// Doopi & Friends appearance options (package A2): the belly fold in looks.js, set_appearance slots,
// and the accessories_more.js drawing against a recording context (no canvas backend needed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { lookFor, lookAt } from "../../engine/renderer/looks.js";
import { drawHeadMore, drawHornsBack, drawBun, drawLookBehind, drawLookFront, RAINBOW } from "../../engine/renderer/accessories_more.js";
import { computeJoints } from "../../engine/skeleton.js";
import { catalog } from "../../catalog/index.js";

/** A 2D-context stand-in that records fill colors and checks every coordinate is finite. */
function recorder() {
  const fills = [];
  let bad = 0;
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k === "fill") return () => fills.push(t.fillStyle);
      if (k in t) return t[k];
      return (...args) => { if (args.some((a) => typeof a === "number" && !Number.isFinite(a))) bad++; };
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  return { ctx, fills, bad: () => bad };
}

const C = { x: 100, y: 100 };
const AX = { f: { x: 1, y: 0 }, u: { x: 0, y: -1 } };

test("looks: belly folds into the belly outfit only when nothing is worn", () => {
  const cases = [
    [{ body: "buddy", color: "#7fe8c4", appearance: { belly: "#c9b6ff" } }, "belly", "#c9b6ff"],
    [{ body: "buddy", color: "#7fe8c4", appearance: { belly: "#c9b6ff", outfit: "shirt", outfitColor: "#ffffff" } }, "shirt", "#ffffff"],
    [{ body: "buddy", color: "#7fe8c4", appearance: {} }, undefined, undefined],
  ];
  for (const [cast, outfit, color] of cases) {
    const look = lookFor(catalog, cast);
    assert.equal(look.outfit, outfit);
    assert.equal(look.outfitColor, color);
  }
});

test("looks: set_appearance outfit replaces the belly patch, outfit none brings it back; slots carry", () => {
  const base = lookFor(catalog, { body: "buddy", color: "#7fe8c4", appearance: { belly: "#c9b6ff" } });
  const ch = (videoT, params) => ({ videoT, params: { who: "m", ...params } });
  const changes = [ch(1, { outfit: "shirt", outfitColor: "#ff0000" }), ch(2, { outfit: "none" }), ch(3, { accessory: "bracelet", color: "#e6b84a", slots: 4 })];
  const rows = [[0.5, "belly", "#c9b6ff"], [1.5, "shirt", "#ff0000"], [2.5, "belly", "#c9b6ff"]];
  for (const [t, outfit, color] of rows) {
    const look = lookAt(base, changes, t);
    assert.equal(look.outfit, outfit, `t=${t}`);
    assert.equal(look.outfitColor, color, `t=${t}`);
  }
  const late = lookAt(base, changes, 4);
  assert.equal(late.slots, 4);
  assert.equal(late.accessories.bracelet, "#e6b84a");
});

test("head pieces: each one draws with finite coordinates, nothing when absent", () => {
  const pieces = ["moustache", "turban", "stub_horns", "horns", "sprout", "hair_flower"];
  for (const name of pieces) {
    const r = recorder();
    drawHeadMore(r.ctx, C, 20, AX, { [name]: "#e6b84a" });
    assert.ok(r.fills.length > 0, name);
    assert.equal(r.bad(), 0, name);
  }
  const none = recorder();
  drawHeadMore(none.ctx, C, 20, AX, {});
  drawHornsBack(none.ctx, C, 20, AX, {});
  assert.equal(none.fills.length, 0);
  const bun = recorder();
  drawBun(bun.ctx, C, 20, AX, "#f2f2f2");
  assert.ok(bun.fills.includes("#f2f2f2"));
});

test("bracelet: the first `slots` gems light up in rainbow order", () => {
  const j = computeJoints({}, { x: 500, y: 500 }, 1, 1);
  for (const slots of [0, 1, 3, 7, 9]) {
    const r = recorder();
    drawLookFront(r.ctx, { j, scale: 1, alpha: 1 }, { accessories: { bracelet: "#e6b84a" }, slots });
    const lit = r.fills.filter((f) => RAINBOW.includes(f));
    assert.deepEqual(lit, RAINBOW.slice(0, Math.min(slots, 7)), `slots ${slots}`);
  }
});

test("mittens: far one behind, near one in front; quadrupeds and bare hands draw nothing", () => {
  const j = computeJoints({}, { x: 500, y: 500 }, 1, 1);
  const look = { accessories: { mittens: "#ff9f43" } };
  const behind = recorder();
  drawLookBehind(behind.ctx, { j, scale: 1, alpha: 1 }, look);
  const front = recorder();
  drawLookFront(front.ctx, { j, scale: 1, alpha: 1 }, look);
  assert.ok(behind.fills.length > 0 && front.fills.includes("#ff9f43"));
  for (const [c, l] of [[{ j, scale: 1, quad: {} }, look], [{ j, scale: 1 }, { accessories: {} }], [{ j, scale: 1 }, undefined]]) {
    const r = recorder();
    drawLookBehind(r.ctx, c, l);
    drawLookFront(r.ctx, c, l);
    assert.equal(r.fills.length, 0);
  }
});
