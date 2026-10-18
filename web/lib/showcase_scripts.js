// Preview scripts for the showcase page (CATALOG_SPEC 8): one small v2 story per card, built from catalog
// data, so every preview runs through the public engine and validates like any script. Pure; the page and
// tests/unit/showcase.test.js both use it. `look` is the viewer's choice: { body, color }.

export const PARTNER_COLOR = "#7a7f8c";
const W = 3200;
const X = 1500;

/** One-scene story around a hero ("a") and, when asked, a partner or target ("b"). */
export function stage({ look, hero = {}, partner = null, beats = [], duration = 3.5, theme = "white_stage", time, weather,
  set = [], camera, audience = "kids", heroX = X, partnerX = X + 320, heroFace, heroHidden = false, extraCast = [] }) {
  const cast = [{ id: "a", name: "A", body: look.body, color: look.color, ...hero }];
  const placed = [{ id: "a", x: heroX, facing: 1, ...(heroFace ? { face: heroFace } : {}), ...(heroHidden ? { hidden: true } : {}) }];
  if (partner) {
    cast.push({ id: "b", name: "B", body: "stickman", color: PARTNER_COLOR, ...partner });
    placed.push({ id: "b", x: partnerX, facing: -1 });
  }
  for (const e of extraCast) {
    cast.push(e.cast);
    placed.push(e.place);
  }
  return {
    version: 2,
    meta: { title: "Showcase", format: "landscape", seed: 7, kind: "clip", audience },
    cast,
    locations: [{ id: "here", theme, stageWidth: W, ...(set.length ? { set } : {}) }],
    scenes: [{ id: "s1", location: "here", ...(time ? { time } : {}), ...(weather ? { weather } : {}), duration, cast: placed,
      camera: camera || [{ at: 0, mode: "follow", targets: partner ? ["a", "b"] : ["a"], zoom: partner ? "auto" : 1.6, padding: 140 }], beats }],
  };
}

/** The holdable that a move's needsProp asks for. */
export function holdFor(catalog, kind) {
  if (!kind) return null;
  if (kind === "any") return "sword";
  return Object.keys(catalog.props).find((k) => catalog.props[k].kind === kind)
    || Object.keys(catalog.objects).find((k) => catalog.objects[k].hold?.kind === kind) || null;
}

const lengthOf = (m) => m.duration * (m.params?.cycles ?? (m.flags?.loop ? 2 : 1));

/** A move preview: the move on the viewer's body plan, with a target, partner, prop or set-up when it needs one. */
export function moveScript(catalog, m, look) {
  // A move plays on a body plan of its rig (a dog move on a dog, a humanoid move on a person; STORY_SPEC 6.2).
  const rig = m.rig || "humanoid";
  const rigOf = (n) => catalog.bodies[n || "stickman"]?.rig || "humanoid";
  if (rig !== "any" && rigOf(look.body) !== rig) look = { ...look, body: rig === "humanoid" ? "stickman" : Object.keys(catalog.bodies).find((n) => rigOf(n) === rig) };
  const prop = holdFor(catalog, m.needsProp);
  const hero = prop ? { prop } : {};
  const dur = Math.max(3.5, lengthOf(m) + 1.6);
  const beat = { id: "m", at: 0.4, who: "a", do: m.name };
  const pre = (b) => [{ id: "p", at: 0.3, who: "a", ...b }, { ...beat, at: { after: "p", delay: 0.2 } }];
  if (m.category === "attack") {
    const ranged = m.flags?.ranged;
    return stage({ look, hero, partner: {}, partnerX: X + (ranged ? Math.max(ranged[0] + 80, 520) : 330),
      beats: [{ ...beat, target: "b", outcome: "hit", approach: "run" }], duration: dur + 1 });
  }
  if (m.pair) {
    const give = m.name === "give" ? { prop: "flower" } : {};
    const beats = [{ ...beat, partner: "b" }];
    // A partner move made for a dog gets a dog partner (pet_dog, hug_dog).
    const partnerRig = catalog.moves.find((x) => x.name === m.pair.partnerMove)?.rig || "humanoid";
    if (partnerRig !== "humanoid") return stage({ look, partner: { body: Object.keys(catalog.bodies).find((n) => rigOf(n) === partnerRig), color: "#f3e3c3" }, partnerX: X + 160, beats, duration: dur + 1.2 });
    if (m.name === "put_down") return stage({ look, partner: {}, partnerX: X + 200, beats: [{ id: "p", at: 0.3, who: "a", do: "carry", partner: "b" }, { ...beat, partner: "b", at: { after: "p", delay: 0.3 } }], duration: 6 });
    return stage({ look, hero: give, partner: {}, partnerX: X + 220, beats, duration: dur + 1.2 });
  }
  const special = {
    get_up: () => stage({ look, beats: pre({ do: "knockdown" }), duration: 4 }),
    stand_up: () => stage({ look, beats: pre({ do: "sit" }), duration: 4 }),
    return: () => stage({ look, beats: pre({ do: "vanish" }), duration: 6.5 }),
    dismount: () => stage({ look, set: [{ id: "bike1", object: "bike", x: X + 60 }], beats: [{ id: "p", at: 0.3, who: "a", do: "ride", object: "bike1" }, { ...beat, at: { after: "p", delay: 0.6 } }], duration: 3.5 }),
    ride: () => stage({ look, set: [{ id: "bike1", object: "bike", x: X + 60 }], beats: [{ ...beat, object: "bike1" }], duration: 3.5 }),
    sit: () => stage({ look, set: [{ id: "bench1", object: "bench", x: X + 60 }], beats: [{ ...beat, object: "bench1" }], duration: 3.5 }),
    use: () => stage({ look, hero: { prop: "bubble_wand" }, beats: [beat], duration: 4 }),
    drop_prop: () => stage({ look, hero: { prop: "sword" }, beats: [beat], duration: 3.5 }),
    pick_prop: () => stage({ look, beats: [{ id: "p", at: 0, who: "world", do: "spawn_prop", params: { prop: "sword", x: X + 50 } }, { ...beat, at: 0.5 }], duration: 3.5 }),
    spawn: () => stage({ look, heroHidden: true, beats: [beat], duration: 3.5 }),
    spawn_dog: () => stage({ look, heroHidden: true, beats: [beat], duration: 3.5 }),
    get_up_dog: () => stage({ look, beats: pre({ do: "lie_dog" }), duration: 4 }),
    throw_prop: () => stage({ look, hero: { prop: "sword" }, partner: {}, partnerX: X + 600, beats: [{ ...beat, target: "b", outcome: "hit", approach: "run" }], duration: 4 }),
  };
  if (special[m.name]) return special[m.name]();
  return stage({ look, hero, beats: [beat], duration: dur, audience: m.name === "ghost" ? "general" : "kids" });
}

/** A beat fx on the hero (trails ride on a fast move). */
export function fxScript(catalog, name, look) {
  const p = catalog.fxPresets[name];
  if (p.trail) {
    const sword = name === "slash_arc";
    return stage({ look, hero: sword ? { prop: "sword" } : {}, partner: {}, beats: [{ id: "m", at: 0.4, who: "a", do: sword ? "sword_slash" : "dash", ...(sword ? { target: "b", outcome: "hit", approach: "run" } : {}), fx: [name] }], duration: 3.5 });
  }
  return stage({ look, beats: [{ id: "m", at: 0.4, who: "a", do: p.anchor === "feet" ? "jump" : "taunt", fx: [name] }], duration: 3.5 });
}

/** Automatic hit effects and kids impact words: a short exchange of hits. */
export function hitsScript(look, audience = "kids") {
  const hit = (id, at, move, outcome) => ({ id, at, who: "a", do: move, target: "b", outcome, approach: "run" });
  return stage({ look, partner: {}, audience, duration: 5,
    beats: [hit("h1", 0.4, "jab", "hit"), { ...hit("h2", { after: "h1", delay: 0.2 }, "cross", "blocked") }, { ...hit("h3", { after: "h2", delay: 0.2 }, "haymaker", "hit") }] });
}

/** A body plan, a preset or a look: the character waves, then idles. */
export function characterScript(look, hero = {}, face) {
  return stage({ look, hero, heroFace: face, beats: [{ id: "w", at: 0.3, who: "a", do: "wave" }], duration: 3.5,
    camera: [{ at: 0, mode: "fixed", x: X, zoom: 2.2 }] });
}

/** A face, close up. */
export const faceScript = (look, face) => stage({ look, heroFace: face, duration: 3.5, camera: [{ at: 0, mode: "close_up", target: "a" }],
  beats: [{ id: "t", at: 0.3, who: "a", do: "talk", params: { cycles: 2 } }] });

/** A theme, at a time of day and weather, with two characters for scale. */
export const placeScript = (look, theme, time, weather) => stage({ look, theme, time, weather, partner: {}, partnerX: X + 420,
  beats: [{ id: "w", at: 0.5, who: "a", do: "wave" }, { id: "w2", at: 1.2, who: "b", do: "wave" }], duration: 3.5,
  camera: [{ at: 0, mode: "wide" }] });

/** An object: placed, held, or set moving by its behavior. */
export function objectScript(catalog, name, look, isProp = false) {
  const o = isProp ? { behavior: "holdable" } : catalog.objects[name];
  if (o.behavior === "holdable") {
    const weapon = isProp && ["sword", "staff", "bat"].includes(catalog.props[name].kind);
    const swing = { sword: "sword_slash", staff: "staff_swing", bat: "bat_swing" }[catalog.props[name]?.kind];
    return stage({ look, hero: { prop: name }, ...(weapon ? { partner: {} } : {}), duration: 3.5,
      beats: [weapon ? { id: "u", at: 0.4, who: "a", do: swing, target: "b", outcome: "blocked", approach: "run" } : { id: "u", at: 0.4, who: "a", do: o.use ? "use" : "wave" }],
      camera: [{ at: 0, mode: "fixed", x: X + (weapon ? 160 : 0), zoom: weapon ? 1.5 : 2 }] });
  }
  const set = [{ id: "o1", object: name, x: X + 300 }];
  const act = {
    ball: [{ id: "k", at: 0.6, who: "world", do: "set_object", object: "o1", params: { toX: X + 900, height: 260 } }],
    vehicle: [{ id: "k", at: 0.6, who: "world", do: "set_object", object: "o1", params: { toX: X + 1100, speed: 500 } }],
    breakable: [{ id: "k", at: 1, who: "world", do: "set_object", object: "o1", params: { state: "broken" } }],
  }[o.behavior];
  const toggle = !act && o.states?.length > 1 ? [{ id: "k", at: 1.2, who: "world", do: "set_object", object: "o1", params: { state: o.states[1] } }] : [];
  const beats = o.behavior === "floater"
    ? [{ id: "k", at: 0.2, who: "world", do: "spawn_object", params: { kind: name, id: "f1", x: X + 300 } }]
    : [...(act || toggle), { id: "w", at: 0.4, who: "a", do: o.behavior === "seat" ? "sit" : "look_around", ...(o.behavior === "seat" ? { object: "o1" } : {}) }];
  return stage({ look, set: o.behavior === "floater" ? [] : set, beats, duration: 4, camera: [{ at: 0, mode: "fixed", x: X + 300, zoom: 0.75 }] });
}

/** An activity with as few players as it takes, on the set piece it can use. */
export function activityScript(catalog, name, look) {
  const a = catalog.activities[name];
  const players = Math.max(2, a.players[0]);
  const piece = a.objects?.[0];
  const ids = ["a", "b"].slice(0, players);
  return stage({ look, partner: players > 1 ? {} : null, partnerX: X + 400,
    set: piece ? [{ id: "p1", object: piece, x: X + 200 }] : [], duration: 4,
    beats: [{ id: "act", at: 0.3, macro: "activity", params: { name, with: ids, ...(a.runner === "rally" ? { reps: 2 } : { dur: 4 }), ...(piece ? { object: "p1" } : {}) } }],
    camera: [{ at: 0, mode: "follow", targets: ids, zoom: "auto", padding: 260 }] });
}
