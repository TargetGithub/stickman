// Designed thumbnails (meta.thumbnails): each concept is a small one-beat scene of its own plus 2D title text,
// never a video frame. This module is pure (Node + page): it turns a concept into a video3d script for
// render3d (tools/thumbnail3d.mjs) and checks concepts for validate.js with the script's own object rules.
//
// Concept: { name, title, subtitle?, titleColor?, side?, badge?, at?, stage?, camera (or "auto"), objects, lights? }

export const THUMB_SIDES = ["left", "right", "top", "bottom"];
export const THUMB_LIMITS = { concepts: 4, title: 18, subtitle: 32, badge: 12 };
/** Seconds into the pose when the still is taken (clips and feelings have settled, the lights have blended). */
export const THUMB_AT = 1.0;
const KEYS = new Set(["name", "title", "subtitle", "titleColor", "side", "badge", "at", "stage", "camera", "objects", "lights", "description"]);
const LIGHT_KEYS = ["rig", "background", "floor", "rug"];

/**
 * The one-beat video3d script for a concept: its objects at rest (characters in their `clip` and `feeling`),
 * the concept's lights blended in at once, no speech. The beat lasts past `at` so the still exists.
 * @param {object} script  the episode script (seed and voice carry over; the stage is the default)
 * @param {object} concept one entry of meta.thumbnails
 */
export function thumbnailScript(script, concept) {
  const meta = script?.meta ?? {};
  const at = concept.at ?? THUMB_AT;
  const actions = concept.lights ? [{ do: "lights", ...concept.lights, dur: 0.1 }] : [];
  // camera "auto": frame every top-level object (shot) plus an empty spot on the title's side, so nothing at the
  // edges is cut off and the title's half stays clear.
  const auto = concept.camera === "auto";
  const objects = auto ? [...(concept.objects ?? []), roomFor(concept)] : concept.objects;
  if (auto) actions.unshift({ do: "shot", target: [...(concept.objects ?? []).filter((o) => o?.parent == null).map((o) => o.id), "thumb_room"], framing: "close", pad: 0.04, height: 6, dur: 0.05 });
  return {
    kind: "video3d", version: 1,
    description: `Thumbnail concept "${concept.name}" for ${meta.title ?? "an episode"}.`,
    meta: { title: `${meta.title ?? "Thumbnail"}: ${concept.title ?? concept.name}`, seed: meta.seed ?? 1, ...(meta.voice ? { voice: meta.voice } : {}) },
    stage: thumbStage(concept.stage, script?.stage),
    camera: auto ? { position: [0, 1.5, 9], lookAt: [0, 1, 0], fov: 36 } : concept.camera,
    objects,
    scenes: [{ id: "thumb", beats: [{ dur: Math.max(2, at + 1), do: actions }] }],
  };
}

/**
 * A concept's stage: the episode's (with its hide/move) by default; a preset name (keeping the episode's hide and
 * move when it is the same preset); or a full stage object ({ preset, hide, move, ... }).
 */
function thumbStage(c, ep) {
  if (c == null) return ep ?? { preset: "playroom" };
  if (typeof c === "object") return c;
  const same = (ep?.preset ?? "playroom") === c;
  return { preset: c, ...(same && ep?.hide ? { hide: ep.hide } : {}), ...(same && ep?.move ? { move: ep.move } : {}) };
}

/** The empty spot that keeps the title's side clear in an auto-framed concept: as wide as the scene, beside it. */
function roomFor(concept) {
  const tops = (concept.objects ?? []).filter((o) => o?.parent == null && Array.isArray(o.at));
  const xs = tops.map((o) => o.at[0]);
  const ys = tops.map((o) => o.at[1]);
  const zs = tops.map((o) => o.at[2]);
  const [x0, x1] = xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 0];
  const w = Math.max(1.6, x1 - x0 + 1.2);
  const y = ys.length ? Math.max(...ys) : 0;
  const z = zs.length ? zs.reduce((a, b) => a + b, 0) / zs.length : 0;
  const side = concept.side ?? "left";
  const at = side === "left" ? [x0 - w * 0.78, y, z] : side === "right" ? [x1 + w * 0.78, y, z] : side === "top" ? [(x0 + x1) / 2, y + 2.2, z] : [(x0 + x1) / 2, y - 1, z];
  return { id: "thumb_room", kind: "group", at: at.map((v) => Math.round(v * 1000) / 1000) };
}

/**
 * Checks meta.thumbnails; object, stage, camera and lights issues come from validateScript on each concept's
 * script, with their paths moved under meta.thumbnails[i].
 * @param {unknown} list   meta.thumbnails
 * @param {object} script  the episode script
 * @param {object} catalog loadCatalog3d()
 * @param {(script: object, catalog: object) => { errors: any[], warnings: any[] }} validate validateScript
 */
export function checkThumbnails(list, script, catalog, validate) {
  const errors = [];
  const warnings = [];
  const err = (code, path, message) => errors.push({ code, path, message });
  if (!Array.isArray(list) || list.length < 1 || list.length > THUMB_LIMITS.concepts) {
    err("E3D_THUMBNAILS", "meta.thumbnails", `thumbnails must be a list of 1-${THUMB_LIMITS.concepts} concepts`);
    return { errors, warnings };
  }
  const names = new Set();
  list.forEach((c, i) => {
    const p = `meta.thumbnails[${i}]`;
    if (!c || typeof c !== "object" || Array.isArray(c)) return err("E3D_THUMBNAILS", p, "a thumbnail concept must be an object");
    for (const k of Object.keys(c)) if (!KEYS.has(k)) warnings.push({ code: "W3D_UNKNOWN_FIELD", path: `${p}.${k}`, message: `unknown thumbnail field "${k}"` });
    if (typeof c.name !== "string" || !/^[a-z0-9][a-z0-9_]*$/.test(c.name)) err("E3D_THUMB_NAME", `${p}.name`, "name must be lower_snake_case (it names thumbnail_<name>.jpg)");
    else if (names.has(c.name)) err("E3D_THUMB_NAME", `${p}.name`, `name "${c.name}" is used twice`);
    else names.add(c.name);
    text(c.title, `${p}.title`, THUMB_LIMITS.title, true);
    text(c.subtitle, `${p}.subtitle`, THUMB_LIMITS.subtitle, false);
    text(c.badge, `${p}.badge`, THUMB_LIMITS.badge, false);
    if (c.titleColor != null && !catalog.colors[c.titleColor] && !/^#[0-9a-f]{6}$/i.test(String(c.titleColor))) err("E3D_COLOR", `${p}.titleColor`, `titleColor must be a colour name or #rrggbb, got "${c.titleColor}"`);
    if (c.side != null && !THUMB_SIDES.includes(c.side)) err("E3D_THUMB_SIDE", `${p}.side`, `side must be one of ${THUMB_SIDES.join(", ")}`);
    if (c.at != null && !(typeof c.at === "number" && c.at >= 0.2 && c.at <= 30)) err("E3D_RANGE", `${p}.at`, "at must be 0.2-30 s into the pose");
    if (c.camera !== "auto" && (c.camera == null || typeof c.camera !== "object")) err("E3D_REQUIRED", `${p}.camera`, 'a concept needs its own camera { position, lookAt, fov }, or "auto" (frames every object and keeps the title side clear)');
    if (!Array.isArray(c.objects) || !c.objects.length) err("E3D_REQUIRED", `${p}.objects`, "a concept needs objects (one teaching object and 1-2 characters)");
    if (c.lights != null && (typeof c.lights !== "object" || !LIGHT_KEYS.some((k) => c.lights[k] != null))) err("E3D_LIGHTS", `${p}.lights`, `lights must set ${LIGHT_KEYS.join(", ")} (any of them)`);
    // The concept's own scene, checked like a script.
    const v = validate(thumbnailScript(script, { ...c, lights: typeof c.lights === "object" ? c.lights : undefined }), catalog);
    const move = (e) => ({ ...e, path: movePath(e.path, p) });
    errors.push(...v.errors.filter((e) => e.path !== "meta.title").map(move));
    warnings.push(...v.warnings.map(move));
  });
  return { errors, warnings };

  function text(v, path, max, required) {
    if (v == null && !required) return;
    if (typeof v !== "string" || !v.trim()) err("E3D_THUMB_TEXT", path, "must be a non-empty string");
    else if ([...v].length > max) err("E3D_THUMB_TEXT", path, `must be at most ${max} characters (got ${[...v].length}): short words read at phone size`);
  }
}

/** A path in a concept's script → the same place in the episode script. */
function movePath(path, p) {
  if (path.startsWith("stage.preset")) return `${p}.stage`;
  if (path.startsWith("stage.")) return `${p}.${path}`;
  if (path.startsWith("scenes[0].beats[0].do[0]")) return `${p}.lights${path.slice("scenes[0].beats[0].do[0]".length)}`;
  return `${p}.${path}`;
}
