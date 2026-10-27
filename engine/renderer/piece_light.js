// Light on set pieces, world objects and props (ENGINE_V3_SPEC 5.2, ADR-035). Draw time only.
// A piece is drawn by its own shape (procedural or imported SVG) into a scratch layer the size of its screen
// box; the layer then gets the character treatment from its own silhouette, so it works for any drawing:
// - a dark band along the edges away from the key light (multiplied, so dark lines stay dark),
// - a lit band along the edges toward it, and a thin rim inside the lit edge,
// all inside the piece eroded by its outline width, so outlines and silhouettes never change. The bands are the
// layer minus itself shifted along the light: what is left are the pixels within d of an edge facing that way.
// Contact shadows are soft ellipses under pieces that stand on the floor. Without a host canvas factory
// (unit tests) pieces draw unlit, as before.

import { pieceContact } from "../lighting.js";
import { STAGE } from "../config.js";

const realOf = (ctx) => ctx.__real || ctx;

/**
 * Three scratch canvases (the piece, its eroded mask, a band), made once at the largest size a piece can take:
 * the frame grown by the 40 px pad on each side. A fixed size keeps frames independent of the pieces drawn
 * before them (canvases grown as needed came out at sizes that depended on history, and Skia's filtering of
 * the sub-pixel band copies varies with the canvas size).
 */
function scratch(r, W, H) {
  if (r.pieceScratch && r.pieceScratch.w === W + 80 && r.pieceScratch.h === H + 80) return r.pieceScratch;
  const make = () => {
    const canvas = r.createCanvas(W + 80, H + 80);
    return { canvas, ctx: canvas.getContext("2d") };
  };
  r.pieceScratch = { w: W + 80, h: H + 80, piece: make(), mask: make(), band: make() };
  return r.pieceScratch;
}

/**
 * The screen rect of a box in the current transform of ctx, clamped to the frame grown by pad (so a piece cut by
 * the frame edge gets no band along it), in whole pixels (null: off frame).
 * @param {{ x0, y0, x1, y1 }} b  in ctx user space
 */
export function screenRect(m, b, W, H, pad = 0) {
  const pts = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
  const x0 = Math.max(-pad, Math.floor(Math.min(...pts.map((p) => p[0]))));
  const y0 = Math.max(-pad, Math.floor(Math.min(...pts.map((p) => p[1]))));
  const x1 = Math.min(W + pad, Math.ceil(Math.max(...pts.map((p) => p[0]))));
  const y1 = Math.min(H + pad, Math.ceil(Math.max(...pts.map((p) => p[1]))));
  return x1 > Math.max(x0, 0) && y1 > Math.max(y0, 0) && x0 < W && y0 < H ? { x0, y0, x1, y1 } : null;
}

/**
 * Band widths in screen px for a piece whose box is size px across its smaller side: the dark band, the lit band,
 * the rim and the outline margin the bands keep clear of.
 */
export function bandWidths(size, scale) {
  const d = Math.min(36, Math.max(3, size * 0.16));
  return { dark: d, lit: d * 0.6, rim: Math.max(1.5, d * 0.16), margin: Math.max(1.5, 2.6 * scale) };
}

const reset = (g) => {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
  g.filter = "none";
};

/** dst := what of src lies within d of an edge facing (dx, dy): src minus src shifted by (dx, dy) * d. */
function band(dst, src, w, h, dx, dy, d, color) {
  reset(dst);
  dst.clearRect(0, 0, w, h);
  dst.drawImage(src.canvas, 0, 0, w, h, 0, 0, w, h);
  dst.globalCompositeOperation = "destination-out";
  dst.drawImage(src.canvas, 0, 0, w, h, -dx * d, -dy * d, w, h);
  dst.globalCompositeOperation = "source-in";
  dst.fillStyle = color;
  dst.fillRect(0, 0, w, h);
  dst.globalCompositeOperation = "source-over";
}

/**
 * Draw something lit: `draw(g)` draws it into g (with ctx's current transform); the tones are pieceTones() of the
 * frame's rig. box: generous bounds in ctx user space; size: the thing's smaller side in user space (sets the band
 * widths). Without tones or a canvas factory it draws straight to ctx.
 */
export function drawLit(ctx, r, tones, box, draw, size) {
  if (!tones || !r?.createCanvas || !box) return draw(ctx);
  const real = realOf(ctx);
  const m = real.getTransform();
  const W = real.canvas?.width ?? r.PW;
  const H = real.canvas?.height ?? r.PH;
  const rect = screenRect(m, box, W, H, 40);
  if (!rect) return draw(ctx);
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  const s = scratch(r, W, H);
  const P = s.piece.ctx;
  reset(P);
  P.clearRect(0, 0, w, h);
  P.setTransform(m.a, m.b, m.c, m.d, m.e - rect.x0, m.f - rect.y0);
  draw(P);
  reset(P);
  // The piece eroded by its outline: the layer kept only where it also covers itself shifted four ways.
  const scale = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
  const bw = bandWidths((size ?? Math.min(box.x1 - box.x0, box.y1 - box.y0) * 0.5) * scale, scale);
  const M = s.mask.ctx;
  reset(M);
  M.clearRect(0, 0, w, h);
  M.drawImage(s.piece.canvas, 0, 0, w, h, 0, 0, w, h);
  M.globalCompositeOperation = "destination-in";
  for (const [ox, oy] of [[bw.margin, 0], [-bw.margin, 0], [0, bw.margin], [0, -bw.margin]]) M.drawImage(s.piece.canvas, 0, 0, w, h, ox, oy, w, h);
  M.globalCompositeOperation = "source-over";
  const { dir } = tones;
  const B = s.band.ctx;
  // Dark band: multiplied over the piece (dark lines stay dark; colours darken toward the fill tint).
  band(B, s.mask.ctx, w, h, -dir.x, -dir.y, bw.dark, tones.dark);
  P.globalCompositeOperation = "multiply";
  P.drawImage(s.band.canvas, 0, 0, w, h, 0, 0, w, h);
  // Lit band and rim: laid over inside the piece only.
  P.globalCompositeOperation = "source-atop";
  if (tones.litAlpha > 0.004) {
    band(B, s.mask.ctx, w, h, dir.x, dir.y, bw.lit, tones.lit);
    P.globalAlpha = tones.litAlpha;
    P.drawImage(s.band.canvas, 0, 0, w, h, 0, 0, w, h);
  }
  if (tones.rimAlpha > 0.01) {
    band(B, s.mask.ctx, w, h, dir.x, dir.y, bw.rim, tones.rim);
    P.globalAlpha = Math.min(1, tones.rimAlpha);
    P.drawImage(s.band.canvas, 0, 0, w, h, 0, 0, w, h);
  }
  reset(P);
  real.save();
  real.setTransform(1, 0, 0, 1, 0, 0);
  // Paste through a canvas the piece's own size: a sub-rect of the frame-sized scratch drawn into a clipped
  // depth-of-field layer took Skia about 5 s on every other frame (Doopi ep08 at 0.1 frames/s, 2026-10-26).
  // The copies are 1:1 on whole pixels, so the result is the same.
  const out = r.createCanvas(w, h);
  out.getContext("2d").drawImage(s.piece.canvas, 0, 0, w, h, 0, 0, w, h);
  real.drawImage(out, rect.x0, rect.y0);
  real.restore();
}

/**
 * A soft contact shadow under a piece standing at world x on the floor (current transform: the piece's depth).
 * @param {{ dx, rx, ry, alpha }|null} sh  pieceContact() from lighting.js
 */
export function drawPieceContact(ctx, x, sh, alpha = 1) {
  if (!sh || sh.alpha * alpha <= 0.01) return;
  const a = sh.alpha * alpha;
  ctx.save();
  ctx.translate(x + sh.dx, STAGE.groundY + 3);
  ctx.scale(1, sh.ry / sh.rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, sh.rx);
  g.addColorStop(0, `rgba(0,0,0,${(a * 1.1).toFixed(3)})`);
  g.addColorStop(0.65, `rgba(0,0,0,${(a * 0.8).toFixed(3)})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, sh.rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The contact shadow of a catalog object standing on the floor at x, lifted by lift px (null rig: none). */
export function pieceShadow(ctx, rig, def, x, lift = 0) {
  if (!rig || !def) return;
  drawPieceContact(ctx, x, pieceContact(rig, def, lift));
}

/** A generous user-space box around a prop drawn between butt and tip, width w. */
export function propBox(t, w) {
  const pad = w * 3 + 12;
  return { x0: Math.min(t.butt.x, t.tip.x) - pad, y0: Math.min(t.butt.y, t.tip.y) - pad, x1: Math.max(t.butt.x, t.tip.x) + pad, y1: Math.max(t.butt.y, t.tip.y) + pad };
}
