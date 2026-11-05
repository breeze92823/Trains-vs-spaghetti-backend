import assert from "assert";
import type { ColyseusTestServer } from "@colyseus/testing";

import type appConfig from "../src/app.config.js";
import { WorldState } from "../src/rooms/schema/WorldState.js";
import { AVATAR_MAX_LEN, POSE_BOUNDS, PRESENCE_RAILCARS_MAX } from "../src/constants.js";
import { sleep } from "./fakePlayers.js";
import { testServer } from "./server.js";

describe("presence", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;
  before(async () => (colyseus = await testServer()));
  beforeEach(async () => await colyseus.cleanup());

  it("takes the pose, train and Bloxity look from the join options", async () => {
    const room = await colyseus.createRoom<WorldState>("world", {});
    const look = '{"equipped":{},"skin":"https://static.bloxity.io/s.png"}';
    const a = await colyseus.connectTo(room, {
      userId: "guest-a",
      pose: { x: 3, y: 0.5, z: -12, yaw: Math.PI, speed: 4 },
      loadout: { train: 6, title: "vip", level: 12, railcars: ["boxcar", "tank"], training: true },
      avatar: look,
    });
    await sleep(50);
    const p = room.state.players.get(a.sessionId)!;
    assert.deepStrictEqual([p.x, p.y, p.z, p.speed], [3, 0.5, -12, 4]);
    assert.ok(Math.abs(Math.abs(p.yaw) - Math.PI) < 1e-5);
    assert.deepStrictEqual([p.train, p.title, p.level, p.railcars, p.training], [6, "vip", 12, "boxcar,tank", true]);
    assert.strictEqual(p.avatar, look);
  });

  it("bounds poses and loadouts and relays them to the others", async () => {
    const room = await colyseus.createRoom<WorldState>("world", {});
    const a = await colyseus.connectTo(room, { userId: "guest-a" });
    const b = await colyseus.connectTo(room, { userId: "guest-b" });
    await sleep(50);
    a.send("pose", { x: 1e9, y: "high", z: -1e12, yaw: 7, speed: -3 });
    const cars = Array.from({ length: 30 }, () => "tank").concat("Bad Id!");
    a.send("loadout", { train: 3, title: "Bad Id!", level: 0, railcars: cars, training: "yes" });
    a.send("setAvatar", { avatar: "x".repeat(AVATAR_MAX_LEN + 1) });
    await sleep(100);
    const p = room.state.players.get(a.sessionId)!;
    assert.strictEqual(p.x, POSE_BOUNDS.xy);
    assert.strictEqual(p.y, 0, "a non-number is ignored");
    assert.strictEqual(p.z, -POSE_BOUNDS.xy);
    assert.ok(Math.abs(p.yaw - Math.atan2(Math.sin(7), Math.cos(7))) < 1e-5, "yaw wrapped to -PI..PI");
    assert.strictEqual(p.speed, 0);
    assert.strictEqual(p.train, 3);
    assert.strictEqual(p.title, "", "a malformed title is ignored");
    assert.strictEqual(p.level, 1);
    assert.strictEqual(p.training, false);
    assert.strictEqual(p.railcars.split(",").length, PRESENCE_RAILCARS_MAX);
    assert.strictEqual(p.avatar, "", "an oversized look is ignored");

    const seen = (b.state as any).players.get(a.sessionId);
    assert.strictEqual(seen.train, 3);
    assert.strictEqual(seen.x, POSE_BOUNDS.xy);
  });

  it("relays emotes and one-shot actions, rate-limited and validated", async () => {
    const room = await colyseus.createRoom<WorldState>("world", {});
    const a = await colyseus.connectTo(room, { userId: "guest-a" });
    const b = await colyseus.connectTo(room, { userId: "guest-b" });
    await sleep(50);
    a.send("emote", { id: "wave" });
    a.send("action", { name: "smash" });
    await sleep(150);
    const p = room.state.players.get(a.sessionId)!;
    assert.deepStrictEqual([p.emote, p.emoteSeq, p.action, p.actionSeq], ["wave", 1, "smash", 1]);

    a.send("action", { name: "Bad Name!" });
    a.send("emote", { id: "x".repeat(200) });
    await sleep(150);
    assert.deepStrictEqual([p.emote, p.action, p.actionSeq], ["wave", "smash", 1], "invalid ones are ignored");

    a.send("emote", { id: "wave" });
    a.send("emote", { id: "dance" }); // inside the flood window: dropped
    await sleep(150);
    assert.strictEqual(p.emote, "wave");
    assert.strictEqual(p.emoteSeq, 2, "replaying the same emote still bumps the counter");
    a.send("emote", { id: "" });
    await sleep(150);
    assert.strictEqual(p.emote, "", "an empty id stops the emote");
    assert.strictEqual(p.emoteSeq, 2);

    const seen = (b.state as any).players.get(a.sessionId);
    assert.strictEqual(seen.action, "smash");
  });
});
