// Step 10 (CATALOG_BUNDLE_SPEC 6.2): every text a person can see goes through the validator's own text
// check (blocklist, glyphs) and the soft words of each audience the bundle claims; presets stay inside
// the bundle's audience; all-red hit FX are flagged for the human review. Pure.

import { checkText } from "../../../engine/validator/semantic.js";
import { softWordIssues } from "../../../engine/validator/story.js";
import { MOVE_GROUPS, presetsOf } from "./layout.mjs";

const issue = (code, file, path, message, fix) => ({ code, file, path, message, fix });

/** Every visible text: [{ file, path, text, kind }] (kind "description" gets the extra description rules). */
export function textsOf(files) {
  const out = [];
  const t = (file, path, text, kind = "text") => { if (typeof text === "string") out.push({ file, path, text, kind }); };
  const m = files["bundle.json"] || {};
  t("bundle.json", "name", m.name);
  t("bundle.json", "description", m.description, "description");
  t("bundle.json", "author.name", m.author?.name);
  (m.tags || []).forEach((x, i) => t("bundle.json", `tags[${i}]`, x));
  const described = (file, obj, pre = "") => {
    for (const [name, e] of Object.entries(obj || {})) {
      t(file, `${pre}${name}.description`, e.description, "description");
      (e.tags || []).forEach((x, i) => t(file, `${pre}${name}.tags[${i}]`, x));
    }
  };
  for (const rel of ["characters/bodies.json", "characters/faces.json", "effects/fx.json", "world/themes.json", "world/objects.json", "world/props.json", "story/activities.json"]) described(rel, files[rel]);
  described("story/music_moods.json", files["story/music_moods.json"]?.moods, "moods.");
  for (const g of MOVE_GROUPS) described(`moves/${g}.json`, Object.fromEntries((files[`moves/${g}.json`] || []).map((mv, i) => [`[${i}]`, mv])));
  for (const p of presetsOf(files)) {
    t(p.file, "name", p.name);
    t(p.file, "description", p.description, "description");
    (p.tags || []).forEach((x, i) => t(p.file, `tags[${i}]`, x));
  }
  for (const [name, fx] of Object.entries(files["effects/fx.json"] || {})) (fx.layers || []).forEach((l, i) => t("effects/fx.json", `${name}.layers[${i}].text`, l.text));
  (files["examples/index.json"]?.examples || []).forEach((e, i) => {
    t("examples/index.json", `examples[${i}].title`, e.title);
    t("examples/index.json", `examples[${i}].description`, e.description, "description");
  });
  t("README.md", "", files["README.md"]);
  return out;
}

const URL_RE = /(https?:\/\/|www\.)/i;
const HANDLE_RE = /(^|\s)@[A-Za-z0-9_]{2,}/;

/** Hex or rgba → [r, g, b], else null. */
function rgbOf(c) {
  if (typeof c !== "string") return null;
  const hex = c.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hex) return hex.slice(1).map((h) => parseInt(h, 16));
  const m = c.match(/^rgba\((\d+), ?(\d+), ?(\d+),/);
  return m ? m.slice(1).map(Number) : null;
}
const isRed = ([r, g, b]) => r >= 140 && g <= 0.45 * r && b <= 0.45 * r;

export function checkTexts(files, base) {
  const out = [];
  const audiences = files["bundle.json"]?.audience || ["kids"];
  for (const { file, path, text, kind } of textsOf(files)) {
    const found = [];
    checkText(text, path, base.blocklist || [], found);
    for (const i of found) out.push(issue("E_BUNDLE_TEXT", file, path, i.code === "E_TEXT_BLOCKED" ? "The text has a blocked word." : i.message, i.code === "E_TEXT_BLOCKED" ? "Keep text family-friendly (no gore, self-harm or slurs)." : i.fix));
    if (kind === "description" && URL_RE.test(text)) out.push(issue("E_BUNDLE_TEXT", file, path, "Descriptions cannot hold links.", "Put a link only in author.url."));
    if (HANDLE_RE.test(text) && file !== "README.md") out.push(issue("E_BUNDLE_TEXT", file, path, "The text has an @ handle.", "Leave out social media handles."));
    for (const a of audiences) for (const w of softWordIssues(text, path, base, a)) out.push(issue("W_BUNDLE_SOFT", file, path, w.message, w.fix));
  }
  for (const p of presetsOf(files)) {
    const extra = (p.audience || []).filter((a) => !audiences.includes(a));
    if (extra.length) out.push(issue("E_BUNDLE_AUDIENCE", p.file, "audience", `The preset claims ${extra.join(", ")}, which the bundle does not.`, `Use a subset of the bundle's audience (${audiences.join(", ")}).`));
  }
  // All-red particles on an FX used by a hit, or tagged as an impact, may read as blood: flag for review.
  const hitFx = new Set(MOVE_GROUPS.flatMap((g) => (files[`moves/${g}.json`] || []).flatMap((m) => (m.hits || []).flatMap((h) => h.fx || []))));
  for (const [name, fx] of Object.entries(files["effects/fx.json"] || {})) {
    const colors = (fx.layers || []).flatMap((l) => [].concat(l.color)).map(rgbOf).filter(Boolean);
    const impact = hitFx.has(name) || (fx.tags || []).some((t) => t === "impact" || t === "hit");
    if (impact && colors.length && colors.every(isRed)) out.push(issue("W_BUNDLE_REVIEW", "effects/fx.json", name, `'${name}' is an impact FX with only red particles.`, "A reviewer checks it does not read as blood; mix in white, yellow or orange to make it clearly a spark."));
  }
  return out;
}
