import { Sabr, SabrTable } from "https://deno.land/x/sabr@1.1.4/mod.ts";
import {
  cache,
  startBot,
  ws,
} from "https://deno.land/x/discordeno@12.0.1/mod.ts";
import { TOKEN } from "./configs.ts";
import {
  hideDate,
  hideEUDText,
  hideHash,
  hideSnowflake,
  loopObject,
} from "./utils.ts";

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

let counter = 1;

const payloads = new Map<number, any>();

startBot({
  token: TOKEN,
  intents: [
    "DirectMessageReactions",
    "DirectMessages",
    "GuildBans",
    "GuildEmojis",
    "GuildInvites",
    "GuildMembers",
    "GuildMessageReactions",
    "GuildMessages",
    "GuildVoiceStates",
    "Guilds",
  ],
  eventHandlers: {
    raw: async function (data) {},
  },
});

ws.log = function (type, data: any) {
  if (type !== "RAW") return;

  const payload = data as any;
  const numberreg = /^\d+$/;

  const cleanPayload = loopObject(payload, (value, key) => {
    if (typeof value !== "string") return value;

    // IF ITS A NUMBER MASK NUMBER
    if (numberreg.test(value)) return hideSnowflake(value);
    if (["icon", "banner", "splash", "avatar"].includes(key)) {
      return hideHash(value);
    }
    // IF ITS DATE REGEX
    if (Date.parse(value)) return hideDate();

    return hideEUDText(value);
  });

  console.log("Creating Event #", counter, payload.payload.t);
  if (cache.isReady) {
    payloads.set(counter, {
      ...cleanPayload,
      payload: { ...cleanPayload.payload, t: payload.payload.t },
    });
    if (payloads.size === 1000) {
      db.events.create(counter.toString(), [...payloads.values()]);
      payloads.clear();
    }
  } else {
    db.events.create(counter.toString(), [
      {
        ...cleanPayload,
        payload: { ...cleanPayload.payload, t: payload.payload.t },
      },
    ]);
  }

  counter++;
};
