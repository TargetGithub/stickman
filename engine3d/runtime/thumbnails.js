// Designed thumbnails (meta.thumbnails): each concept is a small one-beat scene of its own plus 2D title text,
// never a video frame. This module is pure (Node + page): it turns a concept into a video3d script for
// render3d (tools/thumbnail3d.mjs) and checks concepts for validate.js with the script's own object rules.
//
// Concept: { name, title, subtitle?, titleColor?, side?, badge?, at?, stage?, camera, objects, lights? }

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
  return {
    kind: "video3d", version: 1,
    description: `Thumbnail concept "${concept.name}" for ${meta.title ?? "an episode"}.`,
    meta: { title: `${meta.title ?? "Thumbnail"}: ${concept.title ?? concept.name}`, seed: meta.seed ?? 1, ...(meta.voice ? { voice: meta.voice } : {}) },
    stage: concept.stage != null ? { preset: concept.stage } : script?.stage ?? { preset: "playroom" },
    camera: concept.camera,
    objects: concept.objects,
    scenes: [{ id: "thumb", beats: [{ dur: Math.max(2, at + 1), do: actions }] }],
  };
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
    if (c.camera == null || typeof c.camera !== "object") err("E3D_REQUIRED", `${p}.camera`, "a concept needs its own camera { position, lookAt, fov }");
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
  if (path.startsWith("scenes[0].beats[0].do[0]")) return `${p}.lights${path.slice("scenes[0].beats[0].do[0]".length)}`;
  return `${p}.${path}`;
}
