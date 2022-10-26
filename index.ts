import { Sabr, SabrTable } from "https://deno.land/x/sabr@1.1.5/mod.ts";

console.log(`[INFO] Script started.`);
const sabr = new Sabr();

try {
  await Deno.readDir("db");
  sabr.directoryPath = `db/`;
} catch {
  sabr.directoryPath = `${Deno.cwd()}/benchmarks/db/`;
}

// Creates a db object that can be imported in other files.
export const db = {
  // This will allow us to access table methods easily as we will see below.
  sabr,
  // Sets up a table. If this table did not exist, it will create one.
  events: new SabrTable(sabr, "events"),
};

// This is important as it prepares all the tables.
await sabr.init();

console.log(`[INFO] Sabr DB has been initialized.`);

export async function memoryBenchmarks(
  botCreator: () => any,
  options: { times: number; log: boolean; table: boolean } = {
    times: 3,
    log: false,
    table: true,
  },
) {
  let gcEnable = false;
  let garbageCollect = () => {};
  try {
    //@ts-ignore
    gc();
    gcEnable = true;
  } catch (error) {
    if (error.message === "gc is not defined") {
      console.error(
        `[WARN] add the flag '--v8-flags="--expose-gc"' for higher accuracy, or change options.times to 1`,
      );
    }
  }
  //@ts-ignore
  if (gcEnable) garbageCollect = gc;

  const stages = ["start", "loaded", "end", "cached"] as const;
  const typeOfMemUsages = ["rss", "heapUsed", "heapTotal"] as const;

  async function runTest(bot: any) {
    // Determine memory stats now before touching anything
    const results: {
      start: Deno.MemoryUsage;
      loaded?: Deno.MemoryUsage;
      end?: Deno.MemoryUsage;
      cached?: Deno.MemoryUsage;
    } = {
      start: Deno.memoryUsage(),
    };
    garbageCollect();
    results.start = Deno.memoryUsage();
    if (options.log) console.log(`[INFO] Loading json files.`);

    const events = await db.events.getAll(true);

    if (options.log) {
      console.log(`[INFO] DB files loaded into memory.`, events.length);
    }
    // Set the memory stats for when files are loaded in.
    results.loaded = Deno.memoryUsage();

    let counter = 0;

    for (let i = 0; i < events.length; i++) {
      const e = events[i];

      for (
        // @ts-ignore should be fine
        const event of Object.values(e) as (string | {
          shardId: number;
          // the d in DiscordGatewayPayload is {}
          payload: any; // DiscordGatewayPayload
        })[]
      ) {
        // In db there is some weird id: "1561" event, this filters it
        if (typeof event === "string") continue;
        counter++;
        try {
          // Turn all hash into a known working hash, make guild iconHashToBigInt working
          if (event.payload.d !== null && event.payload.d) {
            if ("icon" in event.payload.d) {
              event.payload.d.icon = "eae5905ad2d18d7c8deca20478b088b5";
            }
            if ("discovery_splash" in event.payload.d) {
              event.payload.d.discovery_splash =
                "eae5905ad2d18d7c8deca20478b088b5";
            }
            if ("banner" in event.payload.d) {
              event.payload.d.banner = "eae5905ad2d18d7c8deca20478b088b5";
            }
            if ("splash" in event.payload.d) {
              event.payload.d.splash = "eae5905ad2d18d7c8deca20478b088b5";
            }
          }

          if (event.payload.t) {
            bot.handlers[event.payload.t as any]?.(
              bot,
              event.payload,
              event.shardId,
            );
          }
        } catch (error) {
          console.log(event);
          console.log("erroring in benchmark", error);
        }
      }
    }
    if (options.log) {
      console.log(`[INFO] Processed ${counter.toLocaleString()} events.`);
    }

    // Set results for data once all events are processed
    results.end = Deno.memoryUsage();
    //@ts-ignore
    results.cached = {};
    for (const typeOfMemUsage of typeOfMemUsages) {
      results.cached![typeOfMemUsage] = results.end![typeOfMemUsage] -
        results.loaded![typeOfMemUsage];
    }

    if (options.log) {
      console.log(
        "channels",
        bot.channels.size.toLocaleString(),
        "guilds",
        bot.guilds.size.toLocaleString(),
        "members",
        bot.members.size.toLocaleString(),
        "users",
        bot.users.size.toLocaleString(),
        "messages",
        bot.messages.size.toLocaleString(),
        "presences",
        bot.presences.size.toLocaleString(),
      );
    }

    return results;
  }

  const allResults = {
    start: {
      rss: [] as number[],
      heapUsed: [] as number[],
      heapTotal: [] as number[],
    },
    loaded: {
      rss: [] as number[],
      heapUsed: [] as number[],
      heapTotal: [] as number[],
    },
    end: {
      rss: [] as number[],
      heapUsed: [] as number[],
      heapTotal: [] as number[],
    },
    cached: {
      rss: [] as number[],
      heapUsed: [] as number[],
      heapTotal: [] as number[],
    },
  };

  const BYTES = 1000000;

  for (let index = 0; index < options.times; index++) {
    if (options.log) console.log("running the", index + 1, "time");
    const currentResult = await runTest(botCreator());
    for (const typeOfMemUsage of typeOfMemUsages) {
      for (const stage of stages) {
        allResults[stage][typeOfMemUsage].push(
          currentResult[stage]![typeOfMemUsage],
        );
      }
    }
  }

  type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends
    readonly (infer ElementType)[] ? ElementType : never;

  const tableRows = ["Starting", "Loaded", "End", "Cached"] as const;
  const tableFields = ["RSS", "Heap Used", "Heap Total"] as const;

  const humanReadable: {
    [K in ArrayElement<typeof tableRows>]?: {
      [K in ArrayElement<typeof tableFields>]?: string;
    };
  } = {};

  for (const [index, tableRow] of tableRows.entries()) {
    for (const [index2, tableField] of tableFields.entries()) {
      if (index2 === 0) humanReadable[tableRow] = {};
      humanReadable[tableRow]![tableField] = `${
        Math.round(
          allResults[stages[index]][typeOfMemUsages[index2]].reduce(
            (acc, c) => acc + c,
            0,
          ) / allResults.start.rss.length / BYTES * 100,
        ) / 100
      } MB (${
        Math.round(
          Math.min(...allResults[stages[index]][typeOfMemUsages[index2]]) /
            BYTES * 100,
        ) / 100
      } MB … ${
        Math.round(
          Math.max(...allResults[stages[index]][typeOfMemUsages[index2]]) /
            BYTES * 100,
        ) / 100
      } MB)`;
    }
  }

  if (options.table) console.table(humanReadable);

  const processedResults = humanReadable as {
    [K in ArrayElement<typeof tableRows>]: {
      [K in ArrayElement<typeof tableFields>]: string;
    };
  };

  return processedResults;
}

/* Example Usage
deno run --v8-flags="--expose-gc" -A .\index.ts
*/
/*
import { createBot } from "https://deno.land/x/discordeno@17.1.0/mod.ts";
import { enableCachePlugin } from "https://deno.land/x/discordeno@17.1.0/plugins/mod.ts";
memoryBenchmarks(() => enableCachePlugin(createBot({
  token: " ",
  botId: 0n,
})))
*/
