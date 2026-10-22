// Version 2 → version 3 story scripts from a series profile (series/<name>/v3_profile.json). Pure.
// What it does, as on the Doopi episode 1 pilot (ENGINE_V3_SPEC, ADR-038):
//   - version 3; meta speech/lipSync/narrator; the profile's look, motion, pace and audio (duck rules, tracks)
//   - cast: each character's TTS voice from the voices file, and the profile's limbStyle
//   - set pieces and placements with layer back/front get a depth (zByLayer) instead
//   - locations whose theme is indoors or gloomy get a light rig (lightByTheme); other scenes keep the
//     light of their time of day; dawn and night scenes get a vignette
//   - an intro template scene first (its episode number and title from meta.title "Series N: Title"), and the
//     first scene's title card becomes a fade
// Story, beats and dialogue are not touched.

const clone = (v) => JSON.parse(JSON.stringify(v));

/** Episode number and title from "Doopi & Friends 7: The Spice Tunnel". */
export function episodeOf(title) {
  const m = /(\d+)\s*:\s*(.+)$/.exec(String(title || ""));
  return m ? { episode: Number(m[1]), title: m[2].trim() } : null;
}

function withZ(item, zByLayer) {
  if (!item || typeof item !== "object" || item.layer === undefined || item.z !== undefined) return item;
  const z = zByLayer?.[item.layer];
  if (z === undefined) return item;
  const { layer: _l, ...rest } = item;
  return { ...rest, z };
}

/**
 * @param {object} script  a version 2 story script
 * @param {object} profile  the series profile
 * @param {Record<string, object>} voices  cast id → TTS voice ({ model, pitch, rate } or { off: true })
 * @returns {{ script: object, notes: string[] }}
 */
export function upgradeToV3(script, profile, voices = {}) {
  if (script.version !== 2) throw new Error(`expected a version 2 script, got version ${script.version}`);
  const notes = [];
  const out = clone(script);
  out.version = 3;
  out.meta = { ...out.meta, ...(profile.meta || {}) };
  out.cast = out.cast.map((c) => {
    const v = voices[c.id];
    if (!v) notes.push(`no TTS voice for '${c.id}' (it babbles)`);
    return { ...c, ...(v ? { voice: { ...(c.voice || {}), tts: v } } : {}), ...(profile.limbStyle && !c.limbStyle ? { limbStyle: profile.limbStyle } : {}) };
  });
  out.locations = out.locations.map((l) => {
    const light = profile.lightByTheme?.[l.theme];
    return { ...l, ...(l.set ? { set: l.set.map((p) => withZ(p, profile.zByLayer)) } : {}), ...(light && !l.light ? { light } : {}) };
  });
  out.scenes = out.scenes.map((s) => {
    const sc = { ...s };
    if (sc.set) sc.set = sc.set.map((p) => withZ(p, profile.zByLayer));
    if (sc.cast) sc.cast = sc.cast.map((c) => withZ(c, profile.zByLayer));
    const v = profile.vignetteByTime?.[sc.time];
    if (v !== undefined && !sc.lens?.vignette) sc.lens = { ...(sc.lens || {}), vignette: v };
    return sc;
  });
  const ep = episodeOf(out.meta.title);
  if (profile.intro && ep && !out.scenes.some((s) => s.use?.template === profile.intro.template)) {
    const first = out.scenes[0];
    if (first.transitionIn?.type === "card") first.transitionIn = { type: "fade", dur: 0.6 };
    out.scenes.unshift({ id: "intro", use: { template: profile.intro.template, params: { episode: ep.episode, title: ep.title, location: profile.intro.location } } });
  } else if (profile.intro && !ep) notes.push(`no episode number in the title "${out.meta.title}": no intro`);
  for (const k of ["look", "motion", "pace"]) if (profile[k] && out[k] === undefined) out[k] = clone(profile[k]);
  if (profile.audio) out.audio = { ...(out.audio || {}), ...clone(profile.audio) };
  return { script: out, notes };
}
