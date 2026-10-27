import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validate } from "../../engine/index.js";
import { catalog } from "../../catalog/index.js";
import { shortScript, sceneSpans, shortCandidates, SHORT_PACE } from "../../tools/lib/shorts.mjs";

const ep01 = JSON.parse(readFileSync(new URL("../../scripts/series/doopi/ep01_v3.json", import.meta.url), "utf8"));

test("shortScript: chosen scenes in portrait with the Shorts pace and an end card; the episode is untouched", () => {
  const before = JSON.stringify(ep01);
  const s = shortScript(ep01, ["market"]);
  assert.equal(s.meta.format, "portrait");
  assert.match(s.meta.title, /\(Short\)$/);
  assert.deepEqual(s.scenes.map((x) => x.id), ["market", "short_end"]);
  assert.equal(s.scenes[0].transitionIn, undefined, "a Short starts on its scene");
  assert.deepEqual({ framing: s.pace.framing, establish: s.pace.establish }, { framing: SHORT_PACE.framing, establish: SHORT_PACE.establish });
  assert.equal(s.scenes[1].beats[0].do, "end_card");
  assert.equal(JSON.stringify(ep01), before);
  const r = validate(s, catalog);
  assert.ok(r.ok, r.errors.map((e) => `${e.code} ${e.path}`).join(", "));
});

test("shortScript drops what names a scene it leaves out (layers, their text, audio tracks)", () => {
  const s = shortScript(ep01, ["race"], { end: null });
  assert.deepEqual(s.scenes.map((x) => x.id), ["race"], "no end card with end: null");
  assert.equal(s.layers, undefined, "the 'To be continued' layer belongs to another scene");
  assert.equal(s.text, undefined);
  assert.ok(s.audio.tracks.every((t) => t.scene === undefined || t.scene === "race"));
  assert.ok(validate(s, catalog).ok);
  const keep = shortScript(ep01, ["horns"], { end: null });
  assert.equal(keep.layers.length, 1, "a scene's own layer stays");
  assert.equal(keep.text.length, 1);
});

test("shortScript refuses unknown scenes and the title card", () => {
  assert.throws(() => shortScript(ep01, ["nope"]), /no scene nope/);
  assert.throws(() => shortScript(ep01, ["intro"]), /template scene/);
});

test("sceneSpans sums a macro's expanded scenes and counts spoken lines (not thoughts)", () => {
  const script = { scenes: [{ id: "intro", use: {} }, { id: "chores", macro: "x" }, { id: "talk" }] };
  const played = [
    { id: "intro", startT: 0, endT: 6 },
    { id: "chores_c1", startT: 6, endT: 10 },
    { id: "chores_c2", startT: 10, endT: 14 },
    { id: "talk", startT: 14, endT: 40 },
  ];
  const ev = [
    { type: "say", actor: "a", videoT: 7 },
    { type: "say", actor: "a", videoT: 15 },
    { type: "say", actor: "b", videoT: 16, bubble: "think" },
    { type: "say", actor: "b", videoT: 20 },
  ];
  const sp = sceneSpans(script, played, ev);
  assert.deepEqual(sp.map((s) => [s.id, s.dur, s.lines, s.template]), [["intro", 6, 0, true], ["chores", 8, 1, false], ["talk", 26, 2, false]]);
});

test("shortCandidates: 15-60 s with two or more lines, best first, never sharing a scene, never the title card", () => {
  const span = (id, dur, lines, template = false) => ({ id, dur, lines, template });
  const c = shortCandidates([span("intro", 7, 0, true), span("a", 10, 2), span("b", 40, 12), span("c", 70, 20), span("d", 12, 1), span("e", 9, 3)]);
  // b (40 s, 12 lines) beats a+b (50 s, 14); a+b then shares b; d+e (21 s, 4) is next; c is too long, a and e too short.
  assert.deepEqual(c.map((x) => x.ids), [["b"], ["d", "e"]]);
});

test("every scene of an episode makes a valid Short (the end card stands on the plain stage)", () => {
  for (const s of ep01.scenes.filter((x) => !x.use)) {
    const r = validate(shortScript(ep01, [s.id]), catalog);
    assert.ok(r.ok, `${s.id}: ${r.errors.map((e) => `${e.code} ${e.path}`).join(", ")}`);
  }
});
