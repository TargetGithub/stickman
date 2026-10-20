// Talking mouth shapes (STORY_SPEC 7.1a, ADR-024). Draws one viseme from its catalog data
// (catalog/characters/visemes.json: open, width, round, teeth, tongue, tongueUp, press, bite) in the
// face's coordinates. The "line" mouth style draws ink shapes; "cartoon" adds a dark-red inside,
// a pink tongue and white teeth. Quadrupeds (jaw) only open and close.

const INK = "#111111";
const INSIDE = "#5a1822";
const TONGUE = "#ff7f8e";
const TEETH = "#ffffff";

// Expressions keep their corners while talking: smiles lift them, frowns drop them (face units).
const CORNERS = { smile: 0.05, grin: 0.05, smirk: 0.03, frown: -0.05, wavy: -0.02 };

/**
 * @param {object} at  face helpers: pt(f, u) → point, f / u axes (face.js)
 * @param {number} r  head radius
 * @param {object} shape  the viseme's catalog entry
 * @param {{ k:number, scale:number, cartoon:boolean, jaw:boolean, mouth?:string, teeth?:boolean }} o
 *   k: how far it opens (0..1); scale: mouth size (1.35 cartoon); mouth: the face's own mouth (corners);
 *   teeth: the face talks through teeth (angry faces)
 */
export function drawViseme(ctx, at, r, shape, o) {
  const s = o.scale;
  const lift = CORNERS[o.mouth] ?? 0;
  const m = (df, du) => at.pt(0.4 + df * s, -0.4 + du * s);
  const lw = r * 0.09 * Math.sqrt(s);
  const jaw = o.jaw;
  const w = jaw ? 0.15 : shape.width ?? 0.14;
  const h = (shape.open ?? 0) * o.k * (jaw ? 0.9 : 1);
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";

  if (!jaw && shape.bite) return bite(ctx, m, w, lift, lw);
  if (h < 0.025) {
    // Closed: pressed lips (m, b, p) are a slightly fuller line.
    ctx.lineWidth = shape.press && !jaw ? lw * 1.35 : lw;
    ctx.beginPath();
    const a = m(-w, lift);
    const b = m(w, lift);
    const c = m(0, shape.press ? -0.02 : -lift * 0.5);
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
    return ctx.stroke();
  }
  const round = !jaw && (shape.round ?? 0) >= 0.5;
  const path = () => {
    ctx.beginPath();
    if (round) {
      const c = m(0, -h / 2);
      ctx.ellipse(c.x, c.y, Math.max(0.5, w * r * s), Math.max(0.5, (h / 2) * r * s), Math.atan2(at.f.y, at.f.x), 0, Math.PI * 2);
    } else {
      // A "D": a nearly flat top lip and a jaw that drops in the middle.
      const a = m(-w, lift);
      const b = m(w, lift);
      const top = m(0, 0.02);
      const low = m(0, lift - 2 * h);
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(top.x, top.y, b.x, b.y);
      ctx.quadraticCurveTo(low.x, low.y, a.x, a.y);
      ctx.closePath();
    }
  };
  path();
  ctx.fillStyle = o.cartoon ? INSIDE : INK;
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  if (o.cartoon && (shape.tongue || jaw) && h > 0.08) blob(ctx, m(0, lift - h * 1.05), w * 0.75 * r * s, h * 0.55 * r * s, at, TONGUE);
  if (o.cartoon && shape.tongueUp) blob(ctx, m(0, 0.0), w * 0.45 * r * s, h * 0.45 * r * s, at, TONGUE);
  if (!jaw && (shape.teeth || o.teeth) && h > 0.06) {
    ctx.strokeStyle = TEETH;
    ctx.lineWidth = Math.min(h * 0.32, 0.06) * r * s;
    ctx.beginPath();
    const a = m(-w, 0.01);
    const b = m(w, 0.01);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
  if (o.cartoon) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.6;
    path();
    ctx.stroke();
  }
  return null;
}

/** f and v: the lower lip with the top teeth resting on it. */
function bite(ctx, m, w, lift, lw) {
  const a = m(-w * 0.55, 0.045);
  const b = m(w * 0.55, 0.045);
  const c = m(w * 0.55, -0.005);
  const d = m(-w * 0.55, -0.005);
  ctx.fillStyle = TEETH;
  ctx.lineWidth = lw * 0.45;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = lw;
  const p = m(-w, lift);
  const q = m(w, lift);
  const low = m(0, -0.05);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.quadraticCurveTo(low.x, low.y, q.x, q.y);
  ctx.stroke();
  return null;
}

function blob(ctx, p, rx, ry, at, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, Math.max(0.5, rx), Math.max(0.5, ry), Math.atan2(at.f.y, at.f.x), 0, Math.PI * 2);
  ctx.fill();
}
