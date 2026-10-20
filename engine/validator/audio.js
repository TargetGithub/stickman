// Checks for v3 audio tracks and ducking rules (V3.8): moods, beds, SFX keys and scenes exist, bus tracks
// name a bus, sfx tracks have times, and rules duck under something real.

import { V2_ENUMS } from "./v2_names.js";

const issue = (code, path, message, fix) => ({ code, path, message, fix });

/** @returns {object[]} E_AUDIO_TRACK, E_REF_SCENE, E_MARKER_UNKNOWN, E_REF_DUPLICATE */
export function audioTrackIssues(story, catalog) {
  const out = [];
  const audio = story.audio;
  if (!story.v3 || !audio) return out;
  const scenes = new Set((story.scenes || []).map((s) => s.id));
  const markers = new Set((audio.markers || []).map((m) => m.id));
  const ids = new Set();
  (audio.markers || []).forEach((m, i) => {
    if (!scenes.has(m.scene)) out.push(issue("E_REF_SCENE", `audio.markers[${i}].scene`, `No scene '${m.scene}'.`, `Use one of: ${[...scenes].join(", ")}.`));
  });
  (audio.tracks || []).forEach((tr, i) => {
    const p = `audio.tracks[${i}]`;
    if (ids.has(tr.id)) out.push(issue("E_REF_DUPLICATE", `${p}.id`, `Track id '${tr.id}' is used twice.`, "Give every track its own id."));
    ids.add(tr.id);
    if (tr.scene !== undefined && !scenes.has(tr.scene)) out.push(issue("E_REF_SCENE", `${p}.scene`, `No scene '${tr.scene}'.`, `Use one of: ${[...scenes].join(", ")}.`));
    const need = (field, ok, list) => {
      if (tr[field] === undefined) out.push(issue("E_AUDIO_TRACK", p, `A ${tr.kind} track needs "${field}".`, `Add "${field}".`));
      else if (!ok(tr[field])) out.push(issue("E_AUDIO_TRACK", `${p}.${field}`, `Unknown ${field} '${tr[field]}'.`, `Use one of: ${list.slice(0, 24).join(", ")}${list.length > 24 ? " ..." : ""}.`));
    };
    if (tr.kind === "music") need("mood", (v) => !!catalog.musicMoods?.[v], Object.keys(catalog.musicMoods || {}));
    if (tr.kind === "ambience") need("bed", (v) => V2_ENUMS.ambience.includes(v), V2_ENUMS.ambience);
    if (tr.kind === "sfx") {
      need("sfx", (v) => catalog.sfxKeys.includes(v), catalog.sfxKeys);
      if (!tr.at?.length) out.push(issue("E_AUDIO_TRACK", p, "An sfx track needs \"at\" (when it plays).", 'Add "at": [1.5] or [{ "marker": "<id>" }].'));
      (tr.at || []).forEach((a, j) => {
        if (typeof a === "object" && !markers.has(a.marker)) out.push(issue("E_MARKER_UNKNOWN", `${p}.at[${j}].marker`, `No marker '${a.marker}'.`, "Add it to audio.markers."));
      });
    }
    if (tr.kind === "bus" && !tr.bus) out.push(issue("E_AUDIO_TRACK", p, "A bus track needs \"bus\".", 'Add "bus": "music", "ambience", "sfx" or "voice".'));
    if (tr.from !== undefined && tr.to !== undefined && tr.to <= tr.from) out.push(issue("E_AUDIO_TRACK", p, `The track ends (${tr.to}) before it starts (${tr.from}).`, "Make to later than from."));
  });
  (audio.duck || []).forEach((r, i) => {
    if (r.under !== "voice" && r.under !== "sfx" && !ids.has(r.under)) out.push(issue("E_AUDIO_TRACK", `audio.duck[${i}].under`, `'${r.under}' is not voice, sfx or a track id.`, `Use voice, sfx${ids.size ? ` or one of: ${[...ids].join(", ")}` : ""}.`));
  });
  return out;
}
