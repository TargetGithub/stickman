// YouTube Shorts from episode scripts (tools/shorts.mjs): one or more scenes of a story script become a
// standalone 9:16 script. Pure functions: the scene timings come in from the caller (engine + TTS).

/** Shorts run at most this long (s); YouTube allows up to 3 minutes, but under a minute keeps viewers to the end. */
export const SHORT_MAX = 60;
export const SHORT_MIN = 15;

/** The pace a Short plays with: a quick establishing wide, then each line on its speaker (a group shot is tiny in 9:16). */
export const SHORT_PACE = { framing: "single", establish: 1.5, reactions: false };

/**
 * A standalone portrait script made of some scenes of a story script.
 * Everything that names a dropped scene (layers and the text and shapes on them, audio tracks and markers) goes too.
 * @param {object} script  a story script (version 3)
 * @param {string[]} ids   authored scene ids, in the order they play
 * @param {{ title?: string, end?: string|null }} [o]  end: the end card's text (null: none)
 */
export function shortScript(script, ids, o = {}) {
  const byId = new Map(script.scenes.map((s) => [s.id, s]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) throw new Error(`no scene ${missing.join(", ")} (scenes: ${[...byId.keys()].join(", ")})`);
  if (ids.some((id) => byId.get(id).use)) throw new Error("a template scene (the intro) cannot be a Short");
  const out = structuredClone(script);
  const keep = new Set(ids);
  out.meta = { ...out.meta, format: "portrait", title: o.title ?? `${script.meta.title} (Short)` };
  out.scenes = ids.map((id) => structuredClone(byId.get(id)));
  delete out.scenes[0].transitionIn; // the Short starts on the scene, not on a fade from the episode before
  out.pace = { ...out.pace, ...SHORT_PACE };
  const kept = (x) => x.scene === undefined || keep.has(x.scene);
  if (out.layers) {
    out.layers = out.layers.filter(kept);
    const layers = new Set(out.layers.map((l) => l.id));
    for (const k of ["text", "shapes"]) if (out[k]) out[k] = out[k].filter((x) => kept(x) && (x.layer === undefined || layers.has(x.layer)));
    for (const k of ["layers", "text", "shapes"]) if (out[k] && !out[k].length) delete out[k];
  }
  for (const k of ["tracks", "markers"]) if (out.audio?.[k]) out.audio[k] = out.audio[k].filter(kept);
  if (o.end !== null) {
    const last = out.scenes.at(-1);
    out.scenes.push({
      id: "short_end",
      location: last.location,
      ...(last.time ? { time: last.time } : {}),
      transitionIn: { type: "fade", dur: 0.4 },
      cast: last.cast ?? [], // behind the card (a scene with nobody in it has no camera target)
      beats: [
        { at: 0, who: "world", do: "end_card", params: { text: o.end ?? "Watch the full episode!" } },
        // The card holds the story clock, so this fade starts as the card ends: the Short ends dark, not on the scene.
        { at: 0.05, who: "world", do: "fade", params: { to: "black", dur: 0.25 } },
      ],
    });
  }
  return out;
}

/**
 * Authored scenes with their length: the engine's scenes (a macro expands into several, named `<id>_...`)
 * summed per authored scene, and the spoken lines in each.
 * @param {object} script
 * @param {Array<{ id, startT, endT }>} played  engine.getScenes()
 * @param {Array<{ type, videoT, actor?, bubble? }>} events  engine.getEvents()
 */
export function sceneSpans(script, played, events) {
  const says = events.filter((e) => e.type === "say" && e.actor && e.bubble !== "think");
  return script.scenes.map((s) => {
    const mine = played.filter((p) => p.id === s.id || p.id.startsWith(`${s.id}_`));
    const start = Math.min(...mine.map((p) => p.startT));
    const end = Math.max(...mine.map((p) => p.endT));
    return { id: s.id, template: !!s.use, start, end, dur: end - start, lines: says.filter((e) => e.videoT >= start && e.videoT < end).length };
  });
}

/**
 * Short candidates: single scenes, or runs of neighbouring scenes, SHORT_MIN..SHORT_MAX s long with at least two
 * spoken lines, best first (more lines per second, then closer to 45 s). Candidates never share a scene.
 * @param {ReturnType<typeof sceneSpans>} spans
 */
export function shortCandidates(spans, max = SHORT_MAX) {
  const all = [];
  for (let i = 0; i < spans.length; i++) {
    let dur = 0;
    let lines = 0;
    for (let j = i; j < spans.length && !spans[j].template; j++) {
      dur += spans[j].dur;
      lines += spans[j].lines;
      if (dur > max) break;
      if (dur >= SHORT_MIN && lines >= 2) all.push({ ids: spans.slice(i, j + 1).map((s) => s.id), dur, lines });
    }
  }
  const score = (c) => c.lines / c.dur - Math.abs(c.dur - 45) / 300;
  all.sort((a, b) => score(b) - score(a) || a.ids.length - b.ids.length);
  const used = new Set();
  return all.filter((c) => !c.ids.some((id) => used.has(id)) && (c.ids.forEach((id) => used.add(id)), true));
}
