#!/usr/bin/env node
// Designed YouTube thumbnails (1280x720) for Doopi & Friends season 2: the episode's key moment drawn big by the
// engine (feeling clouds, the Hush, props), the rainbow DOOPI logo, a two-line sticker title and an "S2 EP n"
// badge. Each goes into its episode's finals folder as thumbnail.jpg (which
// tools/youtube_upload.mjs picks up) and a copy into out/demos/s2/thumbs for review.
// Usage: node series/doopi/s2/thumbnails.mjs [--dir <finals folder>] [--only ep01,ep02]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadBackend } from "../../../tools/lib/canvas.mjs";
import { camY, sticker, logo, still } from "../../../tools/lib/doopi_art.mjs";

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const ROOT = opt("--dir", existsSync("/Volumes/DISK1MAC/AI Backup files - Youtube/doopi/COMPILATIONS2") ? "/Volumes/DISK1MAC/AI Backup files - Youtube/doopi/COMPILATIONS2" : "out/series/doopi");
const ONLY = opt("--only", "").split(",").filter(Boolean);
const REVIEW = "out/demos/s2/thumbs";

const cloud = (who, size = 0.8) => ({ at: 0, who: "world", do: "set_cloud", params: { who, size } });
const act = (who, move, extra = {}) => ({ at: 0.2, who, do: move, ...extra });
// Cast entries as the episodes use them (series/doopi/s2/cast.json), without the version 3 only fields.
const CAST = JSON.parse(readFileSync(new URL("./cast.json", import.meta.url), "utf8")).cast;
const entry = (id) => { const { limbStyle, ...rest } = CAST[id]; return rest; };
const C = (id, x, facing, face, prop) => ({ id, x, facing, face, entry: entry(id), ...(prop !== undefined ? { prop } : {}) });
const CRACK = (state = "cracked") => [{ id: "crack", object: "banyan_crack", x: 1800, state }];

/** Episode thumbnails: theme, cast (world x around 1800), beats, the frame time, title lines and colours. */
const EPISODES = {
  1: { cast: [C("peepa", 1700, 1, "sad", null), C("doopi", 1880, -1, "happy")], beats: [act("peepa", "kneel")], lines: ["PEEPA'S", "FIRST DAY!"] },
  2: { theme: "banyan_hill", set: CRACK(), cast: [C("chintu", 1700, 1, "angry", "kite"), C("doomi", 1880, -1, "sad")], beats: [cloud("chintu", 0.9)], lines: ["THE LITTLE", "GREY CLOUD!"] },
  3: { cast: [C("gappu", 1650, 1, "scared"), C("chintu", 1450, 1, "scared"), C("storymon", 2050, -1, "angry")], beats: [cloud("gappu", 0.6)], zoom: 1.8, lines: ["GAPPU'S GIANT", "STORIES!"] },
  4: { time: "dusk", cast: [C("baba", 1700, 1, "happy", "bansuri"), C("peepa", 1900, -1, "surprised", null)], beats: [act("baba", "play_flute")], lines: ["BANSURI", "BABA'S SONG!"] },
  5: { theme: "whispering_forest", cast: [C("mooka", 1700, 1, "angry", "jalebi"), C("peepa", 1900, -1, "tired", null)], beats: [cloud("mooka", 0.8), act("mooka", "hide")], lines: ["MOOKA AND THE", "LAST JALEBI!"] },
  6: { theme: "whispering_forest", time: "night", cast: [C("dony", 1700, 1, "scared"), C("doopi", 1860, -1, "happy")], beats: [cloud("dony", 0.6), act("dony", "point", { fx: ["fireflies"] })], at: 1.4, lines: ["DONY AND", "THE DARK!"] },
  7: { theme: "city_street", cast: [C("doopi", 1700, 1, "scared"), C("zippy", 1900, -1, "laugh", "tiffin")], beats: [act("doopi", "look_around")], lines: ["LOST IN", "JHILMIL CITY!"] },
  8: { theme: "rooftop_city", time: "dusk", cast: [C("doopi", 1700, 1, "determined", "tiffin"), C("zippy", 1950, -1, "surprised", "tiffin")], beats: [cloud("doopi", 0.5), act("doopi", "jump")], at: 0.5, lines: ["THE ROOFTOP", "RACE!"] },
  9: { theme: "clock_tower_still", set: [{ id: "clock", object: "tower_clock", x: 2150, state: "stopped" }], cast: [C("ghadi", 1700, 1, "sad", null), C("zippy", 1900, -1, "surprised", "tiffin")], beats: [cloud("ghadi", 1)], lines: ["THE CLOCK", "THAT STOPPED!"] },
  10: { theme: "alley_night", cast: [C("doomi", 1700, 1, "cry"), C("tinku", 1880, -1, "happy", "cloud_radar")], beats: [cloud("doomi", 0.7)], lines: ["DOOMI'S", "ROBOT!"] },
  11: { theme: "desert_noon", set: [{ id: "well", object: "desert_well", x: 2050, state: "broken" }], cast: [C("bijli", 1750, 1, "angry"), C("mooka", 1580, 1, "surprised", null)], beats: [act("bijli", "taunt")], lines: ["BIJLI OF", "THE SANDS!"] },
  12: { theme: "desert_noon", time: "night", set: [{ id: "fire", object: "campfire", x: 1800, state: "lit" }], cast: [C("peepa", 1650, 1, "sad", null), C("hush", 1950, -1, "smug")], beats: [], lines: ["THE NIGHT", "OF STARS"] },
  13: { theme: "desert_noon", cast: [C("doopi", 1650, 1, "determined"), C("dony", 1850, -1, "sad"), C("tinku", 1500, 1, "surprised", "cloud_radar")], beats: [act("doopi", "look_around")], lines: ["WHERE IS", "PEEPA?"] },
  14: { theme: "khel_arena", cast: [C("doopi", 1650, 1, "happy"), C("peepa", 1850, -1, "surprised", null)], beats: [act("doopi", "point")], lines: ["PICK ME", "LAST"] },
  15: { theme: "grey_peak", cast: [C("doopi", 1700, 1, "laugh"), C("peepa", 1900, -1, "determined", null)], beats: [act("doopi", "cheer")], lines: ["ECHO", "MOUNTAIN!"] },
  16: { theme: "frozen_river", cast: [C("ghoom", 1750, 1, "sad"), C("tinku", 1500, 1, "love", "cloud_radar")], beats: [cloud("ghoom", 0.8)], zoom: 1.05, lines: ["GHOOMU'S", "BIG HEART"] },
  17: { theme: "grey_peak", time: "night", weather: "rain", cast: [C("becky", 1700, 1, "scared"), C("peepa", 1900, -1, "happy", "leaf_whistle")], beats: [cloud("becky", 0.9), act("peepa", "play_flute")], lines: ["BECKY'S", "THUNDER NIGHT"] },
  18: { theme: "mountain_cave", cast: [C("mooka", 1750, 1, "sad", "glass_jar")], beats: [cloud("mooka", 0.6), { at: 0, who: "world", do: "set_object", object: "mooka", params: { state: "hush" } }], lines: ["MOOKA'S", "JAR!"] },
  19: { theme: "mountain_cave", set: [{ id: "sdoor", object: "stone_door", x: 2050, state: "closed" }], cast: [C("peepa", 1700, 1, "sad", null)], beats: [], zoom: 1.9, lines: ["THE DOOR OF", "TRUE WORDS"] },
  20: { theme: "crystal_cave", cast: [C("peepa", 1700, 1, "sad", null), C("littlep", 1880, -1, "sad")], beats: [act("peepa", "kneel")], lines: ["THE LITTLE BOY", "IN THE CAVE"] },
  21: { theme: "tokyo_village", weather: "rain", cast: [C("doopi", 1600, 1, "determined"), C("storm", 2050, -1, "angry", "gloom_horn")], beats: [], zoom: 1.3, lines: ["THE HUSH", "STORM!"] },
  22: { theme: "tokyo_village", cast: [C("chintu", 1550, 1, "sad"), C("gappu", 1750, 1, "sad"), C("doopi", 1950, -1, "happy")], beats: [cloud("chintu", 0.6), cloud("gappu", 0.5)], lines: ["EVERY", "CLOUD"] },
  23: { theme: "banyan_hill", set: CRACK(), cast: [C("peepa", 1700, 1, "determined", "gloom_horn"), C("doopi", 1900, -1, "surprised")], beats: [], lines: ["PEEPA'S", "CHOICE"] },
  24: { theme: "banyan_hill", set: CRACK("healed"), cast: [C("peepa", 1700, 1, "laugh", "bansuri"), C("doopi", 1900, -1, "laugh")], beats: [act("peepa", "play_flute")], lines: ["THE BANYAN", "SONG!"] },
};

const backend = await loadBackend();

/** Draw one thumbnail: the engine still, then the logo, title and badge. */
function draw(spec, badge, lines) {
  const zoom = spec.zoom ?? 2.3;
  const cx = spec.cast.reduce((a, c) => a + c.x, 0) / spec.cast.length;
  const frame = still({ cast: spec.cast, beats: spec.beats ?? [], theme: spec.theme, time: spec.time, weather: spec.weather, set: spec.set ?? [],
    cam: { x: cx + 330 / zoom, y: camY(1040, zoom), zoom }, scale: 2 / 3, at: spec.at ?? 0.8 }, backend);
  const ctx = frame.getContext("2d");
  ctx.setTransform(2 / 3, 0, 0, 2 / 3, 0, 0);
  logo(ctx, 260, 20, 135);
  const size = Math.min(170, 1500 / Math.max(...lines.map((l) => l.length)));
  sticker(ctx, lines[0], 1430, 150 + size * 0.75, size * 0.82, "#ffd23f");
  sticker(ctx, lines[1], 1430, 190 + size * 1.7, size, "#ff4d4d");
  ctx.fillStyle = "#3fa7ff";
  ctx.strokeStyle = "#2b1d3a";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.roundRect(1560, 870, 320, 160, 50);
  ctx.fill();
  ctx.stroke();
  sticker(ctx, badge, 1720, 985, badge.length > 8 ? 62 : 84, "#ffffff");
  return frame;
}

async function save(frame, folder, name) {
  const jpg = await frame.encode("jpeg", 90);
  mkdirSync(REVIEW, { recursive: true });
  writeFileSync(join(REVIEW, `${name}.jpg`), jpg);
  const dir = join(ROOT, folder);
  if (existsSync(join(dir, "final.mp4"))) {
    writeFileSync(join(dir, "thumbnail.jpg"), jpg);
    console.log(`wrote ${join(dir, "thumbnail.jpg")} (${(jpg.length / 1024).toFixed(0)} KB)`);
  } else console.log(`wrote ${join(REVIEW, `${name}.jpg`)} (no finished video in ${folder} yet)`);
}

for (const [n, spec] of Object.entries(EPISODES)) {
  const id = `ep${String(n).padStart(2, "0")}`;
  if (ONLY.length && !ONLY.includes(id)) continue;
  await save(draw(spec, `S2 EP ${n}`, spec.lines), `s2_${id}_4k60`, id);
}
