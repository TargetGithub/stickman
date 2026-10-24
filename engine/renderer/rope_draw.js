// The tug-of-war rope (series/baaaana/PLAN.md task 8b): while a `tug` activity runs, a thick rope runs through
// the pullers' hands, left to right, with a little slack beyond each end. Spans come from the event log
// (scene_views.js: tug start and end events), the hands from the frame's characters.

const ROPE = "#c9a26b";
const EDGE = "#7a5a32";

/**
 * @param {Array<{ t0:number, t1:number, ids:string[] }>} spans  scene video time
 * @param {object[]} chars  the frame's characters (projected joints in depth scenes)
 */
export function drawTugRopes(ctx, spans, chars, t) {
  for (const s of spans) {
    if (t < s.t0 || t >= s.t1) continue;
    const pts = s.ids.map((id) => chars.find((c) => c.id === id)).filter(Boolean)
      .map((c) => ({ x: (c.j.lHand.x + c.j.rHand.x) / 2, y: (c.j.lHand.y + c.j.rHand.y) / 2, w: 7 * c.scale }))
      .sort((a, b) => a.x - b.x);
    if (pts.length < 2) continue;
    const first = pts[0];
    const last = pts[pts.length - 1];
    const tail = 70 * (first.w / 7);
    const line = [{ x: first.x - tail, y: first.y + tail * 0.5 }, ...pts, { x: last.x + tail, y: last.y + tail * 0.5 }];
    for (const [color, w] of [[EDGE, first.w + 4], [ROPE, first.w]]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      line.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
  }
}

/** Tug spans of a scene from its events: { t0, t1, ids } (a start without an end lasts to the scene's end). */
export function tugSpans(events) {
  const out = [];
  for (const e of events) {
    if (e.type !== "tug") continue;
    if (e.what === "start") out.push({ t0: e.videoT, t1: Infinity, ids: e.ids, beatId: e.beatId });
    else {
      const open = out.find((s) => s.beatId === e.beatId && s.t1 === Infinity);
      if (open) open.t1 = e.videoT;
    }
  }
  return out;
}
