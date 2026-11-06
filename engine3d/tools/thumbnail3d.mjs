#!/usr/bin/env node
// Designed YouTube thumbnails from meta.thumbnails (never a video frame). Each concept is its own one-beat scene
// (runtime/thumbnails.js): render3d draws it as one 4K still (no speech, no music), then the canvas backend lays
// the title over it at 1280x720: big Andika Bold with a thick dark outline, white rim and soft shadow on the
// chosen side over a gradient scrim, an optional subtitle, a grade badge and a small "Toy Box Friends" mark.
// Text is measured and shrunk (or wrapped onto two lines) to fit its box, so nothing is cropped.
//   node engine3d/tools/thumbnail3d.mjs <script.json> [--out dir] [--only name] [--no-render]
// Writes thumbnail_<name>.jpg per concept, thumbnail.jpg (the first concept) and thumbnails_sheet.jpg (all
// concepts side by side, with phone-size copies underneath) to --out (default out/series3d/<series>/<id>).

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, join, resolve } from "node:path";
import { loadCatalog3d } from "../catalog/index.mjs";
import { validateScript } from "../runtime/validate.js";
import { thumbnailScript, THUMB_AT } from "../runtime/thumbnails.js";
import { REPO } from "./lib/server.mjs";
import { loadBackend } from "../../tools/lib/canvas.mjs";
import { renderStill3d, stillPath3d, sticker, measureSticker, fontAt, INK } from "../../tools/lib/art3d.mjs";

export const THUMB_W = 1280;
export const THUMB_H = 720;
const TITLE_FONT = "bold Andika";
const MARK_COLORS = ["#f2504b", "#f6923a", "#f5c43c", "#33c26b", "#3d86ea", "#9b5de5", "#f27bbd"]; // the logo's block colours

/**
 * Where each piece goes on a WxH thumbnail for a side. YouTube draws the video length over the bottom-right
 * corner, so nothing goes there. Returns boxes { x, y, w, h } plus the badge and mark corners.
 */
export function thumbLayout(side = "left", W = THUMB_W, H = THUMB_H) {
  const m = Math.round(H * 0.045);
  const top = Math.round(H * 0.15); // under the badge row
  const foot = Math.round(H * 0.12); // above the mark and the duration stamp
  const col = Math.round(W * 0.52);
  const band = Math.round(H * 0.44);
  switch (side) {
    case "right": return { title: { x: W - m - col, y: top, w: col, h: H - top - foot }, badge: "tr", mark: "bl", scrim: "right" };
    case "top": return { title: { x: m, y: m, w: W - 2 * m, h: band }, badge: "bl", mark: "bl", scrim: "top" };
    case "bottom": return { title: { x: m, y: H - foot - band, w: W - 2 * m, h: band }, badge: "tl", mark: "tr", scrim: "bottom" };
    default: return { title: { x: m, y: top, w: col, h: H - top - foot }, badge: "tl", mark: "bl", scrim: "left" };
  }
}

/** Every way to set the title on one or two lines (two only at word breaks), most balanced first. */
export function titleLines(title) {
  const words = title.trim().split(/\s+/);
  const out = [[words.join(" ")]];
  const splits = [];
  for (let i = 1; i < words.length; i++) splits.push([words.slice(0, i).join(" "), words.slice(i).join(" ")]);
  // Ties go to the longer first line ("LIGHT OR / DARK?").
  splits.sort((a, b) => Math.abs(a[0].length - a[1].length) - Math.abs(b[0].length - b[1].length) || b[0].length - a[0].length);
  return out.concat(splits);
}

/**
 * The biggest title (and subtitle) that fits the box: tries one line and each two-line split, from a target
 * size of H/5 down. Sizes include the outline, so measured boxes are the drawn ink.
 * @returns {{ lines: string[], size: number, sub: number, height: number, lineBoxes: object[], subBox: object|null }}
 */
export function fitTitle(ctx, title, subtitle, box, H = THUMB_H, font = TITLE_FONT) {
  const target = Math.round(H / 5);
  const subMax = Math.round(H * 0.075);
  let best = null;
  for (const lines of titleLines(title)) {
    for (let size = Math.round(target * 1.15); size >= 24; size -= 2) {
      const out = outlineOf(size);
      const lb = lines.map((l) => measureSticker(ctx, l, size, { font, pad: out }));
      const sub = subtitle ? Math.min(subMax, Math.round(size * 0.42)) : 0;
      const sb = subtitle ? measureSticker(ctx, subtitle, sub, { font, pad: outlineOf(sub, true) }) : null;
      const gap = size * 0.02;
      const height = lb.reduce((a, b) => a + b.ascent + b.descent, 0) + gap * (lines.length - 1) + (sb ? sb.ascent + sb.descent + size * 0.08 : 0);
      const width = Math.max(...lb.map((b) => b.width), sb?.width ?? 0);
      if (width <= box.w && height <= box.h) {
        // A two-line title wins only when it lets the type grow by a fifth (one line reads faster).
        if (!best || size > best.size * (lines.length > best.lines.length ? 1.2 : 1)) best = { lines, size, sub, height, lineBoxes: lb, subBox: sb, gap };
        break;
      }
    }
    if (best && best.size >= target && lines.length === 1) break;
  }
  if (!best) throw new Error(`title "${title}" does not fit ${box.w}x${box.h}`);
  return best;
}
const outlineOf = (size, sub = false) => size * (sub ? 0.16 : 0.135); // white rim + dark outline, outside the glyph

const hexOf = (c, catalog) => (c?.startsWith?.("#") ? c : catalog.colors[c ?? "yellow"]?.hex ?? "#f5c43c");
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)));
  return `rgb(${ch.join(",")})`;
}

/** The dark gradient behind the title's side: strong enough for contrast, soft enough to keep the scene. */
function scrim(ctx, side, W, H) {
  const g = { left: [0, 0, W * 0.66, 0], right: [W, 0, W * 0.34, 0], top: [0, 0, 0, H * 0.62], bottom: [0, H, 0, H * 0.38] }[side];
  const grad = ctx.createLinearGradient(...g);
  grad.addColorStop(0, "rgba(16,22,58,0.5)");
  grad.addColorStop(0.55, "rgba(16,22,58,0.22)");
  grad.addColorStop(1, "rgba(16,22,58,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A rounded pill (the grade badge) at a corner; returns its box. */
function badge(ctx, text, corner, W, H, color) {
  const size = Math.round(H * 0.05);
  const m = Math.round(H * 0.045);
  ctx.font = fontAt(TITLE_FONT, size);
  const w = Math.ceil(ctx.measureText(text).width + size * 1.1);
  const h = Math.round(size * 1.5);
  const x = corner.endsWith("r") ? W - m - w : m;
  const y = corner.startsWith("b") ? H - m - h : m;
  ctx.save();
  ctx.shadowColor = "rgba(10,15,40,0.45)";
  ctx.shadowBlur = size * 0.4;
  ctx.shadowOffsetY = size * 0.12;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.lineWidth = size * 0.14;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x + w / 2, y + h / 2 + size * 0.04);
  return { x, y, w, h };
}

/** The brand mark ("Toy Box Friends"; env THUMB_BRAND overrides it, e.g. "Toybox Elementary" for the 10K videos)
 * in the logo's block colours, small, at a corner (above a badge sharing it). */
function mark(ctx, corner, W, H, lift = 0) {
  const size = Math.round(H * 0.036);
  const m = Math.round(H * 0.045);
  const text = process.env.THUMB_BRAND || "Toy Box Friends";
  ctx.font = fontAt(TITLE_FONT, size);
  const widths = [...text].map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = corner.endsWith("r") ? W - m - total : m;
  const y = corner.startsWith("b") ? H - m - lift : m + size;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  let c = 0;
  [...text].forEach((ch, i) => {
    if (ch !== " ") {
      ctx.lineWidth = size * 0.28;
      ctx.strokeStyle = "#ffffff";
      ctx.strokeText(ch, x, y);
      ctx.fillStyle = MARK_COLORS[c++ % MARK_COLORS.length];
      ctx.fillText(ch, x, y);
    }
    x += widths[i];
  });
}

/**
 * Lays the 2D text over a still. Draws onto a WxH canvas and returns the title's drawn box (for tests).
 * @param {object} concept   one meta.thumbnails entry
 * @param {{ ctx: CanvasRenderingContext2D, still?: any, catalog: object, W?: number, H?: number }} o
 */
export function composeThumbnail(concept, { ctx, still, catalog, W = THUMB_W, H = THUMB_H }) {
  if (still) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(still, 0, 0, W, H);
  }
  const L = thumbLayout(concept.side, W, H);
  scrim(ctx, L.scrim, W, H);
  const fit = fitTitle(ctx, concept.title, concept.subtitle, L.title, H);
  const fill = hexOf(concept.titleColor, catalog);
  const box = L.title;
  const cx = box.x + box.w / 2;
  let y = box.y + (box.h - fit.height) / 2;
  if (concept.side === "top") y = box.y; // hug the top edge
  if (concept.side === "bottom") y = box.y + box.h - fit.height;
  const drawn = { x: Infinity, y, w: 0, h: fit.height };
  ctx.textAlign = "center";
  fit.lines.forEach((line, i) => {
    const b = fit.lineBoxes[i];
    y += b.ascent;
    const grad = ctx.createLinearGradient(0, y - b.ascent, 0, y);
    grad.addColorStop(0, shade(fill, 0.35));
    grad.addColorStop(1, shade(fill, -0.08));
    const out = outlineOf(fit.size);
    sticker(ctx, line, cx, y, fit.size, grad, { font: TITLE_FONT, rim: out * 0.38, outline: out * 0.62, ink: INK });
    drawn.x = Math.min(drawn.x, cx - b.width / 2);
    drawn.w = Math.max(drawn.w, b.width);
    y += b.descent + fit.gap;
  });
  if (concept.subtitle) {
    y += fit.size * 0.08 - fit.gap + fit.subBox.ascent;
    const out = outlineOf(fit.sub, true);
    sticker(ctx, concept.subtitle, cx, y, fit.sub, "#ffffff", { font: TITLE_FONT, white: false, outline: out, ink: INK, shadow: 0.8 });
  }
  const badgeColor = concept.titleColor === "red" || concept.titleColor === "pink" ? "#3d86ea" : "#f2504b";
  const b = concept.badge ? badge(ctx, concept.badge, L.badge, W, H, badgeColor) : null;
  mark(ctx, L.mark, W, H, b && L.badge === L.mark ? b.h + H * 0.02 : 0);
  return drawn;
}

/**
 * Renders and composes the concepts of one script. Returns the written thumbnail paths.
 * @param {string} input  a video3d script with meta.thumbnails
 * @param {{ outDir?: string, only?: string, render?: boolean, log?: (s: string) => void }} [o]
 */
export async function makeThumbnails(input, { outDir, only, render = true, log = console.log } = {}) {
  const script = JSON.parse(readFileSync(input, "utf8"));
  const catalog = loadCatalog3d();
  const v = validateScript(script, catalog);
  if (!v.ok) throw new Error(v.errors.map((e) => `${e.code} ${e.path}: ${e.message}`).join("\n"));
  const concepts = script.meta?.thumbnails ?? [];
  if (!concepts.length) throw new Error(`${input}: no meta.thumbnails`);
  const id = basename(input, ".json");
  const dir = resolve(outDir ?? join(REPO, "out/series3d", script.meta.series ?? "misc", id));
  const work = join(dir, ".thumbs");
  mkdirSync(work, { recursive: true });
  const backend = await loadBackend();
  const written = [];
  const pics = [];
  for (const c of concepts) {
    const file = join(dir, `thumbnail_${c.name}.jpg`);
    if (only && c.name !== only) {
      if (existsSync(file)) pics.push({ c, file });
      continue;
    }
    const name = `thumb_${c.name}`;
    const t = c.at ?? THUMB_AT;
    const png = render || !existsSync(stillPath3d(work, name, t)) ? renderStill3d(thumbnailScript(script, c), { dir: work, name, t }) : stillPath3d(work, name, t);
    const canvas = backend.createCanvas(THUMB_W, THUMB_H);
    composeThumbnail(c, { ctx: canvas.getContext("2d"), still: await backend.loadImage(png), catalog });
    await saveJpg(backend, canvas, file);
    log(`  thumbnail -> ${file}`);
    written.push(file);
    pics.push({ c, file });
  }
  const first = join(dir, `thumbnail_${concepts[0].name}.jpg`);
  if (existsSync(first)) writeFileSync(join(dir, "thumbnail.jpg"), readFileSync(first));
  if (pics.length) await sheet(backend, pics, join(dir, "thumbnails_sheet.jpg"));
  log(`  sheet -> ${join(dir, "thumbnails_sheet.jpg")}`);
  return written;
}

/** All concepts side by side at 640x360, with phone-size copies (YouTube's mobile list, ~240 px wide) under them. */
async function sheet(backend, pics, file) {
  const [w, h, sw, sh, pad, label] = [640, 360, 240, 135, 24, 30];
  const c = backend.createCanvas(pics.length * (w + pad) + pad, pad + label + h + pad + sh + pad);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f4f5f8";
  ctx.fillRect(0, 0, c.width, c.height);
  for (const [i, { c: concept, file: f }] of pics.entries()) {
    const img = await backend.loadImage(f);
    const x = pad + i * (w + pad);
    ctx.font = "bold 20px Andika";
    ctx.fillStyle = INK;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`${concept.name}: ${concept.title}${i === 0 ? "  (thumbnail.jpg)" : ""}`, x, pad + 20);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, x, pad + label, w, h);
    ctx.drawImage(img, x, pad + label + h + pad, sw, sh);
    ctx.font = "16px Inter";
    ctx.fillStyle = "#6b7290";
    ctx.fillText("phone size", x + sw + 12, pad + label + h + pad + sh / 2);
  }
  await saveJpg(backend, c, file);
}

async function saveJpg(backend, canvas, file) {
  const png = `${file}.png`;
  await backend.savePng(canvas, png);
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-i", png, "-q:v", "2", file]); // q:v 2 is JPEG quality ~90
  rmSync(png, { force: true });
  if (r.status !== 0) throw new Error(String(r.stderr));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
  const input = args.find((a, i) => !a.startsWith("--") && !["--out", "--only"].includes(args[i - 1]));
  if (!input) {
    console.error("usage: thumbnail3d.mjs <script.json> [--out dir] [--only name] [--no-render]");
    process.exit(2);
  }
  try {
    await makeThumbnails(resolve(input), { outDir: opt("--out"), only: opt("--only"), render: !args.includes("--no-render") });
  } catch (e) {
    console.error(String(e.message ?? e));
    process.exit(1);
  }
}
