// Motion quality in the renderer (ENGINE_V3_SPEC 5.5, ADR-029). Milestone: V3.7.
// For one character in a v3 scene: the stored joints with follow-through and breathing, the hair sway, a
// squash or stretch applied to the context, and faint motion-blur ghosts drawn first. History comes from
// the frame store (the same scene's frames only), so any frame renders the same in any order.

import { MOTION_DEFAULTS, WINDOW, followThrough, squashStretch, hairSway, standingStill, breathe, blurGhosts, limbStretch, applyStretch } from "../motion_fx.js";
import { drawCharacter } from "./character.js";
import { STAGE } from "../config.js";

/** The script's motion settings (the v3 `motion` block over the defaults), once per renderer. */
export const motionSettings = (r) => (r.motionCfg ??= { ...MOTION_DEFAULTS, ...(r.sim.story?.motion || {}) });

/**
 * @param {(k: number) => object|null} past  the character's joints k frames back in this scene (null outside it)
 * @param {boolean} ownSquash  the character's v1 style already squashes (style.squash): skip ours
 * @param {string} [limbStyle]  straight | bendy | rubber (ADR-034): rubber limbs also stretch, and ghosts take the style
 * @returns {{ j: object, hairTilt: number }}
 */
export function motionFrame(ctx, r, sv, f, c, chars, past, ownSquash = false, limbStyle = "straight") {
  const cfg = motionSettings(r);
  const hist = [];
  for (let k = WINDOW - 1; k >= 1; k--) {
    const p = past(k);
    if (p) hist.push(p);
  }
  hist.push(c.j);
  let j = c.quad ? c.j : followThrough(hist, cfg.followThrough);
  if (!c.quad && cfg.breathing > 0 && standingStill(hist)) j = breathe(j, c.id, f.videoT, c.scale, cfg.breathing);
  if (!c.quad && limbStyle === "rubber" && cfg.stretch > 0) {
    // Hits land on the stored (unstretched) joints; the stretch only draws the blow a little longer (ADR-034).
    const hits = sv.squashEvents.filter((e) => e.type === "hit" && e.attacker === c.id);
    j = applyStretch(j, limbStretch(hist, hits, f.videoT, STAGE.groundY, c.scale, cfg.stretch));
  }
  for (const g of blurGhosts(hist, cfg.blur)) {
    const pj = hist[hist.length - 1 - g.back];
    if (pj) drawCharacter(ctx, pj, { color: c.color, scale: c.scale, facing: c.facing, alpha: g.alpha * (c.alpha ?? 1), outline: false, limbStyle, ...(c.dims ? { dims: c.dims, draw: c.draw, torsoWidth: c.torsoWidth } : {}), ...(c.quad ? { quad: c.quad, grip: c.grip } : {}) });
  }
  if (!ownSquash && cfg.squash > 0) {
    const events = [];
    for (const e of sv.squashEvents) {
      if (e.type === "land" && e.actor === c.id) events.push(e);
      else if (e.type === "hit" && e.target === c.id) {
        const a = chars.find((x) => x.id === e.attacker);
        events.push({ ...e, dir: a ? Math.sign(c.j.hip.x - a.j.hip.x) || 1 : 1 });
      }
    }
    const sq = squashStretch(hist, events, f.videoT, STAGE.groundY, cfg.squash);
    if (sq) {
      const [a, b, cc, d] = sq.m;
      const { x, y } = sq.pivot;
      ctx.transform(a, b, cc, d, x - a * x - cc * y, y - b * x - d * y);
    }
  }
  return { j, hairTilt: c.quad ? 0 : hairSway(hist, cfg.secondary) };
}
