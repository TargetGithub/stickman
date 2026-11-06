// Passes over an expanded 10K script, timed on the compiled plan (speech estimates):
// 1. keywords: each spec keyword gets a pop-in badge on the first line that says it, unless the lesson placed one;
// 2. camera keep-alive: a still camera for longer than KEEP_ALIVE seconds gets a slow dolly out and back in on what it
//    looks at (so the framing the shot chose comes back), so no video is ever static (GUIDELINES 5).

import { compileScript } from "../../runtime/compile.js";
import { keywordBadge } from "./meta.mjs";
import { wordShare } from "../../runtime/retain_layout.js";

export const KEEP_ALIVE = 12;
const CAMERA_ACTIONS = new Set(["shot", "orbit", "camera", "hook"]);

const allSays = (script) => script.scenes.flatMap((s) => s.beats.flatMap((b) => b.do.filter((a) => a.do === "say")));

/** Attach spec keywords to the first line that says them. Returns the words placed. */
export function attachKeywords(script, spec, catalog) {
  const says = allSays(script);
  const have = new Set(says.flatMap((a) => Object.keys(a.keywords ?? {}).map((w) => w.toLowerCase())));
  const placed = [];
  for (const k of spec.keywords ?? []) {
    const w = String(k.word).trim();
    if (!w || have.has(w.toLowerCase())) continue;
    const line = says.find((a) => wordShare(a.text, w) != null && Object.keys(a.keywords ?? {}).length < 2);
    if (!line) continue;
    line.keywords = { ...(line.keywords ?? {}), [w]: keywordBadge(k, catalog) };
    have.add(w.toLowerCase());
    placed.push(w);
  }
  return placed;
}

/** Beat start times from a probe compile: each beat gets a marker caption. */
export function beatTimes(script, catalog, speech = {}) {
  const probe = structuredClone(script);
  const keys = [];
  probe.scenes.forEach((s, si) => s.beats.forEach((b, bi) => {
    b.do = [{ do: "caption", text: `@@${si}.${bi}`, at: 0, dur: 0.01 }, ...b.do];
    keys.push([si, bi]);
  }));
  const plan = compileScript(probe, { catalog, speech });
  const at = new Map(plan.captions.filter((c) => c.text.startsWith("@@")).map((c) => [c.text.slice(2), c.start]));
  return { plan, beats: keys.map(([si, bi]) => ({ si, bi, t: at.get(`${si}.${bi}`) ?? 0 })) };
}

/** Still-camera stretches longer than `limit` seconds: [{ from, to }]. */
export function staticStretches(plan, limit = KEEP_ALIVE) {
  const tl = plan.timeline;
  const cam = (t) => [...tl.valueAt("camera", "position", t), ...tl.valueAt("camera", "lookAt", t), tl.valueAt("camera", "fov", t)];
  const out = [];
  const STEP = 0.25;
  let from = 0;
  let prev = cam(0);
  for (let t = STEP; t <= plan.duration + 1e-9; t += STEP) {
    const c = cam(t);
    const moved = c.some((x, i) => Math.abs(x - prev[i]) > 1e-4);
    if (moved || t + STEP > plan.duration) {
      const end = moved ? t - STEP : t;
      if (end - from > limit) out.push({ from, to: end });
      from = t;
    }
    prev = c;
  }
  return out;
}

/** Add slow orbits where the camera would hold still too long. Returns how many were added. */
export function keepCameraAlive(script, catalog, { limit = KEEP_ALIVE, babies = false } = {}) {
  let added = 0;
  let sign = 1;
  for (let pass = 0; pass < 12; pass++) {
    const { plan, beats } = beatTimes(script, catalog);
    const stretch = staticStretches(plan, limit)[0];
    if (!stretch) break;
    // The first beat that starts a few seconds into the stretch and has no camera move of its own.
    const want = stretch.from + Math.min(limit - 3, 6);
    const pick = beats.find((b) => b.t >= want - 0.01 && b.t < stretch.to - 1 && !script.scenes[b.si].beats[b.bi].do.some((a) => CAMERA_ACTIONS.has(a.do)))
      ?? beats.filter((b) => b.t > stretch.from && b.t < stretch.to - 1).pop();
    if (!pick) break;
    // A slow dolly about what the camera looks at: out first, back in next time, so the framing the shot chose
    // comes back and nothing is ever pushed out of the frame (an orbit at close range can crop the sides).
    const look = plan.timeline.valueAt("camera", "lookAt", pick.t);
    const pos = plan.timeline.valueAt("camera", "position", pick.t);
    const k = sign > 0 ? (babies ? 1.06 : 1.09) : 1 / (babies ? 1.06 : 1.09);
    const r3 = (v) => v.map((x) => Math.round(x * 1000) / 1000);
    const to = pos.map((x, i) => look[i] + (x - look[i]) * k);
    to[1] += sign * 0.08;
    script.scenes[pick.si].beats[pick.bi].do.push({ do: "camera", position: r3(to), lookAt: r3(look), dur: babies ? 9 : 7 });
    sign = -sign;
    added++;
  }
  return added;
}
