// Story cards and narration (STORY_SPEC 7.3). Milestone: S1.
// drawCard: full-screen title/chapter/time/end card (between scenes or as a world command).
// drawNarration: the narration box with a typewriter reveal. Both are pure in their inputs.

const CARD_STYLE = {
  title: { bg: "#14121f", accent: "#ffcc33", size: 150, font: "Bangers" },
  chapter: { bg: "#101826", accent: "#7fd8ff", size: 96, font: "Bangers" },
  time: { bg: "#0d0d12", accent: "#f2efe6", size: 72, font: "Inter" },
  end: { bg: "#120f18", accent: "#ffcc33", size: 140, font: "Bangers" },
};

function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of String(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * @param {{ kind:"title"|"chapter"|"time"|"end", title?, subtitle?, text?, color? }} card
 * @param {number} alpha  0..1 (fades)
 * @param {number} age  seconds since the card appeared (small entrance motion)
 */
export function drawCard(ctx, W, H, card, alpha, age = 1) {
  if (alpha <= 0) return;
  const st = CARD_STYLE[card.kind] || CARD_STYLE.chapter;
  const k = Math.min(W, H * 16 / 9) / 1920;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = card.color || st.bg;
  ctx.fillRect(0, 0, W, H);
  const vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.7);
  vignette.addColorStop(0, "rgba(255,255,255,0.06)");
  vignette.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
  const main = card.title ?? card.text ?? "";
  const rise = Math.max(0, 1 - age / 0.6) * 30 * k;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const size = Math.round(st.size * k);
  ctx.font = `${size}px ${st.font}`;
  const lines = wrap(ctx, main, W * 0.84);
  const lineH = size * 1.15;
  const sub = card.title && card.subtitle ? card.subtitle : null;
  const total = lines.length * lineH + (sub ? size * 0.9 : 0);
  let y = H / 2 - total / 2 + lineH / 2 + rise;
  ctx.lineJoin = "round";
  for (const l of lines) {
    if (st.font === "Bangers") {
      ctx.lineWidth = Math.max(4, size * 0.09);
      ctx.strokeStyle = "#000000";
      ctx.strokeText(l, W / 2, y);
    }
    ctx.fillStyle = st.accent;
    ctx.fillText(l, W / 2, y);
    y += lineH;
  }
  if (sub) {
    ctx.font = `${Math.round(size * 0.36)}px Inter`;
    ctx.fillStyle = "#e8e6f0";
    ctx.fillText(sub, W / 2, y + size * 0.1);
  }
  if (card.kind === "chapter" || card.kind === "title") {
    ctx.fillStyle = st.accent;
    const w = Math.min(W * 0.3, 420 * k) * Math.min(1, age / 0.5);
    ctx.fillRect(W / 2 - w / 2, H / 2 + total / 2 + 24 * k + rise, w, Math.max(3, 6 * k));
  }
  ctx.textBaseline = "alphabetic";
  ctx.restore();
}

/**
 * Narration box (top or bottom) with a typewriter reveal.
 * @param {{ text, pos?:"top"|"bottom", style?:"box"|"plain" }} p
 * @param {number} age  seconds since it appeared; dur: how long it shows
 */
export function drawNarration(ctx, W, H, p, age, dur, safe) {
  if (age < 0 || age > dur) return;
  const k = Math.max(0.8, H / 1080);
  const size = Math.round(44 * Math.min(k, W / 1080 * 0.9 + 0.1));
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = `${size}px Inter`;
  const maxW = Math.min(W * 0.84, 1500);
  const lines = wrap(ctx, p.text, maxW - size * 1.4);
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + size * 1.4;
  const lineH = size * 1.3;
  const h = lines.length * lineH + size * 0.7;
  const top = (p.pos || "top") === "top" ? H * safe.top : H * (1 - safe.bottom) - h;
  const alpha = Math.min(1, age / 0.25, (dur - age) / 0.3);
  ctx.globalAlpha = Math.max(0, alpha);
  if ((p.style || "box") === "box") {
    ctx.fillStyle = "rgba(250, 246, 232, 0.94)";
    ctx.strokeStyle = "#3a3226";
    ctx.lineWidth = Math.max(2, 3 * k);
    ctx.beginPath();
    ctx.roundRect(W / 2 - w / 2, top, w, h, size * 0.25);
    ctx.fill();
    ctx.stroke();
  }
  // Typewriter: about 40 characters per second, never slower than half the reading time.
  const total = lines.reduce((n, l) => n + l.length, 0);
  const shown = Math.floor(Math.min(total, age * Math.max(40, total / Math.max(0.5, dur * 0.5))));
  let left = shown;
  ctx.fillStyle = (p.style || "box") === "box" ? "#2a241c" : "#ffffff";
  ctx.textAlign = "left";
  lines.forEach((l, i) => {
    const part = l.slice(0, Math.max(0, left));
    left -= l.length;
    const x = W / 2 - ctx.measureText(l).width / 2;
    const y = top + size * 0.35 + lineH * (i + 0.5) + size * 0.35;
    if ((p.style || "box") !== "box") {
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.strokeText(part, x, y);
    }
    ctx.fillText(part, x, y);
  });
  ctx.restore();
}
