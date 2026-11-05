import { MongoClient, type Collection } from "mongodb";

import { LEADERBOARD_STATS } from "./constants.js";

// Bloxity Legion hosting injects MONGODB_URI per game+channel -- an isolated database with
// scoped credentials. A local `npm start` normally has no Mongo reachable, so a missing or
// unreachable URI must degrade to "no persistence" rather than crash the room.

// The persisted client state (what `saveProgress` carries, see sanitize.ts; client game.js SAVED).
// This document is the player's only server-side save. There is no premium currency here: gems go
// through the Bloxity platform and are not stored by this server.
export interface PlayerDoc {
  _id: string; // Bloxity user id -- see WorldRoom.ts (guests are never saved)
  username?: string; // display name as of the last save
  pfp?: string; // Bloxity profile picture URL as of the last save (leaderboard rows)
  power?: number; // lifetime power (the HUD's POWER line, ranked on the Power board)
  level?: number;
  xp?: number;
  wins?: number; // the shop currency, ranked on the Top Wins board
  rebirths?: number;
  playtime?: number; // s with the game visible, ranked on the Top Playtime board
  titlesOwned?: string[]; // client TITLES ids
  title?: string; // the equipped title, "" = none
  railcars?: SavedRailcar[]; // owned railcars
  nextUid?: number; // next railcar uid
  singles?: string[]; // container ids bought once already (`single` containers)
  stock?: { period: number; bought: Record<string, number> }; // restock period + bought per container
  quests?: { day: number; progress: Record<string, number>; claimed: Record<string, boolean> };
  settings?: Record<string, boolean>; // the in-game Settings window's toggles
  trainsOwned?: number[]; // shop train indices (client DISPLAY_TRAINS row by row)
  train?: number; // the equipped shop train (an owned one)
  lastSeen?: number; // epoch ms of the last activity
  version: number;
  updatedAt: Date;
}

export interface SavedRailcar {
  uid: number;
  type: string; // client RAILCAR_TYPES key
}

let client: MongoClient | null = null;
let players: Collection<PlayerDoc> | null = null;

export async function connectDb(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[db] MONGODB_URI not set -- player progress will not persist");
    return;
  }
  try {
    client = new MongoClient(uri);
    await client.connect();
    // No dbName passed to .db() -- the injected URI already points at this game+channel's database.
    players = client.db().collection<PlayerDoc>("players");
    console.log("[db] connected to MongoDB");
    // The leaderboards sort and count by these (leaderboard.ts).
    for (const stat of LEADERBOARD_STATS) {
      players.createIndex({ [stat]: -1 }).catch((err) => console.warn(`[db] index on ${stat} failed`, err));
    }
  } catch (err) {
    console.warn("[db] connect failed -- player progress will not persist:", err);
    client = null;
    players = null;
  }
}

// Null whenever Mongo is unset/unreachable -- every caller must treat that as "skip persistence".
export function getPlayers(): Collection<PlayerDoc> | null {
  return players;
}

// Test-only seam: exercise the save/load logic against an in-memory fake collection.
export function __setPlayersForTest(fake: Collection<PlayerDoc> | null): void {
  players = fake;
}
