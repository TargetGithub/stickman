// Screen-space overlays (spec 11.6, 13.3, 14.1 step 8): speech bubbles, HP bars, text pops,
// captions, flashes, desaturate, slow-motion vignette, fades. Milestone: M4.
// Overlays are pure functions of the event log and the frame's video time.

import { toScreen } from "../camera.js";
import { easings } from "../math.js";
import { STAGE } from "../config.js";
import { drawCard, drawNarration } from "./cards.js";
import { CARD_COMMANDS, cardDuration, cardKind, narrateDuration } from "../story/timing.js";

const SAFE = { landscape: { top: 0.06, bottom: 0.06 }, portrait: { top: 0.12, bottom: 0.2 } };

const activeAt = (list, t, dur) => list.filter((e) => t >= e.videoT && t < e.videoT + dur(e));

/** Greedy word wrap with the current font. */
function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** World-only post effects: desaturate and slow-motion vignette. Call before UI overlays. */
export function drawPostWorld(ctx, view) {
  const { W, H, worldEvents, t, slowness } = view;
  let desat = 0;
  for (const e of worldEvents.filter((w) => w.do === "desaturate" && t >= w.videoT)) {
    const dur = e.params.dur ?? 0.5;
    const age = t - e.videoT;
    const k = age < 0.25 ? age / 0.25 : age < 0.25 + dur ? 1 : Math.max(0, 1 - (age - 0.25 - dur) / 0.25);
    desat = Math.max(desat, k * (e.params.amount ?? 1));
  }
  if (desat > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = `rgba(128,128,128,${desat})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (slowness > 0.01) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${0.5 * slowness})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

function bubble(ctx, text, head, W, H, scale, safe) {
  const size = Math.round(36 * scale);
  ctx.font = `${size}px Bangers`;
  const w = ctx.measureText(text).width + size;
  const h = size * 1.5;
  const x = Math.max(16, Math.min(W - w - 16, head.x - w / 2));
  const y = Math.max(H * safe.top, head.y - h - size * 1.4);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, size * 0.4);
  ctx.fill();
  ctx.stroke();
  const tx = Math.max(x + 18, Math.min(x + w - 18, head.x));
  ctx.beginPath();
  ctx.moveTo(tx - 12 * scale, y + h - 1);
  ctx.lineTo(tx, y + h + 20 * scale);
  ctx.lineTo(tx + 12 * scale, y + h - 1);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tx - 12 * scale, y + h);
  ctx.lineTo(tx, y + h + 20 * scale);
  ctx.lineTo(tx + 12 * scale, y + h);
  ctx.stroke();
  ctx.fillStyle = "#1a1a1a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2 + 2);
  ctx.textBaseline = "alphabetic";
}

function hpBars(ctx, chars, W, H, safe) {
  const n = chars.length;
  const barW = Math.min(560, (W - 80) / Math.min(n, 2) - 40);
  chars.forEach((c, i) => {
    if (c.alpha <= 0.01) return; // not on stage yet (spawn) or gone (despawn); slots keep their places
    const left = i % 2 === 0;
    const row = Math.floor(i / 2);
    const x = left ? 40 : W - 40 - barW;
    const y = H * safe.top + row * 70;
    ctx.fillStyle = "rgba(20,20,20,0.75)";
    ctx.fillRect(x - 4, y - 4, barW + 8, 30);
    const frac = Math.max(0, Math.min(1, c.hp / c.maxHp));
    ctx.fillStyle = c.color;
    ctx.fillRect(left ? x : x + barW * (1 - frac), y, barW * frac, 22);
    ctx.font = "38px Bangers";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = left ? "left" : "right";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#111111";
    ctx.strokeText(c.id.toUpperCase(), left ? x : x + barW, y + 54);
    ctx.fillText(c.id.toUpperCase(), left ? x : x + barW, y + 54);
  });
}

/**
 * @param {object} view  { W, H, format, t (video s), fxT, cam, chars (with unpacked joints j),
 *   events (says, worldEvents), flashes (fx flashes), hpBars }
 */
export function drawOverlays(ctx, view) {
  const { W, H, t, cam, chars, says, worldEvents } = view;
  const safe = SAFE[view.format] || SAFE.landscape;
  const k = H / 1080;
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  for (const s of activeAt(says, t, (e) => e.dur)) {
    const c = chars.find((x) => x.id === s.actor);
    if (!c) continue;
    const head = toScreen(cam, W, H, { x: c.j.head.x, y: c.j.head.y - 22 * c.scale });
    bubble(ctx, s.text, head, W, H, Math.max(0.8, k), safe);
  }
  if (view.hpBars) hpBars(ctx, chars, W, H, safe);

  for (const e of activeAt(worldEvents.filter((w) => w.do === "text_pop"), t, () => 1.0)) {
    const age = t - e.videoT;
    const pop = easings.outBack(Math.min(1, age / 0.18));
    const alpha = age > 0.8 ? Math.max(0, 1 - (age - 0.8) / 0.2) : 1;
    const x = (e.params.x ?? 0.5) * W;
    const y = (e.params.y ?? 0.36) * H;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(-0.07);
    ctx.scale(0.4 + 0.6 * pop, 0.4 + 0.6 * pop);
    ctx.font = `${Math.round(190 * Math.min(1, W / 1920 * 1.4))}px Bangers`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 18;
    ctx.strokeStyle = "#111111";
    ctx.strokeText(e.params.text, 0, 0);
    ctx.fillStyle = e.params.color || "#ffd400";
    ctx.fillText(e.params.text, 0, 0);
    ctx.restore();
  }

  for (const e of activeAt(worldEvents.filter((w) => w.do === "caption"), t, (w) => w.params.dur ?? 2)) {
    const pos = e.params.pos || "bottom";
    const size = Math.round(46 * Math.max(0.8, k));
    ctx.font = `${size}px Inter`;
    const lines = wrap(ctx, e.params.text, W * 0.86 - size * 1.4);
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + size * 1.4;
    const lineH = size * 1.3;
    const h = lines.length * lineH + size * 0.5;
    // Bottom captions sit in the safe area but never above the ground line (they would cover feet).
    const groundScreen = H / 2 + (STAGE.groundY - cam.y) * cam.zoom;
    const barsBelow = view.hpBars ? 100 * Math.max(0.8, k) * Math.ceil(chars.length / 2) : 0; // keep top captions under HP bars
    const top = pos === "top" ? H * safe.top + barsBelow : pos === "center" ? H / 2 - h / 2 : Math.max(groundScreen + 12, H * (1 - safe.bottom) - h);
    const age = t - e.videoT;
    ctx.globalAlpha = Math.min(1, age / 0.15, ((e.params.dur ?? 2) - age) / 0.15);
    ctx.fillStyle = "rgba(15,15,20,0.72)";
    ctx.beginPath();
    ctx.roundRect(W / 2 - w / 2, top, w, h, size * 0.3);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    lines.forEach((l, i) => ctx.fillText(l, W / 2, top + size * 0.25 + lineH * (i + 0.5) + size * 0.35));
    ctx.globalAlpha = 1;
  }

  for (const e of worldEvents.filter((w) => w.do === "narrate" && t >= w.videoT)) {
    drawNarration(ctx, W, H, e.params, t - e.videoT, narrateDuration(e.params), safe);
  }
  for (const e of worldEvents.filter((w) => CARD_COMMANDS.includes(w.do) && t >= w.videoT)) {
    const dur = cardDuration(e.do, e.params);
    const age = t - e.videoT;
    if (age >= dur) continue;
    const alpha = Math.min(1, age / 0.3, (dur - age) / 0.3);
    drawCard(ctx, W, H, { kind: cardKind(e.do), title: e.params.title, subtitle: e.params.subtitle, text: e.params.text, color: e.params.bg }, alpha, age);
  }

  const flashes = [
    ...worldEvents.filter((w) => w.do === "flash").map((w) => ({ t0: w.videoT, dur: w.params.dur ?? 0.1, color: w.params.color || "#ffffff", clock: t })),
    ...view.flashes.map((f) => ({ t0: f.t0, dur: f.dur, color: f.color, clock: view.fxT })),
  ];
  for (const f of flashes) {
    const age = f.clock - f.t0;
    if (age < 0 || age >= f.dur) continue;
    ctx.globalAlpha = 1 - age / f.dur;
    ctx.fillStyle = f.color;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  for (const e of worldEvents.filter((w) => w.do === "fade" && t >= w.videoT)) {
    const u = Math.min(1, (t - e.videoT) / (e.params.dur ?? 1));
    ctx.globalAlpha = e.params.dir === "in" ? 1 - u : u;
    ctx.fillStyle = e.params.to === "white" ? "#ffffff" : "#000000";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}
