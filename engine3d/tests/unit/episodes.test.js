// The tracked episode list (scripts/series/toybox/EPISODES.md) matches the scripts and episodes.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildEpisodesMd, checkRegistry, readScripts } from "../../tools/lib/episodes.mjs";

const dir = new URL("../../scripts/series/toybox/", import.meta.url);
const reg = JSON.parse(readFileSync(new URL("episodes.json", dir), "utf8"));
const skills = JSON.parse(readFileSync(new URL("../../../catalog/education/skills.json", import.meta.url), "utf8")).skills;
const scripts = readScripts(dir.pathname);

test("every toybox script has a registry entry with a valid status", () => {
  assert.deepEqual(checkRegistry(reg, scripts, skills), []);
});

test("EPISODES.md is up to date (node engine3d/tools/episodes.mjs)", () => {
  assert.equal(readFileSync(new URL("EPISODES.md", dir), "utf8"), buildEpisodesMd({ reg, scripts, skills }));
});

test("the registry check catches a missing entry and a planned episode without a spec", () => {
  const s = [{ id: "zz01", file: "zz01_x.json", skills: [] }];
  assert.match(checkRegistry({ episodes: {} }, s, skills)[0], /no entry/);
  assert.match(checkRegistry({ episodes: { zz02: { status: "spec", title: "X", audience: "grade3" } } }, [], skills)[0], /needs title, audience and spec/);
});
