// Shape corners from catalog geometry (WORKBOOK_SPEC 8.1): the lesson marks them, and the catalog build checks
// that each shape's `corners` fact matches its drawing. Unit box, y down, as renderer/shapes_draw.js draws it.

import { regularPoints, starPoints } from "../renderer/shapes_draw.js";

const RAD = Math.PI / 180;

/** The corner points of a shape's geometry ([] for round shapes and free paths). */
export function cornerPoints(g) {
  switch (g.kind) {
    case "regular":
      return regularPoints(g.sides);
    case "polygon":
      return g.points;
    case "star":
      return starPoints(g.points, g.inner);
    case "sector": {
      const ends = [g.from, g.to].map((a) => [Math.cos(a * RAD), Math.sin(a * RAD)]);
      // A half circle's centre lies on its straight side, so it is not a corner.
      return Math.abs(g.to - g.from) === 180 ? ends : [[0, 0], ...ends];
    }
    case "crescent": {
      const x = (1 - g.inner * g.inner + g.offset * g.offset) / (2 * g.offset);
      const y = Math.sqrt(Math.max(0, 1 - x * x));
      return [[x, -y], [x, y]];
    }
    default:
      return [];
  }
}

/** Straight sides a geometry draws (polygons only; null when the shape has curved sides). */
export function straightSides(g) {
  if (g.kind === "regular") return g.sides;
  if (g.kind === "polygon") return g.points.length;
  if (g.kind === "star") return g.points * 2;
  return null;
}
