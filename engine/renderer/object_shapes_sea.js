// Lake object shapes (STORY_SPEC 8), Doopi & Friends batch B3: a pirate ship and a rowboat (vehicles; they
// sit low, as if in the water), a log raft (breakable: broken = sinking apart), a fishing net (static: it
// drops over a captured character) and a treasure chest (closed/open). Drawn at the object's bottom
// center as (ctx, colors, piece, def), like object_shapes.js.

const OUTLINE = "#2a1d14";

function outlined(ctx, fill, lw = 4) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw;
  ctx.stroke();
}

/** A rounded hull from -w/2 to w/2, its deck at y = -h. */
function hull(ctx, w, h, fill) {
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h);
  ctx.lineTo(w / 2, -h);
  ctx.quadraticCurveTo(w / 2 - 20, -h * 0.2, w / 2 - h, 0);
  ctx.lineTo(-w / 2 + h * 0.8, 0);
  ctx.quadraticCurveTo(-w / 2 + 10, -h * 0.2, -w / 2, -h);
  ctx.closePath();
  outlined(ctx, fill, 5);
}

export const SEA_SHAPES = {
  pirate_ship(ctx, c) {
    // Mast and sail first, then the hull in front.
    ctx.beginPath();
    ctx.rect(-14, -720, 28, 560);
    outlined(ctx, c.wood, 4);
    ctx.beginPath();
    ctx.moveTo(14, -680);
    ctx.quadraticCurveTo(260, -480, 14, -260);
    ctx.closePath();
    outlined(ctx, c.sail, 4);
    ctx.beginPath();
    ctx.rect(70, -520, 50, 50);
    outlined(ctx, c.patch, 2);
    ctx.fillStyle = c.flag;
    ctx.fillRect(14, -720, 110, 60);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(70, -690, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    hull(ctx, 1000, 190, c.hull);
    ctx.fillStyle = c.trim;
    ctx.fillRect(-490, -190, 980, 18);
    ctx.fillStyle = c.port;
    for (let k = -3; k <= 3; k++) {
      ctx.beginPath();
      ctx.arc(k * 120, -110, 20, 0, Math.PI * 2);
      outlined(ctx, c.port, 3);
    }
    // The steering wheel at the back.
    ctx.strokeStyle = c.wood;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(-380, -250, 42, 0, Math.PI * 2);
    ctx.stroke();
    // A water line hides the bottom of the hull.
    ctx.fillStyle = c.water;
    ctx.fillRect(-520, -30, 1040, 34);
  },
  rowboat(ctx, c) {
    hull(ctx, 360, 70, c.hull);
    ctx.fillStyle = c.trim;
    ctx.fillRect(-176, -70, 352, 10);
    ctx.strokeStyle = c.oar;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-40, -60); ctx.lineTo(-150, 10);
    ctx.moveTo(40, -60); ctx.lineTo(150, 10);
    ctx.stroke();
    ctx.fillStyle = c.water;
    ctx.fillRect(-200, -14, 400, 18);
  },
  raft(ctx, c, piece) {
    const broken = piece.state === "broken";
    for (let k = 0; k < 6; k++) {
      ctx.save();
      const x = -150 + k * 60;
      ctx.translate(x + (broken ? (k - 2.5) * 22 : 0), broken ? 18 + (k % 2) * 12 : 0);
      ctx.rotate(broken ? (k - 2.5) * 0.12 : 0);
      ctx.beginPath();
      ctx.ellipse(0, -18, 30, 18, 0, 0, Math.PI * 2);
      outlined(ctx, k % 2 ? c.log : c.log2, 3);
      ctx.restore();
    }
    if (!broken) {
      ctx.strokeStyle = c.rope;
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (const x of [-100, 100]) { ctx.moveTo(x, -38); ctx.lineTo(x, 0); }
      ctx.stroke();
    }
    ctx.fillStyle = c.water;
    ctx.fillRect(-200, broken ? -6 : 0, 400, 10);
  },
  fishing_net(ctx, c, piece) {
    if (piece.state === "open") {
      // A loose heap on the floor.
      ctx.beginPath();
      ctx.ellipse(0, -14, 90, 18, 0, 0, Math.PI * 2);
      outlined(ctx, c.mesh, 3);
      return;
    }
    // A dome of mesh over someone, weighted with floats at the bottom.
    ctx.strokeStyle = c.mesh;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 100, 230, 0, Math.PI, 0);
    for (let k = -3; k <= 3; k++) {
      ctx.moveTo(k * 28, 0);
      ctx.quadraticCurveTo(k * 14, -200, 0, -230);
    }
    for (const y of [-60, -120, -170]) {
      const w = 100 * Math.sqrt(1 - (y / 230) ** 2);
      ctx.moveTo(-w, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.fillStyle = c.float;
    for (let k = -3; k <= 3; k += 2) {
      ctx.beginPath();
      ctx.arc(k * 30, -6, 9, 0, Math.PI * 2);
      outlined(ctx, c.float, 2);
    }
  },
  treasure_chest(ctx, c, piece) {
    const open = piece.state === "open";
    ctx.beginPath();
    ctx.rect(-80, -90, 160, 90);
    outlined(ctx, c.wood, 4);
    ctx.fillStyle = c.trim;
    ctx.fillRect(-80, -60, 160, 10);
    for (const x of [-60, 52]) ctx.fillRect(x, -90, 10, 90);
    if (open) {
      // Coins piled up and the lid tipped back.
      for (const [x, y] of [[-40, -98], [-12, -104], [16, -100], [42, -96], [0, -114], [-26, -112], [26, -110]]) {
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        outlined(ctx, c.gold, 2);
      }
      ctx.beginPath();
      ctx.rect(-80, -160, 160, 26);
      outlined(ctx, c.wood, 4);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(-80, -90);
    ctx.quadraticCurveTo(0, -150, 80, -90);
    ctx.closePath();
    outlined(ctx, c.wood, 4);
    ctx.beginPath();
    ctx.rect(-12, -100, 24, 26);
    outlined(ctx, c.gold, 2);
  },
};
