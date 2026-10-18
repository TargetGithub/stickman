#!/usr/bin/env node
// One-time converter (CATALOG_SPEC 10, C1): expands the legacy data/*.js modules (helpers, spreads,
// constants) into the JSON files of catalog/. Kept until data/ is retired (C5) so the migration can be
// re-checked; it refuses to overwrite existing files unless --force is given.
// Usage: node tools/migrate_catalog.mjs [--force]

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatJson } from "./lib/json_format.mjs";
import { legacy } from "../data/legacy.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "catalog");
const force = process.argv.includes("--force");

/** catalog path → JSON value, from the legacy modules. */
export function convert(l) {
  const lists = ["eyes", "brows", "mouthStyle", "hair", "outfit", "accessories"];
  const appearance = {};
  for (const [k, v] of Object.entries(l.appearance)) appearance[k] = lists.includes(k) ? v.map((name) => ({ name })) : v;
  const files = {
    "moves/poses.json": l.poses,
    "characters/bodies.json": l.bodies,
    "characters/appearance.json": appearance,
    "characters/faces.json": l.faces,
    "effects/fx.json": l.fxPresets,
    "effects/sfx.json": l.sfxKeys.map((name) => ({ name })),
    "world/themes.json": l.themes,
    "world/objects.json": l.objects,
    "world/props.json": l.props,
    "story/activities.json": l.activities,
    "story/music_moods.json": { scales: l.scales, moods: l.musicMoods },
    "story/macro_lines.json": l.macroLines,
    "story/blocklist.json": { blocklist: l.blocklist, softWords: l.softWords },
  };
  for (const m of Object.keys(l.moveFiles)) files[`moves/${m}.json`] = l.moveFiles[m];
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = convert(legacy);
  for (const [rel, value] of Object.entries(files)) {
    const out = join(root, rel);
    if (existsSync(out) && !force) {
      console.log(`skip ${rel} (exists; --force overwrites)`);
      continue;
    }
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, formatJson(value));
    console.log(`wrote ${rel}`);
  }
}
