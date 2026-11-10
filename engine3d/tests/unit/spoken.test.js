import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeSpoken } from "../../runtime/spoken.js";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { compileScript } from "../../runtime/compile.js";
import { validateScript } from "../../runtime/validate.js";

const cases = [
  ["[[ kˈeɪ ]], [[ bəl ]]: cable!", "[[ kˈeɪ, ]] [[ bəl, ]] cable!"],
  ["[[ kˈeɪ ]]. [[ bəl ]]. Cable!", "[[ kˈeɪ. ]] [[ bəl. ]] Cable!"],
  ["Say [[ kˈeɪ ]] and [[ bəl ]].", "Say [[ kˈeɪ ]] and [[ bəl. ]]"],
  ["[[ bəl ]]!", "[[ bəl. ]]"],
  ["kay bull", "kay bull"],
  ["[[ kˈeɪ ]]-shaped", "[[ kˈeɪ ]] -shaped"],
];
for (const [inp, want] of cases) test(`normalizeSpoken ${inp}`, () => assert.equal(normalizeSpoken(inp), want));

const catalog = loadCatalog3d();
test("say spoken: the voice reads spoken, the caption shows text", () => {
  const s = JSON.parse(readFileSync(new URL("../../scripts/tour/say_spoken.json", import.meta.url), "utf8"));
  assert.deepEqual(validateScript(s, catalog).errors, []);
  const plan = compileScript(s, { catalog });
  assert.equal(plan.lines[0].text, "ca");
  assert.equal(plan.lines[0].spoken, "[[ kˈeɪ ]]");
  assert.ok(plan.captions.some((c) => c.text === "ca"));
});

for (const [spoken, ok] of [["[[ bəl ]]", true], ["[[ bəl", false], ["[[ [[ bəl ]] ]]", false], ["[[ ]]", false], ["", false]]) {
  test(`say spoken validation ${JSON.stringify(spoken)}`, () => {
    const s = { kind: "video3d", version: 1, scenes: [{ id: "a", beats: [{ dur: 1, do: [{ do: "say", text: "ble", spoken }] }] }] };
    assert.equal(validateScript(s, catalog).errors.some((e) => e.code === "E3D_SPOKEN"), !ok);
  });
}

test("#56 a spoken line that is only an IPA block reaches Piper (no null)", async () => {
  const { forPiper } = await import("../../tools/lib/audio3d.mjs");
  assert.equal(forPiper("[[ ə ]]"), "[[ ə ]].");
  assert.equal(forPiper("[[ ə ]]!"), "[[ ə. ]].");
  assert.equal(forPiper("uh"), "uh.");
  assert.equal(forPiper("[[ kˈeɪ ]], cable"), "[[ kˈeɪ, ]] cable.");
});
