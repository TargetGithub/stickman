#!/usr/bin/env node
// YouTube channel art for Baaaana (series/baaaana/PLAN.md task 13): profile picture (800x800), banner (2560x1440,
// logo and the four leads inside the 1546x423 safe area every device shows), watermark (150x150, transparent) and
// the Picnic Day thumbnail (1280x720). The leads, a crowd and Baaaana Meadow are drawn by the engine (public API);
// the logo uses Bangers, one green-family colour per letter with a sprout on the first A.
// Usage: node tools/channel_art_baaaana.mjs [--out out/channel/baaaana]

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadBackend } from "./lib/canvas.mjs";
import { createEngine } from "../engine/index.js";
import { catalog } from "../catalog/index.js";

const args = process.argv.slice(2);
const outDir = args.includes("--out") ? args[args.indexOf("--out") + 1] : "out/channel/baaaana";
const preset = (id) => ({ id, ...JSON.parse(readFileSync(new URL(`../catalog/characters/presets/${id}.json`, import.meta.url))).cast });
// The leads' colours, a flower pink and the meadow gold, one per logo letter.
const LETTERS = ["#7fe8c4", "#a6e88a", "#ff7eb6", "#ffd166", "#6fd6c8", "#5cc9a0", "#ff8c42"];
const INK = "#1f3b2c";
const GROUND = 880;
const backend = await loadBackend();

/**
 * One still of a one-scene Baaaana Meadow story drawn by the engine.
 * @param {{ cast: object[], beats?: object[], cam: {x,y,zoom}, scale: number, at: number, set?: object[], extras?: object[], time?: string }} o
 */
function still(o) {
  const story = {
    version: 3,
    meta: { title: "Channel art", format: "landscape", seed: 11, kind: "clip", audience: "general" },
    cast: o.cast.map((c) => preset(c.id)),
    locations: [{ id: "here", theme: "baaaana_meadow", stageWidth: 3600, set: o.set || [] }],
    scenes: [{
      id: "a", location: "here", time: o.time || "day", light: o.time === "dusk" ? "golden" : "noon", duration: 4,
      cast: o.cast.map(({ id, x, facing, face, view }) => ({ id, x, facing, face, ...(view ? { view } : {}) })),
      camera: [{ at: 0, mode: "fixed", ...o.cam }],
      ...(o.extras ? { extras: o.extras } : {}),
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
  ctx.strokeStyle = INK;
  ctx.lineWidth = rim * 2.6;
  ctx.strokeText(text, x, y);
  ctx.restore();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = rim * 1.2;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** A two-leaf sprout growing from (x, y), sized s. */
function sprout(ctx, x, y, s) {
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = s * 0.16;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - s * 0.15, y - s * 0.4, x, y - s * 0.7);
  ctx.stroke();
  ctx.strokeStyle = "#3fae5a";
  ctx.lineWidth = s * 0.08;
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(x, y - s * 0.7);
    ctx.rotate(side * 0.7 - Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(s * 0.32, 0, s * 0.34, s * 0.16, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#4fbf68";
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = s * 0.06;
    ctx.stroke();
    ctx.restore();
  }
}

/** "BAAAANA", one colour per letter, bouncing a little, with a sprout on the first A; centred on cx. */
function logo(ctx, cx, top, size) {
  const word = "BAAAANA";
  ctx.font = `${size}px Bangers`;
  const widths = [...word].map((ch) => ctx.measureText(ch).width);
  const gap = size * 0.02;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (word.length - 1);
  let x = cx - total / 2;
  [...word].forEach((ch, i) => {
    const tilt = (i % 2 ? 1 : -1) * 0.06;
    const lift = (i % 2 ? -1 : 1) * size * 0.04;
    ctx.save();
    ctx.translate(x + widths[i] / 2, top + size * 0.85 + lift);
    ctx.rotate(tilt);
    sticker(ctx, ch, 0, 0, size, LETTERS[i]);
    if (i === 1) sprout(ctx, 0, -size * 0.66, size * 0.42);
    ctx.restore();
    x += widths[i] + gap;
  });
  return top + size;
}

async function save(canvas, name) {
  const path = join(outDir, name);
  await backend.savePng(canvas, path);
  console.log(`wrote ${path} (${canvas.width}x${canvas.height})`);
}

const crowd = (count, behavior, extra = {}) => [{ count, behavior, crowd: "baaaana_crowd", from: 300, to: 3300, layer: "back", ...extra }];

// Banner: 2560x1440 = the 1920x1080 frame at scale 4/3. Safe area (all devices): x 380..1540, y 381..698 in frame
// units. Two leads each side of the logo, the village crowd behind.
{
  const zoom = 1.3;
  const cx = 1800;
  const wx = (sx) => cx + (sx - 960) / zoom;
  const cast = [
    { id: "bobo", x: wx(470), facing: 1, face: "happy", view: "three_quarter" },
    { id: "zizi", x: wx(610), facing: 1, face: "laugh" },
    { id: "bn_mooka", x: wx(1310), facing: -1, face: "laugh" },
    { id: "tutu", x: wx(1460), facing: -1, face: "love", view: "three_quarter" },
  ];
  const beats = [{ at: 0.1, who: "bobo", do: "wave" }, { at: 0.1, who: "zizi", do: "jump_joy" }, { at: 0.1, who: "bn_mooka", do: "cheer" }];
  const frame = still({ cast, beats, cam: { x: cx, y: camY(700, zoom), zoom }, scale: 4 / 3, at: 0.75, extras: crowd(18, "cheer"),
    set: [{ id: "h1", object: "mushroom_hut", x: 900, z: -600 }, { id: "h2", object: "mushroom_hut", x: 2700, z: -500 }] });
  const ctx = frame.getContext("2d");
  ctx.setTransform(4 / 3, 0, 0, 4 / 3, 0, 0);
  logo(ctx, 960, 430, 180);
  await save(frame, "banner_2560x1440.png");
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
  await save(guide, "banner_safe_area_guide.png");
}

// Profile picture: Mooka's head and sprout, shown by YouTube as a circle (rendered at scale 3, then cropped).
{
  // Mooka's head centre stands about 90 px above the floor; the camera centres just above it so the sprout fits.
  const zoom = 2.6;
  const frame = still({ cast: [{ id: "bn_mooka", x: 1800, facing: 1, face: "laugh", view: "three_quarter" }], cam: { x: 1800, y: GROUND - 120, zoom }, scale: 3, at: 0.5 });
  const pic = backend.createCanvas(800, 800);
  const ctx = pic.getContext("2d");
  const S = 300;
  ctx.drawImage(frame, (960 - S / 2) * 3, (540 - S / 2) * 3, S * 3, S * 3, 0, 0, 800, 800);
  await save(pic, "profile_800x800.png");
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

// Picnic Day thumbnail: Tutu with the cake, Mooka laughing, Zizi mid-jump, Bobo holding his head; big title.
{
  const zoom = 2.5;
  const frame = still({
    cast: [
      { id: "bobo", x: 1600, facing: 1, face: "surprised", view: "three_quarter" },
      { id: "tutu", x: 1730, facing: -1, face: "laugh", view: "three_quarter" },
      { id: "bn_mooka", x: 1860, facing: -1, face: "laugh", view: "three_quarter" },
      { id: "zizi", x: 1975, facing: -1, face: "laugh" },
    ],
    set: [{ id: "bl", object: "picnic_blanket", x: 1780, z: -40 }, { id: "ck", object: "cake", x: 1800, z: -50 }, { id: "h", object: "mushroom_hut", x: 2350, z: -400 }],
    beats: [{ at: 0.1, who: "bobo", do: "hold_head" }, { at: 0.1, who: "zizi", do: "jump_joy" }, { at: 0.1, who: "bn_mooka", do: "laugh" }, { at: 0.1, who: "tutu", do: "jump_joy" }],
    cam: { x: 1700, y: camY(1040, zoom), zoom }, scale: 2 / 3, at: 0.55,
  });
  const ctx = frame.getContext("2d");
  ctx.setTransform(2 / 3, 0, 0, 2 / 3, 0, 0);
  logo(ctx, 1480, 40, 120);
  sticker(ctx, "PICNIC", 1480, 330, 150, "#ffd166");
  sticker(ctx, "DAY!", 1480, 510, 190, "#ff7eb6");
  await save(frame, "thumbnail_picnic_day_1280x720.png");
}
