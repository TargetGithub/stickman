#!/usr/bin/env node
// YouTube channel art for Doopi & Friends: profile picture (800x800), banner (2560x1440, logo and cast
// inside the 1546x423 safe area every device shows), watermark (150x150, transparent) and an episode 1
// thumbnail (1280x720). The cast and Tokyo are drawn by the engine (public API); the logo uses Bangers.
// Usage: node tools/channel_art.mjs [--out out/channel]

import { join } from "node:path";
import { loadBackend } from "./lib/canvas.mjs";
import { RAINBOW, GROUND, camY, sticker, logo, still as stillOf } from "./lib/doopi_art.mjs";

const args = process.argv.slice(2);
const outDir = args.includes("--out") ? args[args.indexOf("--out") + 1] : "out/channel";
// Profile crop in frame units (square size, top edge).
const CROP = { size: 300, top: 335, cx: 830 };
const backend = await loadBackend();
const still = (o) => stillOf(o, backend);

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
