import { Sabr, SabrTable } from "https://deno.land/x/sabr@1.1.4/mod.ts";
// import { cache, ws } from "https://deno.land/x/discordeno@12.0.1/mod.ts";

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

export async function memoryBenchmarks(bot: any, log = true) {
  async function runTest() {
    if (log) console.log(`[INFO] Loading json files.`);

    const events = await db.events.getAll(true);

    if (log) console.log(`[INFO] DB files loaded into memory.`);
    // Set the memory stats for when files are loaded in.
    results.loaded = Deno.memoryUsage();

    if (log) console.log(`[INFO] Processing events.`);
    for (let i = 0; i < events.length; i++) {
      const e = events[i];

      // @ts-ignore should be fine
      for (const event of Object.values(e)) {
        await bot.gateway.handleOnMessage(
          // @ts-ignore should work
          JSON.stringify(event.payload),
          // @ts-ignore should work
          event.shardId
        );
      }
    }
    if (log) console.log(`[INFO] Processing events completed.`);

    // Set results for data once all events are processed
    results.processed = Deno.memoryUsage();
  }

  await runTest();

  const BYTES = 1000000;

  // Set final results
  results.end = Deno.memoryUsage();

  if (log)
    console.log(
      "[RESULTS - Start]",
      "RSS",
      `${results.start.rss / BYTES} MB`,
      "Heap Total",
      `${results.start.heapTotal / BYTES} MB`,
      "Heap Used",
      `${results.start.heapUsed / BYTES} MB`
    );
  if (log)
    console.log(
      "[RESULTS - Loaded]",
      "RSS",
      `${results.loaded!.rss / BYTES} MB`,
      "Heap Total",
      `${results.loaded!.heapTotal / BYTES} MB`,
      "Heap Used",
      `${results.loaded!.heapUsed / BYTES} MB`
    );
  if (log)
    console.log(
      "[RESULTS - Processed]",
      "RSS",
      `${results.processed!.rss / BYTES} MB`,
      "Heap Total",
      `${results.processed!.heapTotal / BYTES} MB`,
      "Heap Used",
      `${results.processed!.heapUsed / BYTES} MB`
    );
  if (log)
    console.log(
      "[RESULTS - End]",
      "RSS",
      `${results.end.rss / BYTES} MB`,
      "Heap Total",
      `${results.end.heapTotal / BYTES} MB`,
      "Heap Used",
      `${results.end.heapUsed / BYTES} MB`
    );

  if (log)
    console.log(
      "channels",
      bot.cache.channels?.size(),
      "emojis",
      bot.cache.emojis?.size(),
      "guilds",
      bot.cache.guilds?.size(),
      "members",
      bot.cache.members?.size(),
      "messages",
      bot.cache.messages?.size(),
      "presences",
      bot.cache.presences?.size(),
      "threads",
      bot.cache.threads?.size()
    );

  return results;
}
