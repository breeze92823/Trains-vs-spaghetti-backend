import { ACTION_PATTERN, AVATAR_MAX_LEN, BROADCAST_MIN_MS, EMOTE_ID_MAX_LEN, ID_PATTERN, LEVEL_MAX, POSE_BOUNDS, PRESENCE_RAILCARS_MAX, TRAIN_INDEX_MAX } from "./constants.js";
import type { PlayerState } from "./rooms/schema/WorldState.js";

// Presence: what the other clients need to draw a player in the world (client remotePlayers.js):
// their train and railcars, name tag, Bloxity avatar (skin, cosmetics, proportions) and the
// animations they play (Bloxity emotes and game actions). Relayed through the roster as sent,
// only bounded here -- like the rest of the game it is client-authoritative and purely cosmetic.

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const isId = (v: unknown): v is string => typeof v === "string" && ID_PATTERN.test(v);

// `pose` { x, y, z, yaw, speed }: the train's feet position (m), heading (rad) and speed (m/s).
export function applyPose(p: PlayerState, msg: unknown): void {
  if (!msg || typeof msg !== "object") return;
  const m = msg as Record<string, unknown>;
  const b = POSE_BOUNDS;
  if (finite(m.x)) p.x = clamp(m.x, -b.xy, b.xy);
  if (finite(m.y)) p.y = clamp(m.y, -b.xy, b.xy);
  if (finite(m.z)) p.z = clamp(m.z, -b.xy, b.xy);
  if (finite(m.yaw)) p.yaw = Math.atan2(Math.sin(m.yaw), Math.cos(m.yaw));
  if (finite(m.speed)) p.speed = clamp(m.speed, 0, b.speed);
}

// `loadout` { train, title, level, railcars: [typeId], training }: the equipped shop train index,
// the equipped title id ("" = none), the level for the name tag, the railcar types riding behind
// (at most PRESENCE_RAILCARS_MAX) and whether the train is running on a treadmill.
export function applyLoadout(p: PlayerState, msg: unknown): void {
  if (!msg || typeof msg !== "object") return;
  const m = msg as Record<string, unknown>;
  if (Number.isInteger(m.train) && (m.train as number) >= 0 && (m.train as number) < TRAIN_INDEX_MAX) p.train = m.train as number;
  if (m.title === "" || isId(m.title)) p.title = m.title as string;
  if (finite(m.level)) p.level = Math.floor(clamp(m.level, 1, LEVEL_MAX));
  if (typeof m.training === "boolean") p.training = m.training;
  if (Array.isArray(m.railcars)) p.railcars = m.railcars.filter(isId).slice(0, PRESENCE_RAILCARS_MAX).join(",");
}

// `setAvatar` { avatar }: the Bloxity look as an opaque JSON string ("" = default), length-capped.
export function applyAvatar(p: PlayerState, msg: unknown): void {
  const a = (msg as { avatar?: unknown })?.avatar;
  if (typeof a === "string" && a.length <= AVATAR_MAX_LEN) p.avatar = a;
}

// `emote` { id }: the Bloxity emote catalogue id being played ("" = stopped). emoteSeq counts
// starts, so replaying the same emote still reaches the others as a change. Rate-limited.
export function applyEmote(p: PlayerState, msg: unknown, now: number, last: { emote: number }): void {
  const id = (msg as { id?: unknown })?.id;
  if (typeof id !== "string" || id.length > EMOTE_ID_MAX_LEN || now - last.emote < BROADCAST_MIN_MS) return;
  last.emote = now;
  p.emote = id;
  if (id) p.emoteSeq = (p.emoteSeq + 1) >>> 0;
}

// `action` { name }: a one-shot game animation or effect (smash, horn, levelUp, steal ...) for the
// others to play. Rate-limited; actionSeq counts them so repeats still arrive.
export function applyAction(p: PlayerState, msg: unknown, now: number, last: { action: number }): void {
  const name = (msg as { name?: unknown })?.name;
  if (typeof name !== "string" || !ACTION_PATTERN.test(name) || now - last.action < BROADCAST_MIN_MS) return;
  last.action = now;
  p.action = name;
  p.actionSeq = (p.actionSeq + 1) >>> 0;
}
