// Scene macros (STORY_SPEC 11.2, 12). Milestone: S6. Each builder is (ctx, params) → scenes.
//   @fight_card  a fight-only video: title card and intro, rounds with rising intensity, breathers, a boss
//                finale, the victory and an end card; the exchange counts stretch to reach minDur
//   @montage     short clips with quick cuts and one music bed
// Generated scenes may contain beat macros (each round is a @fight); the compiler expands those next.

import { pick, nameOf, round } from "../compile.js";
import { STAGE } from "../../config.js";

// Seconds the compiler expects per part, used to stretch rounds toward minDur (measured on the samples).
const EST = { exchange: 2.4, intro: 11, breather: 9, victory: 7, card: 2.5, title: 3 };
const LEVELS = ["low", "medium", "high"];
const MAX_ROUND = 26; // exchanges in one round (a boss round splits them over two phases of at most 15)

function locationInfo(ctx, name) {
  const loc = (ctx.story.locations || []).find((l) => l.id === name);
  const width = loc?.stageWidth ?? STAGE.width;
  return { id: name, mid: width / 2, width };
}

/** The default arena: the story's first location, else a theme. */
const defaultLocation = (ctx) => ctx.story.locations?.[0]?.id ?? (ctx.catalog.themes.arena ? "arena" : ctx.catalog.themeNames[0]);

const lines = (ctx, key) => ctx.catalog.macroLines?.[key] || [];

function fightCard(ctx, p) {
  const id = ctx.id.slice(0, 20);
  const m = p.matchups;
  const intro = p.intro !== false;
  const breathers = p.breathers !== false;
  const boss = (p.finale ?? "boss") === "boss";
  const title = p.title ?? ctx.story.meta.title;
  const entry = ctx.entry;
  // Stretch the rounds so the whole card reaches minDur. A round holds at most MAX_ROUND exchanges; past that,
  // matchups get rematch rounds (best of three: the eventual winner takes the last one), up to 6 rounds.
  const fixedFor = (rounds) => (intro ? EST.intro : 0) + EST.title + (breathers ? (rounds - 1) * EST.breather : 0) + EST.victory + rounds * EST.card;
  let rounds = m.map((mu) => [mu]);
  const need = (r) => Math.max(0, (p.minDur ?? 180) - fixedFor(r)) / EST.exchange;
  for (let k = m.length - 1; need(rounds.flat().length) > rounds.flat().length * MAX_ROUND && rounds.flat().length < 6; k = (k + m.length - 1) % m.length) {
    rounds[k].push(rounds[k][0]);
  }
  rounds = rounds.flatMap((list) => list.map((mu, i) => {
    const [a, b] = mu.sides;
    const other = a === mu.winner ? b : a;
    // Alternate winners so the matchup's winner wins its last round.
    return (list.length - 1 - i) % 2 ? { ...mu, winner: other, exchanges: undefined } : mu;
  }));
  const weights = rounds.map((_, k) => 1 + 0.25 * k + (boss && k === rounds.length - 1 ? 0.4 : 0));
  const wsum = weights.reduce((s, w) => s + w, 0);
  const budget = need(rounds.length);
  const counts = rounds.map((mu, k) => mu.exchanges ?? Math.max(3, Math.min(MAX_ROUND, Math.round((budget * weights[k]) / wsum))));
  const scenes = [];
  const place = (loc, ids) => ids.map((who, k) => ({ id: who, x: round(loc.mid + (k === 0 ? -260 : 260) + (k > 1 ? (k - 1) * 140 : 0)), facing: k === 0 ? 1 : -1 }));

  const first = locationInfo(ctx, m[0].location ?? defaultLocation(ctx));
  if (intro) {
    const [a, b] = m[0].sides;
    const loser = a === m[0].winner ? b : a;
    const pair = pick(ctx, lines(ctx, "rivals").length ? lines(ctx, "rivals") : [["Ready?", "Ready!"]]);
    scenes.push({
      id: `${id}_intro`, location: first.id, cast: place(first, [m[0].winner, loser]),
      transitionIn: entry.transitionIn ?? { type: "card", kind: "title", title },
      ...(entry.music ? { music: entry.music } : {}),
      beats: [
        { id: `${id}_intro_t`, at: 0.5, who: loser, do: "taunt", face: "smug" },
        { id: `${id}_intro_d`, at: { after: `${id}_intro_t`, delay: 0.2 }, macro: "dialogue", params: { lines: [[loser, pair[0], "smug"], [m[0].winner, pair[1], "determined", "shout"]] } },
        { at: { after: `${id}_intro_d`, delay: 0.2 }, who: m[0].winner, do: "clench_fist" },
      ],
    });
  }
  rounds.forEach((mu, k) => {
    const last = k === rounds.length - 1;
    const loc = locationInfo(ctx, mu.location ?? rounds[k - 1]?.location ?? defaultLocation(ctx));
    const [a, b] = mu.sides;
    const loser = a === mu.winner ? b : a;
    const level = LEVELS[Math.min(2, Math.round((k / Math.max(1, rounds.length - 1)) * 2))];
    const n = counts[k];
    const params = { sides: mu.sides, winner: mu.winner, intensity: last ? "high" : level, ko: true };
    if (last && boss && n >= 4) {
      params.phases = [{ exchanges: Math.min(15, Math.ceil(n / 2)), style: "even", intensity: "medium" }, { exchanges: Math.min(15, Math.floor(n / 2)), style: "comeback", intensity: "high", chargeUp: true }];
    } else {
      params.exchanges = n;
      params.style = mu.style ?? pick(ctx, ["even", "close", "dominant"]);
    }
    const hp = (who) => ctx.story.cast.find((c) => c.id === who)?.hp ?? 100;
    scenes.push({
      id: `${id}_r${k + 1}`, location: loc.id,
      cast: place(loc, [mu.winner, loser]).map((c) => ({ ...c, hp: hp(c.id) })), // each round starts fresh
      transitionIn: (!intro && k === 0 && entry.transitionIn) || { type: "card", kind: "chapter", text: last && boss && rounds.length > 1 ? "Final Round" : `Round ${k + 1}` },
      music: { mood: last && boss ? "boss" : "battle", ...(entry.music?.volume !== undefined ? { volume: entry.music.volume } : {}) },
      beats: [{ id: `${id}_r${k + 1}f`, at: 0.4, macro: "fight", params }],
    });
    if (breathers && !last) {
      const nextUp = rounds[k + 1].sides.filter((s) => s !== mu.winner && s !== loser);
      const cast = [{ id: mu.winner, x: round(loc.mid), facing: 1 }, ...nextUp.slice(0, 1).map((s) => ({ id: s, x: round(loc.mid + 300), facing: -1 }))];
      const beats = [
        { id: `${id}_b${k + 1}s`, at: 0.4, who: mu.winner, do: "sigh", face: "tired", say: pick(ctx, lines(ctx, "breather").length ? lines(ctx, "breather") : ["Phew..."]) },
        { at: { after: `${id}_b${k + 1}s`, delay: 0.3 }, who: mu.winner, do: pick(ctx, ["stretch", "charge_up"].filter((x) => ctx.moves.has(x))), face: "determined" },
      ];
      if (nextUp.length) {
        beats.push({ id: `${id}_b${k + 1}e`, at: { after: `${id}_b${k + 1}s` }, macro: "enter", params: { who: nextUp[0], side: "right", mode: "walk" } });
        beats.push({ at: { after: `${id}_b${k + 1}e`, delay: 0.2 }, who: nextUp[0], do: "point", target: mu.winner, face: "smug", say: pick(ctx, lines(ctx, "challenge").length ? lines(ctx, "challenge") : ["My turn!"]) });
      }
      scenes.push({ id: `${id}_b${k + 1}`, location: loc.id, cast, transitionIn: { type: "fade", dur: 0.6 }, music: { mood: "calm" }, beats });
    }
  });
  const champ = rounds[rounds.length - 1].winner;
  const end = locationInfo(ctx, m[m.length - 1].location ?? defaultLocation(ctx));
  scenes.push({
    id: `${id}_end`, location: end.id, cast: [{ id: champ, x: round(end.mid), facing: 1 }],
    transitionIn: { type: "fade", dur: 0.6 }, music: { mood: "triumphant" },
    ...(entry.transitionOut ? { transitionOut: entry.transitionOut } : {}),
    beats: [
      { id: `${id}_end_v`, at: 0.4, who: champ, do: "victory", face: "happy", say: pick(ctx, lines(ctx, "victory").length ? lines(ctx, "victory") : ["I did it!"]) },
      { at: { after: `${id}_end_v`, delay: 1 }, who: "world", do: "end_card", params: { text: `${nameOf(ctx.story, champ)} wins!`.slice(0, 80) } },
    ],
  });
  return scenes;
}

function montage(ctx, p) {
  const id = ctx.id.slice(0, 24);
  const dur = p.clipDur ?? 3;
  const cut = p.cut ?? "cut";
  const entry = ctx.entry;
  return p.clips.map((clip, k) => {
    const loc = locationInfo(ctx, clip.location);
    const move = clip.do ?? "walk";
    const def = ctx.moves.get(move);
    const cast = clip.who.map((who, i) => ({ id: who, x: round(loc.mid - 200 + i * 150), facing: 1 }));
    const beats = [];
    if (def?.pair && clip.who.length > 1) beats.push({ at: 0.2, who: clip.who[0], do: move, partner: clip.who[1] });
    else clip.who.forEach((who, i) => beats.push({ at: round(0.2 + 0.15 * i), who, do: move, ...(def?.flags.loop ? { params: { distance: 400 } } : {}) }));
    if (clip.text) beats.push({ at: 0.1, who: "world", do: "narrate", params: { text: clip.text, dur: Math.max(0.5, dur - 0.3) } });
    const scene = { id: `${id}_c${k + 1}`, location: loc.id, cast, beats, duration: dur };
    if (clip.time) scene.time = clip.time;
    if (clip.weather) scene.weather = clip.weather;
    if (entry.music) scene.music = entry.music;
    if (k === 0 && entry.transitionIn) scene.transitionIn = entry.transitionIn;
    if (k > 0 && cut !== "cut") scene.transitionIn = { type: cut, dur: 0.4 };
    if (k === p.clips.length - 1 && entry.transitionOut) scene.transitionOut = entry.transitionOut;
    return scene;
  });
}

export const SCENE_MACROS = { fight_card: fightCard, montage };
