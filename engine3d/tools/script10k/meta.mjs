// meta, youtube kit text and keyword icons for a 10K script, filled from its spec (10K/SPEC_TEMPLATE.md).

import { BANDS, bandOf, musicFrom, seedOf } from "./bands.mjs";

export const KIT_ICONS = ["ear", "hand", "mouth", "eye", "question", "star", "check", "heart", "drop", "sun", "leaf", "apple", "music", "home", "moon", "snow"];

/** Words in a spec's icon description that point at a kit icon. */
const ICON_WORDS = {
  ear: ["ear", "listen", "hear", "sound", "sounds"], hand: ["hand", "touch", "point", "finger", "tap", "clap", "wave"],
  mouth: ["mouth", "say", "speak", "talk", "lips"], eye: ["eye", "eyes", "look", "see", "watch", "magnifier", "magnifying"],
  question: ["question", "?", "why", "how", "what", "who", "where", "when"], check: ["tick", "check", "checkmark", "correct", "right"],
  heart: ["heart", "love", "kind", "feelings", "feeling", "hug"], drop: ["drop", "water", "rain", "splash", "wet", "droplet"],
  sun: ["sun", "sunny", "light", "sunlight", "hot", "day"], leaf: ["leaf", "leaves", "plant", "tree", "grow", "seed"],
  apple: ["apple", "food", "fruit", "eat", "snack"], music: ["music", "note", "song", "sing", "rhythm", "beat"],
  home: ["home", "house", "habitat", "nest"], moon: ["moon", "night", "sleep", "bedtime", "dark"], snow: ["snow", "cold", "ice", "winter", "freeze"],
  star: ["star", "stars", "sparkle", "best", "great"],
};

/**
 * A keyword badge for a spec keyword: a catalog prop named in its icon text (or the word itself), else a kit icon
 * whose words match, else up to 4 characters of text for short words and numbers, else a star.
 * @param {{ word: string, icon?: string, sound?: string }} k
 * @param {object} catalog
 */
export function keywordBadge(k, catalog) {
  const words = `${k.icon ?? ""} ${k.word}`.toLowerCase().match(/[a-z0-9?]+/g) ?? [];
  const sound = k.sound && !String(k.sound).startsWith("new:") && catalog.sounds?.[k.sound] ? k.sound : undefined;
  const props = catalog.props ?? {};
  // Two-word prop names first ("rain cloud" -> rain_cloud), then single words; the keyword itself wins ties.
  const word = k.word.toLowerCase().replace(/\s+/g, "_");
  let model = props[word] ? word : null;
  for (let i = 0; !model && i < words.length - 1; i++) if (props[`${words[i]}_${words[i + 1]}`]) model = `${words[i]}_${words[i + 1]}`;
  for (const w of words) if (!model && props[w] && !["hand", "heart"].includes(w)) model = w;
  if (model) return sound ? { model, sound } : model;
  for (const w of words) for (const [icon, ws] of Object.entries(ICON_WORDS)) if (ws.includes(w)) return sound ? { icon, sound } : icon;
  if (/^[0-9+\-=×÷.]{1,4}$/.test(k.word) || k.word.length <= 3) return { text: k.word.slice(0, 4), ...(sound ? { sound } : {}) };
  return sound ? { icon: "star", sound } : "star";
}

const SUBJECT = { math: "Math", ela: "Reading", science: "Science", social_studies: "Social Studies", sel: "Feelings", health: "Health", thinking: "Thinking Skills", music: "Music", art: "Art" };
const GRADE_TAG = { bb: ["baby learning", "babies", "baby videos"], pk: ["preschool", "pre-k", "toddler learning"], kg: ["kindergarten", "kindergarten learning"], g1: ["first grade", "grade 1"], g2: ["second grade", "grade 2"], g3: ["third grade", "grade 3"], g4: ["fourth grade", "grade 4"], g5: ["fifth grade", "grade 5"] };

/**
 * The YouTube description: the hook promise, what kids learn (objective + recap), a grown-up line (safety) and
 * the channel line. Plain text, no links.
 */
export function youtubeDescription(spec) {
  const out = [];
  if (spec.hook?.line) out.push(spec.hook.line);
  out.push(`${spec.story?.premise ?? ""} ${spec.story?.problem ?? ""}`.trim());
  out.push("");
  out.push(`In this video: ${spec.objective.replace(/^I can /, "we learn to ").replace(/\.$/, "")}.`);
  for (const p of spec.recap?.points ?? []) out.push(`- ${p}`);
  for (const s of spec.safety ?? []) out.push("", s);
  out.push("", "Toybox Elementary: short, playful lessons for babies, pre-K and grades K-5. Watch together, pause and play along!");
  return out.join("\n");
}

/** 8-15 tags: topic words, keywords, grade and subject tags, the channel. */
export function youtubeTags(spec) {
  const b = spec.band;
  const tags = new Set();
  const add = (t) => { const s = String(t).toLowerCase().replace(/[^a-z0-9 '+-]/g, " ").replace(/\s+/g, " ").trim(); if (s && s.length <= 40) tags.add(s); };
  add(spec.title);
  for (const k of spec.keywords ?? []) add(k.word);
  add(spec.distinct_by?.sub_skill?.split(/[,;(]/)[0]);
  for (const t of GRADE_TAG[b] ?? []) add(t);
  const subj = SUBJECT[spec.subject] ?? spec.subject;
  add(`${GRADE_TAG[b]?.[0] ?? ""} ${subj}`);
  add(`${subj} for kids`);
  add("kids learning video");
  add("educational video for kids");
  add("Toybox Elementary");
  return [...tags].slice(0, 15);
}

/**
 * Script meta for a spec: series toybox, episode = the 10K id, audience, seed, Toybox voice, music, skills (real
 * ids only), retention lints on, youtube {title, description, tags}. `lesson` may override music, gain and title.
 * @param {object} spec
 * @param {object} lesson
 * @param {{ skills?: Record<string, unknown> }} [o]
 */
export function buildMeta(spec, lesson, { skills } = {}) {
  const band = bandOf(spec.id);
  const d = BANDS[band];
  const m = musicFrom(spec.music, band);
  const meta = {
    title: lesson.title ?? spec.title,
    series: "toybox",
    episode: spec.id,
    audience: d.audience,
    seed: seedOf(spec.id),
    voice: "soft",
    voiceSpeed: lesson.voiceSpeed ?? d.voiceSpeed,
    music: lesson.music ?? m.mood,
    musicGain: lesson.musicGain ?? m.gain,
    skills: (spec.skills ?? []).filter((s) => !skills || skills[s]),
    retention: { hookBy: 8, talkMax: 15, staticMax: 20 },
    youtube: {
      title: (lesson.youtubeTitle ?? spec.youtube_title ?? `${spec.title} | Toybox Elementary`).slice(0, 100),
      description: youtubeDescription(spec),
      tags: youtubeTags(spec),
    },
  };
  return meta;
}
