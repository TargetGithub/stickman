// Tight story framing (V3.9, ADR-033): in version 3 scripts the story auto camera frames the characters who spoke
// or moved lately (a lone one with its nearest neighbour) instead of the whole cast; v2 keeps the follow-all.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createStoryAuto, storyAutoEvent, storyAutoKey } from "../../engine/camera_story.js";

const WALK = { move: { def: { name: "walk", category: "movement", flags: {} } } };
const actor = (id, x, extra = {}) => ({ id, x, vx: 0, hidden: false, face: "neutral", move: null, ...extra });

test("after the opening wide: v2 follows everyone (null key), v3 follows who is active", () => {
  const cast = [actor("a", 800), actor("b", 1000, WALK), actor("c", 2400), actor("d", 2600)];
  for (const [tight, want] of [[false, null], [true, ["b", "a"]]]) {
    const auto = createStoryAuto(0, { tight });
    assert.deepEqual(storyAutoKey(auto, cast, 1), { mode: "wide" });
    const key = storyAutoKey(auto, cast, 3);
    if (!want) assert.equal(key, null);
    else assert.deepEqual([...key.targets].sort(), [...want].sort(), "the walker and its nearest neighbour");
  }
});

test("v3: activity fades after 3.5 s; speakers count as active; nobody active falls back to follow-all", () => {
  const auto = createStoryAuto(0, { tight: true });
  const cast = [actor("a", 800), actor("b", 1000), actor("c", 2400), actor("d", 2600)];
  assert.equal(storyAutoKey(auto, cast, 3), null, "nobody has done anything");
  storyAutoEvent(auto, { type: "say", actor: "c", dur: 1 }, 3);
  storyAutoEvent(auto, { type: "say", actor: "d", dur: 1 }, 4.5);
  const talk = storyAutoKey(auto, cast, 5.2);
  assert.equal(talk.mode, "two_shot", "while a line is up, the two-shot");
  const after = storyAutoKey(auto, cast, 6.5);
  assert.deepEqual(after.targets, ["c", "d"]);
  assert.equal(after.mode, "follow");
  assert.equal(storyAutoKey(auto, cast, 12), null);
});

test("v3: hidden characters are never framed", () => {
  const auto = createStoryAuto(0, { tight: true });
  const cast = [actor("a", 800, WALK), actor("b", 900, { hidden: true }), actor("c", 1400)];
  assert.deepEqual(storyAutoKey(auto, cast, 3).targets, ["a", "c"]);
});
