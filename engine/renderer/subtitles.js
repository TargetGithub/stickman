// Subtitles for spoken lines under a pace (ADR-038): when a scene's pace shows captions as subtitles (by default
// when the script speaks with TTS voices), each voiced line is drawn as a big caption at the bottom of the frame,
// the speaker's name in their colour, instead of a bubble over the head. Thoughts keep their cloud bubble.
// Layout is measured here (renderer only); the simulation never sees it.

const FADE = 0.12; // s
const JOIN = 0.2; // s: a bubble that follows the same speaker's unfinished one this soon is the same sentence
const chains = new WeakMap();

/**
 * Say events with the bubbles of one sentence joined (the dialogue macro splits lines into 40-character bubbles):
 * [{ actor, text, videoT, dur, bubble }], cached per event list.
 */
export function sentences(says) {
  if (chains.has(says)) return chains.get(says);
  const out = [];
  const open = new Map(); // actor → the sentence still being spoken
  for (const s of [...says].sort((a, b) => a.videoT - b.videoT)) {
    const prev = open.get(s.actor);
    if (prev && s.bubble === prev.bubble && s.videoT - (prev.videoT + prev.dur) < JOIN && !/[.!?…]["')]*\s*$/.test(prev.text)) {
      prev.text += ` ${s.text}`;
      prev.dur = s.videoT + s.dur - prev.videoT;
      continue;
    }
    const line = { actor: s.actor, text: s.text, videoT: s.videoT, dur: s.dur, bubble: s.bubble };
    out.push(line);
    open.set(s.actor, line);
  }
  chains.set(says, out);
  return out;
}

/** Greedy word wrap with the current font. */
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
 * Draw the active lines as subtitles, newest at the bottom.
 * @param {Array<{ actor, text, videoT, dur }>} lines  active say events (thoughts already left out)
 * @param {{ W, H, t, scale, safeBottom, names?: Map, colors: Map }} o
 */
export function drawSubtitles(ctx, lines, o) {
  const { W, H, t, scale } = o;
  const size = Math.round(50 * scale);
  const nameSize = Math.round(44 * scale);
  const lineH = size * 1.22;
  let bottom = H * (1 - o.safeBottom);
  for (const s of [...lines].sort((a, b) => b.videoT - a.videoT || (a.actor < b.actor ? -1 : 1))) {
    const name = o.names?.get(s.actor) ?? null;
    ctx.font = `${nameSize}px Bangers`;
    const nameW = name ? ctx.measureText(name).width + size * 0.5 : 0;
    ctx.font = `600 ${size}px Inter`;
    // Wrap to the room the box leaves beside the name (a narrow portrait frame ran the text off the edge).
    const rows = wrap(ctx, s.text, Math.min(W * 0.78, W - 32 - nameW - size * 1.1));
    const textW = Math.max(...rows.map((r) => ctx.measureText(r).width));
    const w = Math.min(W - 32, nameW + textW + size * 1.1);
    const h = rows.length * lineH + size * 0.55;
    const x = W / 2 - w / 2;
    const y = bottom - h;
    const age = t - s.videoT;
    ctx.globalAlpha = Math.max(0, Math.min(1, age / FADE, (s.dur - age) / FADE));
    ctx.fillStyle = "rgba(14,14,24,0.78)";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, size * 0.35);
    ctx.fill();
    const tx = x + size * 0.55;
    if (name) {
      ctx.font = `${nameSize}px Bangers`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(3, 6 * scale);
      ctx.strokeStyle = "#111111";
      ctx.strokeText(name, tx, y + size * 0.28 + lineH / 2);
      ctx.fillStyle = o.colors.get(s.actor) || "#ffd400";
      ctx.fillText(name, tx, y + size * 0.28 + lineH / 2);
    }
    ctx.font = `600 ${size}px Inter`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    rows.forEach((r, i) => ctx.fillText(r, tx + nameW, y + size * 0.28 + lineH * (i + 0.5)));
    ctx.textBaseline = "alphabetic";
    ctx.globalAlpha = 1;
    bottom = y - size * 0.25;
  }
}
