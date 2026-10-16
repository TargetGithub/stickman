// Scene transitions (STORY_SPEC 5.3, ADR-016). Milestone: S1.
// Hold frames between scenes are drawn from the last frame of the previous scene and the first
// frame of the next one, so every transition is a pure function of (sim, n): random access stays.
// Types: cut (no hold), fade, dissolve, wipe, iris, card.

import { frameView } from "../framestore.js";
import { toScreen } from "../camera.js";
import { unpackJoints } from "../skeleton.js";
import { drawCard } from "./cards.js";
import { transitionDuration } from "../story/normalize.js";
import { FPS } from "../config.js";

const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

function fill(ctx, W, H, color, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Draw scene frame m, or a plain color when there is none (before the first scene, after the last). */
function scene(r, ctx, m, renderScene, color) {
  if (m === null) fill(ctx, r.W, r.H, color, 1);
  else renderScene(r, ctx, m);
}

/** Screen position of a character's head in scene frame m (iris center); the frame center if absent. */
function focusPoint(r, m, id) {
  if (m === null) return { x: r.W / 2, y: r.H / 2 };
  const f = frameView(r.sim.store, m, FPS);
  const c = f.chars.find((x) => x.id === id) || f.chars[0];
  if (!c) return { x: r.W / 2, y: r.H / 2 };
  const j = unpackJoints(c.joints);
  return toScreen(f.cam, r.W, r.H, { x: (j.head.x + j.hip.x) / 2, y: (j.head.y + j.hip.y) / 2 });
}

function scratch(r) {
  if (!r.createCanvas) return null;
  if (!r.scratch) r.scratch = r.createCanvas(r.W, r.H);
  return r.scratch;
}

const DRAW = {
  fade(r, ctx, f, renderScene, t) {
    const color = t.color || "#000000";
    if (f.u < 0.5) {
      scene(r, ctx, f.prevFrame, renderScene, color);
      fill(ctx, r.W, r.H, color, smooth(f.u * 2));
    } else {
      scene(r, ctx, f.nextFrame, renderScene, color);
      fill(ctx, r.W, r.H, color, smooth((1 - f.u) * 2));
    }
  },
  dissolve(r, ctx, f, renderScene, t) {
    const color = t.color || "#000000";
    const canvas = f.prevFrame !== null && f.nextFrame !== null ? scratch(r) : null;
    if (!canvas) return DRAW.fade(r, ctx, f, renderScene, t);
    renderScene(r, ctx, f.prevFrame);
    renderScene(r, canvas.getContext("2d"), f.nextFrame);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = smooth(f.u);
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  },
  wipe(r, ctx, f, renderScene, t) {
    const color = t.color || "#000000";
    const { W, H } = r;
    const u = smooth(f.u);
    scene(r, ctx, f.prevFrame, renderScene, color);
    const dir = t.dir || "left";
    const rect = dir === "left" ? [W * (1 - u), 0, W * u, H] : dir === "right" ? [0, 0, W * u, H]
      : dir === "up" ? [0, H * (1 - u), W, H * u] : [0, 0, W, H * u];
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.rect(...rect);
    ctx.clip();
    scene(r, ctx, f.nextFrame, renderScene, color);
    ctx.restore();
  },
  iris(r, ctx, f, renderScene, t) {
    const color = t.color || "#000000";
    const { W, H } = r;
    const closing = f.u < 0.5;
    const m = closing ? f.prevFrame : f.nextFrame;
    scene(r, ctx, m, renderScene, color);
    const p = focusPoint(r, m, t.target);
    const far = Math.hypot(Math.max(p.x, W - p.x), Math.max(p.y, H - p.y));
    const radius = far * (closing ? 1 - smooth(f.u * 2) : smooth((f.u - 0.5) * 2));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(p.x, p.y, Math.max(0, radius), 0, Math.PI * 2, true);
    ctx.fill("evenodd");
    ctx.restore();
  },
  card(r, ctx, f, renderScene, t) {
    // The card fades in over the end of the previous scene and out into the next one.
    const len = transitionDuration(t);
    const edge = Math.min(0.35, len / 4) / len;
    const alpha = f.u < edge ? smooth(f.u / edge) : f.u > 1 - edge ? smooth((1 - f.u) / edge) : 1;
    if (alpha < 1) scene(r, ctx, f.u < 0.5 ? f.prevFrame : f.nextFrame, renderScene, t.color || "#101018");
    drawCard(ctx, r.W, r.H, { kind: t.kind || "chapter", title: t.title, subtitle: t.subtitle, text: t.text, color: t.color }, alpha, f.u * len);
  },
};

/** Draw hold frame f (from frameView) with its transition. */
export function drawHold(r, ctx, f, renderScene) {
  const t = f.hold;
  (DRAW[t.type] || DRAW.fade)(r, ctx, f, renderScene, t);
}
