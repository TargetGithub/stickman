// Spoken lines (SPEECH_SPEC 4.2, 4.4): which beats of a compiled story are spoken, in which voice, and how
// long their beats must last once the audio length is known. Pure: no I/O. The record tool reads the files.

import { readingTime, voiceOf } from "../../../engine/story/speech.js";
import { narrateDuration } from "../../../engine/story/timing.js";
import { paceOf, talkFor, PACED_MIN } from "../../../engine/story/pace.js";

export const MAX_SAY = 10; // s, the schema's sayDur maximum
export const MAX_NARRATE = 15; // s, the validator's narrate dur maximum
export const SAY_TAIL = 0.25; // s of bubble after the voice stops
export const PACED_TAIL = 0.1; // the same under a pace (ADR-038): the next line comes right after
export const NARRATE_LEAD = 0.3; // s from the chime to the voice
export const NARRATE_TAIL = 0.4;
const TALK_CYCLE = 0.8; // s, one cycle of the talk gesture (catalog/moves/emotes.json)

const round2 = (x) => Math.round(x * 100) / 100;

/**
 * Text as it should be spoken: stage directions (*yawn*, (sighs)) dropped, "..." runs become a pause,
 * shouted capitals become plain words. null when nothing speakable is left ("!!!", "...").
 */
export function cleanText(text) {
  let s = String(text)
    .replace(/\*[^*]*\*/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s*(?:\.\s*){2,}|\s*…/g, ", ")
    .replace(/\b[A-Z]{3,}\b/g, (w) => w[0] + w.slice(1).toLowerCase())
    .replace(/\s+/g, " ")
    .replace(/(,\s*)+([!?.])/g, "$2")
    .replace(/^[\s,]+/, "")
    .replace(/[\s,]+$/, "")
    .trim();
  if (!/[a-z0-9]/i.test(s)) return null;
  if (!/[.!?]$/.test(s)) s += ".";
  return s;
}

/**
 * The TTS voice for a character, or null when it keeps babble. Precedence: the --voices override file,
 * then the cast's voice.tts, then the timbre table (catalog/story/tts_voices.json).
 * @returns {{ model, speaker, rate, pitch, filter } | null}
 */
export function resolveVoice(voice, table, override = {}) {
  const v = voiceOf(voice);
  const tts = voice?.tts || {};
  const t = table.timbres[v.timbre] || table.timbres.soft;
  if (override.off ?? tts.off ?? t.off) return null;
  const derived = Math.round(12 * Math.log2(v.pitch) * (t.pitchScale ?? 1)) + (t.pitchOffset ?? 0);
  const pitch = override.pitch ?? tts.pitch ?? Math.max(t.pitchMin ?? -12, Math.min(t.pitchMax ?? 12, derived));
  return {
    model: override.model ?? tts.model ?? t.model,
    speaker: override.speaker ?? tts.speaker ?? t.speaker ?? 0,
    rate: round2(override.rate ?? tts.rate ?? v.speed * (t.rateScale ?? 1)),
    pitch,
    filter: override.filter ?? t.filter ?? null,
  };
}

/** The narrator's voice: override file, then meta.narrator, then the table's narrator. */
export function narratorVoice(meta, table, override = {}) {
  const n = { ...table.narrator, ...(meta?.narrator || {}), ...override };
  if (n.off) return null;
  return { model: n.model, speaker: n.speaker ?? 0, rate: n.rate ?? 1, pitch: n.pitch ?? 0, filter: n.filter ?? null };
}

/**
 * The tone for a mood (a face name) from the table's moods; neutral (null) for unknown faces or when moods are off.
 * @returns {{ mood, rate?, pitch?, gainDb?, noise?, pause?, lowpass?, vibrato?, tremolo? } | null}
 */
export function moodTone(face, table, enabled = true) {
  const m = enabled && face && face !== "neutral" ? table.moods?.[face] : null;
  if (!m) return null;
  const { description, tags, ...tone } = m;
  return Object.keys(tone).length ? { mood: face, ...tone } : null;
}

/**
 * Every spoken line of a compiled v2 script, in script order. Beats without an id get one
 * ("tts_<scene>_<beat>") so the sim's events can be matched back to the line; the script is changed in place.
 * Skipped: thoughts (silent, as babble), characters that keep babble (bark, tts.off), text with no words.
 * Each say line gets the tone of the speaker's face at that beat (SPEECH_SPEC 4.2a): the beat's own face, else the last
 * face an earlier beat of the scene gave the speaker, else the face the scene starts them with. Narration is neutral.
 * The --voices file can turn tones off with "moods": false.
 * @param {object} compiled  compileScript(...).script
 * @param {{ timbres, narrator }} table  catalog/story/tts_voices.json
 * @param {{ cast?: Record<string, object>, narrator?: object }} overrides  the --voices file
 * @returns {Array<{ id, kind:"say"|"narrate", scene, beat, who, text, spoken, bubble, voice }>}
 */
export function collectLines(compiled, table, overrides = {}) {
  const voices = new Map(compiled.cast.map((c) => [c.id, resolveVoice(c.voice, table, overrides.cast?.[c.id])]));
  const narrator = narratorVoice(compiled.meta, table, overrides.narrator);
  const out = [];
  compiled.scenes.forEach((sc, si) => {
    const beats = sc.beats || [];
    const merged = new Set();
    const faces = new Map((sc.cast || []).filter((c) => c.face).map((c) => [c.id, c.face]));
    beats.forEach((b, bi) => {
      const face = b.face ?? faces.get(b.who);
      if (b.face && b.who !== "world") faces.set(b.who, b.face); // "from this beat on" (STORY_SPEC 4.3)
      if (merged.has(bi)) return;
      const narrate = b.who === "world" && b.do === "narrate";
      const text = narrate ? b.params?.text : b.say;
      if (!text || (!narrate && b.bubble === "think")) return;
      const voice = narrate ? narrator : voices.get(b.who);
      b.id ??= `tts_${si}_${bi}`;
      // A long line split into bubbles (the dialogue macro) is spoken as one sentence over all its bubbles.
      const parts = [{ beat: bi, id: b.id, text }];
      for (let k = bi; !narrate && !/[.!?…]["')]*\s*$/.test(beats[k].say); ) {
        const n = beats.findIndex((x, j) => j > k && x.who === b.who && x.say && x.bubble === b.bubble && x.at?.after === beats[k].id);
        if (n < 0) break;
        merged.add(n);
        parts.push({ beat: n, id: beats[n].id, text: beats[n].say });
        k = n;
      }
      const spoken = cleanText(parts.map((p) => p.text).join(" "));
      if (!voice || !spoken) return;
      out.push({ id: b.id, kind: narrate ? "narrate" : "say", scene: si, beat: bi, who: narrate ? "narrator" : b.who, text: parts.map((p) => p.text).join(" "), spoken,
        bubble: narrate ? null : b.bubble ?? "speech", voice, tone: narrate ? null : moodTone(face, table, overrides.moods !== false), ...(parts.length > 1 ? { parts } : {}) });
    });
  });
  return out;
}

/**
 * Make each spoken beat last as long as its audio (SPEECH_SPEC 4.4), in place:
 *   say:     sayDur = clamp(audio + 0.25, readingTime, 10); a talk gesture loops that long, a wait waits that long;
 *            a line over several bubbles shares the audio out by characters (each bubble at least its reading time)
 *            Under a pace (ADR-038) the audio alone sets it: clamp(audio + 0.1, 0.6, 10), and a talk gesture
 *            plays whole cycles at the speed that ends them with the voice
 *   narrate: dur = clamp(audio + lead + tail, narrateDuration, 15)
 * @param {Array<{ id, kind, scene, beat, dur:number }>} lines  dur: audio seconds
 * @returns {Array<{ id, beatDur, long }>}  long: the audio does not fit the longest allowed beat
 */
export function injectDurations(compiled, lines) {
  return lines.map((l) => {
    const b = compiled.scenes[l.scene].beats[l.beat];
    if (l.kind === "narrate") {
      const want = l.dur + NARRATE_LEAD + NARRATE_TAIL;
      const dur = round2(Math.min(MAX_NARRATE, Math.max(narrateDuration(b.params), want)));
      b.params = { ...b.params, dur };
      return { id: l.id, beatDur: dur, long: want > MAX_NARRATE };
    }
    const parts = l.parts ?? [{ beat: l.beat, text: b.say }];
    const chars = parts.reduce((n, p) => n + p.text.length, 0);
    const paced = !!paceOf(compiled, compiled.scenes[l.scene]);
    let long = false;
    let total = 0;
    for (const [k, p] of parts.entries()) {
      const pb = compiled.scenes[l.scene].beats[p.beat];
      const want = (l.dur * p.text.length) / chars + (k === parts.length - 1 ? (paced ? PACED_TAIL : SAY_TAIL) : 0);
      const sayDur = round2(Math.min(MAX_SAY, Math.max(paced ? PACED_MIN : readingTime(pb.say), want)));
      long ||= want > MAX_SAY;
      total += sayDur;
      pb.sayDur = sayDur;
      if (pb.do === "talk" && paced) {
        const { cycles, speed } = talkFor(sayDur, TALK_CYCLE);
        pb.params = { ...pb.params, cycles };
        pb.speed = speed;
      } else if (pb.do === "talk") pb.params = { ...pb.params, cycles: Math.max(pb.params?.cycles ?? 1, Math.ceil(sayDur / TALK_CYCLE)) };
      if (pb.do === "wait") pb.params = { ...pb.params, seconds: paced ? sayDur : Math.max(pb.params?.seconds ?? 0, sayDur) };
    }
    return { id: l.id, beatDur: round2(total), long };
  });
}
