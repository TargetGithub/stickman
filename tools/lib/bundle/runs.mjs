// Step 11, the runs (CATALOG_BUNDLE_SPEC 6.2): every bundle move on every body plan of its rig, every
// move of a rig on each bundle body plan, paired moves in a two-character story, presets on stage and
// the examples against the merged catalog. Pure (the engine's validator and move runner only).

import { validate } from "../../../engine/index.js";
import { prepareCatalog } from "../../../engine/moves.js";
import { holdableProps } from "../../../engine/objects.js";
import { strideOf } from "../../../engine/skeleton.js";
import { checkMove, runMove } from "../move_check.mjs";
import { presetStory } from "../catalog_harness.mjs";
import { MOVE_GROUPS, SELF_HASH, localPart, bundleOf as bundleIdOf, presetsOf, entryList } from "./layout.mjs";
import { referencesOf } from "./names.mjs";

const issue = (code, file, path, message, fix) => ({ code, file, path, message, fix });
const rigOf = (x) => x?.rig || "humanoid";
const MAX_EXAMPLE_SEC = 60;

function errorsOf(script, catalog) {
  try {
    return validate(script, catalog);
  } catch (err) {
    return { ok: false, errors: [{ code: "E_ENGINE", path: "", message: `the engine cannot run it: ${err.message.split("\n")[0]}` }], warnings: [], durationSec: null };
  }
}
/** The pins of every bundle in the merged catalog, for the harness stories (they use namespaced names). */
const pinsOf = (merged) => (merged.bundles || []).map(({ id, version, hash }) => ({ id, version, hash }));

const show = (errors) => errors.slice(0, 3).map((e) => `${e.code} ${e.path}: ${e.message}`).join("; ") + (errors.length > 3 ? ` (+${errors.length - 3} more)` : "");

/** Moves and body plans: E_BUNDLE_MOVE, E_BUNDLE_BODY. */
export function checkMoveRuns(files, merged) {
  const out = [];
  const own = MOVE_GROUPS.flatMap((g) => (files[`moves/${g}.json`] || []).map((m, i) => ({ m, file: `moves/${g}.json`, at: `[${i}]` })));
  for (const { m, file, at } of own) {
    if (m.flags?.partner) continue; // runs with its lead (pairs below)
    const problems = checkMove(m, merged, { draft: true }).filter((p) => !/^move catalog has \d+ problem/.test(p)).map((p) => p.replace(/^move '[^']*': /, "").replace(/\.$/, ""));
    for (const p of problems) out.push(issue("E_BUNDLE_MOVE", file, at, `'${m.name}': ${p}.`, "Fix the keys or the root motion so the move works on every body plan of its rig (see `node tools/move_sheet.mjs`)."));
  }
  const plans = Object.entries(files["characters/bodies.json"] || {});
  if (!plans.length) return out;
  let moves;
  try {
    moves = prepareCatalog(merged.moves, merged.poses, holdableProps(merged));
  } catch {
    return out; // a broken bundle move is reported above; the plan runs come once it is fixed
  }
  const ownNames = new Set(own.map((o) => o.m.name));
  for (const [name, b] of plans) {
    const bad = (message, fix) => out.push(issue("E_BUNDLE_BODY", "characters/bodies.json", name, `'${name}': ${message}`, fix));
    if (rigOf(b) === "humanoid") {
      const s = strideOf(b.dims);
      if (!(s >= 0.4 && s <= 2.5)) bad(`walk and run would stride ${s.toFixed(2)} times the stickman's.`, "Keep thigh + shin between 0.4 and 2.5 times the stickman's (85).");
    }
    for (const def of merged.moves) {
      if (def.flags?.partner || ownNames.has(def.name) || (def.rig ?? "humanoid") !== rigOf(b)) continue; // own moves ran on every plan above
      const problems = runMove(def, moves, merged, { draft: false, plans: [name] });
      if (problems.length) bad(`the move '${def.name}' breaks on it: ${problems[0]}.`, "Change the dims or posture until every move of the rig works (see `node tools/move_sheet.mjs --body`).");
    }
  }
  return out;
}

/** A lead move with its partner on stage: stickman with stickman and with each bundle plan of the partner's rig. */
export function checkPairs(files, merged) {
  const out = [];
  const plans = Object.entries(files["characters/bodies.json"] || {});
  MOVE_GROUPS.forEach((g) => (files[`moves/${g}.json`] || []).forEach((m, i) => {
    if (!m.pair) return;
    const partnerRig = rigOf(merged.moves.find((x) => x.name === m.pair.partnerMove));
    const bodies = ["stickman", ...plans.filter(([, b]) => rigOf(b) === partnerRig).map(([n]) => n)];
    for (const body of bodies) {
      const story = {
        version: 2,
        bundles: pinsOf(merged),
        meta: { title: "Pair check", format: "landscape", seed: 3, kind: "clip", audience: "general" },
        cast: [{ id: "lead", color: "#1f4fbf" }, { id: "other", color: "#c2185b", ...(body === "stickman" ? {} : { body }) }],
        scenes: [{ id: "s1", location: "white_stage", cast: [{ id: "lead", x: 1400, facing: 1 }, { id: "other", x: 1700, facing: -1 }],
          beats: [{ id: "p", at: 0.3, who: "lead", do: m.name, partner: "other" }, { id: "e", at: { after: "p", delay: 0.5 }, who: "world", do: "fade", params: { to: "black", dur: 0.5 } }] }],
      };
      const r = errorsOf(story, merged);
      if (r.errors.length) out.push(issue("E_BUNDLE_MOVE", `moves/${g}.json`, `[${i}]`, `'${m.name}' with a ${body} partner: ${show(r.errors)}.`, "Check the pair block (gap, contacts, attach) and the partner move."));
    }
  }));
  return out;
}

/** Presets on stage: E_BUNDLE_PRESET; and the themes each preset reads well on (no W_CONTRAST). */
export function checkPresets(files, merged) {
  const out = [];
  const goodThemes = {};
  for (const p of presetsOf(files)) {
    const local = { ...p, id: localPart(p.id) }; // the cast id is an id (pattern), not a catalog name
    // On stage for the audiences both the preset and the bundle claim (a mismatch is step 10's E_BUNDLE_AUDIENCE).
    const kids = (p.audience || []).includes("kids") && (merged.bundles.find((b) => b.id === bundleIdOf(p.id))?.audience || ["kids"]).includes("kids");
    const story = (theme) => ({ ...presetStory({ ...local, audience: kids ? ["kids"] : ["general"] }, theme), bundles: pinsOf(merged) });
    const r = errorsOf(story(), merged);
    if (r.errors.length) out.push(issue("E_BUNDLE_PRESET", p.file, "cast", `'${p.id}' does not validate on stage: ${show(r.errors)}.`, "Fix the cast entry (body, prop, appearance, voice)."));
    else goodThemes[p.id] = merged.themeNames.filter((t) => !errorsOf(story(t), merged).warnings.some((w) => w.code === "W_CONTRAST"));
  }
  return { issues: out, goodThemes };
}

/** Every string in a value. */
const strings = (v, acc = new Set()) => {
  if (typeof v === "string") acc.add(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, acc));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, acc));
  return acc;
};

/**
 * Examples (E_BUNDLE_EXAMPLE, E_BUNDLE_AUDIENCE): indexed and present, each declares this bundle with
 * hash "self" (4.15), validates against the merged catalog under each audience the bundle claims, runs
 * at most 60 s; together they use every entry the bundle adds except presets.
 */
export function checkExamples(files, manifest, merged) {
  const out = [];
  const bad = (file, path, message, fix) => out.push(issue("E_BUNDLE_EXAMPLE", file, path, message, fix));
  const index = files["examples/index.json"]?.examples || [];
  const scripts = Object.keys(files).filter((f) => /^examples\/(clips|stories)\//.test(f));
  for (const f of scripts) if (!index.some((e) => `examples/${e.path}` === f)) bad("examples/index.json", f, `'${f}' is not in the index.`, "Add it to examples/index.json.");
  const used = new Set();
  index.forEach((e, i) => {
    const file = `examples/${e.path}`;
    const raw = files[file];
    if (raw === undefined) return bad("examples/index.json", `examples[${i}].path`, `'${file}' is missing.`, "Add the file or remove the entry.");
    const script = e.kind === "story" ? raw.story : raw;
    if ((e.kind === "story") !== e.path.startsWith("stories/") || !script || typeof script !== "object") return bad(file, "", `A ${e.kind} example must be ${e.kind === "story" ? '{"story": ..., "outline"?: ...} under stories/' : "a version 1 script under clips/"}.`, "Match the kind and the folder.");
    const pins = Array.isArray(script.bundles) ? script.bundles : [];
    const self = pins.find((b) => b?.id === manifest.id);
    const pinned = self && self.hash === SELF_HASH && self.version === manifest.version;
    if (!pinned) bad(file, "bundles", `The example must declare {"id": "${manifest.id}", "version": "${manifest.version}", "hash": "self"}.`, 'Add it to "bundles"; "self" stands for this bundle\'s contentHash.');
    pins.forEach((b, k) => {
      if (b?.id === manifest.id) return;
      const dep = (manifest.dependencies || []).find((d) => d.id === b?.id);
      if (b?.hash === SELF_HASH) bad(file, `bundles[${k}].hash`, '"self" is only for the example\'s own bundle.', "Use the dependency's real hash.");
      else if (!dep || dep.hash !== b.hash || dep.version !== b.version) bad(file, `bundles[${k}]`, `'${b?.id}' is not a dependency of this bundle with that version and hash.`, "Declare only this bundle and its dependencies, as pinned in the manifest.");
    });
    for (const d of manifest.dependencies || []) if (!pins.some((b) => b?.id === d.id)) bad(file, "bundles", `The example does not declare the dependency '${d.id}'.`, `Add ${JSON.stringify(d)} to "bundles".`);
    if (script.meta?.title !== e.title) bad("examples/index.json", `examples[${i}].title`, `The title "${e.title}" differs from the script's "${script.meta?.title}".`, "Use the same title.");
    // "self" stands for this bundle's contentHash (4.15): the validator sees the real pin.
    const plain = { ...script, bundles: pins.map((b) => (b?.id === manifest.id && b.hash === SELF_HASH ? { ...b, hash: manifest.contentHash } : b)) };
    const audiences = !pinned ? [] : e.kind === "story" ? manifest.audience : [null]; // a wrong own pin would only fail again as E_BUNDLE_HASH
    for (const a of audiences) {
      const s = a ? { ...plain, meta: { ...plain.meta, audience: a } } : plain;
      const r = errorsOf(s, merged);
      const own = !a || a === (plain.meta?.audience ?? "kids");
      if (r.errors.length) out.push(issue(own ? "E_BUNDLE_EXAMPLE" : "E_BUNDLE_AUDIENCE", file, "", `${own ? "The example" : `As a ${a} script, the example`} does not validate: ${show(r.errors)}.`, own ? "Fix the script (node tools/validate.mjs shows every issue)." : `The bundle claims '${a}': its examples must pass the ${a} rules, or drop '${a}' from audience.`));
      else if (own && r.durationSec > MAX_EXAMPLE_SEC) bad(file, "", `The example runs ${r.durationSec.toFixed(1)} s.`, `Keep examples under ${MAX_EXAMPLE_SEC} s.`);
    }
    strings(plain, used);
  });
  // Entries the examples use, directly or through entries they use (a pose through its move).
  const refs = referencesOf(files);
  for (let grew = true; grew;) {
    grew = false;
    for (const r of refs) {
      const owner = ownerOf(r, files);
      if (owner && used.has(owner) && !used.has(r.name)) { used.add(r.name); grew = true; }
    }
  }
  const unused = entryList(files).filter((x) => x.kind !== "preset" && !used.has(x.name));
  if (index.length && unused.length) bad("examples/", "", `The examples do not use ${unused.map((x) => `${x.kind} '${x.name}'`).join(", ")}.`, "Use every entry the bundle adds in at least one example (poses through a move, scales through a mood).");
  return out;
}

/** The example scripts with the own pin's "self" replaced by the contentHash (for step 12). */
export function exampleScripts(files, manifest) {
  return (files["examples/index.json"]?.examples || []).flatMap((e) => {
    const raw = files[`examples/${e.path}`];
    const script = e.kind === "story" ? raw?.story : raw;
    if (!script) return [];
    const bundles = (script.bundles || []).map((b) => (b?.id === manifest.id && b.hash === SELF_HASH ? { ...b, hash: manifest.contentHash } : b));
    return [{ label: `example ${e.path}`, file: `examples/${e.path}`, script: { ...script, bundles } }];
  });
}

/** The entry a reference belongs to (its path's first segment), as a name. */
function ownerOf(ref, files) {
  const m = ref.path.match(/^\[(\d+)\]/);
  if (m) return files[ref.file]?.[+m[1]]?.name;
  const key = ref.file === "story/music_moods.json" ? ref.path.split(".")[1] : ref.file.startsWith("characters/presets/") ? files[ref.file]?.id : ref.path.split(".")[0];
  return key;
}
