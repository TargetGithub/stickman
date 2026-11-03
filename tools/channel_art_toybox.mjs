#!/usr/bin/env node
// YouTube channel art for Toy Box Friends (engine3d/scripts/series/toybox/SERIES.md): banner (2560x1440, logo and
// the lead cast inside the 1546x423 safe area every device shows), a banner without text, profile picture
// (800x800) and watermark (150x150, transparent). The cast (Robo, Duck, Cat, Frog and friends), number blocks and
// letters are engine3d renders: this tool writes three JSON scenes, renders one 4K still of each with render3d
// (no speech, no music) and composites the logo with the canvas backend (Andika Bold, one block colour per letter).
// Usage: node tools/channel_art_toybox.mjs [--out out/channel/toybox] [--no-render]  (--no-render reuses the stills)

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadBackend } from "./lib/canvas.mjs";
import { renderStill3d, stillPath3d, sticker as sticker3d, INK } from "./lib/art3d.mjs";

const args = process.argv.slice(2);
const outDir = args.includes("--out") ? args[args.indexOf("--out") + 1] : "out/channel/toybox";
const sceneDir = join(outDir, ".scenes");
// Number-block colours from the episodes (red, orange, yellow, green, blue, purple, pink).
const LETTERS = ["#f2504b", "#f6923a", "#f5c43c", "#33c26b", "#3d86ea", "#9b5de5", "#f27bbd"];
const STILL_T = 1.0;
const backend = await loadBackend();

const critter = (id, species, at, rot, size = 1.1, extra = {}) => ({ id, kind: "critter", species, size, at, rotation: [0, rot, 0], feeling: "happy", ...extra });
const block = (id, value, color, at, size = 0.6, rot = 0) => ({ id, kind: "number_block", value, color, size, at, rotation: [0, rot, 0] });
const letter = (text, color, at, size = 0.5) => ({ id: `l_${text.toLowerCase()}`, kind: "letter", text, color, size, at });
const prop = (id, model, at, size = 1, extra = {}) => ({ id, kind: "prop", model, size, at, ...extra });

/** A one-scene still: the objects at rest, Robo waving (or idle), on a stage. */
const scene = (name, { stage = "playroom", camera, objects, robo = "Wave", extra = [] }) => ({
  kind: "video3d", version: 1, description: `Toy Box Friends channel art: ${name}.`,
  meta: { title: `Toy Box Friends ${name}`, seed: 7, voice: "soft" },
  stage: { preset: stage }, camera, objects,
  scenes: [{ id: "a", beats: [{ dur: 3, do: objects.some((o) => o.id === "robo") && robo ? [{ do: "clip", target: "robo", clip: robo, at: 0 }, ...extra] : extra }] }],
});

// Banner: the 4K frame scaled by 2/3 is the 2560x1440 banner. The safe area (x 760..3080, y 762..1397 in 4K pixels)
// holds Robo and Duck on the left, Cat and Frog on the right, the logo between them over a row of 1 2 3 A B C.
// Everyone else stands in the desktop strip either side, with balloons, sun and toys above and below for TVs.
const SCENES = {
  banner: scene("banner", {
    camera: { position: [0, 2.0, 17], lookAt: [0, 1.1, 0], fov: 30 },
    objects: [
      { id: "robo", kind: "character", character: "robot", at: [-3.7, 0, 0.6], rotation: [0, 32, 0] },
      critter("duck", "duck", [-2.75, 0, 1.3], 22, 1.0),
      critter("cat", "cat", [3.0, 0, 1.3], -22, 1.05),
      critter("frog", "frog", [4.05, 0, 0.7], -25, 1.1),
      critter("bunny", "bunny", [-5.9, 0, 0.1], 25, 1.1),
      critter("bear", "bear", [-7.1, 0, -0.6], 25, 1.2),
      critter("dog", "dog", [-8.3, 0, -1.2], 25, 1.1),
      critter("pig", "pig", [5.9, 0, 0.1], -25, 1.0),
      critter("chick", "chick", [7.0, 0, 0.6], -25, 1.0),
      critter("sheep", "sheep", [8.2, 0, -0.9], -25, 1.1),
      ...[1, 2, 3].map((n, i) => block(`n${n}`, n, ["red", "orange", "yellow"][i], [-1.3 + i * 0.5, 0, 1.6], 0.46, 10 - i * 8)),
      letter("A", "green", [0.3, 0, 1.6], 0.44), letter("B", "blue", [0.8, 0, 1.6], 0.44), letter("C", "purple", [1.3, 0, 1.6], 0.44),
      prop("box", "toy_box", [-5.4, 0, 3.4], 1.1, { rotation: [0, 20, 0] }),
      prop("ball", "ball", [-4.2, 0, 4.2], 0.7),
      block("n7", 7, "purple", [5.4, 0, 4.4], 0.6, -15), block("n5", 5, "blue", [6.1, 0, 4.0], 0.6, 12),
      prop("gift", "gift", [6.9, 0, 4.6], 0.8),
      prop("b1", "balloon", [-5.0, 4.2, -1.5], 1.0),
      prop("b2", "balloon", [5.0, 4.4, -1.5], 1.0, { recolor: { red: "blue" } }),
      prop("b3", "balloon", [-1.2, 5.6, -3], 0.9, { recolor: { red: "yellow" } }),
      prop("b4", "balloon", [1.6, 5.4, -3], 0.9, { recolor: { red: "green" } }),
      prop("sun", "sun", [8.5, 6.2, -6], 1.4),
      prop("c1", "cloud", [-7.5, 6.0, -7], 1.4),
      prop("c2", "cloud", [3.5, 7.0, -8], 1.0),
      { id: "s1", kind: "shape", shape: "star", color: "yellow", size: 0.7, at: [-3.3, 5.4, -2] },
      { id: "s2", kind: "shape", shape: "heart", color: "pink", size: 0.6, at: [3.0, 5.6, -2] },
    ],
  }),
  // Profile: Duck's face, big and simple, on a blue backdrop (yellow on blue reads at 48 px). Duck is the only thing in it, so it reads as a small circle.
  profile: scene("profile", {
    camera: { position: [0, 1.25, 5.2], lookAt: [0, 0.95, 0], fov: 30 },
    objects: [
      critter("duck", "duck", [0, 0, 0], -12, 1.3),
    ],
    extra: [{ do: "lights", rig: "soft_day", background: "blue", floor: "blue", rug: "cream", dur: 0.1 }],
  }),
};

const render = (name) => renderStill3d(SCENES[name], { dir: sceneDir, name, t: STILL_T });
const stillPath = (name) => stillPath3d(sceneDir, name, STILL_T);

/** The logo's sticker letters (tools/lib/art3d.mjs): dark outline, white rim, soft drop shadow. */
function sticker(ctx, text, x, y, size, fill) {
  ctx.textAlign = "center";
  sticker3d(ctx, text, x, y, size, fill, { rim: size * 0.054, outline: size * 0.063, ink: INK });
}

/** One word, one block colour per letter (from colour index c0), each letter tilted a little; centred on cx. */
function word(ctx, text, cx, baseline, size, c0) {
  ctx.font = `bold ${size}px Andika`;
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const gap = size * 0.03;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (text.length - 1);
  let x = cx - total / 2;
  let c = c0;
  [...text].forEach((ch, i) => {
    if (ch !== " ") {
      ctx.save();
      ctx.translate(x + widths[i] / 2, baseline + (i % 2 ? -1 : 1) * size * 0.03);
      ctx.rotate((i % 2 ? 1 : -1) * 0.05);
      sticker(ctx, ch, 0, 0, size, LETTERS[c++ % LETTERS.length]);
      ctx.restore();
    }
    x += widths[i] + gap;
  });
  return total;
}

/** The logo: "Toy Box" over "Friends", centred on cx, its top at `top`; returns its height. */
function logo(ctx, cx, top, size) {
  word(ctx, "Toy Box", cx, top + size * 0.95, size, 0);
  word(ctx, "Friends", cx, top + size * 1.95, size, 4);
  return size * 2.1;
}

async function save(canvas, name) {
  const path = join(outDir, name);
  await backend.savePng(canvas, path);
  console.log(`wrote ${path} (${canvas.width}x${canvas.height})`);
}

mkdirSync(sceneDir, { recursive: true });
if (!args.includes("--no-render")) for (const name of Object.keys(SCENES)) render(name);

// Banner (and the same picture without text).
{
  const src = await backend.loadImage(stillPath("banner"));
  const plain = backend.createCanvas(2560, 1440);
  plain.getContext("2d").drawImage(src, 0, 0, 2560, 1440);
  await save(plain, "banner_notext_2560x1440.png");
  const banner = backend.createCanvas(2560, 1440);
  const ctx = banner.getContext("2d");
  ctx.drawImage(plain, 0, 0);
  logo(ctx, 1280, 512, 140);
  await save(banner, "banner_2560x1440.png");
  const guide = backend.createCanvas(2560, 1440);
  const g = guide.getContext("2d");
  g.drawImage(banner, 0, 0);
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

// Profile picture (YouTube shows it as a circle) and the watermark cut from it.
{
  const src = await backend.loadImage(stillPath("profile"));
  const S = 1400; // square crop from the 3840x2160 still: Duck from the tuft to the feet
  const top = 420;
  const pic = backend.createCanvas(800, 800);
  const ctx = pic.getContext("2d");
  ctx.drawImage(src, (3840 - S) / 2, top, S, S, 0, 0, 800, 800);
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

// Previews for checking by eye (not uploaded): the profile as YouTube's circle at 98 px and 48 px, the watermark on dark.
{
  const pic = await backend.loadImage(join(outDir, "profile_800x800.png"));
  const wm = await backend.loadImage(join(outDir, "watermark_150x150.png"));
  const c = backend.createCanvas(560, 220);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 280, 220);
  ctx.fillStyle = "#0f0f0f";
  ctx.fillRect(280, 0, 280, 220);
  for (const [x, d] of [[20, 160], [200, 48]]) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + d / 2, 30 + d / 2, d / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(pic, x, 30, d, d);
    ctx.restore();
  }
  ctx.drawImage(wm, 340, 35, 150, 150);
  await save(c, "preview_small_sizes.png");
}
