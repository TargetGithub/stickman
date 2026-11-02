// Season 2 set pieces (Doopi & Friends, "The Whispering Horn"): desert_well, tower_clock, carrom_board, stone_door,
// banyan_crack, paper_boat and tiffin_stack. Same contract as object_shapes.js: (ctx, colors, piece, def), drawn at
// the object's bottom centre; animated pieces get piece.t (video seconds).

const TAU = Math.PI * 2;
const INK = "#2a2230";

function disc(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function outlined(ctx, fill, lw = 4) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
}

export const S2_SHAPES = {
  desert_well(ctx, c, piece) {
    // A round stone well with a wooden winch; broken: the rope hangs snapped and the bucket lies on its side.
    const w = 240;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -150, w, 150, 10);
    outlined(ctx, c.stone);
    ctx.strokeStyle = c.mortar;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const y of [-100, -50]) { ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); }
    for (const [x, y0] of [[-60, -150], [40, -150], [-10, -100], [80, -100], [-80, -50], [20, -50]]) { ctx.moveTo(x, y0); ctx.lineTo(x, y0 + 50); }
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -150, w / 2, 26, 0, 0, TAU);
    outlined(ctx, c.stone);
    ctx.beginPath();
    ctx.ellipse(0, -150, w / 2 - 22, 16, 0, 0, TAU);
    ctx.fillStyle = c.hole;
    ctx.fill();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.rect(s * (w / 2 - 14) - 9, -340, 18, 190);
      outlined(ctx, c.wood);
    }
    ctx.beginPath();
    ctx.rect(-w / 2 + 5, -330, w - 10, 22);
    outlined(ctx, c.wood);
    const broken = piece.state === "broken";
    ctx.strokeStyle = c.rope;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, -308);
    ctx.lineTo(broken ? 14 : 0, broken ? -230 : -190);
    ctx.stroke();
    if (broken) {
      // The bucket lies on the sand beside the well.
      ctx.save();
      ctx.translate(w / 2 + 50, -24);
      ctx.rotate(1.3);
      ctx.beginPath();
      ctx.moveTo(-26, -24); ctx.lineTo(26, -24); ctx.lineTo(20, 24); ctx.lineTo(-20, 24); ctx.closePath();
      outlined(ctx, c.bucket);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.moveTo(-24, -190); ctx.lineTo(24, -190); ctx.lineTo(19, -150); ctx.lineTo(-19, -150); ctx.closePath();
      outlined(ctx, c.bucket);
    }
  },
  tower_clock(ctx, c, piece) {
    // The big clock's works: a round dial on a brass frame with a pendulum. Ticking: the hands move and the
    // pendulum swings; stopped: everything still, the dial greyed.
    const t = piece.t ?? 0;
    const stopped = piece.state === "stopped";
    const r = 170;
    const cy = -560;
    ctx.beginPath();
    ctx.rect(-26, cy, 52, -cy);
    outlined(ctx, c.frame);
    const swing = stopped ? 0 : Math.sin(t * Math.PI) * 0.32;
    ctx.save();
    ctx.translate(0, cy + r * 0.6);
    ctx.rotate(swing);
    ctx.strokeStyle = c.brass;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 300);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 320, 34, 0, TAU);
    outlined(ctx, c.brass);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(0, cy, r + 22, 0, TAU);
    outlined(ctx, c.brass, 5);
    ctx.beginPath();
    ctx.arc(0, cy, r, 0, TAU);
    outlined(ctx, stopped ? c.dim_face : c.face, 3);
    ctx.strokeStyle = INK;
    ctx.lineCap = "round";
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU;
      ctx.lineWidth = k % 3 ? 4 : 9;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8);
      ctx.lineTo(Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92);
      ctx.stroke();
    }
    // Stopped at ten to four; ticking: the minute hand jumps once a second.
    const sec = stopped ? 0 : Math.floor(t);
    for (const [len, w, a] of [[0.5, 12, ((3.83 + sec / 720) / 12) * TAU], [0.76, 7, ((50 + sec / 6) / 60) * TAU]]) {
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(Math.sin(a) * r * len, cy - Math.cos(a) * r * len);
      ctx.stroke();
    }
    disc(ctx, 0, cy, 14, c.brass);
  },
  carrom_board(ctx, c) {
    // A square carrom board on a low stand (seen from the side and a little above): pockets, coins, a striker.
    ctx.fillStyle = c.legs;
    ctx.fillRect(-120, -70, 18, 70);
    ctx.fillRect(102, -70, 18, 70);
    ctx.beginPath();
    ctx.moveTo(-190, -70); ctx.lineTo(190, -70); ctx.lineTo(150, -140); ctx.lineTo(-150, -140); ctx.closePath();
    outlined(ctx, c.frame);
    ctx.beginPath();
    ctx.moveTo(-168, -78); ctx.lineTo(168, -78); ctx.lineTo(136, -133); ctx.lineTo(-136, -133); ctx.closePath();
    ctx.fillStyle = c.board;
    ctx.fill();
    for (const [x, y] of [[-158, -80], [158, -80], [-132, -131], [132, -131]]) disc(ctx, x, y, 7, INK);
    ctx.strokeStyle = c.lines;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -105, 34, 12, 0, 0, TAU);
    ctx.stroke();
    for (const [x, y, k] of [[-8, -106, 0], [8, -104, 1], [0, -112, 0], [14, -110, 1], [-14, -101, 1], [0, -105, 2]]) {
      ctx.fillStyle = [c.dark, c.light, c.queen][k];
      ctx.beginPath();
      ctx.ellipse(x, y, 7, 3.5, 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = c.striker;
    ctx.beginPath();
    ctx.ellipse(-40, -86, 11, 5, 0, 0, TAU);
    ctx.fill();
  },
  stone_door(ctx, c, piece) {
    // The Echo Cave's door: a carved stone slab in a rock arch with a spiral of glowing runes. Open: the slab has
    // slid up into the arch and warm violet light spills out of the dark doorway.
    const w = 360;
    const h = 560;
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 70, 0);
    ctx.lineTo(-w / 2 - 70, -h);
    ctx.arc(0, -h, w / 2 + 70, Math.PI, 0);
    ctx.lineTo(w / 2 + 70, 0);
    ctx.closePath();
    outlined(ctx, c.rock);
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2, -h);
    ctx.arc(0, -h, w / 2, Math.PI, 0);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
    const open = piece.state === "open";
    ctx.fillStyle = open ? c.inside : c.slab;
    ctx.fill();
    if (open) {
      const g = ctx.createRadialGradient(0, -h * 0.4, 20, 0, -h * 0.4, w);
      g.addColorStop(0, c.light);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fill();
      return;
    }
    ctx.strokeStyle = c.carve;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.55);
    for (let k = 0; k < 60; k++) {
      const a = k * 0.32;
      ctx.lineTo(Math.cos(a) * k * 2.2, -h * 0.55 + Math.sin(a) * k * 2.2);
    }
    ctx.stroke();
    ctx.fillStyle = c.rune;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 140, -h * 0.55 + Math.sin(a) * 140, 9, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h * 0.08);
    ctx.lineTo(w / 2, -h * 0.08);
    ctx.stroke();
  },
  banyan_crack(ctx, c, piece) {
    // The crack in the Rainbow Banyan's trunk (placed over the theme's banyan or a tree_big): a jagged dark split
    // up the bark. Healed: the split is closed by a glowing golden seam.
    const pts = [[0, 0], [14, -60], [-10, -130], [18, -200], [-6, -270], [12, -340], [0, -400]];
    const healed = piece.state === "healed";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (healed) {
      ctx.strokeStyle = c.glow;
      ctx.lineWidth = 26;
      ctx.globalAlpha *= 0.35;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.globalAlpha /= 0.35;
    }
    ctx.strokeStyle = healed ? c.seam : c.dark;
    ctx.lineWidth = healed ? 7 : 16;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    if (healed) return;
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (const [i, dx] of [[2, -40], [4, 36]]) { ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i][0] + dx, pts[i][1] - 30); }
    ctx.stroke();
  },
  paper_boat(ctx, c, piece) {
    const bob = Math.sin((piece.t ?? 0) * 2.4) * 4;
    ctx.save();
    ctx.translate(0, bob);
    ctx.beginPath();
    ctx.moveTo(-70, -30); ctx.lineTo(70, -30); ctx.lineTo(48, 0); ctx.lineTo(-48, 0); ctx.closePath();
    outlined(ctx, c.paper, 3);
    ctx.beginPath();
    ctx.moveTo(-34, -30); ctx.lineTo(0, -100); ctx.lineTo(34, -30); ctx.closePath();
    outlined(ctx, c.paper, 3);
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-30, -14, 8, 0, TAU); // a little drawn island with a palm on the hull
    ctx.moveTo(-30, -22); ctx.lineTo(-27, -36);
    ctx.stroke();
    ctx.restore();
  },
  tiffin_stack(ctx, c) {
    // A courier's crate of steel tiffin carriers.
    ctx.beginPath();
    ctx.rect(-110, -110, 220, 110);
    outlined(ctx, c.crate);
    ctx.strokeStyle = c.slat;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-110, -55); ctx.lineTo(110, -55);
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const x = -78 + k * 52;
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.roundRect(x - 20, -150 - j * 26 + 40, 40, 24, 5);
        outlined(ctx, c.steel, 2.5);
      }
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(x, -164, 12, 10, 0, Math.PI, TAU);
      ctx.stroke();
    }
  },
};
