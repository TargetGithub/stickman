// Automatic quality score for a valid script, before rendering (spec 18.4). 0-100.
// Parts: distinct moves (aim 8+), effect density per 10 s, an emphasized moment, camera variety,
// a clear ending, and few warnings. Scripts under the threshold are regenerated once, then dropped.

const FILLER = new Set(["idle", "wait", "face", "walk", "run"]);
const DRAMATIC = new Set(["slowmo", "freeze", "zoom_punch", "text_pop", "shake", "flash", "explosion", "desaturate"]);

/**
 * @param {object} script  a valid script
 * @param {{ warnings: object[], durationSec: number }} result  validator / engine.load result
 * @param {object[]} events  simulation events (engine.getEvents())
 */
export function scoreScript(script, result, events) {
  const charBeats = script.beats.filter((b) => b.who !== "world");
  const worldBeats = script.beats.filter((b) => b.who === "world");
  const moves = new Set(charBeats.map((b) => b.do).filter((d) => !FILLER.has(d)));
  const hits = events.filter((e) => e.type === "hit" && e.kind === "hit").length;
  const fxBeats = events.filter((e) => e.type === "fx").length;
  const dramatic = worldBeats.filter((b) => DRAMATIC.has(b.do)).length;
  const per10 = ((hits + fxBeats + dramatic) / Math.max(1, result.durationSec)) * 10;
  const emphasis = worldBeats.some((b) => ["slowmo", "freeze"].includes(b.do)) || script.camera.some((k) => k.mode === "focus");
  const cameraKeys = script.camera.length;
  const ending = !result.warnings.some((w) => w.code === "W_NO_ENDING");
  const warnCount = result.warnings.length;

  const parts = {
    moves: Math.round(30 * Math.min(1, moves.size / 8)),
    effects: Math.round(20 * Math.min(1, per10 / 4)),
    emphasis: emphasis ? 15 : 0,
    camera: Math.round(10 * Math.min(1, (cameraKeys - 1) / 2)),
    ending: ending ? 15 : 0,
    clean: Math.max(0, 10 - 2 * warnCount),
  };
  const score = Object.values(parts).reduce((a, b) => a + b, 0);
  const stats = { distinctMoves: moves.size, effectsPer10s: Number(per10.toFixed(1)), cameraKeys, warnings: warnCount, durationSec: Number(result.durationSec.toFixed(1)) };
  return { score, parts, stats };
}

/** Plain-language feedback for a low score, for the regeneration prompt. */
export function scoreFeedback({ parts, stats }) {
  const out = [];
  if (parts.moves < 30) out.push(`Use more distinct moves (now ${stats.distinctMoves}, aim for 8+).`);
  if (parts.effects < 20) out.push(`Add more impact and effects (now ${stats.effectsPer10s} per 10 s, aim for 4+): hits, beat fx, shakes, text pops.`);
  if (!parts.emphasis) out.push("Emphasize the biggest hit with slowmo or freeze and a focus camera key.");
  if (parts.camera < 10) out.push("Add camera keys: a focus on the big moment, then back to follow.");
  if (!parts.ending) out.push("End with a clear beat: KO, victory pose and a fade.");
  if (parts.clean < 10) out.push(`Fix the validator warnings (${stats.warnings}).`);
  return out;
}
