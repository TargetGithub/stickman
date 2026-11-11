import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { VOICE_STYLES, stressSpan, voiceStyleErrors } from "../../runtime/voice_style.js";
import { liftCurve, voicedRange } from "../../tools/lib/speech_stress.mjs";
import { validateScript } from "../../runtime/validate.js";
import { compileScript } from "../../runtime/compile.js";

const cases = [
  { a: { text: "We won!", style: "shout" }, errs: [] },
  { a: { text: "We won!", style: "sad" }, errs: [] },
  { a: { text: "We won!", style: "sing" }, errs: ["style"] },
  { a: { text: "I did not say she took it.", stress: "she" }, errs: [] },
  { a: { text: "I did not say she took it.", stress: "he" }, errs: ["stress"] },
  { a: { text: "I did not say she took it.", stress: "she took" }, errs: ["stress"] },
];
for (const c of cases) test(`voice style check: ${JSON.stringify(c.a).slice(0, 60)}`, () => assert.deepEqual(voiceStyleErrors(c.a).map((e) => e[0]), c.errs));

test("styles change the bubble and tone; stress spans sit where the word is", () => {
  assert.equal(VOICE_STYLES.whisper.bubble, "whisper");
  assert.ok(VOICE_STYLES.groan.tone.rate < 1 && VOICE_STYLES.groan.tone.pitch < 0);
  const [a, b] = stressSpan("I did not say she took it.", "she");
  assert.ok(a > 0.4 && b < 0.75 && b - a > 0.1, `${a} ${b}`);
  assert.equal(stressSpan("hello", "bye"), null);
});

test("the lift is 0 outside the word, 1 inside, eased between", () => {
  const sr = 1000;
  const x = new Float32Array(2000);
  for (let i = 200; i < 1800; i++) x[i] = Math.sin(i / 3) * 0.5;
  const [v0, v1] = voicedRange(x, sr);
  assert.ok(v0 >= 190 && v0 <= 210 && v1 >= 1790 && v1 <= 1810);
  const k = liftCurve(x, sr, "one two three four", "three");
  const mid = Math.round(v0 + 0.6 * (v1 - v0));
  assert.equal(k(mid), 1);
  assert.equal(k(250), 0);
  assert.ok(k(mid - 300) >= 0 && k(mid - 300) <= 1);
});

test("say style and stress validate and reach the plan's lines", () => {
  const catalog = loadCatalog3d();
  const s = JSON.parse(readFileSync(new URL("../../scripts/tour/voice_styles.json", import.meta.url), "utf8"));
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const lines = compileScript(s, { catalog }).lines;
  assert.deepEqual(lines.map((l) => l.style ?? l.stress), ["whisper", "shout", "groan", "sad", "she"]);
});
