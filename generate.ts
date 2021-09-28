import { Sabr, SabrTable } from "https://deno.land/x/sabr@1.1.4/mod.ts";
import {
  snakelize,
  startBot,
} from "https://deno.land/x/discordeno@12.0.1/mod.ts";
import { TOKEN } from "./configs.ts";
import {
  hideDate,
  hideEUDText,
  hideHash,
  hideSnowflake,
  loopObject,
} from "./utils.ts";

const test: Record<string, any> = {};

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

const FINISHED = new Set([
  "READY",
  "INVITE_CREATE",
  "INVITE_DELETE",
  "GUILD_JOIN_REQUEST_DELETE",
  "MESSAGE_REACTION_ADD",
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
      // let cleanPayload: Record<string, any> = {};

      const numberreg = /^\d+$/;
      const datereg =
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:.\d*)?)((-(\d{2}):(\d{2})|Z)?)$/;

      const cleanPayload = loopObject(payload, (value, key) => {
        if (typeof value !== "string") return value;

        // IF ITS A NUMBER MASK NUMBER
        if (numberreg.test(value)) return hideSnowflake(value);
        if (["icon", "banner", "splash", "avatar"].includes(key))
          return hideHash(value);
        // IF ITS DATE REGEX
        if (Date.parse(value)) return hideDate();

        if (!["username", "content", "hash", "session_id", "nick", "preferred_locale", '"fdvopm'].includes(key)) console.log(key, value);
        return hideEUDText(value);
      });

      db.events.create(Date.now().toString(), cleanPayload);
      // switch (data.t) {
      //   case "READY": {
      //     cleanPayload = {
      //       ...payload,
      //       user: {
      //         ...payload.user,
      //         username: hideEUDText(payload.user.username),
      //         id: hideSnowflake(payload.user.id),
      //         discrimnator: hideSnowflake(payload.user.discriminator),
      //         avatar: hideHash(payload.user.avatar),
      //       },
      //       guilds: payload.guilds.map((ug: any) => ({
      //         ...ug,
      //         id: hideSnowflake(ug.id),
      //       })),
      //       application: {
      //         ...payload.application,
      //         id: hideSnowflake(payload.application.id),
      //       },
      //     };
      //     break;
      //   }
      //   case "INVITE_CREATE": {
      //     cleanPayload = {
      //       ...payload,
      //       inviter: {
      //         username: hideEUDText(payload.inviter.username),
      //         id: hideSnowflake(payload.inviter.id),
      //         discriminator: hideSnowflake(payload.inviter.discriminator),
      //         avatar: hideHash(payload.inviter.avatar),
      //       },
      //       guild_id: hideSnowflake(payload.guild_id),
      //       created_at: hideDate(),
      //       code: hideEUDText(payload.code),
      //       channel_id: hideSnowflake(payload.channel_id),
      //     };
      //     break;
      //   }
      //   case "INVITE_DELETE": {
      //     cleanPayload = {
      //       ...payload,
      //       guild_id: hideSnowflake(payload.guild_id),
      //       code: hideEUDText(payload.code),
      //       channel_id: hideSnowflake(payload.channel_id),
      //     };
      //     break;
      //   }
      //   // @ts-ignore undocumented event
      //   case "GUILD_JOIN_REQUEST_DELETE": {
      //     cleanPayload = {
      //       ...payload,
      //       user_id: hideSnowflake(payload.user_id),
      //       guild_id: hideSnowflake(payload.guild_id),
      //     };
      //     break;
      //   }
      //   case "MESSAGE_REACTION_ADD": {
      //     cleanPayload = {
      //       ...payload,
      //       user_id: hideSnowflake(payload.user_id),
      //       message_id: hideSnowflake(payload.message_id),
      //       member: {
      //         ...payload,
      //         user: {
      //           ...payload.member.user,
      //           username: hideEUDText(payload.member.user.username),
      //           id: hideSnowflake(payload.member.user.id),
      //           discrimnator: hideSnowflake(payload.member.user.discriminator),
      //           avatar: hideHash(payload.member.user.avatar),
      //         },
      //         roles: payload.member.roles.map((id: string) =>
      //           hideSnowflake(id)
      //         ),
      //         joined_at: hideDate(),
      //       },
      //       emoji: {
      //         ...payload.emoji,
      //         name: hideEUDText(payload.emoji.name),
      //         id: hideSnowflake(payload.emoji.id),
      //       },
      //       channel_id: hideSnowflake(payload.channel_id),
      //       guild_id: hideSnowflake(payload.guild_id),
      //     };
      //     break;
      //   }
      //   case "GUILD_MEMBER_ADD": {
      //     cleanPayload = {
      //       ...payload,
      //       user: {
      //         ...payload.user,
      //         username: hideEUDText(payload.user.username),
      //         id: hideSnowflake(payload.user.id),
      //         discrimnator: hideSnowflake(payload.user.discriminator),
      //         avatar: hideHash(payload.user.avatar),
      //       },
      //       roles: payload.roles.map((id: string) => hideSnowflake(id)),
      //       joined_at: hideDate(),
      //       premium_since: payload.premium_since
      //         ? hideDate()
      //         : payload.premium_since,
      //       guild_id: hideSnowflake(payload.guild_id),
      //       avatar: hideHash(payload.avatar)
      //     };
      //     break;
      //   }
      //   case "MESSAGE_CREATE": {
      //     cleanPayload = {
      //       ...payload,
      //       id: hideSnowflake(payload.id),
      //       embeds: payload.embeds.map(e => ({
      //         ...e,
      //         timestamp: e.timestamp ? hideDate() : undefined,
      //         image: ,
      //         description: hideEUDText(e.description),
      //       }))
      //     };
      //     break;
      //   }
      // }

      // make it snake case to be safe
      const final = snakelize(cleanPayload);

      // TODO: SAVE TO A JSON FILE
    },
  },
});
