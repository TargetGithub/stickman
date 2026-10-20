// Per-scene views of the event log for the renderer (split from renderer/index.js in V3.4): what each scene's
// frames need (world events, says, objects, depth events, light changes, lens changes), and the lens of a v3
// frame (ENGINE_V3_SPEC 5.3, ADR-025). Pure functions of the sim result, the catalog and the frame.

import { lightRigOf, scaleRig } from "../lighting.js";
import { LENS_DEFAULTS, lensChanges, lensAt, autoFocusSpans, autoFocusAt, createHandheld, handheldAt, lensCamera, blurFor, coverScale } from "../camera3.js";
import { lensMatrix } from "./lens_draw.js";
import { withLensTracks } from "../compositor.js";
import { depthAt } from "../depth.js";
import { deriveRng } from "../math.js";
import { resolveView } from "../turnaround.js";
import { STAGE } from "../config.js";

/** Per-scene views of the event log and fx records (overlays and particles never leak across scenes). */
/** The strength of the automatic v3 look (a v3 script's look.strength, default 0.2). */
export const LOOK_STRENGTH = 0.2;
export const lookStrength = (story) => story?.look?.strength ?? LOOK_STRENGTH;

export function sceneViews(sim, catalog) {
  const k = lookStrength(sim.story);
  const scenes = sim.scenes || [{ index: 0, theme: sim.meta?.theme, fxStart: 0, fxEnd: sim.fx.log.length, fxT0: 0, set: [] }];
  return scenes.map((sc, i) => {
    const ev = sim.events.filter((e) => (e.scene ?? 0) === sc.index);
    const world = ev.filter((e) => e.type === "world");
    const fxT1 = i + 1 < scenes.length ? scenes[i + 1].fxT0 : Infinity;
    const inRange = (t) => t >= sc.fxT0 && t < fxT1;
    return {
      ...sc,
      worldEvents: world,
      themeChanges: world.filter((e) => e.do === "set_theme"),
      looks: world.filter((e) => e.do === "set_time" || e.do === "set_weather"),
      gradeEvents: world.filter((e) => e.do === "set_grade"),
      says: ev.filter((e) => e.type === "say"),
      objectEvents: ev.filter((e) => e.type === "object"),
      squashEvents: ev.filter((e) => e.type === "land" || e.type === "hit"),
      // Depth layers and extras (S6): layer changes, and what crowds react to (scene story seconds).
      layerEvents: ev.filter((e) => e.type === "layer"),
      // The depth lane (V3.2): a v3 scene's depth settings, each character's placement z and depth events (scene story seconds).
      depth: sc.depth || null,
      // Light rigs (V3.3): the scene's starting rig (null: flat) and its set_light changes.
      // The time-of-day rig is the automatic look (at the look strength); a scene's or location's own light is full.
      rig0: sc.depth ? (sc.light ? lightRigOf(catalog, { light: sc.light }, null, sc.look) : scaleRig(lightRigOf(catalog, {}, null, sc.look), k)) : null,
      lookStrength: k,
      lightEvents: world.filter((e) => e.do === "set_light"),
      // The v3 lens (V3.4): its changes, the shots that pull focus, the scene's starting lens and handheld noise.
      ...(sc.depth ? {
        lensChanges: lensChanges(ev.filter((e) => e.type === "camera" || (e.type === "world" && e.do === "set_camera"))),
        autoFocus: autoFocusSpans(ev),
        lensBase: { ...LENS_DEFAULTS, vignette: LENS_DEFAULTS.vignette * k, ...(sc.lens || {}) },
        handheld: createHandheld(deriveRng(sim.meta?.seed ?? 1, `handheld@${sc.id ?? i}`)),
        viewTracks: viewTracks(ev, sc, catalog, k),
      } : {}),
      placementZ: new Map((sc.characters || []).map((c) => [c.id, c.z ?? 0])),
      depthEvents: groupDepth(ev.filter((e) => e.type === "depth"), sc.storyStart ?? 0),
      extras: sc.extras || [],
      reactions: reactionsOf(ev, sc),
      fxLog: sc.fxStart === 0 && sc.fxEnd === sim.fx.log.length ? sim.fx.log : sim.fx.log.slice(sc.fxStart, sc.fxEnd),
      trails: sim.fx.trails.filter((t) => inRange(t.t0)),
      flashes: sim.fx.flashes.filter((f) => inRange(f.t0)),
    };
  });
}

/** Depth events by character, with their start in scene story seconds (the sim lerps the same way). */
function groupDepth(events, t0) {
  const by = new Map();
  for (const e of events) {
    if (!by.has(e.actor)) by.set(e.actor, []);
    by.get(e.actor).push({ storyT: e.storyT - t0, z0: e.z0, z1: e.z1, dur: e.dur });
  }
  return by;
}

/** Hit and defeat times (scene story seconds) for cheering and fleeing extras. */
function reactionsOf(ev, sc) {
  const t0 = sc.storyStart ?? 0;
  const hits = ev.filter((e) => e.type === "hit" && e.kind === "hit").map((e) => e.storyT - t0);
  const defeats = ev.filter((e) => e.type === "defeat").map((e) => e.storyT - t0);
  const first = [...hits, ...defeats].sort((a, b) => a - b)[0] ?? null;
  return { hits, defeats, first, center: (sc.stageWidth ?? STAGE.width) / 2 };
}

/**
 * The lens of a v3 frame (V3.4): the lens channels, the camera they give, the tilt/roll matrix, and the focus.
 * @returns {{ L, lc, matrix, dof: { zf, amount }|null, bgBlur }}
 */
export function frameLens(r, sv, f) {
  // Lens tracks (V3.5: lens.<channel>) override the lens channels.
  const L = withLensTracks(lensAt(sv.lensChanges, f.videoT, r.catalog.cameraMoves, sv.lensBase), r.frameValues || {});
  const hh = handheldAt(sv.handheld, L.handheld, f.videoT);
  const lc = lensCamera(f.cam, L, sv.depth, hh, STAGE.groundY);
  const tilt = (lc.tiltPx * r.H) / 1080;
  const matrix = Math.abs(lc.roll) > 1e-5 || Math.abs(tilt) > 0.05 ? lensMatrix(r.W, r.H, lc.roll, tilt, coverScale(r.W, r.H, lc.roll)) : null;
  const auto = sv.lensBase.autoFocus !== false ? autoFocusAt(sv.autoFocus, f.videoT) : null;
  const amount = Math.max(L.dof, (auto?.dof ?? 0) * (sv.lookStrength ?? 1));
  const t = f.storyT - (sv.storyStart ?? 0);
  const zOfId = (id) => depthAt(sv.depthEvents.get(id) || [], sv.placementZ.get(id) ?? 0, t);
  let zf = 0;
  if (typeof L.focusZ === "number") zf = L.focusZ;
  else if (L.focus) zf = zOfId(L.focus);
  else if (auto?.ids.length) zf = auto.ids.reduce((sum, id) => sum + zOfId(id), 0) / auto.ids.length;
  const dof = amount > 0.01 ? { zf, amount } : null;
  return { L, lc, matrix, dof, bgBlur: dof ? blurFor(sv.depth.far * 1.5, zf, amount) : 0 };
}

/**
 * Turnaround views of a v3 scene (V3.6), per character: { base, sets: [{ storyT, view }], hints: [{ t0, t1, view }] }
 * in scene story seconds. Views the body plan lacks fall back to the nearest one it has.
 */
function viewTracks(ev, sc, catalog, k = 1) {
  const t0 = sc.storyStart ?? 0;
  const out = new Map();
  for (const c of sc.characters || []) {
    const plan = catalog.bodies?.[c.body ?? "stickman"] ?? null;
    out.set(c.id, { base: resolveView(plan, c.view ?? "side"), sets: [], hints: [], plan });
  }
  const ends = ev.filter((e) => e.type === "moveEnd");
  for (const e of ev) {
    const tr = out.get(e.actor);
    if (!tr) continue;
    if (e.type === "view") tr.sets.push({ storyT: e.storyT - t0, view: resolveView(tr.plan, e.view) });
    else if (e.type === "viewHint") {
      const end = ends.find((x) => x.actor === e.actor && x.beatId === e.beatId && x.storyT >= e.storyT);
      tr.hints.push({ t0: e.storyT - t0, t1: end ? end.storyT - t0 : Infinity, view: resolveView(tr.plan, e.view), amount: k }); // automatic turns at the look strength
    }
  }
  return out;
}

