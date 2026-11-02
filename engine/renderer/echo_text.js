// Echoing lines (Doopi season 2, Echo Mountain and the Echo Cave): a say beat with `echo` shows its words coming
// back, smaller and fainter each time, drifting away from the speaker toward the far side of the frame. The sound
// is the same clip repeated in the mix (tools/lib/tts/synth.mjs ECHO_DELAY and ECHO_GAIN match these timings).

import { toScreen } from "../camera.js";

export const ECHO_DELAY = 0.75; // s between echoes
const LIFE = 2.4; // s each echo stays on screen

/** The echoes of say events visible at video time t: [{ say, k, age }]. */
export function echoesAt(says, t) {
  const out = [];
  for (const s of says) {
    if (!s.echo) continue;
    for (let k = 1; k <= s.echo; k++) {
      const age = t - (s.videoT + ECHO_DELAY * k);
      if (age >= 0 && age < LIFE) out.push({ say: s, k, age });
    }
  }
  return out;
}

/** Short echo text: the last few words of the line, as an echo would carry them. */
export function echoWords(text, k) {
  const words = text.replace(/[.!?…]+$/u, "").split(/\s+/);
  const keep = Math.max(1, Math.min(words.length, 4 - k));
  return `${words.slice(-keep).join(" ")}...`;
}

/** Draw the echoes (screen space, after the bubbles). view: { W, H, t, cam, chars }. */
export function drawEchoes(ctx, says, view) {
  const { W, H, t, cam, chars } = view;
  const k0 = H / 1080;
  for (const { say, k, age } of echoesAt(says, t)) {
    const c = chars.find((x) => x.id === say.actor);
    if (!c) continue;
    const head = toScreen(cam, W, H, { x: c.j.head.x, y: c.j.head.y });
    const dir = head.x < W / 2 ? 1 : -1; // toward the far side, where the mountain answers
    const x = head.x + dir * (220 + 200 * k + age * 110) * k0;
    const y = head.y - (180 + 70 * k + age * 35) * k0;
    const fade = Math.min(1, age / 0.25) * (age > LIFE - 0.8 ? (LIFE - age) / 0.8 : 1);
    ctx.save();
    ctx.globalAlpha = fade * 0.85 * 0.62 ** (k - 1);
    ctx.font = `${Math.round(64 * k0 * 0.82 ** k)}px Bangers`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 8 * k0;
    ctx.strokeStyle = "rgba(40, 40, 60, 0.8)";
    const text = echoWords(say.text, k).toUpperCase();
    ctx.strokeText(text, Math.max(W * 0.1, Math.min(W * 0.9, x)), y);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, Math.max(W * 0.1, Math.min(W * 0.9, x)), y);
    ctx.restore();
  }
}
