// A real night on any theme (ADR-037): the theme's night look, sky, moon, lit windows and the lighter grade.
import { test } from "node:test";
import assert from "node:assert/strict";
import { nightLook, nightSky, moonOf, windowLit, nightFilter, NIGHT_SKY, NIGHT_LIGHT_KINDS } from "../../engine/renderer/night.js";
import { NIGHT_DIM } from "../../engine/renderer/grade.js";
import { drawBackground, createBackground } from "../../engine/renderer/background.js";
import { catalog } from "../../catalog/index.js";

test("nightLook by tags: daytime outdoor themes get all of it with a sky, rooms half, dark themes a little", () => {
  const cases = [["tokyo_village", 1, true], ["city_park", 1, true], ["home_interior", 0.5, false], ["alley_night", 0.35, false], ["villain_lair", 0.35, false]];
  for (const [name, amount, sky] of cases) assert.deepEqual(nightLook(catalog.themes[name]), { amount, sky }, name);
});

test("nightSky blends the theme's sky to the night sky", () => {
  assert.deepEqual(nightSky({ top: "#6cc3f2", bottom: "#d8f1ff" }, 1), NIGHT_SKY);
  assert.deepEqual(nightSky({ top: "#6cc3f2", bottom: "#d8f1ff" }, 0), { top: "#6cc3f2", bottom: "#d8f1ff" });
  assert.equal(nightSky({ top: "rgba(1,2,3,1)", bottom: "#000000" }, 0.7).top, NIGHT_SKY.top, "non-hex colours switch at half");
});

test("moonOf: where the sun was, else high on the right", () => {
  const m = moonOf(catalog.themes.tokyo_village);
  const sun = catalog.themes.tokyo_village.layers.find((l) => l.kind === "sun");
  assert.equal(m.x, sun.x);
  assert.ok(m.r >= 30 && m.r <= 58);
  assert.deepEqual(moonOf({ layers: [] }), { x: 0.78, y: 0.16, r: 44, factor: 0.02 });
});

test("lit windows are a fixed share, the same every call", () => {
  let lit = 0;
  for (let k = 0; k < 2000; k++) lit += windowLit(3, k) ? 1 : 0;
  assert.ok(lit > 1000 && lit < 1200, `${lit}`);
  assert.equal(windowLit(7, 11), windowLit(7, 11));
  assert.ok(NIGHT_LIGHT_KINDS.includes("buildings") && NIGHT_LIGHT_KINDS.includes("huts"));
});

test("the night grade dims like the moonlit rig's ambient; the layer filter darkens with n", () => {
  const amb = catalog.lights.rigs.moonlit.ambient.color.slice(1).match(/../g).map((h) => parseInt(h, 16)).join(",");
  assert.equal(NIGHT_DIM.color, amb);
  assert.equal(nightFilter(0), "brightness(1.000) saturate(1.000)");
  assert.equal(nightFilter(1), "brightness(0.400) saturate(0.700)");
});

/** A recording context: every call by name; fills record the fill style. */
function fakeCtx(log) {
  const ctx = { canvas: { width: 1920, height: 1080 }, filter: "none", globalAlpha: 1, globalCompositeOperation: "source-over" };
  return new Proxy(ctx, {
    get: (t, k) => (k in t || k === "__real" ? t[k] : (...a) => (log.push(k === "fillRect" ? `fillRect:${t.globalCompositeOperation}` : k), String(k).startsWith("create") ? { addColorStop() {} } : undefined)),
    set: (t, k, v) => ((t[k] = v), true),
  });
}

test("drawBackground: day is the old path; night clears the frame and puts the sky behind (every daytime theme)", () => {
  const cam = { x: 1000, y: 540, zoom: 1, shakeX: 0, shakeY: 0 };
  for (const name of ["tokyo_village", "city_street", "home_interior", "desert_noon", "pirate_deck"]) {
    const bg = createBackground(catalog.themes[name], name, 1);
    const day = [];
    drawBackground(fakeCtx(day), bg, cam, 1920, 1080, 0, 1, 0);
    assert.ok(!day.includes("clearRect"), `${name}: day`);
    const night = [];
    drawBackground(fakeCtx(night), bg, cam, 1920, 1080, 0, 1, 1);
    assert.equal(night[0] === "save" && night.includes("clearRect"), true, `${name}: night clears`);
    assert.ok(night.includes("fillRect:destination-over"), `${name}: the sky goes behind`);
  }
});
