#!/usr/bin/env node
// Write series/doopi/S2_EPISODES.md: the season 2 episode list (number, title, lesson, places, cast, length) from the
// episode files and their built scripts. Usage: node series/doopi/s2/episodes_md.mjs

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validate } from "../../../engine/index.js";
import { catalog } from "../../../catalog/index.js";

const EPS = fileURLToPath(new URL("./eps/", import.meta.url));
const SCRIPTS = fileURLToPath(new URL("../../../scripts/series/doopi/s2/", import.meta.url));
const OUT = fileURLToPath(new URL("../S2_EPISODES.md", import.meta.url));
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

const rows = [];
let total = 0;
for (const f of readdirSync(EPS).filter((x) => /^ep\d\d\.mjs$/.test(x)).sort()) {
  const src = readFileSync(EPS + f, "utf8");
  const lesson = (src.match(/Lesson: (.*)$/m) || [])[1] || "";
  const script = JSON.parse(readFileSync(`${SCRIPTS}${f.replace(".mjs", "_v3.json")}`, "utf8"));
  const r = validate(script, catalog);
  total += r.durationSec || 0;
  const n = Number(f.slice(2, 4));
  const themes = [...new Set(script.locations.map((l) => l.theme))].join(", ");
  const people = script.cast.map((c) => c.id).join(", ");
  rows.push(`| ${n} | ${script.meta.title.replace(/^.*?: /, "")} | ${lesson} | ${fmt(r.durationSec || 0)} | ${themes} | ${people} |`);
}

const md = `# Doopi & Friends season 2: "The Whispering Horn" (episodes)

The storyline is docs/DOOPI_SEASON2_STORYLINE.md; the new assets are in S2_ASSETS.md; the render plan is in
S2_RENDER_PLAN.md. This list is generated: \`node series/doopi/s2/episodes_md.mjs\`.

**Scripts:** \`scripts/series/doopi/s2/epNN_v3.json\`. They are built from \`series/doopi/s2/eps/epNN.mjs\` by
\`node series/doopi/s2/make.mjs [N ...]\`, so edit the episode files and rebuild rather than editing the JSON.
- **Cast and voices:** \`series/doopi/s2/cast.json\` holds season 1's characters as they last appeared plus the new
  season 2 presets, with their Piper voices; \`series/doopi/tts_voices.json\` has the same voices.
- **Places:** \`series/doopi/s2/places.mjs\`.
- **Settings:** season 1's approved profile (ep01 pace block, glide 1.2, calm framing) and the \`doopi_intro\` title
  card with "Season 2 - Episode N".

**Lengths** use babble timing, which is within a few seconds of the voiced length (episode 1: 5:30 babble, 5:28 voiced).
Total: ${fmt(total)} (${(total / 60).toFixed(0)} min).

| # | Title | Lesson | Length | Places | Cast |
|---|---|---|---|---|---|
${rows.join("\n")}
`;
writeFileSync(OUT, md);
console.log(`wrote ${OUT} (${rows.length} episodes, ${fmt(total)})`);
