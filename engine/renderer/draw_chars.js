// Characters for a frame (spec 14.1): the unpacked frame characters (cached), and drawing them with their looks,
// accessories, squash, glow and stone, motion quality (V3.7) and turnaround views (V3.6). Split from
// renderer/index.js in V3.9.

import { unpackJoints } from "../skeleton.js";
import { drawCharacter, shade } from "./character.js";
import { withState } from "./world_items.js";
import { yawAt, limitYaw } from "../turnaround.js";
import { motionFrame } from "./motion_draw.js";
import { turnedHumanoid, drawQuadFront, quadBlend } from "./turnaround_draw.js";
import { drawBehind, drawFront, squashAt } from "./accessories.js";
import { drawLookBehind, drawLookFront } from "./accessories_more.js";
import { propTransform } from "../props.js";
import { glowAt, drawGlow, petrifyAt, stoneFilter, thawLine } from "./colour.js";
import { holdableData } from "../objects.js";
import { faceStyle } from "./face_state.js";
import { lookAt } from "./looks.js";
import { bodyPlan } from "../story/bodies.js";
import { withLayer } from "./extras.js";
import { shadeTones } from "../lighting.js";
import { STAGE, FPS } from "../config.js";
import { frameView, segmentIndexAt } from "../framestore.js";

/** The characters of frame n with unpacked joints, body plan data and prop style (the last 64 frames are cached). */
export function charsAt(r, n) {
  if (!r.charCache.has(n)) {
    r.charCache.set(n, frameView(r.sim.store, n, FPS).chars.map((c) => {
      const j = unpackJoints(c.joints);
      const data = c.prop ? holdableData(r.catalog, c.prop.name) : null;
      const plan = c.plan ? r.catalog.bodies?.[c.plan] : null; // story body plans (S3)
      if (data) j.propTip = propTransform(j, data, c.prop.angle, c.facing, c.scale, plan?.grip).tip; // slash trails follow the tip
      const body = plan ? { dims: bodyPlan(r.catalog, c.plan).dims, draw: plan.draw, torsoWidth: plan.torsoWidth, ...(plan.quad ? { quad: plan.quad, grip: plan.grip } : {}) } : {};
      return { ...c, ...body, j, propStyle: data ? { data, angle: c.prop.angle } : undefined };
    }));
    if (r.charCache.size > 64) r.charCache.delete(r.charCache.keys().next().value);
  }
  return r.charCache.get(n);
}

export const order = (chars) => [...chars].sort((a, b) => b.scale - a.scale);

/** Characters on a back or front layer, scaled about their feet (STORY_SPEC 14). */
export function drawLayerChars(ctx, r, n, f, chars, sv, list, layer) {
  for (const c of list) withLayer(ctx, layer, c.j.hip.x, () => drawChars(ctx, r, n, f, chars, sv, [c]));
}

/** Draw characters (largest first), with their looks, accessories and squash; glowing, petrified or thawing (A3). */
export function drawChars(ctx, r, n, f, chars, sv, list) {
  for (const c of order(list)) {
    if (c.alpha <= 0.01) continue;
    const glow = r.glowChanges.length ? glowAt(r.glowChanges.filter((e) => e.params.who === c.id), f.videoT) : null;
    if (glow) {
      ctx.save();
      if (r.castFilter) ctx.filter = r.castFilter; // the glow keeps its colour with the cast
      drawGlow(ctx, c, glow, f.videoT);
      ctx.restore();
    }
    const stone = r.petrifyEvents.length ? petrifyAt(r.petrifyEvents.filter((e) => e.actor === c.id), f.videoT) : null;
    if (!stone) {
      drawOne(ctx, r, n, f, chars, sv, c, r.castFilter);
      continue;
    }
    drawOne(ctx, r, n, f, chars, sv, c, stoneFilter(stone.grey));
    if (stone.thaw === null) continue;
    // Thawing: the colour floods back up from the feet over the grey body.
    ctx.save();
    ctx.beginPath();
    ctx.rect(c.j.hip.x - 2000, thawLine(c, stone.thaw), 4000, 4000);
    ctx.clip();
    drawOne(ctx, r, n, f, chars, sv, c, "none");
    ctx.restore();
  }
}

/** One character; filter: a canvas filter for it (stone grey, or "none" inside a greyed world). */
function drawOne(ctx, r, n, f, chars, sv, c, filter) {
  const look = lookAt(r.looks.get(c.id), r.lookChanges.filter((e) => e.params.who === c.id), f.videoT);
  const style = look?.style || r.styles.get(c.id) || {};
  const index = chars.indexOf(c);
  // Frame history (cape and scarf lag) stays inside the scene's segment.
  const past = (k) => (n - k >= 0 && segmentIndexAt(r.sim.store, n - k) === f.segment ? charsAt(r, n - k)[index].j : null);
  ctx.save();
  if (filter) ctx.filter = filter;
  if (style.squash) {
    // Flatten around the feet briefly after a landing or a hit.
    const k = squashAt(sv.squashEvents, c.id, f.videoT);
    if (k < 1) ctx.transform(1 / k, 0, 0, k, (c.j.hip.x) * (1 - 1 / k), STAGE.groundY * (1 - k));
  }
  if (style.glow) {
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = 22 * c.scale;
  }
  // Motion quality (V3.7, v3 scenes): follow-through, breathing, squash and stretch, hair sway, blur ghosts.
  const mo = sv.depth ? motionFrame(ctx, r, sv, f, c, chars, past, !!style.squash) : null;
  const cm = mo ? { ...c, j: mo.j } : c;
  // Turnaround views (V3.6, v3 scenes): the yaw from the scene's view track.
  const track = sv.viewTracks?.get(c.id);
  const yaw = track ? limitYaw(yawAt(track, f.storyT - (sv.storyStart ?? 0)), sv.maxTurn) : 90;
  const turned = !c.quad && yaw !== 90 ? turnedHumanoid(cm, yaw, r.catalog.bodies?.[c.plan]) : null;
  const ct = turned ? { ...cm, j: turned.j } : cm;
  drawBehind(ctx, ct, past, style);
  drawLookBehind(ctx, ct, look, f.videoT);
  const face = c.face ? faceStyle(r, c, chars, sv, f) : null;
  const st = { color: c.color, scale: c.scale, facing: c.facing, mouth: c.mouth, prop: c.propStyle && { ...c.propStyle, data: withState(r, sv, c.prop.name, c.propStyle.data, f.videoT) }, alpha: c.alpha, outline: style.outline !== false, ...face,
    ...(c.dims ? { dims: c.dims, draw: c.draw, torsoWidth: c.torsoWidth } : {}), ...(look ? { look } : {}),
    ...(r.frameLight ? { light: shadeTones(style.color || c.color, r.frameLight) } : {}),
    ...(turned ? { faceShift: turned.faceShift, hideFace: turned.hideFace, farBrightness: turned.farBrightness, wrap: turned.wrap } : {}),
    ...(mo?.hairTilt ? { hairTilt: mo.hairTilt } : {}),
    ...(c.quad ? { quad: c.quad, grip: c.grip, faceName: c.face, id: c.id, time: f.videoT, prevHip: past(1)?.hip, prevHead: past(1)?.head } : {}) };
  if (c.quad && yaw < 89.5) {
    // A four-legged character cross-fades from its side drawing to its front drawing, squashed mid-turn.
    const b = quadBlend(yaw);
    if (b.front < 0.99) drawCharacter(ctx, cm.j, { ...st, alpha: st.alpha * (1 - b.front) });
    ctx.save();
    ctx.transform(b.squash, 0, 0, 1, c.j.hip.x * (1 - b.squash), 0);
    drawQuadFront(ctx, cm.j, { ...st, alpha: st.alpha * b.front }, shade);
    ctx.restore();
  } else drawCharacter(ctx, ct.j, st);
  ctx.shadowBlur = 0;
  drawFront(ctx, ct, past, style);
  drawLookFront(ctx, ct, look);
  ctx.restore();
}
