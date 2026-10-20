// Templates and markers (ENGINE_V3_SPEC 6, ADR-031). Milestone: V3.8.
// A version 3 script may use a template in place of a scene: { "id": "intro", "use": { "template": "doopi_intro",
// "params": { ... } } }. Templates are catalog data (catalog/story/templates.json): params with types and
// defaults, and fragments (scenes, text, layers, shapes, tracks, audio tracks, markers) whose strings may hold
// ${name} placeholders; ${id} is the use entry's id, so every id a template makes is unique. A string that is
// exactly "${name}" becomes the param's value with its type (a number, a list). Markers name moments in a scene
// ({ id, scene, t }) that beats can start at: "at": { "marker": "drop", "delay": 0.2 }. expandScript() turns both
// into a plain v3 script before anything else looks at it. Pure: no I/O.

const PLACEHOLDER = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
const WHOLE = /^\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/;
const BLOCKS = ["text", "layers", "shapes", "tracks"];

const issue = (code, path, message, fix) => ({ code, path, message, fix });

/** A template name: bare names are the base catalog's ("base:" is accepted as their prefix). */
export const templateKey = (name) => (typeof name === "string" && name.startsWith("base:") ? name.slice(5) : name);

/** Substitute ${name} placeholders everywhere in a value (deep). */
export function substitute(value, vars) {
  if (typeof value === "string") {
    const whole = value.match(WHOLE);
    if (whole && whole[1] in vars) return vars[whole[1]];
    return value.replace(PLACEHOLDER, (m, k) => (k in vars ? String(vars[k]) : m));
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, vars));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v, vars)]));
  return value;
}

/** Check and complete a use's params against the template's param specs. */
export function templateParams(tpl, given, path) {
  const out = [];
  const vars = {};
  const specs = tpl.params || {};
  for (const k of Object.keys(given || {})) {
    if (!specs[k]) out.push(issue("E_TEMPLATE_PARAM", `${path}.params.${k}`, `The template has no param '${k}'.`, `Params: ${Object.keys(specs).join(", ") || "none"}.`));
  }
  for (const [k, spec] of Object.entries(specs)) {
    const v = given?.[k] ?? spec.default;
    if (v === undefined) {
      if (spec.required) out.push(issue("E_TEMPLATE_PARAM", `${path}.params`, `The template needs param '${k}' (${spec.description || spec.type}).`, `Add "${k}" to params.`));
      continue;
    }
    const type = Array.isArray(v) ? "array" : typeof v;
    if (spec.type && type !== spec.type) out.push(issue("E_TEMPLATE_PARAM", `${path}.params.${k}`, `'${k}' must be a ${spec.type}.`, `Give a ${spec.type}.`));
    else if (spec.enum && !spec.enum.includes(v)) out.push(issue("E_TEMPLATE_PARAM", `${path}.params.${k}`, `'${k}' must be one of ${spec.enum.join(", ")}.`, "Use a listed value."));
    else if (spec.type === "string" && spec.maxLength && v.length > spec.maxLength) out.push(issue("E_TEMPLATE_PARAM", `${path}.params.${k}`, `'${k}' is longer than ${spec.maxLength} characters.`, "Shorten it."));
    vars[k] = v;
  }
  return { vars, issues: out };
}

/**
 * Expand template uses and resolve markers. Scripts other than version 3 come back unchanged.
 * @returns {{ script: object, issues: object[], expansions: Array<{ id, template, scenes: string[] }> }}
 */
export function expandScript(script, catalog) {
  if (!script || script.version !== 3) return { script, issues: [], expansions: [] };
  const hasUse = (script.scenes || []).some((s) => s && s.use);
  const hasMarkers = !!script.audio?.markers?.length || (script.scenes || []).some((s) => (s?.beats || []).some((b) => b?.at?.marker !== undefined));
  if (!hasUse && !hasMarkers) return { script, issues: [], expansions: [] };
  const issues = [];
  const expansions = [];
  const out = { ...script, scenes: [] };
  for (const b of BLOCKS) if (script[b]) out[b] = [...script[b]];
  if (script.audio) out.audio = { ...script.audio, tracks: [...(script.audio.tracks || [])], markers: [...(script.audio.markers || [])] };
  else delete out.audio;
  const add = (key, items) => {
    if (!items?.length) return;
    if (key === "audioTracks" || key === "markers") {
      out.audio ??= { tracks: [], markers: [] };
      (out.audio[key === "audioTracks" ? "tracks" : "markers"] ??= []).push(...items);
    } else (out[key] ??= []).push(...items);
  };
  (script.scenes || []).forEach((s, i) => {
    if (!s?.use) return out.scenes.push(s);
    const path = `scenes[${i}].use`;
    const name = templateKey(s.use.template);
    const tpl = catalog.templates?.[name];
    if (!tpl) {
      issues.push(issue("E_TEMPLATE_UNKNOWN", `${path}.template`, `Unknown template '${s.use.template}'.`, `Use one of: ${Object.keys(catalog.templates || {}).join(", ") || "(none)"}.`));
      return;
    }
    const { vars, issues: bad } = templateParams(tpl, s.use.params, path);
    issues.push(...bad);
    if (bad.length) return;
    const frag = substitute(tpl.fragment, { ...vars, id: s.id });
    out.scenes.push(...(frag.scenes || []));
    for (const b of BLOCKS) add(b, frag[b]);
    add("audioTracks", frag.audioTracks);
    add("markers", frag.markers);
    expansions.push({ id: s.id, template: name, scenes: (frag.scenes || []).map((x) => x.id) });
  });
  // Markers: beats that start at a marker get its time in their scene.
  const markers = new Map((out.audio?.markers || []).map((m) => [m.id, m]));
  out.scenes = out.scenes.map((sc, si) => {
    if (!sc?.beats?.some((b) => b?.at?.marker !== undefined)) return sc;
    return { ...sc, beats: sc.beats.map((b, bi) => {
      if (b?.at?.marker === undefined) return b;
      const m = markers.get(b.at.marker);
      const path = `scenes[${si}].beats[${bi}].at.marker`;
      if (!m) issues.push(issue("E_MARKER_UNKNOWN", path, `No marker '${b.at.marker}'.`, `Add { "id": "${b.at.marker}", "scene": "${sc.id}", "t": <seconds> } to audio.markers.`));
      else if (m.scene !== sc.id) issues.push(issue("E_MARKER_UNKNOWN", path, `Marker '${m.id}' is in scene '${m.scene}', not '${sc.id}'.`, "Anchor beats to markers of their own scene."));
      else return { ...b, at: m.t + (b.at.delay ?? 0) };
      return { ...b, at: 0 };
    }) };
  });
  if (out.audio) for (const k of ["tracks", "markers"]) if (!out.audio[k].length && !script.audio?.[k]) delete out.audio[k];
  return { script: out, issues, expansions };
}
