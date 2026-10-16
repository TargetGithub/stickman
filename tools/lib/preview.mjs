// Interim preview renderer for simulated scripts (M3). Draws characters, simple follow camera,
// hit flashes, shake, speech bubbles, text pops, captions and fades from sim.frames + sim.events.
// M4/M5 replace this with engine/renderer (real FX, camera, themes) driven by the frame store.

import { unpackJoints } from "../../engine/skeleton.js";
import { drawCharacter } from "../../engine/renderer/character.js";
import { mulberry32 } from "../../engine/math.js";
import { SHAKE, STAGE } from "../../engine/config.js";

export function createPreview(sim, { width = 1920, height = 1080, seed = 1 } = {}) {
  const rng = mulberry32(seed);
  const ev = sim.events;
  const at = (type) => ev.filter((e) => e.type === type);
  const hits = at("hit");
  const says = at("say");
  const world = at("world");
  let camX = null;

  const active = (list, n, dur) => list.filter((e) => n / 60 >= e.videoT && n / 60 < e.videoT + dur(e));

  return function draw(ctx, n) {
    const f = sim.frames[n];
    const chars = f.chars.map((c) => ({ ...c, j: unpackJoints(c.joints) }));
    const target = chars.reduce((s, c) => s + c.j.hip.x, 0) / chars.length;
    camX = camX === null ? target : camX + (target - camX) * 0.08;

    let sx = 0;
    let sy = 0;
    for (const e of [...active(hits, n, () => 0.25).filter((h) => h.kind === "hit"), ...active(world, n, (w) => (w.do === "shake" ? SHAKE[w.params.preset]?.duration ?? 0.3 : 0)).filter((w) => w.do === "shake")]) {
      const preset = SHAKE[e.shake || e.params?.preset || "small"];
      const k = 1 - (n / 60 - e.videoT) / preset.duration;
      if (k > 0) {
        sx += (rng() * 2 - 1) * preset.amplitude * k;
        sy += (rng() * 2 - 1) * preset.amplitude * k;
      }
    }

    ctx.fillStyle = "#f7f7f5";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2 - camX + sx, sy);
    ctx.fillStyle = "#e4e2dc";
    ctx.fillRect(camX - width, STAGE.groundY, width * 2, height);
    ctx.strokeStyle = "#b9b6ad";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(camX - width, STAGE.groundY); ctx.lineTo(camX + width, STAGE.groundY); ctx.stroke();
    for (const c of [...chars].sort((a, b) => b.scale - a.scale)) {
      ctx.fillStyle = "rgba(0,0,0,0.10)";
      ctx.beginPath(); ctx.ellipse(c.j.hip.x, STAGE.groundY + 2, 40 * c.scale, 7 * c.scale, 0, 0, Math.PI * 2); ctx.fill();
      drawCharacter(ctx, c.j, { color: c.color, scale: c.scale, facing: c.facing, mouth: c.mouth });
    }
    for (const h of active(hits, n, () => 0.2)) {
      const k = 1 - (n / 60 - h.videoT) / 0.2;
      ctx.strokeStyle = h.kind === "hit" ? `rgba(255, 190, 0, ${k})` : `rgba(80, 170, 255, ${k})`;
      ctx.lineWidth = 6;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const r0 = 14 + (1 - k) * 30;
        ctx.beginPath(); ctx.moveTo(h.point.x + Math.cos(a) * r0, h.point.y + Math.sin(a) * r0); ctx.lineTo(h.point.x + Math.cos(a) * (r0 + 34 * k + 8), h.point.y + Math.sin(a) * (r0 + 34 * k + 8)); ctx.stroke();
      }
    }
    for (const s of active(says, n, (e) => e.dur)) {
      const c = chars.find((x) => x.id === s.actor);
      if (!c) continue;
      ctx.font = "34px Bangers";
      const w = ctx.measureText(s.text).width + 36;
      const x = c.j.head.x - w / 2;
      const y = c.j.head.y - 40 * c.scale - 70;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#222222";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(x, y, w, 54, 14); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c.j.head.x - 10, y + 54); ctx.lineTo(c.j.head.x, y + 72); ctx.lineTo(c.j.head.x + 10, y + 54); ctx.fill();
      ctx.fillStyle = "#222222";
      ctx.textAlign = "center";
      ctx.fillText(s.text, c.j.head.x, y + 39);
    }
    ctx.restore();

    for (const w of active(world, n, (e) => (e.do === "text_pop" ? 1.0 : e.do === "caption" ? e.params.dur ?? 2 : 0))) {
      const k = Math.min(1, (n / 60 - w.videoT) / 0.12);
      ctx.save();
      ctx.textAlign = "center";
      if (w.do === "text_pop") {
        ctx.translate(width / 2, height * 0.38);
        ctx.scale(0.6 + 0.5 * k, 0.6 + 0.5 * k);
        ctx.rotate(-0.06);
        ctx.font = "160px Bangers";
        ctx.lineWidth = 14;
        ctx.strokeStyle = "#111111";
        ctx.strokeText(w.params.text, 0, 0);
        ctx.fillStyle = w.params.color || "#ffd400";
        ctx.fillText(w.params.text, 0, 0);
      } else {
        ctx.font = "44px Inter";
        ctx.fillStyle = "#222222";
        ctx.fillText(w.params.text, width / 2, w.params.pos === "top" ? 120 : height - 80);
      }
      ctx.restore();
    }
    for (const w of world.filter((e) => e.do === "fade" && n / 60 >= e.videoT)) {
      const k = Math.min(1, (n / 60 - w.videoT) / (w.params.dur ?? 1));
      const alpha = w.params.dir === "in" ? 1 - k : k;
      ctx.fillStyle = w.params.to === "white" ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
      ctx.fillRect(0, 0, width, height);
    }
    const slow = f.storyT - (sim.frames[n - 1]?.storyT ?? 0);
    if (n > 0 && slow > 0 && slow < 0.9 / 60) {
      ctx.font = "24px Inter";
      ctx.fillStyle = "#888888";
      ctx.textAlign = "right";
      ctx.fillText("slow motion", width - 40, 50);
    }
  };
}
