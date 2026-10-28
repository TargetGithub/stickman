// 2D shapes for workbooks (WORKBOOK_SPEC 8.1): catalog geometry in a unit box ([-1, 1], y down) turned into a
// canvas path, then drawn as an outline, a dashed tracing guide, a fill or an answer. Geometry kinds: regular
// {sides}, polygon {points}, ellipse {rx, ry}, star {points, inner}, sector {from, to} (degrees, canvas
// direction), crescent {offset, inner}, ring {inner}, path {d} (the object path commands, renderer/paths.js).

const RAD = Math.PI / 180;

/** Corner points of a regular polygon: odd ones point up, even ones stand on a flat side. */
export function regularPoints(sides) {
  const start = -90 + (sides % 2 ? 0 : 180 / sides);
  return Array.from({ length: sides }, (_, i) => {
    const a = (start + (360 * i) / sides) * RAD;
    return [Math.cos(a), Math.sin(a)];
  });
}

/** The outer and inner points of a star, alternating, the first point up. */
export function starPoints(points, inner) {
  return Array.from({ length: points * 2 }, (_, i) => {
    const a = (-90 + (180 * i) / points) * RAD;
    const r = i % 2 ? inner : 1;
    return [r * Math.cos(a), r * Math.sin(a)];
  });
}

const polyPath = (ctx, pts) => {
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
};

/** Add a shape's outline to the current path (unit coordinates). Rings add two circles: fill them evenodd. */
export function shapePath(ctx, g) {
  switch (g.kind) {
    case "regular":
      return polyPath(ctx, regularPoints(g.sides));
    case "polygon":
      return polyPath(ctx, g.points);
    case "star":
      return polyPath(ctx, starPoints(g.points, g.inner));
    case "ellipse":
      ctx.moveTo(g.rx, 0);
      return ctx.ellipse(0, 0, g.rx, g.ry, 0, 0, Math.PI * 2);
    case "sector":
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 1, g.from * RAD, g.to * RAD);
      return ctx.closePath();
    case "ring":
      ctx.moveTo(1, 0);
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.moveTo(g.inner, 0);
      return ctx.arc(0, 0, g.inner, 0, Math.PI * 2);
    case "crescent": {
      // The outer circle (radius 1) less an inner circle (radius inner) moved right by offset.
      const d = g.offset;
      const r = g.inner;
      const x = (1 - r * r + d * d) / (2 * d);
      const y = Math.sqrt(Math.max(0, 1 - x * x));
      ctx.moveTo(x, -y);
      ctx.arc(0, 0, 1, Math.atan2(-y, x), Math.atan2(y, x), true);
      ctx.arc(d, 0, r, Math.atan2(y, x - d), Math.atan2(-y, x - d), false);
      return ctx.closePath();
    }
    case "path":
      for (const c of g.d) {
        if (c[0] === "M") ctx.moveTo(c[1], c[2]);
        else if (c[0] === "L") ctx.lineTo(c[1], c[2]);
        else if (c[0] === "C") ctx.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]);
        else if (c[0] === "Q") ctx.quadraticCurveTo(c[1], c[2], c[3], c[4]);
        else if (c[0] === "Z") ctx.closePath();
      }
  }
}

/**
 * Draw a catalog shape centred at (x, y), the unit box scaled to size (its larger extent), turned by rotate degrees.
 * @param {{ x:number, y:number, size:number, rotate?:number, style?: "outline"|"trace"|"filled"|"answer",
 *   width?:number, colour?:string, fill?:string }} at  width: line width in the context's units
 */
export function drawShape(ctx, def, at) {
  const k = at.size / 2;
  const style = at.style || "outline";
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate((at.rotate || 0) * RAD);
  ctx.scale(k, k);
  ctx.beginPath();
  shapePath(ctx, def.geometry);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = (at.width ?? 3) / k;
  if (style === "trace") ctx.setLineDash([6 / k, 4 / k]);
  const fill = style === "filled" || style === "answer" ? at.fill || at.colour || "#000000" : style === "outline" ? at.fill || "#ffffff" : null;
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill(def.geometry.kind === "ring" ? "evenodd" : "nonzero");
  }
  ctx.strokeStyle = at.colour || (style === "trace" ? "#888888" : "#000000");
  ctx.stroke();
  ctx.restore();
}
