// Doopi season 2 engine pieces: the wisp body, echoing lines, the whisper voice and the new shapes, layer kinds
// and accessories (each table-driven; the feeling clouds have their own file, cloud.test.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { wispFrame, lighten } from "../../engine/renderer/wisp.js";
import { echoesAt, echoWords, ECHO_DELAY } from "../../engine/renderer/echo_text.js";
import { OBJECT_SHAPES } from "../../engine/renderer/objects.js";
import { PROP_SHAPES } from "../../engine/renderer/props.js";
import { LAYER_KINDS } from "../../engine/renderer/background.js";
import { postFilters } from "../../tools/lib/tts/piper.mjs";
import { loadVoiceTable } from "../../tools/lib/tts/index.mjs";
import { resolveVoice } from "../../tools/lib/tts/lines.mjs";
import { speechClips, ECHO_DELAY as MIX_DELAY, ECHO_GAIN } from "../../tools/lib/tts/synth.mjs";
import { validate } from "../../engine/index.js";
import { catalog } from "../../catalog/index.js";

const joints = (hipY = 600) => ({
  head: { x: 100, y: hipY - 110 }, neckTop: { x: 100, y: hipY - 90 }, hip: { x: 100, y: hipY },
  lFoot: { x: 90, y: hipY + 100 }, rFoot: { x: 110, y: hipY + 100 },
});

const WISP = [
  ["floats above the feet", { scale: 1, facing: 1, time: 0, id: "hush" }],
  ["at another time it bobs but still floats", { scale: 1, facing: 1, time: 1.3, id: "hush" }],
  ["a big storm wisp", { scale: 3, facing: -1, time: 0.5, id: "storm" }],
];
for (const [name, s] of WISP) {
  test(`wispFrame: ${name}`, () => {
    const j = joints();
    const w = wispFrame(j, s);
    assert.ok(w.lift > 0, "lifted");
    assert.ok(w.head.y < j.head.y, "the head is above the skeleton's head");
    assert.ok(w.tip.y > w.hip.y && w.tip.y < j.lFoot.y, "the tail hangs below the hip, above the floor");
    assert.ok(Math.abs(w.r - 26 * s.scale) < 1e-9);
  });
}

test("wispFrame is deterministic", () => assert.deepEqual(wispFrame(joints(), { scale: 1, facing: 1, time: 2, id: "a" }), wispFrame(joints(), { scale: 1, facing: 1, time: 2, id: "a" })));

const LIGHTEN = [["#000000", 0, "rgb(0, 0, 0)"], ["#000000", 1, "rgb(255, 255, 255)"], ["#804020", 0.5, "rgb(192, 160, 144)"]];
for (const [hex, k, want] of LIGHTEN) test(`lighten(${hex}, ${k})`, () => assert.equal(lighten(hex, k), want));

const say = (videoT, echo, text = "I am getting better!") => ({ type: "say", actor: "peepa", text, videoT, echo });
const ECHOES = [
  ["no echo field", [say(1, undefined)], 2, 0],
  ["before the first echo", [say(1, 2)], 1.5, 0],
  ["the first echo", [say(1, 2)], 1 + ECHO_DELAY + 0.1, 1],
  ["both echoes", [say(1, 2)], 1 + 2 * ECHO_DELAY + 0.1, 2],
  ["long gone", [say(1, 3)], 10, 0],
];
for (const [name, says, t, n] of ECHOES) test(`echoesAt: ${name}`, () => assert.equal(echoesAt(says, t).length, n));

const WORDS = [
  ["I am getting better!", 1, "am getting better..."],
  ["I am getting better!", 2, "getting better..."],
  ["I am getting better!", 3, "better..."],
  ["Hello", 1, "Hello..."],
];
for (const [text, k, want] of WORDS) test(`echoWords(${JSON.stringify(text)}, ${k})`, () => assert.equal(echoWords(text, k), want));

test("the mix echo timing matches the drawn echoes", () => assert.equal(MIX_DELAY, ECHO_DELAY));

test("speechClips adds fainter echo clips after an echoing line", () => {
  const clips = speechClips([{ id: "b1", key: "k1", echo: 2 }], [{ type: "say", beatId: "b1", videoT: 3 }]);
  assert.deepEqual(clips.get("b1"), { t: 3, sfx: "tts:k1", volume: 1 });
  assert.deepEqual(clips.get("b1#echo1"), { t: 3 + MIX_DELAY, sfx: "tts:k1", volume: ECHO_GAIN });
  assert.ok(Math.abs(clips.get("b1#echo2").volume - ECHO_GAIN ** 2) < 1e-12);
  assert.equal(clips.size, 3);
});

const FILTERS = [
  ["whisper", { pitch: 0, filter: "whisper" }, /afftfilt.*amix.*aecho/],
  ["robot still rings", { pitch: 0, filter: "robot" }, /aeval/],
];
for (const [name, voice, re] of FILTERS) test(`postFilters: ${name}`, () => assert.match(postFilters(22050, voice, "speech"), re));

test("resolveVoice takes a cast's tts.filter", () => {
  const v = resolveVoice({ timbre: "soft", pitch: 1.3, speed: 0.85, tts: { model: "en_US-kristin-medium", filter: "whisper" } }, loadVoiceTable());
  assert.equal(v.filter, "whisper");
});

const NAMES = [
  [OBJECT_SHAPES(), ["desert_well", "tower_clock", "carrom_board", "stone_door", "banyan_crack", "paper_boat", "tiffin_stack"]],
  [PROP_SHAPES, ["flute", "leaf", "jar", "tiffin", "radar"]],
  [LAYER_KINDS, ["clock_window", "stands", "scoreboard", "pines", "ice_river"]],
];
for (const [have, want] of NAMES) test(`renderer knows ${want.join(", ")}`, () => { for (const n of want) assert.ok(have.includes(n), n); });

const base = (beat, cast = [{ id: "kai", color: "#3fd8ff" }]) => ({
  version: 2,
  meta: { title: "S2", format: "landscape", seed: 3, kind: "clip", audience: "kids" },
  cast,
  locations: [{ id: "park", theme: "city_park" }],
  scenes: [{ id: "one", location: "park", cast: [{ id: cast[0].id, x: 1500, facing: 1 }], beats: [beat, { id: "w", at: 0.2, who: cast[0].id, do: "wait", params: { seconds: 4 } }] }],
});
const VALID = [
  ["an echoing line", base({ id: "a", at: 0.3, who: "kai", do: "talk", say: "Hello!", echo: 2 }), true],
  ["echo 4 is too many", base({ id: "a", at: 0.3, who: "kai", do: "talk", say: "Hello!", echo: 4 }), false],
  ["a wisp cast member", base({ id: "a", at: 0.3, who: "hush", do: "wave" }, [{ id: "hush", body: "wisp", color: "#c4a3ff" }]), true],
  ["a whisper voice", base({ id: "a", at: 0.3, who: "kai", do: "wave" }, [{ id: "kai", color: "#3fd8ff", voice: { tts: { filter: "whisper" } } }]), true],
  ["roller skates", base({ id: "a", at: 0.3, who: "kai", do: "skate", to: { x: 1900 } }, [{ id: "kai", color: "#3fd8ff", appearance: { accessories: { skates: "#d62828" } } }]), true],
];
for (const [name, script, ok] of VALID) test(`validate: ${name}`, () => assert.equal(validate(script, catalog).ok, ok, JSON.stringify(validate(script, catalog).errors)));
