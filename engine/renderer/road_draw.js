// Drawing a scene's road (series/baaaana/PLAN.md task 10a; geometry in engine/road.js): a ground plane from the
// horizon down, the road narrowing to its vanishing point, and centre dashes that stream past as the lens
// travels. Drawn in world units after the background and before the depth nodes.

import { roadShapes } from "../road.js";
import { STAGE } from "../config.js";

function poly(ctx, pts, fill, stroke, lw) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/**
 * @param {object} road  roadOf() of the scene
 * @param {number} travel  the lens travel this frame
 * @param {string} groundColor  the plane under the road (the road's `ground`, else the theme's ground colour)
 */
export function drawRoad(ctx, road, travel, cam, depth, groundColor) {
  const { quad, dashes, horizonY } = roadShapes(road, travel, cam, STAGE.groundY, depth);
  ctx.save();
  // The ground plane: everything below the horizon, so the road never runs up into the scenery.
  if (groundColor) poly(ctx, [{ x: cam.x - 8000, y: horizonY }, { x: cam.x + 8000, y: horizonY }, { x: cam.x + 8000, y: STAGE.groundY + 4000 }, { x: cam.x - 8000, y: STAGE.groundY + 4000 }], groundColor);
  poly(ctx, quad, road.color, road.edge, 6);
  for (const d of dashes) poly(ctx, d, road.line);
  ctx.restore();
}
