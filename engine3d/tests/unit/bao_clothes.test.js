// Bao Buddy's overalls (runtime/bao_clothes.js): every piece builds and is in shapes.json; the twill is a pattern
// in range; each piece stands on the dough over its own stretch (pants low all round, bib in front, back panel
// behind, open sides where the arms come out); straps reach up under the collar band, which stays outside them;
// the stitching lies on the cloth. Node only (no canvas).
import { test } from "node:test";
import assert from "node:assert/strict";
import { shapeGeometry } from "../../runtime/geometry.js";
import { CLOTHES_SHAPES, OVERALLS, twill } from "../../runtime/bao_clothes.js";
import { COLLAR_BAND, hugged } from "../../runtime/dough.js";
import { loadCatalog3d } from "../../catalog/index.mjs";

const catalog = loadCatalog3d();
const O = OVERALLS;
/** Each vertex as (angle from the front, height share, distance off the dough). */
function points(name, step = 7) {
  const p = shapeGeometry(name).attributes.position;
  const out = [];
  for (let i = 0; i < p.count; i += step) {
    const x = p.getX(i), y = p.getY(i) + 0.5, z = p.getZ(i);
    out.push({ a: Math.atan2(x, z), y, off: Math.hypot(x, z) - hugged(Math.max(0, y)) });
  }
  return out;
}
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));

test("every overalls shape builds and is described", () => {
  for (const n of Object.keys(CLOTHES_SHAPES)) {
    assert.ok(shapeGeometry(n).attributes.position.count > 100, n);
    assert.ok(catalog.shapes[n]?.description, `${n} in shapes.json`);
  }
});

test("twill: a diagonal pattern between 0 and 1 that repeats", () => {
  for (let k = 0; k < 50; k++) {
    const a = k * 0.13, y = k * 0.007;
    const v = twill(a, y);
    assert.ok(v >= 0 && v <= 1);
    assert.ok(Math.abs(twill(a, y + O.twill.period) - v) < 1e-9, "repeats every period up");
  }
  // Diagonal: moving up a little and round a little the other way can stay on the same ridge.
  assert.ok(Math.abs(twill(0, 0) - twill(-O.twill.period / 0.45, O.twill.period)) < 1e-9);
});

test("each piece sits on the dough over its own stretch, so the sides stay open", () => {
  for (const [name, check] of [
    ["bao_pants", (q) => q.y <= O.waist + 0.012],
    ["bao_bib", (q) => Math.abs(q.a) <= O.bibHalf + 0.01 && q.y >= O.waist - 0.01 && q.y <= O.bibTop + 0.001],
    ["bao_back", (q) => Math.abs(wrapPi(q.a - Math.PI)) <= O.backHalf + 0.01 && q.y <= O.backTop + 0.001],
    ["bao_pocket", (q) => Math.abs(q.a) <= O.pocket.half + 0.01 && q.y >= O.pocket.lo - 0.001 && q.y <= O.pocket.hi + 0.001],
  ]) {
    for (const q of points(name)) {
      assert.ok(check(q), `${name} vertex at a ${q.a.toFixed(2)}, y ${q.y.toFixed(3)}`);
      assert.ok(q.off > 0 && q.off < 0.03, `${name} stands just off the dough (${q.off})`);
    }
  }
  // Nothing covers the sides between the waist and the collar, where the arms come out.
  const side = (q) => q.y > O.waist + 0.03 && q.y < COLLAR_BAND.lo - 0.01 && Math.abs(Math.abs(q.a) - Math.PI / 2) < 0.25;
  for (const n of ["bao_pants", "bao_bib", "bao_back", "bao_straps", "bao_pocket"]) assert.ok(!points(n, 3).some(side), `${n} leaves the sides open`);
});

test("straps run up under the collar band, which stays outside them", () => {
  const s = points("bao_straps", 3);
  assert.ok(Math.max(...s.map((q) => q.y)) > COLLAR_BAND.lo + 0.01, "up under the band");
  assert.ok(Math.max(...s.map((q) => q.y)) < COLLAR_BAND.hi, "not out over its top");
  const band = points("leaf_collar", 1).filter((q) => q.y < COLLAR_BAND.lo + 0.02 && q.y > COLLAR_BAND.lo + 0.005);
  const strapOut = Math.max(...s.filter((q) => q.y > COLLAR_BAND.lo + 0.005).map((q) => q.off));
  assert.ok(Math.max(...band.map((q) => q.off)) > strapOut, "the band is the outer layer");
});

test("stitching lies on the cloth, a little proud of it", () => {
  for (const q of points("bao_stitches", 5)) assert.ok(q.off > O.off && q.off < O.off + 0.02, `stitch off ${q.off}`);
});
