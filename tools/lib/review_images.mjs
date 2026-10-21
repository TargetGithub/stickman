// Thumbnail choice and contact sheets (spec 17.4), via the public engine API.

/**
 * Frame for the thumbnail: just after the strongest landed hit (bonus for slow motion and big
 * shakes around it); otherwise 40% into the video.
 * @returns {{ frame:number, reason:string }}
 */
export function chooseThumbnailFrame(engine) {
  const events = engine.getEvents();
  const { totalFrames, fps } = engine.getMeta();
  const slow = events.filter((e) => e.type === "world" && e.do === "slowmo").map((e) => e.videoT);
  let best = null;
  for (const e of events) {
    if (e.type !== "hit" || e.kind !== "hit") continue;
    let score = e.damage;
    if (slow.some((t) => Math.abs(t - e.videoT) < 0.1)) score += 10;
    if (e.shake === "big") score += 5;
    if (!best || score > best.score) best = { score, e };
  }
  if (!best) return { frame: Math.floor(totalFrames * 0.4), reason: "no landed hits: 40% mark" };
  const frame = Math.min(totalFrames - 1, Math.round((best.e.videoT + 0.05) * fps));
  return { frame, reason: `${best.e.attacker} ${best.e.move} on ${best.e.target} (damage ${best.e.damage})` };
}

/** Draw a cols×rows grid of evenly spaced frames into a new canvas (quarter-size tiles). */
export function contactSheet(engine, backend, { cols = 4, rows = 4 } = {}) {
  const { width, height, totalFrames, outputWidth, outputHeight } = engine.getMeta();
  const tw = width / 4;
  const th = height / 4;
  const full = backend.createCanvas(outputWidth ?? width, outputHeight ?? height); // the render scale's canvas
  const sheet = backend.createCanvas(tw * cols, th * rows);
  const sctx = sheet.getContext("2d");
  const count = cols * rows;
  for (let i = 0; i < count; i++) {
    const n = Math.floor((i * (totalFrames - 1)) / (count - 1));
    engine.renderFrame(full.getContext("2d"), n);
    sctx.drawImage(full, (i % cols) * tw, Math.floor(i / cols) * th, tw, th);
    sctx.fillStyle = "rgba(0,0,0,0.55)";
    sctx.fillRect((i % cols) * tw, Math.floor(i / cols) * th, 92, 22);
    sctx.fillStyle = "#ffffff";
    sctx.font = "15px Inter";
    sctx.fillText(`${(n / 60).toFixed(1)}s`, (i % cols) * tw + 6, Math.floor(i / cols) * th + 16);
  }
  return sheet;
}

/**
 * Story sheet (S8.5): one row per scene (up to 16), `cols` frames across each scene, sixth-size tiles,
 * with the scene id on the first tile.
 */
export function storySheet(engine, backend, { cols = 4, maxRows = 16 } = {}) {
  const { width, height, outputWidth, outputHeight } = engine.getMeta();
  const scenes = engine.getScenes().slice(0, maxRows);
  const tw = Math.round(width / 6);
  const th = Math.round(height / 6);
  const full = backend.createCanvas(outputWidth ?? width, outputHeight ?? height);
  const sheet = backend.createCanvas(tw * cols, th * scenes.length);
  const sctx = sheet.getContext("2d");
  scenes.forEach((sc, row) => {
    for (let c = 0; c < cols; c++) {
      const n = sc.startFrame + Math.floor(((c + 0.5) * (sc.frames - 1)) / cols);
      engine.renderFrame(full.getContext("2d"), n);
      sctx.drawImage(full, c * tw, row * th, tw, th);
    }
    sctx.fillStyle = "rgba(0,0,0,0.6)";
    sctx.fillRect(0, row * th, 160, 22);
    sctx.fillStyle = "#ffffff";
    sctx.font = "15px Inter";
    sctx.fillText(`${sc.id} ${((sc.frames) / 60).toFixed(0)}s`, 6, row * th + 16);
  });
  return sheet;
}
