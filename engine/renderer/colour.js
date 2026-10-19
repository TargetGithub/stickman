// Character and scene colour effects (package A3, STORY_SPEC 5.2, 13): the Heart Glow (set_glow), the scene
// colour grade (scene `grade`, set_grade, a colour wave from a character), and petrified characters
// (stone grey, then the colour flooding back up from the feet when they thaw). Pure functions of the event
// log and the frame time; glow and petrify read the whole story's events, so they carry over between scenes.

const GLOW_COLOR = "#ffd23f";
const PETRIFY_FADE = 1.5; // s to stone grey
const THAW = 1.2; // s for the colour to flood back up
const PULSE = 1.4; // s per glow pulse
const WAVE_Y = 220; // px above the floor: the wave's centre on the character
const STONE = (k) => `grayscale(${k.toFixed(3)}) contrast(${(1 - 0.18 * k).toFixed(3)}) brightness(${(1 + 0.06 * k).toFixed(3)})`;

const progress = (t, t0, dur) => (dur > 0 ? Math.min(1, Math.max(0, (t - t0) / dur)) : 1);

/**
 * A character's glow at video time t, or null when it is off.
 * @param {object[]} changes  set_glow world events for this character, in order
 * @returns {{ color:string, level:number }|null}  color is a hex color or "rainbow"
 */
export function glowAt(changes, t) {
  let level = 0;
  let color = GLOW_COLOR;
  for (const e of changes) {
    if (e.videoT > t) break;
    level += (e.params.level - level) * progress(t, e.videoT, e.params.dur ?? 0);
    color = e.params.color ?? color;
  }
  return level > 0.005 ? { color, level } : null;
}

/** The glow's fill color at time t (a rainbow cycles its hue). */
export function glowColor(glow, t) {
  return glow.color === "rainbow" ? `hsl(${Math.round((t * 120) % 360)}, 95%, 62%)` : glow.color;
}

/** A soft pulsing halo behind the body (world space): a tinted haze with a brighter core. */
export function drawGlow(ctx, c, glow, t) {
  const j = c.j;
  const top = Math.min(j.head.y, j.lHand.y, j.rHand.y);
  const bottom = Math.max(j.lFoot.y, j.rFoot.y);
  const cx = (j.head.x + j.hip.x) / 2;
  const cy = (top + bottom) / 2;
  const pulse = 0.85 + 0.15 * Math.sin((2 * Math.PI * t) / PULSE);
  const r = Math.max(80 * c.scale, (bottom - top) * (0.55 + 0.25 * glow.level)) * (0.94 + 0.06 * pulse);
  const col = glowColor(glow, t);
  const a = Math.min(1, glow.level * pulse) * (c.alpha ?? 1);
  ctx.save();
  const haze = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  haze.addColorStop(0, col);
  haze.addColorStop(0.55, col);
  haze.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.4 * a;
  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.6);
  core.addColorStop(0, "rgba(255,255,255,0.9)");
  core.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalAlpha = 0.5 * a;
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * The scene's colour grade at video time t, or null at full colour.
 * @param {{ grade?: { saturation:number, keepCast?:boolean } }} look  the scene look
 * @param {object[]} events  the scene's set_grade world events, in order
 * @returns {{ sat:number, keepCast:boolean, wave: { from:string, u:number, s0:number, s1:number }|null }|null}
 */
export function gradeAt(look, events, t) {
  let sat = look?.grade?.saturation ?? 1;
  let keepCast = !!look?.grade?.keepCast;
  let wave = null;
  for (const e of events) {
    if (e.videoT > t) break;
    const p = e.params;
    const u = progress(t, e.videoT, p.dur ?? 0);
    if (p.keepCast !== undefined) keepCast = p.keepCast;
    // A wave from a character: inside the growing circle the new value, outside the old one.
    wave = p.from && u < 1 ? { from: p.from, u, s0: sat, s1: p.saturation } : null;
    sat += (p.saturation - sat) * u;
  }
  if (wave && keepCast) wave = null; // with the cast in colour the grade blends evenly (canvas filter)
  if (!wave && sat > 0.999) return null;
  return { sat, keepCast, wave };
}

/** The canvas filter for the world (background, set pieces, particles) when the cast keeps its colour. */
export function worldFilter(grade) {
  return grade?.keepCast && grade.sat < 0.999 ? `saturate(${grade.sat.toFixed(3)})` : null;
}

/**
 * Grey the whole world (screen space, after the world is drawn) unless the cast keeps its colour.
 * @param {{ W, H, cam, origin?: {x,y} }} view  origin: the wave's centre in screen px
 */
export function drawWorldGrade(ctx, grade, view) {
  if (!grade || grade.keepCast) return;
  const { W, H } = view;
  const fill = (a) => {
    ctx.fillStyle = `rgba(128,128,128,${Math.min(1, Math.max(0, a)).toFixed(3)})`;
  };
  ctx.save();
  ctx.globalCompositeOperation = "saturation";
  const w = grade.wave;
  if (!w || !view.origin) {
    fill(1 - grade.sat);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return;
  }
  const { x, y } = view.origin;
  const far = Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y));
  const R = far * w.u;
  fill(1 - w.s0);
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill("evenodd");
  fill(1 - w.s1);
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = `rgba(255,255,255,${(0.45 * (1 - w.u)).toFixed(3)})`;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Where a wave starts on screen: the character's middle, or null when it is not in the frame data. */
export function waveOrigin(grade, chars, cam, W, H, groundY) {
  const c = grade?.wave && chars.find((x) => x.id === grade.wave.from);
  if (!c) return null;
  const y = Math.min(c.j.hip.y, groundY - WAVE_Y * c.scale);
  return { x: W / 2 + (c.j.hip.x - cam.x + cam.shakeX) * cam.zoom, y: H / 2 + (y - cam.y + cam.shakeY) * cam.zoom };
}

/**
 * A character's petrify state at video time t, or null when it is in colour.
 * @param {object[]} events  the character's petrify "defeat" and "thaw" events, in order
 * @returns {{ grey:number, thaw:number|null }|null}  grey 0-1 while turning; thaw 0-1 while the colour comes back
 */
export function petrifyAt(events, t) {
  const last = events.findLast((e) => e.videoT <= t);
  if (!last) return null;
  if (last.type === "thaw") {
    const u = progress(t, last.videoT, THAW);
    return u < 1 ? { grey: 1, thaw: u } : null;
  }
  return { grey: progress(t, last.videoT, last.dur ?? PETRIFY_FADE), thaw: null };
}

/** The canvas filter that turns a character to stone (k 0-1). */
export const stoneFilter = (k) => STONE(k);

/** The world-space band (y below it) that is back in colour while thawing: from the feet up. */
export function thawLine(c, u) {
  const j = c.j;
  const top = Math.min(...["head", "lHand", "rHand", "neck"].map((k) => j[k]?.y ?? j.head.y)) - 40 * c.scale;
  const bottom = Math.max(j.lFoot.y, j.rFoot.y) + 20 * c.scale;
  return bottom - (bottom - top) * u;
}
