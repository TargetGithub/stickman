// More held shapes (STORY_SPEC 8): the batch A5 holdables (crystal, horn, jalebi, plate, apple, kite,
// basket). Same contract as props.js: drawn from butt/tip (and grip) points, so held, flying and
// lying props share one routine. A holdable with states (the crystal) gets `prop.state` from the renderer.

const lerpPt = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
const angleOf = (t) => Math.atan2(t.tip.y - t.butt.y, t.tip.x - t.butt.x);

/** Rainbow crystal colours per state: [light facet, dark facet]. */
const CRYSTAL = {
  red: ["#ff5a6a", "#c7243a"], orange: ["#ffa64a", "#d9661a"], yellow: ["#ffe45c", "#d1a91c"],
  green: ["#6fe07a", "#2c9a45"], blue: ["#5ec8ff", "#1f78d1"], indigo: ["#7f7bff", "#3f35b8"],
  violet: ["#d38bff", "#8a3fc2"], dim: ["#a3a3a3", "#6e6e6e"],
};

/** A six-sided gem standing upright at c (height h), with a soft glow unless dim. */
function crystal(ctx, prop, c, scale, outline) {
  const state = CRYSTAL[prop.state] ? prop.state : "red";
  const [light, dark] = CRYSTAL[state];
  const h = prop.len * scale;
  const w = h * 0.62;
  if (state !== "dim") {
    const g = ctx.createRadialGradient(c.x, c.y, h * 0.1, c.x, c.y, h * 1.3);
    g.addColorStop(0, `${light}99`);
    g.addColorStop(1, `${light}00`);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - h * 1.3, c.y - h * 1.3, h * 2.6, h * 2.6);
  }
  const P = [[0, -h / 2], [w / 2, -h / 4], [w / 2, h / 4], [0, h / 2], [-w / 2, h / 4], [-w / 2, -h / 4]].map(([x, y]) => ({ x: c.x + x, y: c.y + y }));
  const poly = (pts, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  };
  poly([P[0], P[3], P[4], P[5]], light);
  poly([P[0], P[1], P[2], P[3]], dark);
  poly([P[0], { x: c.x + w * 0.16, y: c.y - h * 0.1 }, P[3], { x: c.x - w * 0.16, y: c.y - h * 0.1 }], light);
  ctx.strokeStyle = outline;
  ctx.lineWidth = Math.max(1.5, 2 * scale);
  ctx.beginPath();
  P.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
  poly([{ x: c.x - w * 0.3, y: c.y - h * 0.2 }, { x: c.x - w * 0.12, y: c.y - h * 0.34 }, { x: c.x - w * 0.18, y: c.y - h * 0.05 }], state === "dim" ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.9)");
}

/** The Gloom Horn: a tapered tube from the mouthpiece (butt) to a wide bell (tip), a coil and gold rings. */
function horn(ctx, prop, t, scale, outline) {
  const L = Math.hypot(t.tip.x - t.butt.x, t.tip.y - t.butt.y);
  ctx.save();
  ctx.translate(t.butt.x, t.butt.y);
  ctx.rotate(angleOf(t));
  const w = prop.width * scale;
  ctx.fillStyle = prop.color;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -w * 0.25);
  ctx.quadraticCurveTo(L * 0.6, -w * 0.35, L * 0.86, -w * 0.8);
  ctx.lineTo(L, -w * 1.5);
  ctx.lineTo(L, w * 1.5);
  ctx.lineTo(L * 0.86, w * 0.8);
  ctx.quadraticCurveTo(L * 0.6, w * 0.35, 0, w * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // The coil round the middle of the tube.
  ctx.strokeStyle = outline;
  ctx.lineWidth = w * 0.4 + 3;
  ctx.beginPath();
  ctx.ellipse(L * 0.42, 0, L * 0.16, L * 0.19, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = prop.color;
  ctx.lineWidth = w * 0.4;
  ctx.stroke();
  // Gold rings and the bell's rim.
  ctx.strokeStyle = prop.trim;
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.beginPath();
  for (const u of [0.12, 0.72]) {
    ctx.moveTo(L * u, -w * 0.55);
    ctx.lineTo(L * u, w * 0.55);
  }
  ctx.moveTo(L - 1, -w * 1.5);
  ctx.lineTo(L - 1, w * 1.5);
  ctx.stroke();
  ctx.fillStyle = prop.trim;
  ctx.fillRect(-3 * scale, -w * 0.4, 4 * scale, w * 0.8); // mouthpiece
  // Faint grey mist at the bell.
  ctx.fillStyle = "rgba(150, 140, 170, 0.35)";
  for (const [x, y, r] of [[1.08, -0.6, 0.55], [1.18, 0.4, 0.45]]) {
    ctx.beginPath();
    ctx.arc(L * 1 + w * x, w * y, w * r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** An orange spiral jalebi with a glossy highlight. */
function jalebi(ctx, c, r, color, trim, scale) {
  ctx.lineCap = "round";
  const spiral = (width, col) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let k = 0; k <= 40; k++) {
      const a = k * 0.42;
      const rr = (r * k) / 40;
      const x = c.x + Math.cos(a) * rr;
      const y = c.y + Math.sin(a) * rr * 0.9;
      if (k) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  };
  spiral(r * 0.28 + 1.5, trim);
  spiral(r * 0.2 + 0.5, color);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(c.x - r * 0.35, c.y - r * 0.45, Math.max(1, 1.6 * scale), 0, Math.PI * 2);
  ctx.fill();
}

function apple(ctx, c, r, prop, outline) {
  ctx.fillStyle = prop.color;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c.x - r * 0.35, c.y, r * 0.75, 0, Math.PI * 2);
  ctx.arc(c.x + r * 0.35, c.y, r * 0.75, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + r * 0.05, r * 1.08, r * 0.92, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();
  ctx.strokeStyle = "#6b4a2f";
  ctx.lineWidth = Math.max(1.5, r * 0.18);
  ctx.beginPath();
  ctx.moveTo(c.x, c.y - r * 0.7);
  ctx.lineTo(c.x + r * 0.15, c.y - r * 1.25);
  ctx.stroke();
  ctx.fillStyle = prop.trim;
  ctx.beginPath();
  ctx.ellipse(c.x + r * 0.5, c.y - r * 1.15, r * 0.42, r * 0.2, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(c.x - r * 0.45, c.y - r * 0.35, r * 0.18, r * 0.28, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

/** A diamond kite with crossbars and a tail of bows; centered at c, half-height r. */
export function kiteShape(ctx, c, r, color, trim, outline, sway = 0) {
  const w = r * 0.72;
  ctx.strokeStyle = "#555555";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(c.x, c.y + r);
  for (let k = 1; k <= 8; k++) ctx.lineTo(c.x + Math.sin(k * 0.9 + sway) * r * 0.25, c.y + r + k * r * 0.22);
  ctx.stroke();
  const bows = ["#ff5fa8", "#ffd23f", "#3fa8ff"];
  for (let k = 0; k < 3; k++) {
    const x = c.x + Math.sin((k * 2 + 2) * 0.9 + sway) * r * 0.25;
    const y = c.y + r + (k * 2 + 2) * r * 0.22;
    ctx.fillStyle = bows[k];
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x - r * 0.2, y - r * 0.1); ctx.lineTo(x - r * 0.2, y + r * 0.1); ctx.closePath();
    ctx.moveTo(x, y); ctx.lineTo(x + r * 0.2, y - r * 0.1); ctx.lineTo(x + r * 0.2, y + r * 0.1); ctx.closePath();
    ctx.fill();
  }
  const quad = (pts, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(c.x + x, c.y + y) : ctx.moveTo(c.x + x, c.y + y)));
    ctx.closePath();
    ctx.fill();
  };
  quad([[0, -r], [w, -r * 0.25], [0, -r * 0.25]], color);
  quad([[0, -r], [-w, -r * 0.25], [0, -r * 0.25]], trim);
  quad([[0, r], [w, -r * 0.25], [0, -r * 0.25]], trim);
  quad([[0, r], [-w, -r * 0.25], [0, -r * 0.25]], color);
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(c.x, c.y - r); ctx.lineTo(c.x + w, c.y - r * 0.25); ctx.lineTo(c.x, c.y + r); ctx.lineTo(c.x - w, c.y - r * 0.25); ctx.closePath();
  ctx.moveTo(c.x, c.y - r); ctx.lineTo(c.x, c.y + r);
  ctx.moveTo(c.x - w, c.y - r * 0.25); ctx.lineTo(c.x + w, c.y - r * 0.25);
  ctx.stroke();
}

/** A round woven basket with a lid; bottom center at (x, y), width w. */
export function basketShape(ctx, x, y, w, color, trim, outline) {
  const h = w * 0.62;
  ctx.fillStyle = color;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y - h * 0.82);
  ctx.lineTo(x + w * 0.5, y - h * 0.82);
  ctx.quadraticCurveTo(x + w * 0.48, y, x + w * 0.3, y);
  ctx.lineTo(x - w * 0.3, y);
  ctx.quadraticCurveTo(x - w * 0.48, y, x - w * 0.5, y - h * 0.82);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = trim; // the weave
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.beginPath();
  for (let k = 1; k <= 3; k++) {
    const yy = y - (h * 0.82 * k) / 4;
    ctx.moveTo(x - w * 0.47, yy);
    ctx.lineTo(x + w * 0.47, yy);
  }
  for (let k = -2; k <= 2; k++) {
    ctx.moveTo(x + k * w * 0.16, y - h * 0.82);
    ctx.lineTo(x + k * w * 0.11, y);
  }
  ctx.stroke();
  ctx.fillStyle = trim; // the lid with a knob
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.86, w * 0.54, h * 0.16, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y - h * 1.04, w * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/**
 * Draw one of this module's shapes. Returns false for shapes it does not know.
 * @param {{ butt, tip, grip? }} t
 */
/** A long wooden ladle (batch B): a handle with a deep round cup at the tip; trim colours the cup's inside. */
function ladle(ctx, prop, t, scale, outline) {
  const L = Math.hypot(t.tip.x - t.butt.x, t.tip.y - t.butt.y);
  const w = prop.width * scale;
  ctx.save();
  ctx.translate(t.butt.x, t.butt.y);
  ctx.rotate(angleOf(t));
  ctx.lineCap = "round";
  ctx.strokeStyle = outline;
  ctx.lineWidth = w + 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(L * 0.86, 0);
  ctx.stroke();
  ctx.strokeStyle = prop.color;
  ctx.lineWidth = w;
  ctx.stroke();
  const r = w * 2.6;
  ctx.fillStyle = prop.color;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(L - r, r * 0.5, r, Math.PI * 1.05, Math.PI * 1.95, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = prop.trim;
  ctx.beginPath();
  ctx.ellipse(L - r, r * 0.5 - r * 0.15, r * 0.8, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawMoreProp(ctx, prop, t, scale, outline) {
  const mid = lerpPt(t.butt, t.tip, 0.5);
  switch (prop.shape) {
    case "crystal":
      crystal(ctx, prop, lerpPt(t.butt, t.tip, 0.62), scale, outline);
      return true;
    case "horn":
      horn(ctx, prop, t, scale, outline);
      return true;
    case "ladle":
      ladle(ctx, prop, t, scale, outline);
      return true;
    case "jalebi":
      jalebi(ctx, lerpPt(t.butt, t.tip, 0.65), prop.len * 0.5 * scale, prop.color, prop.trim, scale);
      return true;
    case "plate": {
      // Held flat on the hand, a little stack of jalebis on top.
      const g = t.grip || mid;
      const r = prop.len * 0.5 * scale;
      for (const [dx, dy] of [[-0.35, -0.32], [0.35, -0.32], [0, -0.62]]) jalebi(ctx, { x: g.x + dx * r, y: g.y + dy * r }, r * 0.34, "#ff9a1f", "#c45e0e", scale);
      ctx.fillStyle = prop.color;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(g.x, g.y - 2 * scale, r, r * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = prop.trim;
      ctx.beginPath();
      ctx.ellipse(g.x, g.y - 2 * scale, r * 0.7, r * 0.13, 0, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    }
    case "apple":
      apple(ctx, lerpPt(t.butt, t.tip, 0.6), prop.len * 0.5 * scale, prop, outline);
      return true;
    case "kite": {
      // Held by its string: the kite flies high above and ahead of the hand.
      const g = t.grip || t.butt;
      const top = { x: g.x + prop.len * 0.35 * scale, y: g.y - prop.len * scale };
      ctx.strokeStyle = "#555555";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.quadraticCurveTo(g.x + prop.len * 0.3 * scale, (g.y + top.y) / 2 + 30 * scale, top.x, top.y + 24 * scale);
      ctx.stroke();
      kiteShape(ctx, top, 24 * scale, prop.color, prop.trim, outline, angleOf(t));
      return true;
    }
    case "basket": {
      // Hangs from the hand by its rim.
      const g = t.grip || mid;
      const w = prop.width * 1.4 * scale;
      basketShape(ctx, g.x, g.y + w * 0.5, w, prop.color, prop.trim, outline);
      return true;
    }
    default:
      return false;
  }
}

/** Shape names this module draws. */
export const MORE_PROP_SHAPES = ["crystal", "horn", "jalebi", "plate", "apple", "kite", "basket", "ladle"];
