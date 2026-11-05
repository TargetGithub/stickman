// Toon face shapes (runtime/toon_face.js): the anime eye's layers stack in order and stay inside the eye (the
// iris toward the nose, nothing below the lash line but the lash line itself), they follow the face's curve,
// the lid lines run past the outer corner, the brow peaks toward its inner end, and the grin's teeth and tongue
// sit inside the mouth just in front of it. Node only (no canvas).
import { test } from "node:test";
import assert from "node:assert/strict";
import { shapeGeometry } from "../../runtime/geometry.js";
import { EYE_BEND, EYE_LINE, TOON_SHAPES, eyeDome } from "../../runtime/toon_face.js";
import { loadCatalog3d } from "../../catalog/index.mjs";

const catalog = loadCatalog3d();
const box = (n) => shapeGeometry(n).boundingBox ?? (shapeGeometry(n).computeBoundingBox(), shapeGeometry(n).boundingBox);
const near = (a, b, eps, what = "") => assert.ok(Math.abs(a - b) < eps, `${what} ${a} != ${b}`);
/** The highest z of a layer near (x, y): which layer is in front there. */
function zAt(name, x, y, r = 0.04) {
  const p = shapeGeometry(name).attributes.position;
  let best = -Infinity;
  for (let i = 0; i < p.count; i++) if (Math.hypot(p.getX(i) - x, p.getY(i) - y) < r) best = Math.max(best, p.getZ(i));
  return best;
}

test("every toon shape builds and is in shapes.json", () => {
  for (const n of Object.keys(TOON_SHAPES)) {
    assert.ok(shapeGeometry(n).attributes.position.count > 20, n);
    assert.ok(catalog.shapes[n]?.description, `${n} in shapes.json`);
  }
});

test("eyeDome: a dome on the lash line, leaning toward the nose (+x)", () => {
  for (const [t, x, y] of [[0, 0.5, EYE_LINE.bottom], [Math.PI, -0.5, EYE_LINE.bottom], [Math.PI / 2, 0.1, EYE_LINE.top]]) {
    const [px, py] = eyeDome(t);
    near(px, x, 1e-9, `x at ${t}`);
    near(py, y, 1e-9, `y at ${t}`);
  }
});

test("eye layers: inside the white's height, the iris toward the nose, the lid lines past the corners", () => {
  const w = box("eye_white");
  near(w.min.y, EYE_LINE.bottom, 0.005, "white bottom");
  near(w.max.y, EYE_LINE.top, 0.01, "white top");
  for (const n of ["eye_rim", "eye_iris", "eye_pupil_low", "eye_pupil", "eye_crescent", "eye_shine"]) {
    const b = box(n);
    assert.ok(b.min.y >= EYE_LINE.bottom - 1e-6 && b.max.y <= EYE_LINE.top + 0.03, `${n} within the eye's height`);
    assert.ok((b.min.x + b.max.x) / 2 > 0.1, `${n} toward the nose`);
  }
  const l = box("eyelid");
  assert.ok(l.min.x < -0.6, "the lower line's tail runs past the outer corner");
  assert.ok(l.max.y > EYE_LINE.top, "the upper line arches over the white");
});

test("eye layers stack front to back: shine, pupil, iris, rim, shade, white; lids on top", () => {
  const order = ["eye_shine", "eye_pupil", "eye_iris", "eye_rim", "eye_white"].map((n) => [n, zAt(n, 0.29, 0.22, 0.03)]);
  // At the big shine every layer is there; each is in front of the next.
  for (let i = 1; i < order.length; i++) assert.ok(order[i - 1][1] > order[i][1], `${order[i - 1][0]} in front of ${order[i][0]}`);
  // Each layer is lifted by its own amount above the white's curve: shade a little, the lids the most.
  const lift = (n) => {
    const p = shapeGeometry(n).attributes.position;
    let lo = Infinity;
    for (let i = 0; i < p.count; i++) lo = Math.min(lo, p.getZ(i) + EYE_BEND * (p.getX(i) ** 2 + p.getY(i) ** 2));
    return lo;
  };
  assert.ok(lift("eye_shade") > 0.004 && lift("eye_shade") < lift("eye_rim"), "shade just over the white, under the iris");
  assert.ok(lift("eyelid") > lift("eye_shine"), "lids over everything");
});

test("eye layers follow the face's curve (EYE_BEND)", () => {
  const p = shapeGeometry("eye_white").attributes.position;
  for (let i = 0; i < p.count; i += 37) near(p.getZ(i), -EYE_BEND * (p.getX(i) ** 2 + p.getY(i) ** 2), 1e-6, `vertex ${i}`);
});

test("brow_thin peaks toward its inner end (+x)", () => {
  const p = shapeGeometry("brow_thin").attributes.position;
  let top = [0, -Infinity];
  for (let i = 0; i < p.count; i++) if (p.getY(i) > top[1]) top = [p.getX(i), p.getY(i)];
  assert.ok(top[0] > 0.02, `peak at x ${top[0]}`);
});

test("grin_wide: about half as tall as wide; teeth and tongue inside it, just in front", () => {
  const g = box("grin_wide"), t = box("grin_wide_teeth"), u = box("grin_wide_tongue");
  near((g.max.y - g.min.y) / (g.max.x - g.min.x), 0.5, 0.08, "proportions");
  for (const [n, b] of [["teeth", t], ["tongue", u]]) {
    assert.ok(b.min.x > g.min.x && b.max.x < g.max.x && b.min.y >= g.min.y - 0.01 && b.max.y < g.max.y, `${n} inside the mouth`);
    assert.ok(b.max.z > g.max.z && b.max.z < g.max.z + 0.04, `${n} just in front`);
  }
  assert.ok(t.min.y > (g.min.y + g.max.y) / 2, "teeth up top");
  assert.ok(u.max.y < 0.1 && u.max.y > g.min.y + 0.25, "the tongue rises to about the middle");
});
