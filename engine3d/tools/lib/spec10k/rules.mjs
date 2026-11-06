// Spec rules beyond the JSON Schema: retention (hook <= 8 s, no gap over 15 s between interactions, early
// tease), timing (scenes tile the length, chapters >= 10 s), band rules, the allocation slot, and catalog names.
import { basename } from "node:path";
import { validateSchema } from "./jsonschema.mjs";
import { splitId } from "./load.mjs";
import { usEnglishIssues } from "./usenglish.mjs";

export const RULES = {
  hookMaxS: 8,
  gapMaxS: 15,
  /** The last interaction may sit up to this long before the end (goodbye / end card). */
  endGapMaxS: 20,
  teaseMaxS: 60,
  chapterMinS: 10,
  checkMin: { bb: 1, pk: 2, kg: 3, g1: 3, g2: 3, g3: 3, g4: 3, g5: 3 },
  /** Not allowed in baby videos (no timers, no confetti, no fast flashes). */
  babyBannedInteractions: ["point_before_timer", "solve_step", "vote", "explain_why", "spot_mistake"],
  babyBannedMagic: ["confetti_shower_soft", "fizz_eruption", "rocket_countdown"],
  bannedWords: ["blood", "bloodstream", "bloody", "gore", "gun", "guns", "weapon", "kill", "killed", "corpse"],
};

const needName = (n) => (typeof n === "string" ? n : n.name);

/**
 * All text fields joined (for the banned-word check).
 * @param {object} s
 */
function allText(s) {
  const out = [];
  const walk = (v) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(s);
  return out.join(" ").toLowerCase();
}

/**
 * Retention and timing rules. Assumes the schema passed.
 * @param {object} s  spec
 * @returns {string[]}
 */
export function retentionErrors(s) {
  const e = [];
  const L = s.target_length_s;
  if (s.hook.duration_s > RULES.hookMaxS) e.push(`hook.duration_s ${s.hook.duration_s} > ${RULES.hookMaxS} s: deliver the core promise within 5-8 s`);
  const ts = s.interactions.map((x) => x.t);
  for (let i = 1; i < ts.length; i++) if (ts[i] < ts[i - 1]) { e.push(`interactions must be in time order (t=${ts[i]} after t=${ts[i - 1]})`); break; }
  const sorted = [...ts].sort((a, b) => a - b);
  if (sorted[0] > RULES.gapMaxS) e.push(`first interaction at ${sorted[0]} s: the first prompt must come within ${RULES.gapMaxS} s`);
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap > RULES.gapMaxS) e.push(`interaction gap ${round(gap)} s between t=${sorted[i - 1]} and t=${sorted[i]} (max ${RULES.gapMaxS} s): add a prompt, timer or call-and-response`);
  }
  const last = sorted[sorted.length - 1];
  if (last > L) e.push(`interaction at t=${last} is after the end (${L} s)`);
  else if (L - last > RULES.endGapMaxS) e.push(`last interaction at ${last} s leaves ${round(L - last)} s with no prompt (max ${RULES.endGapMaxS} s at the end)`);
  if (s.progress_tracker.tease_t > RULES.teaseMaxS) e.push(`progress_tracker.tease_t ${s.progress_tracker.tease_t} > ${RULES.teaseMaxS} s: tease the final surprise early`);
  if (s.progress_tracker.labels.length !== s.progress_tracker.steps) e.push(`progress_tracker: ${s.progress_tracker.labels.length} labels for ${s.progress_tracker.steps} steps`);
  // Scenes tile the video.
  let t = 0;
  s.scenes.forEach((sc, i) => {
    if (Math.abs(sc.start_s - t) > 0.5) e.push(`scenes[${i}] "${sc.title}" starts at ${sc.start_s} s, expected ${round(t)} s (scenes must follow each other)`);
    if (sc.dur_s < RULES.chapterMinS) e.push(`scenes[${i}] "${sc.title}" is ${sc.dur_s} s: YouTube chapters need at least ${RULES.chapterMinS} s`);
    t = sc.start_s + sc.dur_s;
  });
  if (Math.abs(t - L) > 1) e.push(`scenes add up to ${round(t)} s but target_length_s is ${L}`);
  if (s.scenes[0].purpose !== "hook") e.push(`scenes[0] must have purpose "hook"`);
  for (const [name, v] of [["magical_moment.t", s.magical_moment.t], ["recap.t", s.recap.t], ...s.keywords.map((k, i) => [`keywords[${i}].t`, k.t])]) {
    if (v > L) e.push(`${name} ${v} is after the end (${L} s)`);
  }
  if (s.recap.t < L * 0.6) e.push(`recap.t ${s.recap.t} s is too early: the recap belongs in the last 40% of the video`);
  return e;
}

const round = (x) => Math.round(x * 10) / 10;

/**
 * Validate one spec.
 * @param {object} s     the spec
 * @param {{ schema: object, programme?: object, names?: object, file?: string }} ctx
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateSpec(s, ctx) {
  const errors = validateSchema(ctx.schema, s);
  const warnings = [];
  if (errors.length) return { errors, warnings };
  errors.push(...retentionErrors(s));
  const id = splitId(s.id);
  if (id.band !== s.band) errors.push(`id ${s.id} does not start with band ${s.band}`);
  if (ctx.file && basename(ctx.file) !== `${s.id}.json`) errors.push(`file name must be ${s.id}.json`);
  const L = ctx.programme?.bands?.bands?.[s.band]?.lengthS;
  if (L && (s.target_length_s < L[0] || s.target_length_s > L[1])) errors.push(`target_length_s ${s.target_length_s} is outside the ${s.band} range ${L[0]}-${L[1]} s`);
  const min = RULES.checkMin[s.band];
  if (s.check.questions.length < min) errors.push(`check needs at least ${min} questions for ${s.band}`);
  if (s.band === "bb") {
    for (const x of s.interactions) if (RULES.babyBannedInteractions.includes(x.type)) errors.push(`babies: no "${x.type}" interactions (no timers or tests for 0-2)`);
    if (RULES.babyBannedMagic.includes(s.magical_moment.id)) errors.push(`babies: magical moment "${s.magical_moment.id}" is too loud or fast`);
  }
  const text = allText(s);
  // "blood" is allowed where science or body parts call for it (science and health specs, any band); "bloody",
  // gore and weapons never are (Sridhar, 2026-11-06).
  const bodyScience = ["science", "health"].includes(s.subject);
  for (const w of RULES.bannedWords) {
    if (bodyScience && (w === "blood" || w === "bloodstream")) continue;
    if (new RegExp(`\\b${w}\\b`).test(text)) errors.push(`banned word "${w}" (no gore or weapons; "blood" only in science/health)`);
  }
  const us = usEnglishIssues(s);
  errors.push(...us.errors);
  warnings.push(...us.warnings);
  if (ctx.programme) errors.push(...programmeErrors(s, ctx.programme, warnings));
  if (ctx.names) {
    errors.push(...nameErrors(s, ctx.names));
    for (const n of s.needs.features) if (typeof n === "string" && ctx.names.aliases?.[n]) warnings.push(`needs.features: "${n}" is a provisional name; use the retention-kit name "${ctx.names.aliases[n]}"`);
  }
  return { errors, warnings };
}

/** Series, magic library and allocation slot. */
function programmeErrors(s, p, warnings) {
  const e = [];
  const ser = p.series.series[s.series];
  if (!ser) e.push(`unknown series "${s.series}"`);
  else {
    if (!ser.bands.includes(s.band)) e.push(`series "${s.series}" is not a ${s.band} series (bands: ${ser.bands.join(", ")})`);
    const rowSeries = p.slotIndex.get(s.id)?.series ?? [];
    if (!ser.subjects.includes(s.subject) && !rowSeries.includes(s.series)) warnings.push(`series "${s.series}" usually carries ${ser.subjects.join(", ")}, not ${s.subject}`);
  }
  const mm = s.magical_moment.id;
  if (!mm.startsWith("new:") && !p.series.magic[mm]) e.push(`magical_moment.id "${mm}" is not in the library (use new:<name> for a new one)`);
  const { slot } = splitId(s.id);
  if (slot <= 100) { warnings.push(`${s.id} is a legacy slot (0001-0100)`); return e; }
  const row = p.slotIndex.get(s.id);
  if (!row) { e.push(`${s.id} is not inside any allocation row's slot range`); return e; }
  if (row.subject !== s.subject) e.push(`slot ${s.id} belongs to subject ${row.subject} (row ${row.key}), not ${s.subject}`);
  if (row.strand !== s.strand) e.push(`slot ${s.id} belongs to strand ${row.strand} (row ${row.key}), not ${s.strand}`);
  if (!s.standards.some((c) => row.standards.includes(c))) e.push(`standards ${s.standards.join(", ")} include none of row ${row.key}'s standards (${row.standards.join(", ")})`);
  if (row.series?.length && !row.series.includes(s.series)) warnings.push(`row ${row.key} suggests series ${row.series.join(", ")}, spec uses ${s.series}`);
  return e;
}

/** Existing names must be real catalog names; cast members must be listed in needs.characters. */
function nameErrors(s, names) {
  const e = [];
  const groups = { characters: names.characters, props: names.props, stages: names.stages, features: names.features };
  for (const [g, set] of Object.entries(groups)) {
    for (const n of s.needs[g]) {
      if (typeof n === "string" && !set.has(n)) e.push(`needs.${g}: "${n}" is not in the catalog; write { "name": "new:${n}", "description": ... }`);
    }
  }
  const chars = new Set(s.needs.characters.map(needName));
  for (const c of s.cast) if (!chars.has(c.who)) e.push(`cast "${c.who}" is missing from needs.characters`);
  for (const sc of s.scenes) for (const c of sc.characters) if (!chars.has(c)) e.push(`scene "${sc.title}" uses "${c}", which is not in needs.characters`);
  if (names.skills) for (const k of s.skills ?? []) if (!names.skills.has(k)) e.push(`skills: "${k}" is not in catalog/education/skills.json`);
  for (const k of s.keywords) if (k.sound && !k.sound.startsWith("new:") && !names.sounds.has(k.sound)) e.push(`keywords "${k.word}": unknown sound "${k.sound}"`);
  return e;
}

/** Provisional feature names used before the retention kit landed -> its stable names (also in series.json). */
export const FEATURE_ALIASES = { hook_template: "hook", progress_tracker: "tracker", keyword_pop: "keyword", call_response: "call" };

/**
 * Retention-kit features a spec implies by its structure (counted by `needs` even if not listed).
 * @param {object} s
 */
export function impliedFeatures(s) {
  const f = new Set(["hook", "tracker", "progress", "keyword"]);
  for (const x of s.interactions ?? []) {
    if (x.type === "point_before_timer" || x.timer_s) { f.add("challenge"); f.add("timer_ring"); }
    if (x.type === "choose" || x.type === "vote") f.add("options");
    if (x.type === "call_response" || x.type === "say_the_sound") f.add("call");
  }
  return [...f];
}
