// look, shot and orbit: closed-form camera framing, head angles and arcs (no canvas).
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { ASPECT, FRAMING, frameBox, orbitPoint } from "../../runtime/camera_moves.js";
import { lookAngles, LOOK_LIMITS } from "../../runtime/look.js";
import { localBounds } from "../../runtime/bounds.js";
import { compileScript } from "../../runtime/compile.js";
import { validateScript } from "../../runtime/validate.js";

const catalog = loadCatalog3d();
const DEG = Math.PI / 180;
const close = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

/** Project a point with a pinhole camera (three.js conventions: vertical fov, looking at lookAt, up +y). */
function project(p, { position, lookAt }, fov = 40) {
  const f = lookAt.map((x, i) => x - position[i]);
  const n = Math.hypot(...f);
  const fw = f.map((x) => x / n);
  let r = [fw[1] * 0 - fw[2] * 1, fw[2] * 0 - fw[0] * 0, fw[0] * 1 - fw[1] * 0]; // forward × up
  const rn = Math.hypot(...r);
  r = r.map((x) => x / rn);
  const u = [r[1] * fw[2] - r[2] * fw[1], r[2] * fw[0] - r[0] * fw[2], r[0] * fw[1] - r[1] * fw[0]];
  const q = p.map((x, i) => x - position[i]);
  const z = q[0] * fw[0] + q[1] * fw[1] + q[2] * fw[2];
  const t = Math.tan((fov * DEG) / 2);
  return [(q[0] * r[0] + q[1] * r[1] + q[2] * r[2]) / (z * t * ASPECT), (q[0] * u[0] + q[1] * u[1] + q[2] * u[2]) / (z * t)];
}

const corners = (b) => [b.min[0], b.max[0]].flatMap((x) => [b.min[1], b.max[1]].flatMap((y) => [b.min[2], b.max[2]].map((z) => [x, y, z])));

const BOXES = {
  duck: { min: [-0.5, 0, -0.5], max: [0.5, 1.3, 0.6] },
  row: { min: [-3.2, 0, 0.1], max: [3.0, 1.6, 0.9] },
  tall: { min: [-0.3, 0, -0.3], max: [0.3, 3, 0.3] },
  far: { min: [4, 0.5, -6], max: [6, 2, -4] },
};

for (const [name, box] of Object.entries(BOXES)) {
  for (const framing of Object.keys(FRAMING)) {
    for (const [yaw, height] of [[0, 8], [35, 15], [-80, 3], [180, 30]]) {
      test(`shot frames ${name} ${framing} yaw ${yaw} height ${height} without cropping`, () => {
        const f = frameBox(box, { framing, yaw, height, fov: 40 });
        let [x, y] = [0, 0];
        for (const c of corners(box)) {
          const [px, py] = project(c, f);
          assert.ok(Math.abs(px) <= 0.995 && Math.abs(py) <= 0.995, `corner ${c} lands at ${px.toFixed(3)}, ${py.toFixed(3)}`);
          x = Math.max(x, Math.abs(px));
          y = Math.max(y, Math.abs(py));
        }
        // It fills about its share of the frame on the tighter side (not lost in a corner); a deep box seen
        // end-on fills less, because its near corners need the room.
        assert.ok(Math.max(x, y) > FRAMING[framing] * 0.7, `fills only ${Math.max(x, y).toFixed(2)}`);
        assert.ok(f.position[1] >= 0.25, "never under the floor");
      });
    }
  }
}

test("framings get tighter from wide to close", () => {
  const d = Object.keys(FRAMING).map((k) => frameBox(BOXES.duck, { framing: k }).distance);
  assert.ok(d[0] > d[1] && d[1] > d[2], d.join(" > "));
});

const LOOKS = [
  // eye, point, body yaw, kind → [yaw, pitch]
  { eye: [0, 1, 0], point: [0, 1, 5], body: 0, want: [0, 0] },
  { eye: [0, 1, 0], point: [5, 1, 5], body: 0, want: [45, 0] },
  { eye: [0, 1, 0], point: [-5, 1, 5], body: 0, want: [-45, 0] },
  { eye: [0, 1, 0], point: [5, 1, 5], body: 45, want: [0, 0] },
  { eye: [0, 1, 0], point: [0, 0, 1], body: 0, want: [30, 30], kind: "critter", pitchOnly: true },
  { eye: [0, 1, 0], point: [-5, 1, -0.1], body: 0, want: [-LOOK_LIMITS.critter[0], 0] },
  { eye: [0, 1, 0], point: [0, 9, 1], body: 0, want: [0, -LOOK_LIMITS.character[2]], kind: "character" },
  { eye: [0, 1, 0], point: [5, 1, 0], body: 170, want: [-LOOK_LIMITS.critter[0], 0] },
];
for (const [i, c] of LOOKS.entries()) {
  test(`lookAngles case ${i + 1}`, () => {
    const [yaw, pitch] = lookAngles(c.eye, c.point, c.body, c.kind);
    if (c.pitchOnly) return close(pitch, LOOK_LIMITS.critter[1], 1e-6);
    close(yaw, c.want[0], 0.01);
    close(pitch, c.want[1], 0.01);
  });
}

const ORBITS = [
  { from: [0, 2, 10], around: [0, 1, 0], k: 0, o: { degrees: 90 }, want: [0, 2, 10] },
  { from: [0, 2, 10], around: [0, 1, 0], k: 1, o: { degrees: 90 }, want: [10, 2, 0] },
  { from: [0, 2, 10], around: [0, 1, 0], k: 0.5, o: { degrees: 180 }, want: [10, 2, 0] },
  { from: [0, 2, 10], around: [0, 1, 0], k: 1, o: { degrees: -90, radius: 5, height: 3 }, want: [-5, 4, 0] },
  { from: [3, 1, 4], around: [0, 1, 0], k: 1, o: { degrees: 360 }, want: [3, 1, 4] },
];
for (const [i, c] of ORBITS.entries()) {
  test(`orbitPoint case ${i + 1}`, () => {
    const p = orbitPoint(c.from, c.around, c.k, c.o);
    p.forEach((x, j) => close(x, c.want[j], 1e-6));
  });
}

test("an orbit keeps its distance from the point all the way round", () => {
  for (let k = 0; k <= 1; k += 0.05) {
    const p = orbitPoint([1, 2, 6], [1, 0.5, 1], k, { degrees: 120 });
    close(Math.hypot(p[0] - 1, p[2] - 1), 5, 1e-9);
    close(p[1], 2, 1e-9);
  }
});

const script = (beats, extra = {}) => ({
  kind: "video3d", version: 1, stage: { preset: "studio" },
  camera: { position: [0, 2, 10], lookAt: [0, 1, 0], fov: 40 },
  objects: [
    { id: "duck", kind: "critter", species: "duck", at: [-1, 0, 0] },
    { id: "robo", kind: "character", character: "robot", at: [2, 0, 0] },
    { id: "ball", kind: "shape", shape: "sphere", at: [0, 0, 2], size: 0.5 },
  ],
  scenes: [{ id: "s", beats }],
  ...extra,
});

test("shot in a script moves the camera to the framing of its targets", () => {
  const s = script([{ dur: 3, do: [{ do: "shot", target: ["duck", "robo"], framing: "medium", yaw: 20, dur: 1 }] }]);
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  const at = (id) => s.objects.find((o) => o.id === id).at;
  const boxes = ["duck", "robo"].map((id) => {
    const b = localBounds(s.objects.find((o) => o.id === id), catalog);
    return { min: b.min.map((x, i) => x + at(id)[i]), max: b.max.map((x, i) => x + at(id)[i]) };
  });
  const box = { min: [0, 1, 2].map((i) => Math.min(...boxes.map((b) => b.min[i]))), max: [0, 1, 2].map((i) => Math.max(...boxes.map((b) => b.max[i]))) };
  const f = frameBox(box, { framing: "medium", yaw: 20 });
  assert.deepEqual(plan.timeline.valueAt("camera", "position", 1), f.position);
  assert.deepEqual(plan.timeline.valueAt("camera", "lookAt", 1), f.lookAt);
  assert.deepEqual(plan.timeline.valueAt("camera", "position", 0), [0, 2, 10]);
});

test("orbit starts where the camera is, and a later camera move takes over", () => {
  const s = script([
    { dur: 4, do: [{ do: "orbit", around: [0, 1, 0], degrees: 90, dur: 4 }] },
    { dur: 2, do: [{ do: "camera", position: [0, 3, 8], dur: 1 }] },
  ]);
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  const tl = plan.timeline;
  tl.valueAt("camera", "position", 0).forEach((x, i) => close(x, [0, 2, 10][i]));
  tl.valueAt("camera", "position", 4).forEach((x, i) => close(x, [10, 2, 0][i]));
  // Midway the camera is on the arc (same distance from the axis), not cutting across it.
  const mid = tl.valueAt("camera", "position", 2);
  close(Math.hypot(mid[0], mid[2]), 10);
  tl.valueAt("camera", "lookAt", 4).forEach((x, i) => close(x, [0, 1, 0][i]));
  tl.valueAt("camera", "position", 5).forEach((x, i) => close(x, [0, 3, 8][i]));
});

test("look turns a head toward an object and holds until the next look", () => {
  const s = script([
    { dur: 2, do: [{ do: "look", target: "duck", at: "robo", dur: 0.5 }] },
    { dur: 2, do: [{ do: "look", target: "duck", to: [-1, 1, 5], at: 0.5, dur: 0.5 }, { do: "look", target: "robo", at: "duck" }] },
    { dur: 1, do: [{ do: "look", target: "duck", at: "ahead" }] },
  ]);
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const tl = compileScript(s, { catalog }).timeline;
  assert.deepEqual(tl.valueAt("duck", "look", 0), [0, 0]);
  const toRobo = tl.valueAt("duck", "look", 1.9);
  assert.ok(toRobo[0] > 60, `duck turns right toward Robo: ${toRobo}`);
  assert.deepEqual(tl.valueAt("duck", "look", 2.4), toRobo, "holds until the next look starts");
  const front = tl.valueAt("duck", "look", 3.5);
  close(front[0], 0, 0.01);
  close(tl.valueAt("robo", "look", 3.9)[0], -LOOK_LIMITS.character[0], 1e-6); // the duck is right beside him: as far as he turns
  assert.deepEqual(tl.valueAt("duck", "look", 5), [0, 0]);
});

test("scripts without look, shot or orbit get no look props", () => {
  const plan = compileScript(script([{ dur: 1, do: [{ do: "hop", target: "duck" }] }]), { catalog });
  assert.equal(plan.timeline.valueAt("duck", "look", 0.5), undefined);
});

test("bounds: Robo, critters and shapes stand on the floor with sensible sizes", () => {
  const robo = localBounds({ kind: "character", character: "robot" }, catalog);
  close(robo.max[1], 1.6 * 1.04, 0.01);
  const duck = localBounds({ kind: "critter", species: "duck", size: 2 }, catalog);
  assert.ok(duck.min[1] >= 0 && duck.max[1] > 2 && duck.max[1] < 3, JSON.stringify(duck));
  const star = localBounds({ kind: "shape", shape: "star", size: 1 }, catalog);
  assert.ok(star.max[2] < 0.2, "flat shapes are thin");
});
