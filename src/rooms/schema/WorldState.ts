import { schema, t, type SchemaType } from "@colyseus/schema";

// The live roster: who is in the room and what the others need to draw them. Durable progress
// lives in Mongo (src/db.ts). To sync something new about a player, add a field here and accept it
// in a WorldRoom message (bounded in presence.ts).
export const PlayerState = schema(
  {
    uid: t.string().default(""), // public Bloxity user id (guest-... for guests): matches a Bloxity chat message's userId
    username: t.string().default(""), // client-reported Bloxity displayName/username, not validated
    signedIn: t.boolean().default(false), // has a Bloxity id: only signed-in players are saved
    pfp: t.string().default(""), // Bloxity profile picture URL ("" = none)
    // Presence (presence.ts, `pose` / `loadout` / `setAvatar` / `emote` / `action`).
    x: t.float64().default(0), // train position (m)
    y: t.float64().default(0),
    z: t.float64().default(0),
    yaw: t.float32().default(0), // heading, rad
    speed: t.float32().default(0), // m/s, for wheels, smoke and dead reckoning
    train: t.int32().default(0), // equipped shop train index (client SHOP_TRAINS)
    title: t.string().default(""), // equipped title id, "" = none
    level: t.int32().default(1), // name tag level
    railcars: t.string().default(""), // railcar types riding behind, "type,type"
    training: t.boolean().default(false), // running on a treadmill
    avatar: t.string().default(""), // Bloxity look JSON { equipped, proportions, skin }, "" = default
    emote: t.string().default(""), // Bloxity emote catalogue id being played, "" = none
    emoteSeq: t.uint32().default(0), // bumps on every emote start
    action: t.string().default(""), // last one-shot game action slug (smash, horn, steal ...)
    actionSeq: t.uint32().default(0), // bumps on every action
  },
  "PlayerState",
);
export type PlayerState = SchemaType<typeof PlayerState>;

export const WorldState = schema(
  {
    players: t.map(PlayerState), // keyed by sessionId
  },
  "WorldState",
);
export type WorldState = SchemaType<typeof WorldState>;
