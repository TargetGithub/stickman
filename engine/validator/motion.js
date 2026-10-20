// Checks for the v3 motion-graphics blocks (ENGINE_V3_SPEC 6, V3.5): ids, layer and scene references,
// parents without cycles, track targets, keys and easings, text styles and on-screen text.

import { parseTarget, easingOf, valueFits } from "../timeline.js";
import { checkText } from "./semantic.js";
import { DEFAULT_LAYER } from "../compositor.js";

const issue = (code, path, message, fix) => ({ code, path, message, fix });

/**
 * @param {object} story  the normalized v3 story
 * @param {object} catalog  for text styles and the blocklist
 * @returns {object[]} E_REF_DUPLICATE, E_LAYER_REF, E_REF_SCENE, E_REF_CHARACTER, E_TRACK_TARGET, E_TRACK_KEYS,
 *   E_TRACK_EASE, E_TEXT_STYLE, E_TEXT_BLOCKED, E_TEXT_GLYPH
 */
export function motionIssues(story, catalog) {
  const out = [];
  if (!story.v3) return out;
  const layers = story.layers || [];
  const text = story.text || [];
  const shapes = story.shapes || [];
  const scenes = new Set((story.scenes || []).map((s) => s.id));
  const cast = new Set((story.cast || []).map((c) => c.id));
  const layerIds = new Set([DEFAULT_LAYER]);
  const seen = new Map();
  const unique = (list, block) => list.forEach((e, i) => {
    const key = block === "layers" ? `layer:${e.id}` : `item:${e.id}`;
    if (seen.has(key)) out.push(issue("E_REF_DUPLICATE", `${block}[${i}].id`, `'${e.id}' is used twice (${seen.get(key)}).`, "Give every layer, text and shape its own id."));
    else seen.set(key, `${block}[${i}]`);
    if (block === "layers") layerIds.add(e.id);
  });
  unique(layers, "layers");
  unique(shapes, "shapes");
  unique(text, "text");
  const sceneRef = (e, path) => {
    if (e.scene !== undefined && !scenes.has(e.scene)) out.push(issue("E_REF_SCENE", `${path}.scene`, `No scene '${e.scene}'.`, `Use one of: ${[...scenes].join(", ")}.`));
  };
  const layerRef = (v, path, what) => {
    if (v !== undefined && !layerIds.has(v)) out.push(issue("E_LAYER_REF", path, `${what} names no layer '${v}'.`, `Use one of: ${layers.map((l) => l.id).join(", ") || "(add a layer first)"}.`));
  };
  const shapeIds = new Set(shapes.map((s) => s.id));
  layers.forEach((l, i) => {
    const p = `layers[${i}]`;
    sceneRef(l, p);
    if (l.mask && !shapeIds.has(l.mask.shape)) out.push(issue("E_LAYER_REF", `${p}.mask.shape`, `The mask names no shape '${l.mask.shape}'.`, "Add the shape to shapes (it is drawn only as the mask when it has no layer of its own)."));
    if (l.parent?.layer !== undefined) layerRef(l.parent.layer, `${p}.parent.layer`, "The parent");
    if (l.parent?.char !== undefined && !cast.has(l.parent.char)) out.push(issue("E_REF_CHARACTER", `${p}.parent.char`, `No character '${l.parent.char}'.`, `Use one of: ${[...cast].join(", ")}.`));
    if (l.parent && !l.parent.char && !l.parent.layer) out.push(issue("E_LAYER_REF", `${p}.parent`, "A parent needs a char or a layer.", 'Use { "char": "<id>", "joint": "head" } or { "layer": "<id>" }.'));
  });
  // Parent cycles: follow layer parents from each layer.
  const parentOf = new Map(layers.filter((l) => l.parent?.layer).map((l) => [l.id, l.parent.layer]));
  layers.forEach((l, i) => {
    const visited = new Set([l.id]);
    for (let cur = parentOf.get(l.id); cur; cur = parentOf.get(cur)) {
      if (visited.has(cur)) { out.push(issue("E_LAYER_REF", `layers[${i}].parent`, `Layer '${l.id}' is its own ancestor.`, "Break the parent loop.")); break; }
      visited.add(cur);
    }
  });
  const order = new Map(layers.map((l, i) => [l.id, i]));
  layers.forEach((l, i) => {
    if (l.parent?.layer && order.has(l.parent.layer) && order.get(l.parent.layer) > i) out.push(issue("E_LAYER_REF", `layers[${i}].parent.layer`, `The parent '${l.parent.layer}' is listed after '${l.id}'.`, "List a parent layer before its children."));
  });
  shapes.forEach((s, i) => {
    sceneRef(s, `shapes[${i}]`);
    layerRef(s.layer, `shapes[${i}].layer`, `Shape '${s.id}'`);
    if (s.type === "path" && !(s.d?.length >= 2)) out.push(issue("E_TRACK_KEYS", `shapes[${i}].d`, `Path shape '${s.id}' needs path commands.`, 'Add "d": [["M", 0, 0], ["L", 100, 0], ...].'));
    if (s.type === "line" && (s.x2 === undefined || s.y2 === undefined)) out.push(issue("E_TRACK_KEYS", `shapes[${i}]`, `Line '${s.id}' needs x2 and y2.`, "Give the end point."));
  });
  text.forEach((e, i) => {
    const p = `text[${i}]`;
    sceneRef(e, p);
    layerRef(e.layer, `${p}.layer`, `Text '${e.id}'`);
    if (e.style !== undefined && !catalog.textStyles?.[e.style]) out.push(issue("E_TEXT_STYLE", `${p}.style`, `Unknown text style '${e.style}'.`, `Use one of: ${(catalog.textStyleNames || []).join(", ")}.`));
    for (const line of e.text.split("\n")) checkText(line, `${p}.text`, catalog.blocklist, out);
  });
  const items = new Map([...layers.map((l) => [`layer.${l.id}`, l]), ...text.map((e) => [`text.${e.id}`, e]), ...shapes.map((s) => [`shape.${s.id}`, s])]);
  (story.tracks || []).forEach((tr, i) => {
    const p = `tracks[${i}]`;
    sceneRef(tr, p);
    const t = parseTarget(tr.target);
    if (!t) { out.push(issue("E_TRACK_TARGET", `${p}.target`, `'${tr.target}' is not a keyable target.`, "Use layer.<id>.<prop>, text.<id>.<prop>, shape.<id>.<prop>, lens.<channel> or post.<prop>.")); return; }
    if (t.id && !items.has(`${t.kind}.${t.id}`)) { out.push(issue("E_TRACK_TARGET", `${p}.target`, `No ${t.kind} '${t.id}'.`, `Add it to ${t.kind === "layer" ? "layers" : t.kind === "text" ? "text" : "shapes"} or fix the id.`)); return; }
    tr.keys.forEach((k, j) => {
      if (!valueFits(t.prop, k.v)) out.push(issue("E_TRACK_KEYS", `${p}.keys[${j}].v`, `${tr.target} takes ${["color", "fill", "stroke"].includes(t.prop) ? 'a colour "#rrggbb"' : "a number"}.`, "Fix the value."));
      if (k.ease !== undefined && !easingOf(k.ease)) out.push(issue("E_TRACK_EASE", `${p}.keys[${j}].ease`, `Unknown easing ${JSON.stringify(k.ease)}.`, 'Use an easing name (linear, inOutCubic, outBack ...), "step" or "cubic-bezier(x1, y1, x2, y2)".'));
    });
    const times = tr.keys.map((k) => k.t);
    if (new Set(times).size !== times.length) out.push(issue("E_TRACK_KEYS", `${p}.keys`, "Two keys share a time.", "Give every key its own t."));
  });
  return out;
}
