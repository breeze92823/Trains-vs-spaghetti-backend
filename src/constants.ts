// Keep in step with the client's src/config.js by hand.
export const ROOM_MAX_CLIENTS = 50;

// Longest accepted strings.
export const NAME_MAX = 64;
// Profile picture URL (Bloxity `pfp`), relayed so other players can draw it.
export const PFP_MAX_LEN = 512;
// Public id other clients use to match a roster entry to a Bloxity chat message (`userId`).
export const UID_MAX_LEN = 128;

// Presence (presence.ts): the Bloxity avatar JSON relayed for the others to draw ({ equipped,
// proportions, skin }, never parsed), the most railcars drawn behind a train, and the pose bounds
// (|x|, |y| and |z| up to `xy` m; speed in m/s).
export const AVATAR_MAX_LEN = 3000;
export const PRESENCE_RAILCARS_MAX = 12;
export const POSE_BOUNDS = { xy: 5000, speed: 2000 };
export const LEVEL_MAX = 1e6;
// Emote ids are Bloxity catalogue ids; actions are short game-defined slugs (smash, horn, steal...).
export const EMOTE_ID_MAX_LEN = 64;
export const ACTION_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/;
// Minimum gap between a player's emote / action broadcasts, so a client can't flood the roster.
export const BROADCAST_MIN_MS = 100;

// Colyseus drops the whole connection for a WebSocket message above this (default 4 KB).
export const MAX_PAYLOAD_BYTES = 128 * 1024;

// How long a dropped connection (WiFi blip, backgrounded tab) may reconnect with the same session.
export const RECONNECT_SECONDS = 20;

// Upper bounds for saved values, so a forged payload cannot store a bogus number. Generous
// ceilings, not game rules (the client's power / wins grow into the quintillions and beyond).
export const CURRENCY_MAX = 1e33; // power, wins
export const REBIRTHS_MAX = 1e9;
export const PLAY_SECONDS_MAX = 31_536_000 * 10; // ~10 years
export const XP_MAX = 1e15;

// Catalog sizes (client config.js): TITLES, DISPLAY_TRAINS (15 today), CONTAINERS, RAILCAR_TYPES.
export const OWNED_MAX = 256;
export const TRAIN_INDEX_MAX = 1024;
export const RAILCARS_MAX = 2000; // owned railcars in a save
export const NEXT_UID_MAX = 1e9;
export const SETTINGS_MAX = 64; // keys in the settings map
export const QUEST_KEYS_MAX = 64;
export const STOCK_KEYS_MAX = 128;
export const PERIOD_MAX = 1e9;

// Leaderboards (leaderboard.ts; client hub boards): the saved doc fields ranked (Rebirths, Wins,
// Power, Playtime), rows per board and how often the lists are re-read and re-sent. The same four
// are also submitted by the client to the Bloxity portal's own boards (SDK leaderboard.define).
export const LEADERBOARD_STATS = ["rebirths", "wins", "power", "playtime"] as const;
export type LeaderboardStat = (typeof LEADERBOARD_STATS)[number];
export const LEADERBOARD_SIZE = 10;
export const LEADERBOARD_EVERY_MS = 60 * 1000;

// Ids from the client's catalogs (titles, railcar types, containers): camelCase / kebab slugs.
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

// The client's per-browser fallback id for players who are not signed in to Bloxity.
// Guests are never persisted.
export const GUEST_ID_PREFIX = "guest-";
