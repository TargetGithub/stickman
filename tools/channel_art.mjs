#!/usr/bin/env node
// YouTube channel art for Doopi & Friends: profile picture (800x800), banner (2560x1440, logo and cast
// inside the 1546x423 safe area every device shows), watermark (150x150, transparent) and an episode 1
// thumbnail (1280x720). The cast and Tokyo are drawn by the engine (public API); the logo uses Bangers.
// Usage: node tools/channel_art.mjs [--out out/channel]

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadBackend } from "./lib/canvas.mjs";
import { createEngine } from "../engine/index.js";
import { catalog } from "../catalog/index.js";

const args = process.argv.slice(2);
const outDir = args.includes("--out") ? args[args.indexOf("--out") + 1] : "out/channel";
const preset = (id) => ({ id, ...JSON.parse(readFileSync(new URL(`../catalog/characters/presets/${id}.json`, import.meta.url))).cast });
// The seven Rainbow Crystal colours (BIBLE.md), one per logo letter.
const RAINBOW = ["#ff4d4d", "#ff9f1c", "#ffd23f", "#4cc960", "#3fa7ff", "#5b5bd6", "#b05be0"];
const GROUND = 880;
// Profile crop in frame units (square size, top edge).
const CROP = { size: 300, top: 335, cx: 830 };
const backend = await loadBackend();

/**
 * Render one still of a one-scene Tokyo story with the engine.
 * @param {{ cast: {id:string,x:number,facing:number,face:string}[], beats?: object[], cam: {x:number,y:number,zoom:number}, scale: number, at: number, time?: string, theme?: string }} o
 */
function still(o) {
  const story = {
    version: 2,
    meta: { title: "Channel art", format: "landscape", seed: 7, kind: "clip" },
    cast: o.cast.map((c) => preset(c.id)),
    locations: [{ id: "here", theme: o.theme || "tokyo_village", stageWidth: 3600, set: [{ id: "lan", object: "lantern_string", x: 1800, layer: "back" }] }],
    scenes: [{
      id: "a", location: "here", time: o.time || "day", duration: 4,
      cast: o.cast.map(({ id, x, facing, face }) => ({ id, x, facing, face })),
      camera: [{ at: 0, mode: "fixed", ...o.cam }],
      beats: o.beats || [],
    }],
  };
  const engine = createEngine({ catalog, createCanvas: backend.createCanvas, scale: o.scale });
  const r = engine.load(story);
  if (!r.ok) throw new Error(r.errors.map((e) => `${e.code}: ${e.message}`).join("\n"));
  const canvas = backend.createCanvas(r.outputWidth, r.outputHeight);
  engine.renderFrame(canvas.getContext("2d"), Math.round(o.at * r.fps));
  return canvas;
}

/** Camera y that puts the ground line at screen y (1080-high frame) for a zoom. */
const camY = (screenY, zoom) => GROUND - (screenY - 540) / zoom;

/** Text with a thick dark outline, a white rim and a soft drop shadow (sticker style). */
function sticker(ctx, text, x, y, size, fill, { rim = size * 0.1 } = {}) {
  ctx.font = `${size}px Bangers`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowOffsetY = size * 0.06;
  ctx.shadowBlur = size * 0.08;
  ctx.strokeStyle = "#2b1d3a";
  ctx.lineWidth = rim * 2.6;
  ctx.strokeText(text, x, y);
  ctx.restore();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = rim * 1.2;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** "DOOPI" with one Rainbow Crystal colour per letter, then "& FRIENDS" under it, centred on cx. */
function logo(ctx, cx, top, size) {
  const word = "DOOPI";
  ctx.font = `${size}px Bangers`;
  const widths = [...word].map((ch) => ctx.measureText(ch).width);
  const gap = size * 0.03;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (word.length - 1);
  let x = cx - total / 2;
  [...word].forEach((ch, i) => {
    const tilt = (i % 2 ? 1 : -1) * 0.05;
    const lift = (i % 2 ? -1 : 1) * size * 0.03;
    ctx.save();
    ctx.translate(x + widths[i] / 2, top + size * 0.85 + lift);
    ctx.rotate(tilt);
    sticker(ctx, ch, 0, 0, size, RAINBOW[[0, 1, 2, 4, 6][i]]);
    ctx.restore();
    x += widths[i] + gap;
  });
  sticker(ctx, "& FRIENDS", cx, top + size * 1.42, size * 0.46, "#ffffff", { rim: size * 0.035 });
  // The bracelet's crystals as a row of small gems under the title.
  const gy = top + size * 1.62;
  RAINBOW.forEach((c, i) => {
    const gx = cx + (i - 3) * size * 0.17;
    const r = size * 0.055;
    ctx.beginPath();
    ctx.moveTo(gx, gy - r * 1.3);
    ctx.lineTo(gx + r, gy);
    ctx.lineTo(gx, gy + r * 1.3);
    ctx.lineTo(gx - r, gy);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    ctx.lineWidth = r * 0.35;
    ctx.strokeStyle = "#2b1d3a";
    ctx.stroke();
  });
  return top + size * 1.62 + size * 0.08;
}

async function save(canvas, name) {
  const path = join(outDir, name);
  await backend.savePng(canvas, path);
  console.log(`wrote ${path} (${canvas.width}x${canvas.height})`);
}

// Banner: 2560x1440 = the 1920x1080 frame at scale 4/3. Safe area (all devices) is the centred 1546x423
// band: x 380..1540, y 381..698 in frame units. Heroes flank the logo; Doopi stands right next to it.
{
  const zoom = 1.3;
  const cx = 1800;
  const wx = (sx) => cx + (sx - 960) / zoom;
  const cast = [
    { id: "nani", x: wx(440), facing: 1, face: "happy" },
    { id: "dony", x: wx(560), facing: 1, face: "happy" },
    { id: "mooka", x: wx(665), facing: 1, face: "happy" },
    { id: "doopi", x: wx(1260), facing: -1, face: "happy" },
    { id: "doomi", x: wx(1370), facing: -1, face: "happy" },
    { id: "becky", x: wx(1475), facing: -1, face: "happy" },
  ];
  const beats = [
    { at: 0.1, who: "doopi", do: "wave" },
    { at: 0.1, who: "dony", do: "cheer" },
    { at: 0.1, who: "mooka", do: "jump_joy" },
  ];
  const frame = still({ cast, beats, cam: { x: cx, y: camY(690, zoom), zoom }, scale: 4 / 3, at: 0.75 });
  const ctx = frame.getContext("2d");
  ctx.setTransform(4 / 3, 0, 0, 4 / 3, 0, 0);
  logo(ctx, 960, 392, 168);
  await save(frame, "banner_2560x1440.png");
  // Review copy with the safe areas marked (not for upload).
  const guide = backend.createCanvas(frame.width, frame.height);
  const g = guide.getContext("2d");
  g.drawImage(frame, 0, 0);
  g.lineWidth = 6;
  g.setLineDash([24, 14]);
  g.strokeStyle = "#ff2d55";
  g.strokeRect((2560 - 1546) / 2, (1440 - 423) / 2, 1546, 423);
  g.strokeStyle = "#ffffff";
  g.strokeRect(0, (1440 - 423) / 2, 2560, 423);
  g.font = "34px Inter";
  g.fillStyle = "#ff2d55";
  g.fillText("safe area: all devices (1546x423)", (2560 - 1546) / 2 + 10, (1440 - 423) / 2 - 14);
  g.fillStyle = "#ffffff";
  g.fillText("desktop width (2560x423); the whole image shows on TV", 20, (1440 + 423) / 2 + 44);
  await save(guide, "banner_safe_area_guide.png");
}

// Profile picture: Doopi's head and shoulders, shown by YouTube as a circle. The camera stops at zoom
// 2.16, so the frame renders at scale 3 and a square around Doopi is cropped out of it.
{
  const zoom = 2.1;
  const frame = still({
    cast: [{ id: "doopi", x: 1800, facing: 1, face: "happy" }, { id: "becky", x: 3400, facing: 1, face: "happy" }],
    cam: { x: 1800, y: GROUND - 168, zoom }, scale: 3, at: 0.5,
  });
  const S = CROP.size;
  const pic = backend.createCanvas(800, 800);
  const ctx = pic.getContext("2d");
  ctx.drawImage(frame, (CROP.cx - S / 2) * 3, CROP.top * 3, S * 3, S * 3, 0, 0, 800, 800);
  await save(pic, "profile_800x800.png");
  // Watermark: the same picture in a white-rimmed circle on a transparent square.
  const wm = backend.createCanvas(150, 150);
  const w = wm.getContext("2d");
  w.save();
  w.beginPath();
  w.arc(75, 75, 70, 0, Math.PI * 2);
  w.clip();
  w.drawImage(pic, 0, 0, 800, 800, 5, 5, 140, 140);
  w.restore();
  w.lineWidth = 6;
  w.strokeStyle = "#ffffff";
  w.beginPath();
  w.arc(75, 75, 71, 0, Math.PI * 2);
  w.stroke();
  await save(wm, "watermark_150x150.png");
}

// Episode 1 thumbnail ("The Boy Who Tripped"): Doopi mid-trip, friends laughing, big title.
{
  const zoom = 1.9;
  const frame = still({
    cast: [
      { id: "doopi", x: 1800, facing: 1, face: "scared" },
      { id: "dony", x: 1960, facing: -1, face: "happy" },
      { id: "becky", x: 1600, facing: 1, face: "happy" },
    ],
    beats: [{ at: 0.2, who: "doopi", do: "ko_fall" }, { at: 0.2, who: "dony", do: "laugh" }],
    cam: { x: 1870, y: camY(1000, zoom), zoom }, scale: 2 / 3, at: 0.55,
  });
  const ctx = frame.getContext("2d");
  ctx.setTransform(2 / 3, 0, 0, 2 / 3, 0, 0);
  ctx.save();
  ctx.translate(560, 0);
  logo(ctx, 0, 30, 120);
  ctx.restore();
  sticker(ctx, "THE BOY WHO", 1500, 140, 120, "#ffd23f");
  sticker(ctx, "TRIPPED!", 1500, 290, 170, "#ff4d4d");
  // Episode badge.
  ctx.fillStyle = "#3fa7ff";
  ctx.strokeStyle = "#2b1d3a";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(1780, 960, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  sticker(ctx, "EP 1", 1780, 990, 84, "#ffffff");
  await save(frame, "thumbnail_ep01_1280x720.png");
}
