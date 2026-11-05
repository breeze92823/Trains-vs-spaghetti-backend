import {
  CURRENCY_MAX, REBIRTHS_MAX, PLAY_SECONDS_MAX, XP_MAX, LEVEL_MAX, OWNED_MAX, TRAIN_INDEX_MAX, RAILCARS_MAX,
  NEXT_UID_MAX, SETTINGS_MAX, QUEST_KEYS_MAX, STOCK_KEYS_MAX, PERIOD_MAX, ID_PATTERN,
} from "./constants.js";
import type { PlayerDoc, SavedRailcar } from "./db.js";

export function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
export function clampNum(v: number, max: number): number {
  return Math.min(max, Math.max(0, v));
}
export function clampInt(v: number, max: number, min = 0): number {
  return Math.min(max, Math.max(min, Math.floor(v)));
}
function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
export const isId = (v: unknown): v is string => typeof v === "string" && ID_PATTERN.test(v);

// Catalog ids (titles, containers): slug strings, no duplicates, bounded count.
export function sanitizeIds(raw: unknown, max = OWNED_MAX): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(isId))].slice(0, max);
}

// Shop train indices: whole numbers, no duplicates.
export function sanitizeTrainIndices(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((i): i is number => Number.isInteger(i) && i >= 0 && i < TRAIN_INDEX_MAX))].slice(0, OWNED_MAX);
}

// Owned railcars { uid, type }: whole uid, slug type, unique uids, bounded count.
export function sanitizeRailcars(raw: unknown): SavedRailcar[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const out: SavedRailcar[] = [];
  for (const r of raw) {
    if (out.length >= RAILCARS_MAX) break;
    if (!isObject(r) || !Number.isInteger(r.uid) || !isId(r.type)) continue;
    const uid = r.uid as number;
    if (uid < 0 || uid > NEXT_UID_MAX || seen.has(uid)) continue;
    seen.add(uid);
    out.push({ uid, type: r.type });
  }
  return out;
}

// A { slug: finite number >= 0 } map with bounded keys.
function numberMap(raw: unknown, maxKeys: number, maxValue = CURRENCY_MAX): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObject(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (Object.keys(out).length >= maxKeys) break;
    if (isId(k) && finite(v)) out[k] = clampNum(v, maxValue);
  }
  return out;
}

function boolMap(raw: unknown, maxKeys: number): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (!isObject(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (Object.keys(out).length >= maxKeys) break;
    if (isId(k) && typeof v === "boolean") out[k] = v;
  }
  return out;
}

// The game is client-authoritative -- no server-side gameplay validation. What IS enforced:
// shape and bounds, so a malformed payload can never corrupt this player's own Mongo document.
// A forged number can only ever affect the sender's own save (and its leaderboard rows).
export function sanitizeProgress(raw: unknown): Partial<PlayerDoc> | null {
  if (!isObject(raw)) return null;
  const out: Partial<PlayerDoc> = {};

  if (finite(raw.power)) out.power = clampNum(raw.power, CURRENCY_MAX);
  if (finite(raw.wins)) out.wins = clampNum(raw.wins, CURRENCY_MAX);
  if (finite(raw.xp)) out.xp = clampNum(raw.xp, XP_MAX);
  if (finite(raw.level)) out.level = clampInt(raw.level, LEVEL_MAX, 1);
  if (finite(raw.rebirths)) out.rebirths = clampInt(raw.rebirths, REBIRTHS_MAX);
  if (finite(raw.playtime)) out.playtime = clampInt(raw.playtime, PLAY_SECONDS_MAX);
  if (finite(raw.lastSeen)) out.lastSeen = clampInt(raw.lastSeen, Date.now() + 10 * 60 * 1000);

  if (raw.titlesOwned !== undefined) out.titlesOwned = sanitizeIds(raw.titlesOwned);
  // The equipped title must be owned ("" = none); when this save carries no list, trust the shape.
  if (raw.title === "" || raw.title === null) out.title = "";
  else if (isId(raw.title) && (!out.titlesOwned || out.titlesOwned.includes(raw.title))) out.title = raw.title;

  if (raw.railcars !== undefined) out.railcars = sanitizeRailcars(raw.railcars);
  if (finite(raw.nextUid)) out.nextUid = clampInt(raw.nextUid, NEXT_UID_MAX, 1);
  if (raw.singles !== undefined) out.singles = sanitizeIds(raw.singles);

  if (isObject(raw.stock)) {
    out.stock = {
      period: finite(raw.stock.period) ? Math.floor(Math.min(PERIOD_MAX, Math.max(-1, raw.stock.period))) : -1,
      bought: numberMap(raw.stock.bought, STOCK_KEYS_MAX, 1e9),
    };
  }
  if (isObject(raw.quests)) {
    out.quests = {
      day: finite(raw.quests.day) ? Math.floor(Math.min(PERIOD_MAX, Math.max(-1, raw.quests.day))) : -1,
      progress: numberMap(raw.quests.progress, QUEST_KEYS_MAX),
      claimed: boolMap(raw.quests.claimed, QUEST_KEYS_MAX),
    };
  }
  if (raw.settings !== undefined) out.settings = boolMap(raw.settings, SETTINGS_MAX);

  if (raw.trainsOwned !== undefined) out.trainsOwned = sanitizeTrainIndices(raw.trainsOwned);
  if (Number.isInteger(raw.train) && (raw.train as number) >= 0 && (raw.train as number) < TRAIN_INDEX_MAX) {
    const train = raw.train as number;
    // The equipped train must be owned when the save carries the list.
    if (!out.trainsOwned || out.trainsOwned.includes(train)) out.train = train;
  }
  return out;
}
