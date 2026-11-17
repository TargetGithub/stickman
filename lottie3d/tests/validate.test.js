import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validate } from "../validate.js";

const base = () => ({
  format: "lottie3d", version: "0.1", duration: 2, fps: 30,
  scene: { background: "#ffffff", camera: { position: [0, 1, 5] } },
  characters: [{ id: "a", rig: "stick", tracks: { hipL: [{ t: 0, v: [0, 0, 0] }, { t: 1, v: [-30, 0, 0] }] } }],
});

test("the bundled examples are valid", () => {
  for (const f of ["wave", "walk", "jump"]) {
    const r = validate(readFileSync(new URL(`../examples/${f}.json`, import.meta.url), "utf8"));
    assert.deepEqual(r.errors, [], f);
  }
});

const cases = [
  ["bad JSON text", () => "{ nope", "", "E_JSON"],
  ["wrong format", (d) => { d.format = "lottie"; }, "format", "E_FORMAT"],
  ["wrong version", (d) => { d.version = "2"; }, "version", "E_VERSION"],
  ["missing duration", (d) => { delete d.duration; }, "duration", "E_REQUIRED"],
  ["zero duration", (d) => { d.duration = 0; }, "duration", "E_RANGE"],
  ["fractional fps", (d) => { d.fps = 29.97; }, "fps", "E_TYPE"],
  ["typo at top level", (d) => { d.durration = 2; }, "durration", "E_UNKNOWN_KEY"],
  ["bad background color", (d) => { d.scene.background = "blue"; }, "scene.background", "E_TYPE"],
  ["camera vec2", (d) => { d.scene.camera.position = [0, 1]; }, "scene.camera.position", "E_TYPE"],
  ["unknown light", (d) => { d.scene.lights = [{ type: "laser" }]; }, "scene.lights[0].type", "E_ENUM"],
  ["unknown rig", (d) => { d.characters[0].rig = "robot"; }, "characters[0].rig", "E_ENUM"],
  ["unknown joint", (d) => { d.characters[0].tracks.wrist = [{ t: 0, v: [0, 0, 0] }]; }, "characters[0].tracks.wrist", "E_ENUM"],
  ["keys out of order", (d) => { d.characters[0].tracks.hipL[1].t = 0; }, "characters[0].tracks.hipL[1].t", "E_KEY_ORDER"],
  ["key past duration", (d) => { d.characters[0].tracks.hipL[1].t = 3; }, "characters[0].tracks.hipL[1].t", "E_RANGE"],
  ["unknown ease", (d) => { d.characters[0].tracks.hipL[0].ease = "wobble"; }, "characters[0].tracks.hipL[0].ease", "E_ENUM"],
  ["bad bezier", (d) => { d.characters[0].tracks.hipL[0].ease = [2, 0, 0.5, 1]; }, "characters[0].tracks.hipL[0].ease", "E_RANGE"],
  ["empty track", (d) => { d.characters[0].tracks.hipL = []; }, "characters[0].tracks.hipL", "E_EMPTY"],
  ["scalar joint value", (d) => { d.characters[0].tracks.hipL[0].v = 10; }, "characters[0].tracks.hipL[0].v", "E_TYPE"],
  ["duplicate id", (d) => { d.props = [{ id: "a", type: "box" }]; }, "props[0].id", "E_DUP_ID"],
  ["unknown prop", (d) => { d.props = [{ id: "p", type: "teapot" }]; }, "props[0].type", "E_ENUM"],
  ["repeat with zero period", (d) => { d.characters[0].tracks.hipR = { repeat: true, keys: [{ t: 0, v: [0, 0, 0] }] }; }, "characters[0].tracks.hipR.keys", "E_RANGE"],
];

for (const [name, mutate, path, code] of cases) {
  test(`rejects ${name}`, () => {
    const d = base();
    const input = mutate(d) ?? d;
    const r = validate(input);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.path === path && e.code === code), JSON.stringify(r.errors));
  });
}

test("accepts the minimal document", () => {
  assert.deepEqual(validate(base()).errors, []);
});
