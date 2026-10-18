// Story checks for activities and defeat styles (STORY_SPEC 10, 13, 17). Milestone: S5.
//   E_ACTIVITY_OBJECT  an activity's `object` is not in the scene, or is not a kind it can use
//   E_WORLD_PARAM      wrong number of players, or a winner who isn't playing
//   E_DEFEAT_STYLE     a defeat style the audience doesn't allow (ghost is for "general" only)
//   W_KIDS_NO_HOPE     kids: someone vanishes and never comes back (`return`) later in the story

import { V2_ENUMS, DEFEAT_STYLES_BY_AUDIENCE } from "./v2_names.js";

const issue = (code, path, message, fix, severity) => ({ code, path, message, fix, ...(severity ? { severity } : {}) });

/** Object ids → kinds in a scene: location and scene set pieces, plus spawned objects with an id. */
function sceneObjects(scene, story) {
  const location = (story.locations || []).find((l) => l.id === scene.location);
  const known = new Map([...(location?.set || []), ...(scene.set || [])].map((p) => [p.id, p.object]));
  for (const b of scene.beats || []) if (b.who === "world" && b.do === "spawn_object" && b.params?.id) known.set(b.params.id, b.params.kind);
  return known;
}

/** Activity beats in one scene. */
export function activityIssues(scene, si, story, catalog) {
  const out = [];
  const known = sceneObjects(scene, story);
  (scene.beats || []).forEach((b, bi) => {
    if (b.who !== "world" || b.do !== "activity") return;
    const p = b.params || {};
    const def = catalog.activities?.[p.name];
    const path = `scenes[${si}].beats[${bi}].params`;
    if (!def) return; // unknown name: E_WORLD_PARAM from the v1-style checks
    const n = Array.isArray(p.with) ? p.with.length : 0;
    const [min, max] = def.players;
    if (n && (n < min || n > max)) {
      out.push(issue("E_WORLD_PARAM", `${path}.with`, `'${p.name}' needs ${min === max ? min : `${min} to ${max}`} players, not ${n}.`, min === max ? `List ${min} character ids.` : `List ${min} to ${max} character ids.`));
    }
    if (p.winner !== undefined && Array.isArray(p.with) && !p.with.includes(p.winner)) {
      out.push(issue("E_WORLD_PARAM", `${path}.winner`, `'${p.winner}' is not playing '${p.name}'.`, `Use one of: ${p.with.join(", ")}.`));
    }
    if (p.object === undefined) return;
    const kinds = def.objects || [];
    if (!known.has(p.object)) {
      out.push(issue("E_ACTIVITY_OBJECT", `${path}.object`, `No object '${p.object}' in scene '${scene.id}' for '${p.name}'.`,
        kinds.length ? `Add a ${kinds.join(" or ")} to the location's or scene's "set" (or spawn one), or leave out "object".` : `'${p.name}' uses no set piece: leave out "object".`));
    } else if (!kinds.includes(known.get(p.object))) {
      out.push(issue("E_ACTIVITY_OBJECT", `${path}.object`, `'${p.name}' cannot use '${p.object}' (a ${known.get(p.object)}).`,
        kinds.length ? `Use a ${kinds.join(" or ")}, or leave out "object".` : `'${p.name}' uses no set piece: leave out "object".`));
    }
  });
  return out;
}

/** Defeat styles for the audience, and (kids) losses that are never undone. */
export function defeatIssues(story) {
  const out = [];
  const audience = story.meta.audience ?? "kids";
  const allowed = DEFEAT_STYLES_BY_AUDIENCE[audience] || DEFEAT_STYLES_BY_AUDIENCE.kids;
  const gone = new Map(); // id → path of the vanish beat
  story.scenes.forEach((scene, si) => {
    (scene.beats || []).forEach((b, bi) => {
      const path = `scenes[${si}].beats[${bi}]`;
      const style = b.macro === "defeat" ? b.params?.style : b.do;
      const at = b.macro === "defeat" ? `${path}.params.style` : `${path}.do`;
      if (V2_ENUMS.defeatStyle.includes(style) && !allowed.includes(style)) {
        out.push(issue("E_DEFEAT_STYLE", at, `'${style}' is not allowed for a ${audience} audience.`,
          `Use one of: ${allowed.join(", ")}${audience === "kids" ? ' (or set meta.audience to "general")' : ""}.`));
      }
      const who = b.macro === "defeat" ? b.params?.who : b.who;
      if (style === "vanish" && who) gone.set(who, path);
      if (b.do === "return") gone.delete(b.who);
    });
  });
  if (audience === "kids") {
    for (const [id, path] of gone) {
      out.push(issue("W_KIDS_NO_HOPE", path, `'${id}' vanishes and never comes back; kids stories keep losses temporary or hopeful.`,
        `Add a "return" beat for '${id}' in a later scene (sparkles bring them back), or show they're safe.`, "warning"));
    }
  }
  return out;
}
