#!/usr/bin/env node
// Write youtube.txt (title, description, tags, audience: the format tools/youtube_upload.mjs reads) into every
// finished season 2 episode folder (season 2 goes up as single episodes, no compilations). Summaries and lessons come
// from docs/DOOPI_SEASON2_STORYLINE.md. Existing files are kept unless --force. Usage: node series/doopi/s2/youtube_txt.mjs [--force] [--dir <finals folder>]...

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const force = args.includes("--force");
const dirs = args.flatMap((a, i) => (args[i - 1] === "--dir" ? [a] : []));
if (!dirs.length) dirs.push("/Volumes/DISK1MAC/AI Backup files - Youtube/doopi/COMPILATIONS2", "out/series/doopi");

const story = readFileSync(new URL("../../../docs/DOOPI_SEASON2_STORYLINE.md", import.meta.url), "utf8");
/** Episode n of the storyline: { title, summary, lesson }. */
function storyEp(n) {
  const m = story.match(new RegExp(`\\*\\*${n}\\. ([^*]+)\\*\\*\\n([\\s\\S]*?)\\n\\*Lesson: ([^*]+)\\*`));
  if (!m) throw new Error(`storyline has no episode ${n}`);
  return { title: m[1].trim(), summary: m[2].replace(/\s*\n\s*/g, " ").trim(), lesson: m[3].trim().replace(/\.$/, "") };
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const cap = (s) => s[0].toUpperCase() + s.slice(1);

const TAGS = ["Doopi and Friends", "Doopi", "kids cartoon", "cartoons for kids", "feelings for kids", "social emotional learning",
  "kindness for kids", "friendship story", "big feelings", "preschool cartoon", "kids stories", "Peepa", "The Hush", "Season 2"];
const ABOUT = "Doopi & Friends Season 2, The Whispering Horn: a little purple whisper called the Hush escaped from the Gloom Horn, and it turns big feelings into grey rain clouds over people's heads. Fighting only makes a cloud bigger. Noticing, asking, listening and naming the feeling makes it pop.";

function write(dir, text) {
  const file = join(dir, "youtube.txt");
  if (existsSync(file) && !force) return console.log(`kept ${file}`);
  writeFileSync(file, text);
  console.log(`wrote ${file}`);
}

for (const root of dirs.filter(existsSync)) {
  for (const name of readdirSync(root).sort()) {
    const dir = join(root, name);
    if (!existsSync(join(dir, "final.mp4"))) continue;
    const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
    const len = fmt(meta.durationSec ?? meta.duration ?? 0);
    let m;
    if ((m = name.match(/^s2_ep(\d\d)_4k60$/))) {
      const n = Number(m[1]);
      const e = storyEp(n);
      write(dir, `TITLE: ${e.title} | Doopi & Friends Season 2 Episode ${n} | Kids Cartoon about Feelings

DESCRIPTION:
${e.summary}

Today's lesson: ${e.lesson}.

${ABOUT}


TAGS: ${[`${e.title}`, `Doopi episode ${n}`, `${cap(e.lesson.split(/[.;:]/)[0]).slice(0, 60)}`, ...TAGS].join(", ")}

AUDIENCE: Made for kids (ages 3-8). Length ${len}.
`);

    }
  }
}
