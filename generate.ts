import {
  snakelize,
  startBot,
} from "https://deno.land/x/discordeno@12.0.1/mod.ts";
import { TOKEN } from "./configs.ts";
import { hideDate, hideEUDText, hideHash, hideSnowflake } from "./utils.ts";

const test: Record<string, any> = {};

const FINISHED = new Set([
  "READY",
  "INVITE_CREATE",
  "INVITE_DELETE",
  "GUILD_JOIN_REQUEST_DELETE",
]);

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
    raw: async function (data) {
      // DEVELOPMENT ONLY REMOVE WHEN DONE
      if (data.t && FINISHED.has(data.t)) return;

      if (!data.t) return console.log("NO T FOUND", data);

      if (!test[data.t]) {
        test[data.t] = data;
        console.log(data);
      }

      const payload = data.d as any;
      let cleanPayload: Record<string, any> = {};

      switch (data.t) {
        case "READY": {
          cleanPayload = {
            ...payload,
            user: {
              ...payload.user,
              username: hideEUDText(payload.user.username),
              id: hideSnowflake(payload.user.id),
              discrimnator: hideSnowflake(payload.user.discriminator),
              avatar: hideHash(payload.user.avatar),
            },
            guilds: payload.guilds.map((ug: any) => ({
              ...ug,
              id: hideSnowflake(ug.id),
            })),
            application: {
              ...payload.application,
              id: hideSnowflake(payload.application.id),
            },
          };
          break;
        }
        case "INVITE_CREATE": {
          cleanPayload = {
            ...payload,
            inviter: {
              username: hideEUDText(payload.inviter.username),
              id: hideSnowflake(payload.inviter.id),
              discriminator: hideSnowflake(payload.inviter.discriminator),
              avatar: hideHash(payload.inviter.avatar),
            },
            guild_id: hideSnowflake(payload.guild_id),
            created_at: hideDate(),
            code: hideEUDText(payload.code),
            channel_id: hideSnowflake(payload.channel_id),
          };
          break;
        }
        case "INVITE_DELETE": {
          cleanPayload = {
            ...payload,
            guild_id: hideSnowflake(payload.guild_id),
            code: hideEUDText(payload.code),
            channel_id: hideSnowflake(payload.channel_id),
          };
          break;
        }
        // @ts-ignore undocumented event
        case "GUILD_JOIN_REQUEST_DELETE": {
          cleanPayload = {
            ...payload,
            user_id: hideSnowflake(payload.user_id),
            guild_id: hideSnowflake(payload.guild_id),
          };
          break;
        }
      }

      // make it snake case to be safe
      const final = snakelize(cleanPayload);

      // TODO: SAVE TO A JSON FILE
    },
  },
});
