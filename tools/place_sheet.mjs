#!/usr/bin/env node
// Place review sheets (Doopi & Friends, package A4): a theme at three camera distances (columns) by
// day, dusk and night (rows), with Doopi and Becky standing in it, through the public API.
// Usage: node tools/place_sheet.mjs [theme ...] [--out out/demos]

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadBackend } from "./lib/canvas.mjs";
import { createEngine } from "../engine/index.js";
import { catalog } from "../catalog/index.js";

const args = process.argv.slice(2);
const outDir = args.includes("--out") ? args[args.indexOf("--out") + 1] : "out/demos";
const themes = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");
const list = themes.length ? themes : ["chirpur_village", "banyan_hill", "gloom_throne_room"];

const DOOPI = { id: "doopi", body: "stickman", color: "#5ec8ff", appearance: { eyes: "big", hair: "spiky", hairColor: "#2a1a14", mouthStyle: "cartoon", accessories: { headband: "#ff3b5c" } } };
const BECKY = { id: "becky", ...JSON.parse(readFileSync(new URL("../catalog/characters/presets/becky.json", import.meta.url))).cast };

// Set pieces shown with each place.
const SETS = {
  banyan_hill: ["empty", "red", "orange", "yellow", "green", "blue", "indigo", "violet"].map((state, i) => ({ id: `s${i}`, object: "crystal_socket", x: 1290 + i * 150 + (i > 3 ? 120 : 0), state })),
  gloom_throne_room: [{ id: "throne", object: "throne", x: 1950 }, { id: "ball", object: "crystal_ball", x: 1250 }],
};
const TIMES = ["day", "dusk", "night"];
const ZOOMS = [0.6, 1, 1.7];

const backend = await loadBackend();
for (const theme of list) {
  const story = {
    version: 2,
    meta: { title: `Place ${theme}`, format: "landscape", seed: 1, kind: "clip" },
    cast: [DOOPI, BECKY],
    locations: [{ id: "here", theme, stageWidth: 3600, set: SETS[theme] || [] }],
    scenes: TIMES.map((time) => ({
      id: time, location: "here", time, duration: 3,
      cast: [{ id: "doopi", x: 1520, facing: 1, face: "happy" }, { id: "becky", x: 1700, facing: -1, face: "happy" }],
      camera: ZOOMS.map((zoom, i) => ({ at: i, mode: "fixed", x: 1610, zoom })),
      beats: [{ at: 0.5, who: "doopi", do: "wave" }],
    })),
  };
  const engine = createEngine({ catalog, createCanvas: backend.createCanvas });
  const r = engine.load(story);
  if (!r.ok) {
    console.log(`${theme} does not load:\n${r.errors.map((e) => `- ${e.code}: ${e.message}`).join("\n")}`);
    process.exitCode = 1;
    continue;
  }
  for (const w of r.warnings || []) console.log(`${theme}: ${w.code} ${w.message}`);
  const tw = r.width / 2;
  const th = r.height / 2;
  const frame = backend.createCanvas(r.width, r.height);
  const sheet = backend.createCanvas(tw * ZOOMS.length, th * TIMES.length);
  const sctx = sheet.getContext("2d");
  engine.getScenes().forEach((sc, row) => {
    ZOOMS.forEach((zoom, col) => {
      engine.renderFrame(frame.getContext("2d"), sc.startFrame + Math.round((col + 0.8) * 60));
      sctx.drawImage(frame, col * tw, row * th, tw, th);
      sctx.fillStyle = "rgba(0,0,0,0.6)";
      sctx.fillRect(col * tw, row * th, 190, 26);
      sctx.fillStyle = "#ffffff";
      sctx.font = "17px Inter";
      sctx.fillText(`${sc.id}  zoom ${zoom}`, col * tw + 8, row * th + 19);
    });
  });
  const png = join(outDir, `a4_${theme}.png`);
  await backend.savePng(sheet, png);
  console.log(`wrote ${png}`);
}
