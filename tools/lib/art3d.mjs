// Shared helpers for designed stills made from engine3d scenes (channel art, episode thumbnails): render a JSON
// scene to one 4K PNG with render3d (no speech, no music), and draw sticker-style text with the canvas backend
// (tools/lib/canvas.mjs). Used by tools/channel_art_toybox.mjs and engine3d/tools/thumbnail3d.mjs.

import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const REPO = resolve(new URL("../../", import.meta.url).pathname);
export const INK = "#24305e";

/**
 * Writes `scene` to <dir>/<name>.json, renders the frame at `t` seconds as a 4K PNG and returns its path.
 * @param {object} scene  a video3d script
 * @param {{ dir: string, name: string, t?: number }} o
 */
export function renderStill3d(scene, { dir, name, t = 1 }) {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${name}.json`);
  writeFileSync(file, JSON.stringify(scene, null, 1));
  const r = spawnSync(process.execPath, [join(REPO, "engine3d/tools/render3d.mjs"), file, "--speech", "off", "--music", "off", "--stills", String(t), "--res", "4k", "--out", join(dir, `${name}.mp4`)], { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`render3d failed for ${name}`);
  return stillPath3d(dir, name, t);
}

/** "bold Andika" at 120 → "bold 120px Andika". */
export const fontAt = (font, size) => (font.startsWith("bold ") ? `bold ${size}px ${font.slice(5)}` : `${size}px ${font}`);

/** Where renderStill3d puts the PNG (to reuse earlier renders). */
export const stillPath3d = (dir, name, t = 1) => resolve(dir, `${name}_stills`, `${name}_4k_t${t.toFixed(2)}.png`);

/**
 * Sticker text: a thick dark outline, a white rim (optional) and a soft drop shadow under the fill.
 * The caller sets ctx.textAlign; `font` is a CSS font without the size ("bold Andika").
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ font?: string, rim?: number, outline?: number, ink?: string, white?: boolean, shadow?: number }} [o]
 *   rim: white rim width (px); outline: dark outline width (px), both measured outside the glyph
 */
export function sticker(ctx, text, x, y, size, fill, { font = "bold Andika", rim = size * 0.09, outline = rim * 1.3, ink = INK, white = true, shadow = 1 } = {}) {
  ctx.font = fontAt(font, size);
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  const out = white ? rim + outline : outline;
  ctx.save();
  if (shadow) {
    ctx.shadowColor = `rgba(20,30,70,${0.35 * shadow})`;
    ctx.shadowOffsetY = size * 0.06;
    ctx.shadowBlur = size * 0.08;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = out * 2;
  ctx.strokeText(text, x, y);
  ctx.restore();
  if (white) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = rim * 2;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  return out;
}

/**
 * The ink box of `text` at `size`, outline included: { width, ascent, descent } in px.
 * @param {CanvasRenderingContext2D} ctx
 */
export function measureSticker(ctx, text, size, { font = "bold Andika", pad = 0 } = {}) {
  ctx.font = fontAt(font, size);
  const m = ctx.measureText(text);
  const left = m.actualBoundingBoxLeft ?? 0;
  const right = m.actualBoundingBoxRight ?? m.width;
  return { width: Math.max(m.width, left + right) + 2 * pad, ascent: (m.actualBoundingBoxAscent ?? size * 0.75) + pad, descent: (m.actualBoundingBoxDescent ?? size * 0.2) + pad };
}
