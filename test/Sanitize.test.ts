import assert from "assert";

import { CURRENCY_MAX } from "../src/constants.js";
import { sanitizeProgress } from "../src/sanitize.js";

describe("sanitizeProgress", () => {
  it("rejects non-objects and bounds numbers", () => {
    assert.strictEqual(sanitizeProgress(null), null);
    assert.strictEqual(sanitizeProgress([1]), null);
    const out = sanitizeProgress({ wins: 1e40, power: -5, xp: NaN, rebirths: 3.7, level: 0, gems: 50, hack: "x" })!;
    assert.strictEqual(out.wins, CURRENCY_MAX);
    assert.strictEqual(out.power, 0);
    assert.strictEqual(out.xp, undefined);
    assert.strictEqual(out.rebirths, 3);
    assert.strictEqual(out.level, 1);
    assert.ok(!("hack" in out));
    assert.ok(!("gems" in out), "gems are never stored");
  });

  it("keeps well-formed titles and only equips an owned one", () => {
    const out = sanitizeProgress({ titlesOwned: ["rookie", "rookie", "Bad Id!", 7, "vip"], title: "vip" })!;
    assert.deepStrictEqual(out.titlesOwned, ["rookie", "vip"]);
    assert.strictEqual(out.title, "vip");
    assert.strictEqual(sanitizeProgress({ titlesOwned: ["rookie"], title: "vip" })!.title, undefined);
    assert.strictEqual(sanitizeProgress({ title: "" })!.title, "");
  });

  it("keeps owned trains and railcars, and equips only an owned train", () => {
    const out = sanitizeProgress({
      trainsOwned: [0, 1, 1, 2.5, -1, "x", 4],
      train: 4,
      railcars: [{ uid: 1, type: "boxcar" }, { uid: 1, type: "dupe" }, { uid: 2, type: "Bad Id!" }, { uid: 3, type: "tank" }, "x"],
      nextUid: 4.9,
    })!;
    assert.deepStrictEqual(out.trainsOwned, [0, 1, 4]);
    assert.strictEqual(out.train, 4);
    assert.deepStrictEqual(out.railcars, [{ uid: 1, type: "boxcar" }, { uid: 3, type: "tank" }]);
    assert.strictEqual(out.nextUid, 4);
    assert.strictEqual(sanitizeProgress({ trainsOwned: [0], train: 7 })!.train, undefined);
  });

  it("bounds stock, quests and settings", () => {
    const out = sanitizeProgress({
      stock: { period: 12, bought: { starter: 2, "bad id": 1, big: "x" } },
      quests: { day: 400, progress: { easy: 5, "bad id": 1 }, claimed: { easy: true, hard: "yes" } },
      settings: { sfx: false, hud: true, evil: "1" },
      singles: ["gold", "gold", "Bad Id!"],
    })!;
    assert.deepStrictEqual(out.stock, { period: 12, bought: { starter: 2 } });
    assert.deepStrictEqual(out.quests, { day: 400, progress: { easy: 5 }, claimed: { easy: true } });
    assert.deepStrictEqual(out.settings, { sfx: false, hud: true });
    assert.deepStrictEqual(out.singles, ["gold"]);
  });
});
