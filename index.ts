import { Sabr, SabrTable } from "https://deno.land/x/sabr@1.1.4/mod.ts";
import {
  delay,
  startBot,
  ws,
} from "https://deno.land/x/discordeno@12.0.1/mod.ts";
import { TOKEN } from "./configs.ts";

console.log(`[INFO] Script started.`);
const sabr = new Sabr();

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

console.log(`[INFO] Initial results prepared.`);

console.log(`[INFO] Starting Bot`);
startBot({
  token: TOKEN,
  intents: [],
  eventHandlers: {
    shardReady: (id) => console.log(`[READY] Shard ${id} is online.`),
    // IMPORTAN TO KEEP OFF FOR RUNNING SCRIPT
    dispatchRequirements: () => null,
    ready: async () => {
      async function runTest() {
        console.log(`[INFO] Bot is started. Loading json files.`);

        const events = await db.events.getAll(true);

        console.log(`[INFO] DB files loaded into memory.`);
        // Set the memory stats for when files are loaded in.
        results.loaded = Deno.memoryUsage();

        console.log(`[INFO] Processing events.`);
        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          await ws.handleOnMessage(
            // @ts-ignore should work
            JSON.stringify(event.payload),
            // @ts-ignore should work
            event.shardId
          );
        }
        console.log(`[INFO] Processing events completed.`);

        // Set results for data once all events are processed
        results.processed = Deno.memoryUsage();
      }

      await runTest();

      const BYTES = 1000000;

      // Set final results
      results.end = Deno.memoryUsage();

      console.log(
        "[RESULTS - Start]",
        "RSS",
        `${results.start.rss / BYTES} MB`,
        "Heap Total",
        `${results.start.heapTotal / BYTES} MB`,
        "Heap Used",
        `${results.start.heapUsed / BYTES} MB`
      );
      console.log(
        "[RESULTS - Loaded]",
        "RSS",
        `${results.loaded!.rss / BYTES} MB`,
        "Heap Total",
        `${results.loaded!.heapTotal / BYTES} MB`,
        "Heap Used",
        `${results.loaded!.heapUsed / BYTES} MB`
      );
      console.log(
        "[RESULTS - Processed]",
        "RSS",
        `${results.processed!.rss / BYTES} MB`,
        "Heap Total",
        `${results.processed!.heapTotal / BYTES} MB`,
        "Heap Used",
        `${results.processed!.heapUsed / BYTES} MB`
      );
      console.log(
        "[RESULTS - End]",
        "RSS",
        `${results.end.rss / BYTES} MB`,
        "Heap Total",
        `${results.end.heapTotal / BYTES} MB`,
        "Heap Used",
        `${results.end.heapUsed / BYTES} MB`
      );

      Deno.exit();
    },
  },
});
