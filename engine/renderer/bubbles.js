// Story speech bubbles (STORY_SPEC 7.2). Milestone: S2.
// Kinds: think (cloud with trailing puffs), shout (jagged, larger), whisper (small, dashed, italic);
// "speech" uses the v1 bubble. A speaker name tag sits on the bubble's top-left corner when
// meta.speakerNames is on. Returns the bubble rectangle so the caller can add the name.

/** Rectangle of a bubble for text at a head point, kept inside the frame. */
function layout(ctx, text, head, W, H, size, safe, padK = 1) {
  const w = ctx.measureText(text).width + size * padK;
  const h = size * 1.5;
  const x = Math.max(16, Math.min(W - w - 16, head.x - w / 2));
  const y = Math.max(H * safe.top + size * 0.6, head.y - h - size * 1.4);
  return { x, y, w, h };
}

function text(ctx, s, b, color = "#1a1a1a") {
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(s, b.x + b.w / 2, b.y + b.h / 2 + 2);
  ctx.textBaseline = "alphabetic";
}

function think(ctx, s, head, W, H, scale, safe) {
  const size = Math.round(34 * scale);
  ctx.font = `${size}px Bangers`;
  const b = layout(ctx, s, head, W, H, size, safe, 1.6);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = Math.max(2, 3 * scale);
  // Cloud: an ellipse ringed with bumps.
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const rx = b.w / 2;
  const ry = b.h / 2 + size * 0.15;
  const bumps = Math.max(8, Math.round(b.w / (size * 0.9)));
  ctx.beginPath();
  for (let i = 0; i <= bumps; i++) {
    const a0 = (i / bumps) * Math.PI * 2;
    const a1 = ((i + 1) / bumps) * Math.PI * 2;
    const p0 = { x: cx + Math.cos(a0) * rx, y: cy + Math.sin(a0) * ry };
    const p1 = { x: cx + Math.cos(a1) * rx, y: cy + Math.sin(a1) * ry };
    const am = (a0 + a1) / 2;
    const c = { x: cx + Math.cos(am) * rx * 1.18, y: cy + Math.sin(am) * ry * 1.32 };
    if (i === 0) ctx.moveTo(p0.x, p0.y);
    if (i < bumps) ctx.quadraticCurveTo(c.x, c.y, p1.x, p1.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Trailing puffs toward the head.
  const tx = Math.max(b.x + 20, Math.min(b.x + b.w - 20, head.x));
  [[0.55, 0.16], [1.05, 0.1]].forEach(([k, rad]) => {
    ctx.beginPath();
    ctx.arc(tx, b.y + b.h + size * k, size * rad * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  text(ctx, s, b, "#3a3a4a");
  return b;
}

function shout(ctx, s, head, W, H, scale, safe) {
  const size = Math.round(46 * scale);
  ctx.font = `${size}px Bangers`;
  const b = layout(ctx, s, head, W, H, size, safe, 1.5);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const spikes = Math.max(14, Math.round(b.w / (size * 0.45)));
  ctx.fillStyle = "#fff6c2";
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = Math.max(2, 3.5 * scale);
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const k = i % 2 ? 0.86 : 1.12;
    const p = { x: cx + Math.cos(a) * (b.w / 2 + size * 0.2) * k, y: cy + Math.sin(a) * (b.h / 2 + size * 0.35) * k };
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const tx = Math.max(b.x + 24, Math.min(b.x + b.w - 24, head.x));
  ctx.beginPath();
  ctx.moveTo(tx - 16 * scale, b.y + b.h + size * 0.1);
  ctx.lineTo(tx + 4 * scale, b.y + b.h + size * 0.9);
  ctx.lineTo(tx + 14 * scale, b.y + b.h + size * 0.1);
  ctx.fill();
  ctx.stroke();
  text(ctx, s, b, "#c4182f");
  return b;
}

function whisper(ctx, s, head, W, H, scale, safe) {
  const size = Math.round(28 * scale);
  ctx.font = `italic ${size}px Inter`;
  const b = layout(ctx, s, head, W, H, size, safe, 1.2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.strokeStyle = "#5a5a66";
  ctx.lineWidth = Math.max(1.5, 2 * scale);
  ctx.setLineDash([6 * scale, 6 * scale]);
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, size * 0.6);
  ctx.fill();
  ctx.stroke();
  const tx = Math.max(b.x + 18, Math.min(b.x + b.w - 18, head.x));
  ctx.beginPath();
  ctx.moveTo(tx - 8 * scale, b.y + b.h);
  ctx.lineTo(tx, b.y + b.h + 14 * scale);
  ctx.lineTo(tx + 8 * scale, b.y + b.h);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, s, b, "#4a4a56");
  return b;
}

export const BUBBLE_KINDS = { think, shout, whisper };

/** Name tag on a bubble's top-left corner. */
export function nameTag(ctx, name, b, scale, color) {
  const size = Math.round(24 * scale);
  ctx.font = `${size}px Inter`;
  const w = ctx.measureText(name).width + size * 0.8;
  const x = b.x + size * 0.3;
  const y = b.y - size * 0.75;
  ctx.fillStyle = color || "#1a1a1a";
  ctx.beginPath();
  ctx.roundRect(x, y, w, size * 1.2, size * 0.3);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = Math.max(1.5, 2 * scale);
  ctx.stroke();
  ctx.fillStyle = "#1a1a1a";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 4 * scale;
  ctx.strokeStyle = "#ffffff";
  ctx.strokeText(name, x + size * 0.4, y + size * 0.62);
  ctx.fillText(name, x + size * 0.4, y + size * 0.62);
  ctx.textBaseline = "alphabetic";
}
