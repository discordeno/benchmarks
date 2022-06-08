import { Sabr, SabrTable } from "https://deno.land/x/sabr@1.1.5/mod.ts";

console.log(`[INFO] Script started.`);
const sabr = new Sabr();
sabr.directoryPath = `${Deno.cwd()}/benchmarks/db/`;

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

// Determine memory stats now before touching anything
const results: {
  start: Deno.MemoryUsage;
  loaded?: Deno.MemoryUsage;
  processed?: Deno.MemoryUsage;
  end?: Deno.MemoryUsage;
} = {
  start: Deno.memoryUsage(),
};

export async function memoryBenchmarks(
  bot: any,
  options: { log: boolean; table: boolean } = { log: false, table: true }
) {
  async function runTest() {
    if (options.log) console.log(`[INFO] Loading json files.`);

    const events = await db.events.getAll(true);

    if (options.log) console.log(`[INFO] DB files loaded into memory.`, events.length);
    // Set the memory stats for when files are loaded in.
    results.loaded = Deno.memoryUsage();

    let counter = 0;

    for (let i = 0; i < events.length; i++) {
      const e = events[i];

      // @ts-ignore should be fine
      for (const event of Object.values(e)) {
        counter++;

        try {
          await bot.gateway.manager.createShardOptions.events.message(
            // @ts-ignore should work
            { id: event.shardId },
            // @ts-ignore should work
            JSON.stringify(event.payload),
          );
        } catch (error) {
          console.log("erroring in benchmark", error);
        }
      }
    }
    if (options.log) console.log(`[INFO] Processed ${counter.toLocaleString()} events.`);

    // Set results for data once all events are processed
    results.processed = Deno.memoryUsage();
  }

  await runTest();

  const BYTES = 1000000;

  // Set final results
  results.end = Deno.memoryUsage();

  const humanReadable = {
    Starting: {
      RSS: `${results.start.rss / BYTES} MB`,
      "Heap Used": `${results.start.heapUsed / BYTES} MB`,
      "Heap Total": `${results.start.heapTotal / BYTES} MB`,
    },
    Loaded: {
      RSS: `${results.loaded!.rss / BYTES} MB`,
      "Heap Used": `${results.loaded!.heapUsed / BYTES} MB`,
      "Heap Total": `${results.loaded!.heapTotal / BYTES} MB`,
    },
    Processed: {
      RSS: `${results.processed!.rss / BYTES} MB`,
      "Heap Used": `${results.processed!.heapUsed / BYTES} MB`,
      "Heap Total": `${results.processed!.heapTotal / BYTES} MB`,
    },
    End: {
      RSS: `${results.end.rss / BYTES} MB`,
      "Heap Used": `${results.end.heapUsed / BYTES} MB`,
      "Heap Total": `${results.end.heapTotal / BYTES} MB`,
    },
    Cached: {
      RSS: `${(results.end.rss - results.loaded!.rss) / BYTES} MB`,
      "Heap Used": `${(results.end.heapUsed - results.loaded!.heapUsed) / BYTES} MB`,
      "Heap Total": `${(results.end.heapTotal - results.loaded!.heapTotal) / BYTES} MB`,
    },
  };

  if (options.log)
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
      bot.presences.size.toLocaleString()
    );

  if (options.table) console.table(humanReadable);

  return results;
}
