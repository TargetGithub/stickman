// Tiny stories that put one catalog example on stage (CATALOG_SPEC 6, 11): a doc's example beat, a macro,
// a camera key, a transition or a preset. The checks validate them so every example the context pack and
// the showcase show is known to work. Pure functions. (Any seed works; tests/unit/macros.test.js checks
// @brawl and @gauntlet with these placements on many seeds.)

const CAST = [
  { id: "kai", name: "Kai", color: "#1f4fbf", prop: "sword" },
  { id: "pip", name: "Pip", body: "buddy", color: "#c2185b" },
  { id: "vex", name: "Vex", body: "slim", color: "#5b2a86", hp: 200 },
  { id: "guard1", body: "bulky", color: "#8b2500" },
  { id: "guard2", body: "bulky", color: "#2b2b2b" },
];
const PLACES = { kai: 1100, pip: 1350, vex: 1900, guard1: 2300, guard2: 2700 };

const story = (scenes, extra = {}) => ({
  version: 2,
  meta: { title: "Catalog example", format: "landscape", seed: 3, kind: "clip", audience: extra.audience || "kids" },
  cast: extra.cast || CAST,
  locations: [{ id: "here", theme: extra.theme || "white_stage", set: [{ id: "door1", object: "door", x: 600 }] }],
  scenes,
});

const placed = (hidden = []) => CAST.map((c) => ({ id: c.id, x: PLACES[c.id], facing: c.id === "kai" || c.id === "pip" ? 1 : -1, ...(hidden.includes(c.id) ? { hidden: true } : {}) }));
const tail = (after) => ({ id: "x_end", at: { after, delay: 0.5 }, who: "world", do: "fade", params: { to: "black", dur: 0.5 } });

/** A world command example beat: a balloon is spawned first so remove_object has something to remove. */
export function worldCommandStory(name, example) {
  const beats = [
    { id: "x_spawn", at: 0, who: "world", do: "spawn_object", params: { kind: "balloon", id: "red_balloon", x: 1500 } },
    { id: "x_it", ...example, at: 0.5 },
    { id: "x_wave", at: { after: "x_spawn", delay: 1.5 }, who: "guard2", do: "wave" },
  ];
  return story([{ id: "s1", location: "here", cast: placed(), beats: [...beats, tail("x_wave")] }]);
}

/** A beat or scene macro example. */
export function macroStory(name, example) {
  if (!example.macro || example.who) throw new Error(`${name}: an example macro has "macro" and no "who"`);
  if ("at" in example) {
    return story([{ id: "s1", location: "here", cast: placed(name === "enter" ? [example.params.who] : []), beats: [example, tail(example.id)] }]);
  }
  return story([example], { cast: CAST.map((c) => (c.id === "kai" ? { ...c, prop: null } : c)) });
}

/** A camera key example (after a wide opening key when it does not start at 0). */
export function cameraStory(example) {
  const camera = example.at === 0 ? [example] : [{ at: 0, mode: "wide" }, example];
  const beats = [{ id: "x_w", at: 0.5, who: "kai", do: "wave" }, { id: "x_l", at: { after: "x_w" }, who: "pip", do: "look_around" }, { id: "x_w2", at: { after: "x_l" }, who: "pip", do: "wave" }];
  return story([{ id: "s1", location: "here", cast: placed(), camera, beats: [...beats, tail("x_w2")] }]);
}

/** A transition or card example, between two short scenes. */
export function transitionStory(example) {
  const scene = (id) => ({ id, location: "here", cast: placed(), beats: [{ id: `${id}_w`, at: 0.5, who: "kai", do: "wave" }] });
  const last = scene("s2");
  last.beats.push(tail("s2_w"));
  return story([scene("s1"), { ...last, transitionIn: example }]);
}

/** One character preset on stage, on a theme (for the contrast check). */
export function presetStory(preset, theme = "white_stage") {
  const cast = [{ id: preset.id, name: preset.name, ...preset.cast }];
  const scene = { id: "s1", location: "here", cast: [{ id: preset.id, x: 1600, facing: 1 }], beats: [{ id: "x_w", at: 0.3, who: preset.id, do: "wave" }, { id: "x_n", at: { after: "x_w" }, who: preset.id, do: "nod" }, tail("x_n")] };
  return story([scene], { cast, theme, audience: preset.audience?.includes("kids") ? "kids" : "general" });
}
