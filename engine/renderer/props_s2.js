// Season 2 held shapes (Doopi & Friends, "The Whispering Horn"): flute (the golden bamboo Banyan Flute), leaf (a
// folded leaf whistle), jar (a glass jar: empty, open, or with the Hush inside), tiffin (a stacked steel tiffin
// carrier) and radar (Tinku's cloud radar: off, scanning, found). Same contract as props_more.js: drawn between
// t.butt and t.tip at the prop's scale; prop.state comes from the object's states (renderer/world_items.js).

const lerpPt = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
const angleOf = (t) => Math.atan2(t.tip.y - t.butt.y, t.tip.x - t.butt.x);
const TAU = Math.PI * 2;

/** Rotate into the prop's frame: x along butt→tip from its centre, y across. */
function frame(ctx, t, at = 0.5) {
  const c = lerpPt(t.butt, t.tip, at);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(angleOf(t));
}

function flute(ctx, prop, t, scale, outline) {
  const L = Math.hypot(t.tip.x - t.butt.x, t.tip.y - t.butt.y);
  const w = prop.width * scale;
  frame(ctx, t);
  ctx.fillStyle = prop.color;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-L / 2, -w / 2, L, w, w / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(-L / 2 + w * 0.4, -w * 0.32, L - w * 0.8, w * 0.18);
  // Bamboo nodes, the blow hole and six finger holes.
  ctx.strokeStyle = prop.trim;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (const u of [0.12, 0.88]) { ctx.moveTo(-L / 2 + L * u, -w / 2); ctx.lineTo(-L / 2 + L * u, w / 2); }
  ctx.stroke();
  ctx.fillStyle = "#3a2410";
  for (const u of [0.2, 0.5, 0.58, 0.66, 0.74, 0.82, 0.9]) {
    ctx.beginPath();
    ctx.ellipse(-L / 2 + L * u, 0, w * (u === 0.2 ? 0.26 : 0.18), w * 0.18, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "#e63946";
  ctx.fillRect(-L / 2 + L * 0.03, -w / 2 - 1, L * 0.05, w + 2);
  ctx.restore();
}

function leaf(ctx, prop, t, scale, outline) {
  const L = Math.hypot(t.tip.x - t.butt.x, t.tip.y - t.butt.y);
  const w = prop.width * scale;
  frame(ctx, t);
  ctx.fillStyle = prop.color;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-L / 2, 0);
  ctx.quadraticCurveTo(0, -w, L / 2, 0);
  ctx.quadraticCurveTo(0, w, -L / 2, 0);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = prop.trim;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-L / 2, 0);
  ctx.lineTo(L / 2, 0);
  for (const u of [-0.2, 0.05, 0.3]) { ctx.moveTo(L * u, 0); ctx.lineTo(L * u + w * 0.4, -w * 0.35); ctx.moveTo(L * u, 0); ctx.lineTo(L * u + w * 0.4, w * 0.35); }
  ctx.stroke();
  ctx.restore();
}

/** A small Hush puff inside the jar: violet, two glowing eyes blinking now and then. */
function hushInJar(ctx, r, time) {
  const bob = Math.sin(time * 3) * r * 0.08;
  ctx.fillStyle = "#a47ef0";
  for (const [x, y, k] of [[0, -0.05, 0.42], [-0.3, 0.12, 0.3], [0.3, 0.12, 0.3], [0, 0.3, 0.32]]) {
    ctx.beginPath();
    ctx.arc(x * r, y * r + bob, k * r, 0, TAU);
    ctx.fill();
  }
  const blink = (time % 3.1) < 0.12;
  ctx.fillStyle = "#2c1a52";
  for (const x of [-0.15, 0.15]) {
    ctx.beginPath();
    ctx.ellipse(x * r, -0.05 * r + bob, r * 0.11, blink ? r * 0.025 : r * 0.15, 0, 0, TAU);
    ctx.fill();
  }
  if (blink) return;
  ctx.fillStyle = "#ffe66b";
  for (const x of [-0.15, 0.15]) {
    ctx.beginPath();
    ctx.arc(x * r, -0.04 * r + bob, r * 0.075, 0, TAU);
    ctx.fill();
  }
}

function jar(ctx, prop, t, scale, outline, time) {
  // Held upright whatever the hand's angle: a jar is carried like a lantern.
  const c = t.grip || lerpPt(t.butt, t.tip, 0.5);
  const h = prop.len * scale;
  const w = prop.width * scale;
  ctx.save();
  ctx.translate(c.x, c.y - h * 0.42);
  ctx.fillStyle = "rgba(226, 244, 252, 0.88)";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.22);
  ctx.fill();
  if (prop.state === "hush") hushInJar(ctx, w * 0.55, time);
  ctx.strokeStyle = "rgba(60, 90, 110, 0.9)";
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillRect(-w * 0.34, -h * 0.36, w * 0.1, h * 0.6);
  // The lid: on the jar, or tipped open on one side.
  ctx.fillStyle = prop.trim;
  ctx.strokeStyle = outline;
  ctx.save();
  if (prop.state === "open") {
    ctx.translate(w / 2, -h / 2);
    ctx.rotate(-1.1);
    ctx.translate(-w / 2, 0);
  } else ctx.translate(0, -h / 2);
  ctx.beginPath();
  ctx.roundRect(-w * 0.56, -h * 0.16, w * 1.12, h * 0.16, 3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function tiffin(ctx, prop, t, scale, outline) {
  // A steel tiffin carrier hanging from its handle: three round tins, a clip bar and the handle loop.
  const c = t.grip || lerpPt(t.butt, t.tip, 0.5);
  const w = prop.width * scale;
  const h = prop.len * scale;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, h * 0.08, w * 0.3, h * 0.12, 0, Math.PI, TAU);
  ctx.stroke();
  for (let k = 0; k < 3; k++) {
    const y = h * 0.1 + k * h * 0.28;
    ctx.fillStyle = prop.color;
    ctx.beginPath();
    ctx.roundRect(-w / 2, y, w, h * 0.27, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(-w * 0.38, y + h * 0.05, w * 0.12, h * 0.16);
  }
  ctx.fillStyle = prop.trim;
  for (const s of [-1, 1]) ctx.fillRect(s * w / 2 - (s > 0 ? 3 : 0), h * 0.08, 3, h * 0.86);
  ctx.restore();
}

function radar(ctx, prop, t, scale, outline, time) {
  // A round screen in a scrap-metal case with a little dish on top; scanning sweeps, found blinks a violet dot.
  const c = t.grip || lerpPt(t.butt, t.tip, 0.5);
  const r = prop.width * scale * 0.5;
  ctx.save();
  ctx.translate(c.x, c.y - r * 0.8);
  ctx.fillStyle = prop.trim;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-r * 1.25, -r * 1.25, r * 2.5, r * 2.5, r * 0.35);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.25);
  ctx.lineTo(0, -r * 1.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -r * 1.75, r * 0.35, Math.PI * 0.1, Math.PI * 0.9, true);
  ctx.stroke();
  const on = prop.state === "scan" || prop.state === "found";
  ctx.fillStyle = on ? "#0e3a2a" : "#2a2e34";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  if (on) {
    ctx.strokeStyle = "rgba(90, 255, 160, 0.5)";
    ctx.lineWidth = 1.5;
    for (const k of [0.4, 0.75]) { ctx.beginPath(); ctx.arc(0, 0, r * k, 0, TAU); ctx.stroke(); }
    const a = time * 3.5;
    ctx.strokeStyle = "#5affa0";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.stroke();
    if (prop.state === "found" && Math.floor(time * 4) % 2 === 0) {
      ctx.fillStyle = "#c4a3ff";
      ctx.beginPath();
      ctx.arc(r * 0.45, -r * 0.3, r * 0.2, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Draws a season 2 shape; false when the shape is not one of these. time: video seconds (the jar and radar move). */
export function drawS2Prop(ctx, prop, t, scale, outline, time = 0) {
  if (prop.shape === "flute") flute(ctx, prop, t, scale, outline);
  else if (prop.shape === "leaf") leaf(ctx, prop, t, scale, outline);
  else if (prop.shape === "jar") jar(ctx, prop, t, scale, outline, time);
  else if (prop.shape === "tiffin") tiffin(ctx, prop, t, scale, outline);
  else if (prop.shape === "radar") radar(ctx, prop, t, scale, outline, time);
  else return false;
  return true;
}

export const S2_PROP_SHAPES = ["flute", "leaf", "jar", "tiffin", "radar"];
