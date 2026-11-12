// Doopi & Friends art helpers shared by tools/channel_art.mjs and series/doopi/s2/thumbnails.mjs: engine stills of
// a one-scene story (public API), sticker-style Bangers text and the rainbow DOOPI logo.

import { readFileSync } from "node:fs";
import { createEngine } from "../../engine/index.js";
import { catalog } from "../../catalog/index.js";

export const preset = (id) => ({ id, ...JSON.parse(readFileSync(new URL(`../../catalog/characters/presets/${id}.json`, import.meta.url))).cast });

/** A preset's cast entry with its prop replaced (a prop name) or removed (null); undefined keeps the preset's. */
function withProp(c, prop) {
  if (prop === undefined) return c;
  const { prop: _old, ...rest } = c;
  return prop ? { ...rest, prop } : rest;
}

// The seven Rainbow Crystal colours (BIBLE.md), one per logo letter.
export const RAINBOW = ["#ff4d4d", "#ff9f1c", "#ffd23f", "#4cc960", "#3fa7ff", "#5b5bd6", "#b05be0"];
export const GROUND = 880;

/**
 * Render one still of a one-scene Tokyo story with the engine.
 * @param {{ cast: {id:string,x:number,facing:number,face:string,prop?:string|null,entry?:object}[], beats?: object[], cam: {x:number,y:number,zoom:number}, scale: number, at: number, time?: string, theme?: string, set?: object[], weather?: string }} o
 * @param {{ createCanvas: Function }} backend  tools/lib/canvas.mjs
 */
export function still(o, backend) {
  const story = {
    version: 2,
    meta: { title: "Channel art", format: "landscape", seed: 7, kind: "clip" },
    cast: o.cast.map((c) => withProp(c.entry ? { ...c.entry, id: c.id } : preset(c.id), c.prop)),
    locations: [{ id: "here", theme: o.theme || "tokyo_village", stageWidth: 3600, set: o.set ?? [{ id: "lan", object: "lantern_string", x: 1800, layer: "back" }] }],
    scenes: [{
      id: "a", location: "here", time: o.time || "day", duration: 4, ...(o.weather ? { weather: o.weather } : {}),
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
export const camY = (screenY, zoom) => GROUND - (screenY - 540) / zoom;

/** Text with a thick dark outline, a white rim and a soft drop shadow (sticker style). */
export function sticker(ctx, text, x, y, size, fill, { rim = size * 0.1 } = {}) {
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
export function logo(ctx, cx, top, size) {
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

