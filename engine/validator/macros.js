// Macro checks before compiling (STORY_SPEC 11, 17). Milestone: S6.
//   E_MACRO_UNKNOWN  a macro this engine has no builder for
//   E_MACRO_PARAM    params that fail the macro's schema (macro_params.js) or name the wrong characters,
//                    moves or places (a winner who isn't fighting, a finisher that isn't an attack)
//   E_CAST_ABSENT / E_CAST_UNKNOWN  macro params naming characters not placed in the scene / not in the cast
//   E_REF_ANCHOR     {"on": "<macro>.<anchor>"} with an anchor the macro does not have
//   `to` on action beats (S6): only for walk, run, sneak, tiptoe and walk_together, toward something in the scene
// The compiler may assume a story that passes these checks.

import { checkValue } from "./schema.js";
import { MACRO_PARAMS, MACRO_ANCHORS } from "./macro_params.js";
import { closestMatch } from "./report.js";
import { parseAt } from "../director.js";
import { resolveLocation } from "../story/normalize.js";
import { BEAT_MACROS } from "../story/macros/index.js";
import { SCENE_MACROS } from "../story/macros/scenes.js";
import { TO_MOVES } from "../story/destinations.js";

const issue = (code, path, message, fix) => ({ code, path, message, fix });

/** Character ids a beat macro's params name, with their param paths. */
function namedIds(macro, p) {
  const one = (k) => (typeof p[k] === "string" ? [[p[k], k]] : []);
  const list = (k) => (Array.isArray(p[k]) ? p[k].map((id, i) => [id, `${k}[${i}]`]) : []);
  switch (macro) {
    case "dialogue": return (p.lines || []).map((l, i) => [l[0], `lines[${i}][0]`]);
    case "activity": return [...list("with"), ...one("winner")];
    case "walk_together": case "travel": return list("who");
    case "enter": case "exit": return one("who");
    case "fight": return [...list("sides"), ...one("winner")];
    case "gauntlet": return [...one("hero"), ...list("opponents")];
    case "brawl": return [...(p.teams?.a || []).map((id, i) => [id, `teams.a[${i}]`]), ...(p.teams?.b || []).map((id, i) => [id, `teams.b[${i}]`])];
    case "chase": return [...one("runner"), ...list("chasers")];
    case "defeat": return [...one("who"), ...one("by")];
    case "grief": return [...one("who"), ...one("over")];
    default: return [];
  }
}

const dupes = (ids) => ids.filter((id, i) => ids.indexOf(id) !== i);

/** Meaning checks for one beat macro's params (after its schema passed). */
function beatMacroMeaning(b, path, scene, ctx, out) {
  const p = b.params;
  const present = new Set((scene.cast || []).map((c) => c.id));
  for (const [id, k] of namedIds(b.macro, p)) {
    if (!ctx.castIds.has(id)) {
      const near = closestMatch(id, [...ctx.castIds]);
      out.push(issue("E_CAST_UNKNOWN", `${path}.params.${k}`, `'${id}' is not in the story's cast.`, near ? `Did you mean '${near}'?` : "Add it to 'cast' first."));
    } else if (!present.has(id)) {
      out.push(issue("E_CAST_ABSENT", `${path}.params.${k}`, `'${id}' is not placed in scene '${scene.id}'.`, `Add {"id": "${id}", "x": ...} to this scene's cast (with "hidden": true if it enters later).`));
    }
  }
  const bad = (k, message, fix) => out.push(issue("E_MACRO_PARAM", `${path}.params${k ? `.${k}` : ""}`, message, fix));
  const attack = (k, name) => {
    if (name === undefined) return;
    const def = ctx.moves.get(name);
    if (!def || def.category !== "attack") {
      const attacks = [...ctx.moves.values()].filter((d) => d.category === "attack").map((d) => d.name);
      bad(k, `'${name}' is not an attack move.`, `Use an attack such as ${closestMatch(name, attacks) || "flying_kick"} (or leave '${k}' out to let the compiler pick).`);
    }
  };
  if (b.macro === "fight") {
    if (p.sides[0] === p.sides[1]) bad("sides", "The two sides are the same character.", "Name two different characters.");
    if (!p.sides.includes(p.winner)) bad("winner", `'${p.winner}' is not one of the sides (${p.sides.join(", ")}).`, `Use "winner": "${p.sides[0]}" or "${p.sides[1]}".`);
    if (p.exchanges !== undefined && p.phases) bad("exchanges", "Give either 'exchanges' or 'phases', not both.", "Phases set their own exchange counts.");
    attack("finisher", p.finisher);
  }
  if (b.macro === "gauntlet") {
    if (p.opponents.includes(p.hero)) bad("opponents", `The hero '${p.hero}' cannot be one of the opponents.`, "Remove the hero from 'opponents'.");
    if (dupes(p.opponents).length) bad("opponents", `'${dupes(p.opponents)[0]}' is listed twice.`, "List each opponent once.");
    attack("finisher", p.finisher);
  }
  if (b.macro === "brawl") {
    const both = p.teams.a.filter((id) => p.teams.b.includes(id));
    if (both.length) bad("teams", `'${both[0]}' is on both teams.`, "Put each character on one team.");
    if (dupes([...p.teams.a, ...p.teams.b]).length) bad("teams", "A character is listed twice.", "List each character once.");
  }
  if (b.macro === "chase" && p.chasers.includes(p.runner)) bad("chasers", `The runner '${p.runner}' cannot chase itself.`, "Remove the runner from 'chasers'.");
  if ((b.macro === "defeat" || b.macro === "grief") && (p.by ?? p.over) === p.who) bad(p.by ? "by" : "over", `'${p.who}' cannot be both.`, "Name someone else.");
  if (b.macro === "activity" && p.winner !== undefined && !p.with.includes(p.winner)) bad("winner", `'${p.winner}' is not playing.`, `Use one of: ${p.with.join(", ")}.`);
  if (b.macro === "dialogue") {
    p.lines.forEach((l, i) => {
      if (l[3] !== undefined && !["speech", "think", "shout", "whisper"].includes(l[3])) bad(`lines[${i}][3]`, `Unknown bubble '${l[3]}'.`, "Use speech, think, shout or whisper.");
      if (l[2] !== undefined && l[2] !== "" && !ctx.catalog.faces?.[l[2]]) bad(`lines[${i}][2]`, `Unknown face '${l[2]}'.`, `Use one of: ${Object.keys(ctx.catalog.faces || {}).join(", ")}.`);
      if (String(l[1]).length > 120) bad(`lines[${i}][1]`, "A dialogue line is longer than 120 characters.", "Split it into two lines.");
    });
  }
  if (p.to?.near !== undefined) toNear(p.to.near, `${path}.params.to.near`, scene, ctx, out);
}

/** A `to.near` must name a character in the scene or an object id there. */
function toNear(id, path, scene, ctx, out) {
  const present = new Set((scene.cast || []).map((c) => c.id));
  if (present.has(id) || ctx.objectIds(scene).has(id)) return;
  out.push(issue(ctx.castIds.has(id) ? "E_CAST_ABSENT" : "E_OBJECT_UNKNOWN", path, `Nothing called '${id}' in scene '${scene.id}' to walk to.`,
    `Use a character or object in this scene: ${[...present, ...ctx.objectIds(scene)].join(", ")}.`));
}

/** On-anchors that name a macro must use one of its anchors. */
function anchorIssues(scene, si, out) {
  const macros = new Map((scene.beats || []).filter((b) => b.macro && b.id).map((b) => [b.id, b]));
  const check = (at, path) => {
    const dep = parseAt(at);
    if (!dep || dep.kind !== "on" || !macros.has(dep.ref)) return;
    const m = macros.get(dep.ref);
    const names = MACRO_ANCHORS[m.macro] || [];
    const n = dep.anchor.match(/^(line|opponent)(\d+)$/);
    const count = m.macro === "dialogue" ? m.params?.lines?.length : m.params?.opponents?.length;
    const ok = names.includes(dep.anchor) || (n && names.includes(`${n[1]}<N>`) && +n[2] >= 1 && +n[2] <= (count ?? 0));
    if (!ok) {
      const list = names.map((x) => x.replace("<N>", count ? `1..${count}` : "N"));
      out.push(issue("E_REF_ANCHOR", `${path}.at`, `The '${m.macro}' macro '${dep.ref}' has no anchor '${dep.anchor}'.`, `Use one of: ${list.join(", ")}.`));
    }
  };
  (scene.beats || []).forEach((b, bi) => check(b.at, `scenes[${si}].beats[${bi}]`));
  (scene.camera || []).forEach((k, i) => check(k.at, `scenes[${si}].camera[${i}]`));
}

/**
 * @param {object} story  normalized, schema-valid v2 story (before compiling)
 * @returns {object[]} issues (all errors)
 */
export function macroIssues(story, catalog, moves) {
  const out = [];
  const castIds = new Set(story.cast.map((c) => c.id));
  const objectIds = (scene) => {
    const loc = (story.locations || []).find((l) => l.id === scene.location);
    return new Set([...(loc?.set || []), ...(scene.set || [])].map((p) => p.id));
  };
  const ctx = { castIds, catalog, moves, objectIds };
  const schemaIssues = (params, schema, path) => checkValue(params ?? {}, schema, path).map((i) => ({ ...i, code: "E_MACRO_PARAM" }));
  story.scenes.forEach((scene, si) => {
    const pre = `scenes[${si}]`;
    if (scene.macro) {
      if (!SCENE_MACROS[scene.macro]) return out.push(issue("E_MACRO_UNKNOWN", `${pre}.macro`, `Unknown scene macro '${scene.macro}'.`, `Use one of: ${Object.keys(SCENE_MACROS).join(", ")}.`));
      const found = schemaIssues(scene.params, MACRO_PARAMS[scene.macro], `${pre}.params`);
      if (found.length) return out.push(...found);
      sceneMacroMeaning(scene, pre, story, ctx, out);
      return;
    }
    anchorIssues(scene, si, out);
    (scene.beats || []).forEach((b, bi) => {
      const path = `${pre}.beats[${bi}]`;
      if (!b.macro) {
        if (b.to && b.who !== "world") {
          if (!TO_MOVES.includes(b.do)) out.push(issue("E_MOVE_PARAM", `${path}.to`, `'${b.do}' cannot take "to".`, `Use "to" with ${TO_MOVES.join(", ")}.`));
          else if (b.to.near !== undefined) toNear(b.to.near, `${path}.to.near`, scene, ctx, out);
        }
        return;
      }
      if (!BEAT_MACROS[b.macro]) return out.push(issue("E_MACRO_UNKNOWN", `${path}.macro`, `Unknown macro '${b.macro}'.`, `Use one of: ${Object.keys(BEAT_MACROS).join(", ")}.`));
      const found = schemaIssues(b.params, MACRO_PARAMS[b.macro], `${path}.params`);
      if (found.length) return out.push(...found);
      beatMacroMeaning(b, path, scene, ctx, out);
    });
  });
  return out;
}

function sceneMacroMeaning(scene, pre, story, ctx, out) {
  const p = scene.params;
  const where = (name, path) => {
    if (resolveLocation(story, { location: name }, ctx.catalog)) return;
    const near = closestMatch(name, [...(story.locations || []).map((l) => l.id), ...ctx.catalog.themeNames]);
    out.push(issue("E_LOCATION_UNKNOWN", path, `No location or theme '${name}'.`, near ? `Did you mean '${near}'?` : "Use a location id or a theme name."));
  };
  const castId = (id, path) => {
    if (!ctx.castIds.has(id)) out.push(issue("E_CAST_UNKNOWN", path, `'${id}' is not in the story's cast.`, "Add it to 'cast' first."));
  };
  if (scene.macro === "fight_card") {
    p.matchups.forEach((m, k) => {
      const path = `${pre}.params.matchups[${k}]`;
      m.sides.forEach((id, i) => castId(id, `${path}.sides[${i}]`));
      if (m.sides[0] === m.sides[1]) out.push(issue("E_MACRO_PARAM", `${path}.sides`, "The two sides are the same character.", "Name two different characters."));
      if (!m.sides.includes(m.winner)) out.push(issue("E_MACRO_PARAM", `${path}.winner`, `'${m.winner}' is not one of the sides.`, `Use "${m.sides[0]}" or "${m.sides[1]}".`));
      if (m.location !== undefined) where(m.location, `${path}.location`);
    });
  }
  if (scene.macro === "montage") {
    p.clips.forEach((c, k) => {
      const path = `${pre}.params.clips[${k}]`;
      where(c.location, `${path}.location`);
      c.who.forEach((id, i) => castId(id, `${path}.who[${i}]`));
      const def = c.do !== undefined ? ctx.moves.get(c.do) : null;
      if (c.do !== undefined && (!def || def.flags.partner || def.category === "attack")) {
        out.push(issue("E_MACRO_PARAM", `${path}.do`, def ? `'${c.do}' does not work in a montage clip.` : `Unknown move '${c.do}'.`, "Use a solo move such as walk, run, cheer or dance_a, or a paired move with two characters."));
      } else if (def?.pair && c.who.length < 2) out.push(issue("E_MACRO_PARAM", `${path}.who`, `'${c.do}' needs two characters.`, "Add a partner to 'who'."));
    });
  }
}
