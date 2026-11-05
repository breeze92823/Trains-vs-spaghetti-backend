import assert from "assert";
import type { ColyseusTestServer } from "@colyseus/testing";

import type appConfig from "../src/app.config.js";
import { WorldState } from "../src/rooms/schema/WorldState.js";
import { sleep } from "./fakePlayers.js";
import { testServer } from "./server.js";

describe("roster", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;
  before(async () => (colyseus = await testServer()));
  beforeEach(async () => await colyseus.cleanup());

  it("relays each player's name, public id and profile picture, bounded", async () => {
    const room = await colyseus.createRoom<WorldState>("world", {});
    const a = await colyseus.connectTo(room, { userId: "guest-a", username: "Ann", pfp: "https://static.bloxity.io/img/pfps/3.png" });
    const b = await colyseus.connectTo(room, { userId: "u-b", username: "Bo", pfp: "javascript:alert(1)" });
    await sleep(50);
    const pa = room.state.players.get(a.sessionId)!;
    const pb = room.state.players.get(b.sessionId)!;
    assert.strictEqual(pa.pfp, "https://static.bloxity.io/img/pfps/3.png");
    assert.strictEqual(pb.pfp, "", "only http(s) pictures are relayed");
    assert.strictEqual(pa.uid, "guest-a", "a guest's id is the public id chat bubbles match on");
    assert.strictEqual(pb.uid, "u-b");
    assert.strictEqual(pa.signedIn, false);
    assert.strictEqual(pb.signedIn, true);

    b.send("identify", { username: "Bo", pfp: "https://static.bloxity.io/img/pfps/7.png" });
    await sleep(50);
    assert.strictEqual(pb.pfp, "https://static.bloxity.io/img/pfps/7.png");
  });
});
