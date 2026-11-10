import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { compileScript } from "../../runtime/compile.js";
import { validateScript } from "../../runtime/validate.js";
import { splitOffsets } from "../../runtime/start_pose.js";

const catalog = loadCatalog3d();
const tour = () => JSON.parse(readFileSync(new URL("../../scripts/tour/start_pose.json", import.meta.url), "utf8"));

test("start pose: parts and a split word begin moved, and a later action moves on from there", () => {
  const s = tour();
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const tl = compileScript(s, { catalog }).timeline;
  assert.deepEqual(tl.valueAt("mach#lever", "rotation", 0), [0, 0, -45]);
  assert.deepEqual(tl.valueAt("cur#curtain", "position", 0), [0, 1.6, 0]);
  const dx = tl.valueAt("w#c3", "position", 0)[0];
  assert.ok(dx > 0.2 && tl.valueAt("w#c2", "position", 0)[0] === 0, "ble starts a gap right of ca");
  assert.deepEqual(tl.valueAt("w#c3", "position", 2.4), [0, 0, 0], "the join at 1 s closes it");
  assert.deepEqual(tl.valueAt("w#c1", "scale", 0), [1, 1, 1]);
});

const bad = [
  { o: { kind: "prop", model: "word_machine", pose: { nope: { rotation: [0, 0, 1] } } }, path: "pose.nope", code: "E3D_PART" },
  { o: { kind: "prop", model: "word_machine", pose: { lever: { rotation: [0, 1] } } }, path: "pose.lever.rotation", code: "E3D_POSE" },
  { o: { kind: "prop", model: "word_machine", pose: { lever: { scale: [1, 1, 1] } } }, path: "pose.lever.scale", code: "E3D_POSE" },
  { o: { kind: "letter", text: "cab", split: [3] }, path: "split", code: "E3D_POSE" },
  { o: { kind: "shape", shape: "cube", pose: {} }, path: "pose", code: "E3D_POSE" },
  { o: { kind: "shape", shape: "cube", split: [1] }, path: "split", code: "E3D_POSE" },
];
for (const b of bad) {
  test(`start pose error at ${b.path} (${b.o.kind})`, () => {
    const s = tour();
    s.objects = [{ id: "x", ...b.o }];
    s.scenes[0].beats[0].do = [];
    assert.ok(validateScript(s, catalog).errors.some((e) => e.code === b.code && e.path === `objects[0].${b.path}`), JSON.stringify(validateScript(s, catalog).errors));
  });
}

test("splitOffsets: characters after each cut slide one gap per cut", () => {
  const { dx } = splitOffsets({ id: "w", text: "basket", size: 1 }, catalog.fontMetrics, [3, 1], 0.5);
  assert.deepEqual([...dx.values()], [0, 0.5, 0.5, 1, 1, 1]);
  assert.throws(() => splitOffsets({ id: "w", text: "ab" }, catalog.fontMetrics, [2]));
});
