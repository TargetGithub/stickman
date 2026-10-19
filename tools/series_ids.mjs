#!/usr/bin/env node
// Prefix every beat id in a story with its scene id (ids must be unique across the story), and the
// "after" / "with" / "on" references in `at` with it. Already-prefixed ids are left alone.
// Usage: node tools/series_ids.mjs <story.json> [more.json ...]

import { readFileSync, writeFileSync } from "node:fs";

for (const file of process.argv.slice(2)) {
  const story = JSON.parse(readFileSync(file, "utf8"));
  for (const scene of story.scenes) {
    const p = `${scene.id}_`;
    const ids = new Set(scene.beats.map((b) => b.id).filter((id) => id && !id.startsWith(p)));
    const ref = (r) => {
      const [id, ...rest] = String(r).split(".");
      return ids.has(id) ? [p + id, ...rest].join(".") : r;
    };
    const fixAt = (at) => {
      if (!at || typeof at !== "object") return;
      for (const k of ["after", "with", "on"]) if (typeof at[k] === "string") at[k] = ref(at[k]);
    };
    for (const b of scene.beats) {
      if (ids.has(b.id)) b.id = p + b.id;
      fixAt(b.at);
    }
    for (const k of scene.camera || []) fixAt(k.at);
  }
  const text = JSON.stringify(story, null, 2);
  // Keep beats and small objects on one line (the files stay readable and diffable).
  writeFileSync(file, compact(text) + "\n");
}

/** Collapse JSON objects and arrays that fit in 160 characters onto one line. */
function compact(text) {
  const lines = text.split("\n");
  const out = [];
  const stack = [];
  for (const line of lines) {
    out.push(line);
    const open = /[[{]$/.test(line.trim());
    const close = /^[\]}],?$/.test(line.trim());
    if (open) stack.push(out.length - 1);
    else if (close && stack.length) {
      const start = stack.pop();
      const block = out.slice(start);
      const one = block.map((l, i) => (i ? l.trim() : l.trimEnd())).join(" ").replace(/([[{]) /g, "$1 ").replace(/ ([\]}])/g, " $1");
      if (one.length <= 160) out.splice(start, block.length, one);
    }
  }
  return out.join("\n");
}
