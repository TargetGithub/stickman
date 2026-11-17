import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validate } from "../validate.js";

const catalog = JSON.parse(readFileSync(new URL("../catalog/kids.json", import.meta.url), "utf8"));
const base = () => ({
  format: "lottie3d", version: "0.2", duration: 6, fps: 30, stage: "garden",
  cast: [{ id: "duck", kind: "critter", name: "duck", at: [0, 0] }, { id: "robo", kind: "character", name: "robot", at: [1, 0] }],
  timeline: [{ who: "duck", at: 0, do: "hop" }, { who: "robo", at: 0, do: "wave" }],
});

test("the minimal v0.2 document is valid, with and without the catalog", () => {
  assert.deepEqual(validate(base(), { catalog }).errors, []);
  assert.deepEqual(validate(base()).errors, []);
});

const cases = [
  ["no stage or scene", (d) => { delete d.stage; }, "stage", "E_REQUIRED"],
  ["stage and scene together", (d) => { d.scene = { background: "#fff", camera: { position: [0, 1, 5] } }; }, "stage", "E_CONFLICT"],
  ["unknown stage", (d) => { d.stage = "moon"; }, "stage", "E_ENUM"],
  ["v0.2 keys in a v0.1 file", (d) => { d.version = "0.1"; }, "cast", "E_UNKNOWN_KEY"],
  ["unknown model", (d) => { d.cast[0].name = "dragon"; }, "cast[0].name", "E_ENUM"],
  ["kind that does not match the model", (d) => { d.cast[0].kind = "prop"; }, "cast[0].kind", "E_ENUM"],
  ["at that is not on the floor", (d) => { d.cast[0].at = [1]; }, "cast[0].at", "E_TYPE"],
  ["duplicate cast id", (d) => { d.cast[1].id = "duck"; }, "cast[1].id", "E_DUP_ID"],
  ["camera as a cast id", (d) => { d.cast[1].id = "camera"; }, "cast[1].id", "E_TYPE"],
  ["block for someone not in the cast", (d) => { d.timeline[0].who = "cat"; }, "timeline[0].who", "E_REF"],
  ["unknown move", (d) => { d.timeline[0].do = "fly"; }, "timeline[0].do", "E_ENUM"],
  ["a duck can't wave", (d) => { d.timeline[0].do = "wave"; }, "timeline[0].do", "E_CAPS"],
  ["a camera move on a cast member", (d) => { d.timeline[0].do = "wide"; }, "timeline[0].do", "E_CAPS"],
  ["a cast move on the camera", (d) => { d.timeline.push({ who: "camera", at: 0, do: "hop" }); }, "timeline[2].do", "E_CAPS"],
  ["overlapping blocks in one row", (d) => { d.timeline.push({ who: "duck", at: 0.3, do: "spin" }); }, "timeline[2].at", "E_OVERLAP"],
  ["a block past the end", (d) => { d.timeline[0].at = 5.8; }, "timeline[0].dur", "E_RANGE"],
  ["an option the move does not have", (d) => { d.timeline[0].with = { speed: 2 }; }, "timeline[0].with.speed", "E_UNKNOWN_KEY"],
  ["an option out of range", (d) => { d.timeline[0].with = { height: 99 }; }, "timeline[0].with.height", "E_RANGE"],
  ["a missing required option", (d) => { d.timeline[0].do = "walk_to"; }, "timeline[0].with.to", "E_REQUIRED"],
  ["a word not in the word list", (d) => { d.timeline[0] = { who: "duck", at: 0, do: "say", with: { words: ["supercalifragilistic"] } }; }, "timeline[0].with.words[0]", "E_ENUM"],
  ["looking at yourself", (d) => { d.timeline[0] = { who: "duck", at: 0, do: "look_at", with: { target: "duck" } }; }, "timeline[0].with.target", "E_REF"],
  ["a clip the character does not have", (d) => { d.timeline[1] = { who: "robo", at: 0, do: "clip", with: { name: "Fly" } }; }, "timeline[1].with.name", "E_ENUM"],
  ["a pose that is not defined", (d) => { d.cast.push({ id: "kid", kind: "rig", name: "stick", at: [2, 0] }); d.timeline.push({ who: "kid", at: 0, do: "pose", with: { name: "star" } }); }, "timeline[2].with.name", "E_REF"],
  ["a pose with an unknown joint", (d) => { d.poses = { star: { joints: { wrist: [0, 0, 0] } } }; }, "poses.star.joints.wrist", "E_ENUM"],
];

for (const [name, mutate, path, code] of cases) {
  test(`v0.2 rejects ${name}`, () => {
    const d = base();
    mutate(d);
    const r = validate(d, { catalog });
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.path === path && e.code === code), JSON.stringify(r.errors));
  });
}
