// Cartoon shading under a light rig (ENGINE_V3_SPEC 5.2, ADR-024). Milestone: V3.3.
// Three flat tones, no gradients: a dark band along the side of each limb away from the light, a lit band
// toward it, a rim line on the lit edge; the head and a filled torso get a shadow crescent and a rim arc.
// Every pass stays inside the shape it shades (bands are thinner than the limb and offset by less than the
// margin; the head and torso passes are clipped), so outlines never change. Pure drawing helpers.

import { torsoPath } from "./bodies.js";

/** Offset a polyline by a vector. */
const shift = (pts, dx, dy) => pts.map((p) => ({ x: p.x + dx, y: p.y + dy }));

function stroke(ctx, lines, color, lw) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  for (const pts of lines) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
}

/**
 * Shade stroked limbs that were just drawn in their base colour with width lw.
 * @param {{ lit, dark, rim, rimAlpha, rimWidth, dir:{x,y} }} tones  shadeTones() of the limb colour
 */
export function shadeStrokes(ctx, lines, lw, tones) {
  const { dir } = tones;
  // Dark band on the far side: width 0.5 lw, centred 0.25 lw from the axis (stays inside the 0.5 lw radius).
  stroke(ctx, lines.map((pts) => shift(pts, -dir.x * lw * 0.25, -dir.y * lw * 0.25)), tones.dark, lw * 0.5);
  // Lit band toward the light: thinner, closer to the edge.
  stroke(ctx, lines.map((pts) => shift(pts, dir.x * lw * 0.26, dir.y * lw * 0.26)), tones.lit, lw * 0.34);
  if (tones.rimAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha *= tones.rimAlpha;
    stroke(ctx, lines.map((pts) => shift(pts, dir.x * lw * 0.38, dir.y * lw * 0.38)), tones.rim, lw * tones.rimWidth * 0.5);
    ctx.restore();
  }
}

/** Shade a round head of radius r at c (after its fill, before the face). */
export function shadeHead(ctx, c, r, tones) {
  const { dir } = tones;
  ctx.save();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.clip();
  // A dark crescent on the far side: a circle of the same size shifted away from the light.
  ctx.fillStyle = tones.dark;
  ctx.beginPath();
  ctx.arc(c.x - dir.x * r * 0.55, c.y - dir.y * r * 0.55, r * 0.95, 0, Math.PI * 2);
  ctx.fill();
  // The base tone back over the middle, so the crescent is a band, not half the head.
  ctx.fillStyle = tones.base;
  ctx.beginPath();
  ctx.arc(c.x + dir.x * r * 0.08, c.y + dir.y * r * 0.08, r * 0.78, 0, Math.PI * 2);
  ctx.fill();
  // A lit spot toward the light.
  ctx.fillStyle = tones.lit;
  ctx.beginPath();
  ctx.arc(c.x + dir.x * r * 0.42, c.y + dir.y * r * 0.4, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  if (tones.rimAlpha > 0.01) {
    const a = Math.atan2(dir.y, dir.x);
    ctx.globalAlpha *= tones.rimAlpha;
    ctx.strokeStyle = tones.rim;
    ctx.lineWidth = r * 0.14;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r * 0.9, a - 0.9, a + 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Shade a filled torso (capsule or trapezoid) that drawTorso just drew: a dark band inside the far edge and a
 * lit band inside the near edge, clipped to the torso path.
 * @param {object} o  the drawTorso options (draw, torsoWidth, scale)
 */
export function shadeTorso(ctx, j, o, tones) {
  if (o.draw !== "capsule" && o.draw !== "trapezoid") return;
  const { dir } = tones;
  const w = (o.torsoWidth ?? 20) * o.scale;
  ctx.save();
  torsoPath(ctx, j, o);
  ctx.clip();
  const spine = [j.hip, j.neckTop];
  stroke(ctx, [shift(spine, -dir.x * w * 0.95, -dir.y * w * 0.95)], tones.dark, w * 0.7);
  stroke(ctx, [shift(spine, dir.x * w * 0.9, dir.y * w * 0.9)], tones.lit, w * 0.45);
  if (tones.rimAlpha > 0.01) {
    ctx.globalAlpha *= tones.rimAlpha;
    stroke(ctx, [shift(spine, dir.x * w * 1.02, dir.y * w * 1.02)], tones.rim, w * 0.18);
  }
  ctx.restore();
}

/**
 * The contact shadow under a character from the rig: an ellipse stretched away from the light.
 * @param {{ dx, rx, ry, alpha }} sh  contactShadow() from lighting.js
 */
export function drawLitContactShadow(ctx, c, sh, groundY) {
  if (c.alpha <= 0.01) return;
  const h = groundY - Math.max(c.j.lFoot.y, c.j.rFoot.y);
  const k = Math.max(0, 1 - h / 400); // fades and shrinks as the character jumps
  ctx.fillStyle = `rgba(0,0,0,${(sh.alpha * k * c.alpha).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(c.j.hip.x + sh.dx, groundY + 3, sh.rx * (0.6 + 0.4 * k), sh.ry * (0.6 + 0.4 * k), 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * A cast shadow: the character's silhouette drawn through a flattening transform about its feet.
 * @param {{ a, b, c, d, alpha }} cast  castShadow() from lighting.js
 * @param {(ctx, grey) => void} silhouette  draws the character in the grey colour given, no outline, no face
 */
export function drawCastShadow(ctx, c, cast, groundY, silhouette) {
  if (c.alpha <= 0.01) return;
  const fx = c.j.hip.x;
  ctx.save();
  // A multiply pass with a grey darkens whatever is under the silhouette by the shadow's alpha, whatever the
  // character drawer does with globalAlpha; overlapping strokes darken a little more, as real shadows do not,
  // but the grey keeps it soft.
  ctx.globalCompositeOperation = "multiply";
  ctx.translate(fx + (cast.tx || 0) * c.scale, groundY + (cast.ty || 0) * c.scale);
  ctx.transform(cast.a, cast.b, cast.c, cast.d, 0, 0);
  ctx.translate(-fx, -groundY);
  const g = Math.round(255 * (1 - cast.alpha * c.alpha));
  silhouette(ctx, `#${g.toString(16).padStart(2, "0").repeat(3)}`);
  ctx.restore();
}
