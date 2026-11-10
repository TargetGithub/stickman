// A mid-episode stage change: the `stage` action crossfades the background, floor, rug, fog and light rig to
// another stage preset, fades the old preset's set pieces out and the new one's in. Every set piece of every
// preset the episode visits is a plan object from the start: the first preset's keep their "set_<id>" ids, a
// later preset's are "set_<preset>_<id>" (laterSetPieces), hidden (fade 0) until their preset comes. Only
// timeline segments are recorded, so any frame is a pure function of t. Pure: no three.js, no clocks.

import { rgb } from "./director_extras.js";
import { SET_PREFIX, stageSet } from "./stage_set.js";

/** Fog [near, far] for a preset without fog: beyond the camera's far plane (200 m), so it shows nothing. */
export const NO_FOG = [300, 600];

/** The id prefix of a preset's set pieces: "set_" for the episode's first preset, "set_<preset>_" for later ones. */
export const setPrefix = (preset, first) => (preset === first ? SET_PREFIX : `${SET_PREFIX}${preset}_`);

/**
 * Set pieces of the presets a script changes to with `stage` actions (other than its first preset), with
 * prefixed ids. The validator and the director both use this, so scripts can target "set_forest_tree1".
 * @param {object} script
 * @returns {object[]}
 */
export function laterSetPieces(script, catalog) {
  const first = script.stage?.preset ?? "playroom";
  const out = [];
  for (const p of stagePresets(script)) {
    if (p === first || !catalog.stages?.[p]) continue;
    const pre = setPrefix(p, first);
    out.push(...stageSet({ preset: p }, catalog).map((o) => ({ ...o, id: pre + o.id.slice(SET_PREFIX.length), ...(o.parent != null ? { parent: pre + o.parent.slice(SET_PREFIX.length) } : {}) })));
  }
  return out;
}

/** Presets named by the script's `stage` actions, in order of first use. */
export function stagePresets(script) {
  const seen = [];
  for (const s of Array.isArray(script?.scenes) ? script.scenes : []) {
    for (const b of Array.isArray(s?.beats) ? s.beats : []) {
      for (const a of Array.isArray(b?.do) ? b.do : []) if (a?.do === "stage" && typeof a.preset === "string" && !seen.includes(a.preset)) seen.push(a.preset);
    }
  }
  return seen;
}

/**
 * Add changeStage to a director (compile.js runs the `stage` action through it).
 * @param {object} d  the director
 * @param {{ catalog, tl, objects: Map, getStage: () => object, stageBases: () => void, setStage: (s:object) => void }} k
 */
export function installStageChange(d, { catalog, tl, objects, getStage, stageBases, setStage }) {
  let current = null; // the preset on show (after the changes recorded so far)
  const visited = [];
  let based = false;

  /** The set piece ids of a preset (adding a later preset's pieces, hidden, the first time it is named). */
  const piecesOf = (preset) => {
    const first = getStage().preset ?? "playroom";
    // The first preset's pieces (or the script's own stage.set) joined when the stage was set.
    if (preset === first) return stageSet(getStage(), catalog).map((o) => o.id).filter((id) => objects.has(id));
    const pre = setPrefix(preset, first);
    const ids = [];
    for (const o of stageSet({ preset }, catalog)) {
      const id = pre + o.id.slice(SET_PREFIX.length);
      if (!objects.has(id)) {
        d.add({ ...o, id, ...(o.parent != null ? { parent: pre + o.parent.slice(SET_PREFIX.length) } : {}) });
        tl.base(id, "visible", false);
        tl.base(id, "fade", 0);
        once.add(id);
      }
      ids.push(id);
    }
    return ids;
  };
  const once = new Set(); // pieces that have a "fade" base
  const colour = (name) => rgb(catalog.colors[name].hex);

  /** Bases the crossfade needs beyond lights' (fog, floor and rug fades, the sun's direction and shadow). */
  function bases(presets) {
    if (based) return;
    based = true;
    stageBases();
    const s = { ...catalog.stages[getStage().preset ?? "playroom"], ...getStage() };
    const rig = catalog.lights[s.lights];
    const anyFloor = [s, ...presets.map((p) => catalog.stages[p])].find((x) => x.floor)?.floor;
    tl.base("stage", "fog", s.fog ?? NO_FOG);
    if (!s.floor && anyFloor) tl.base("stage", "floor", colour(anyFloor));
    tl.base("stage", "floorFade", s.floor ? 1 : 0);
    if (!s.rug) tl.base("stage", "rug", colour(s.floor ?? anyFloor ?? s.background));
    tl.base("stage", "rugFade", s.rug ? 1 : 0);
    tl.base("stage", "sunDir", rig.sun.dir);
    tl.base("stage", "shadow", !!rig.sun.shadow);
  }

  /**
   * Fog rolls in or lifts: amount 0 (the preset's own fog, or none) to 1 (thick: haze from 3 m, nothing past 20 m, so the teaching area stays readable), and the sky
   * blends toward `color` (default misty rain_sky) as it thickens (fog takes the background's colour), back to the
   * preset's when it clears. Use with lights overcast for a grey day; a lighthouse beam (lamp) still cuts through.
   */
  d.fog = ({ at: t = 0, amount = 1, dur = 2, color = "rain_sky", ease = "sineInOut" } = {}) => {
    if (!(typeof amount === "number" && amount >= 0 && amount <= 1)) throw new Error("fog: amount must be 0-1");
    if (!catalog.colors[color]) throw new Error(`fog: unknown color "${color}"`);
    setStage({ fogAction: true }); // the page makes a fog for the scene even when the preset has none
    bases([]);
    const s = { ...catalog.stages[getStage().preset ?? "playroom"], ...getStage() };
    const [n0, f0] = s.fog ?? NO_FOG;
    const lerp = (a, b) => Math.round((a + (b - a) * amount) * 1000) / 1000;
    const tw = (prop, to) => tl.tween("stage", prop, { start: t, dur, to, ease });
    tw("fog", [lerp(n0, 3), lerp(f0, 20)]);
    const bg = colour(s.background);
    const mist = colour(color);
    tw("background", bg.map((x, i) => Math.round((x + (mist[i] - x) * Math.min(1, amount * 1.2)) * 1e4) / 1e4));
    return d;
  };

  d.changeStage = (preset, { at: t = 0, dur = 2, ease = "sineInOut" } = {}) => {
    const next = catalog.stages[preset];
    if (!next) throw new Error(`unknown stage "${preset}"`);
    const first = getStage().preset ?? "playroom";
    current ??= first;
    if (!visited.includes(first)) visited.push(first);
    if (!visited.includes(preset)) visited.push(preset);
    setStage({ presets: [...visited] }); // the page builds fog, floor and rug for every preset it will show
    bases(visited.filter((p) => p !== first));
    const rig = catalog.lights[next.lights];
    const tw = (prop, to) => tl.tween("stage", prop, { start: t, dur, to, ease });
    tw("background", colour(next.background));
    tw("fog", next.fog ?? NO_FOG);
    if (next.floor) tw("floor", colour(next.floor));
    tw("floorFade", next.floor ? 1 : 0);
    // A rug fades into the floor colour on its way out, and comes in from it.
    if (next.rug) tw("rug", colour(next.rug));
    else if (next.floor) tw("rug", colour(next.floor));
    tw("rugFade", next.rug ? 1 : 0);
    tw("sun", rig.sun.intensity);
    tw("hemi", rig.hemisphere[0]);
    tw("sky", rgb(rig.hemisphere[1]));
    tw("ground", rgb(rig.hemisphere[2]));
    tw("environment", rig.environment);
    tw("sunDir", rig.sun.dir);
    tl.set("stage", "shadow", !!rig.sun.shadow, t + dur / 2);
    if (preset !== current) {
      for (const id of piecesOf(current)) {
        if (!once.has(id)) (once.add(id), tl.base(id, "fade", 1));
        tl.tween(id, "fade", { start: t, dur, to: 0, ease });
        tl.set(id, "visible", false, t + dur);
      }
      for (const id of piecesOf(preset)) {
        if (!once.has(id)) (once.add(id), tl.base(id, "fade", 1));
        tl.set(id, "visible", true, t);
        tl.tween(id, "fade", { start: t, dur, to: 1, ease });
      }
    }
    current = preset;
    return d;
  };
}
