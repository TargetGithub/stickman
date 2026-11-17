#!/usr/bin/env node
// Write series/doopi/S2_UPLOADS.md: every uploaded season 2 episode (from youtube_upload.json in its finals folder).
// Usage: node series/doopi/s2/uploads_md.mjs

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOTS = ["/Volumes/DISK1MAC/AI Backup files - Youtube/doopi/COMPILATIONS2", "out/series/doopi"];
const OUT = fileURLToPath(new URL("../S2_UPLOADS.md", import.meta.url));

const rows = [];
const missing = [];
for (let n = 1; n <= 24; n++) {
  const slug = `s2_ep${String(n).padStart(2, "0")}_4k60`;
  const file = ROOTS.map((r) => join(r, slug, "youtube_upload.json")).find(existsSync);
  if (!file) { missing.push(n); continue; }
  const r = JSON.parse(readFileSync(file, "utf8"));
  rows.push(`| ${n} | ${r.title.split(" | ")[0]} | [${r.videoId}](${r.url}) | ${r.privacy} | ${r.uploadedAt.slice(0, 10)} |`);
}

writeFileSync(OUT, `# Doopi & Friends season 2: YouTube uploads

Single episodes only, with no compilations. They go to the Doopi & Friends channel (\`--channel doopi\`), each with a designed thumbnail (\`series/doopi/s2/thumbnails.mjs\`) and the text from \`series/doopi/s2/youtube_txt.mjs\`, uploaded by \`series/doopi/s2/upload_episodes.sh\`. Every upload needs Sridhar's yes. Each episode folder also keeps its \`youtube_upload.json\`.
Regenerate this list with \`node series/doopi/s2/uploads_md.mjs\`.

| # | Title | Video | Privacy | Uploaded |
|---|---|---|---|---|
${rows.join("\n")}
${missing.length ? `\nNot uploaded yet: episodes ${missing.join(", ")}.\n` : ""}`);
console.log(`wrote ${OUT}: ${rows.length} uploaded${missing.length ? `, ${missing.length} not yet` : ""}`);
