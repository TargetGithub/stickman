// Story macro params (STORY_SPEC 11, S0 freeze). The semantic stage checks a macro beat's params
// against these schemas; the compiler (S6) reads the same table for defaults.

import { ID, V2_ENUMS as E, DEST } from "./v2_names.js";

const idRef = { type: "string", pattern: ID };
const idList = (max) => ({ type: "array", minItems: 1, maxItems: max, items: idRef });
const num = (minimum, maximum, description) => ({ type: "number", minimum, maximum, ...(description ? { description } : {}) });
const int = (minimum, maximum) => ({ type: "integer", minimum, maximum });
const obj = (required, properties) => ({ type: "object", required, additionalProperties: false, properties });

export const MACRO_PARAMS = {
  // ---- beat macros ----
  dialogue: obj(["lines"], {
    lines: {
      type: "array", minItems: 1, maxItems: 30,
      description: "[speaker, text], [speaker, text, face] or [speaker, text, face, bubble]; text up to 120 characters, split into 40-character bubbles.",
      items: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
    },
    gap: num(0, 3, "Pause between lines (default 0.3 s)."),
    gestures: { type: "boolean", description: "Talk gestures while speaking (default true)." },
    camera: { enum: ["auto", "none"] },
  }),
  activity: obj(["name", "with"], {
    name: { enum: E.activity },
    with: idList(4),
    reps: int(1, 40),
    dur: num(1, 120),
    intensity: { enum: E.intensity },
    ending: { enum: E.ending },
    winner: idRef,
    object: { ...idRef, description: "Use this set piece (a bench, a net) instead of spawning one." },
  }),
  walk_together: obj(["who", "to"], { who: idList(4), to: DEST, pace: { enum: ["walk", "run"] }, holdHands: { type: "boolean" } }),
  travel: obj(["who", "to"], { who: idList(4), to: DEST, mode: { enum: E.pace }, camera: { enum: ["track", "wide", "none"] } }),
  enter: obj(["who", "side"], { who: idRef, side: { enum: E.side }, mode: { enum: E.pace }, to: DEST }),
  exit: obj(["who", "side"], { who: idRef, side: { enum: E.side }, mode: { enum: E.pace } }),
  fight: obj(["sides", "winner"], {
    sides: { type: "array", minItems: 2, maxItems: 2, items: idRef },
    winner: idRef,
    exchanges: int(1, 30),
    intensity: { enum: E.intensity },
    style: { enum: E.fightStyle },
    finisher: { type: "string", description: "Attack move for the last exchange." },
    ko: { type: "boolean", description: "Loser ends knocked out (default true); false leaves them standing for a defeat macro." },
    phases: {
      type: "array", maxItems: 4,
      items: obj(["exchanges"], { exchanges: int(1, 15), style: { enum: E.fightStyle }, intensity: { enum: E.intensity }, chargeUp: { type: "boolean" } }),
    },
  }),
  gauntlet: obj(["hero", "opponents"], {
    hero: idRef,
    opponents: idList(6),
    per: int(1, 10),
    travel: { enum: ["walk", "run", "none"] },
    intensity: { enum: E.intensity },
    finisher: { type: "string" },
    afterDefeat: { enum: ["stay", "fade"] },
  }),
  brawl: obj(["teams", "winner"], {
    teams: obj(["a", "b"], { a: idList(6), b: idList(6) }),
    winner: { enum: ["a", "b"] },
    dur: num(5, 120),
    intensity: { enum: E.intensity },
  }),
  chase: obj(["runner", "chasers"], { runner: idRef, chasers: idList(4), dur: num(3, 60), obstacles: int(0, 6), caught: { type: "boolean" } }),
  defeat: obj(["who", "style"], { who: idRef, by: idRef, style: { enum: E.defeatStyle } }),
  grief: obj(["who"], { who: idRef, over: idRef, dur: num(2, 20), rain: { type: "boolean" } }),

  // ---- scene macros (expand into scenes) ----
  fight_card: obj(["matchups"], {
    title: { type: "string", minLength: 1, maxLength: 60 },
    matchups: {
      type: "array", minItems: 1, maxItems: 6,
      items: obj(["sides", "winner"], {
        sides: { type: "array", minItems: 2, maxItems: 2, items: idRef },
        winner: idRef,
        location: { type: "string" },
        exchanges: int(3, 30),
        style: { enum: E.fightStyle },
      }),
    },
    intro: { type: "boolean" },
    breathers: { type: "boolean" },
    finale: { enum: ["boss", "plain"] },
    minDur: num(60, 900, "Target length in seconds (default 180)."),
  }),
  montage: obj(["clips"], {
    clips: {
      type: "array", minItems: 2, maxItems: 8,
      items: obj(["location", "who"], {
        location: { type: "string" },
        who: idList(4),
        do: { type: "string" },
        time: { enum: E.time },
        weather: { enum: E.weather },
        text: { type: "string", minLength: 1, maxLength: 80 },
      }),
    },
    clipDur: num(1, 10),
    cut: { enum: ["cut", "dissolve", "wipe"] },
  }),
};

/** Anchors each beat macro exposes for {"on": "<macroId>.<anchor>"} (spec 11.3). N is 1-based. */
export const MACRO_ANCHORS = {
  dialogue: ["start", "end", "line<N>"],
  activity: ["start", "end", "ending"],
  walk_together: ["start", "end"],
  travel: ["start", "end"],
  enter: ["start", "end"],
  exit: ["start", "end"],
  fight: ["start", "end", "finisher", "ko"],
  gauntlet: ["start", "end", "opponent<N>", "finisher"],
  brawl: ["start", "end"],
  chase: ["start", "end", "caught"],
  defeat: ["start", "end", "gone"],
  grief: ["start", "end"],
};
