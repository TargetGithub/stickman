// Lip-sync (STORY_SPEC 7.1a, ADR-032): letters to visemes, babble and audio plans, the face state's
// lip shape, the mouth drawing (on a recording fake context) and the tools' envelope tracks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../../catalog/index.js";
import { visemeTable, letterVisemes, textPlan, audioPlan, visemeAt, REST, LEAD } from "../../engine/lipsync.js";
import { syllables } from "../../engine/story/speech.js";
import { faceStyle } from "../../engine/renderer/face_state.js";
import { drawFace } from "../../engine/renderer/face.js";
import { drawViseme } from "../../engine/renderer/mouth_shapes.js";
import { envelope, lipTracks, LIP_HZ } from "../../tools/lib/tts/lipsync.mjs";
import { validate } from "../../engine/index.js";
import { speechStory } from "../helpers/fake_tts.mjs";

const table = visemeTable(catalog.visemes);
const shapes = (text) => letterVisemes(text, table).map((l) => l.v).join(" ");

test("the catalog viseme set: rest plus the eight-shape set, every grapheme on one shape", () => {
  assert.deepEqual(Object.keys(catalog.visemes).sort(), ["A", "E", "F", "L", "M", "O", "U", "rest"]);
  assert.equal(catalog.visemes.rest.open, 0);
  assert.equal(table.map.get("th"), "L");
  assert.equal(table.map.get("t"), "E");
  assert.equal(table.longest, 3);
});

test("letterVisemes: longest grapheme first, letters without a shape borrow a neighbour's", () => {
  for (const [text, want] of [
    ["mama", "M A M A"],
    ["math", "M A L L"], // th is one L over two letters
    ["phone", "F F O E E"],
    ["hi!", "A A"], // h at the start borrows the next shape
    ["oh", "O O"], // h after a vowel keeps it
    ["wow", "U O O"], // "ow" wins over "o" + "w"
    ["Bob's fun", "M O M E F U E"],
    ["!!!", ""],
  ]) assert.equal(shapes(text), want, text);
  // Vowel groups count as speech.js counts them (/[aeiouy]+/).
  const groups = letterVisemes("Hello there", table).filter((l) => l.vowel).map((l) => l.group);
  assert.deepEqual(groups, [0, 1, 2, 3]);
});

test("textPlan: one vowel shape per babble syllable, led in by a shaped consonant; keys never overlap", () => {
  const say = { text: "Mama, look at me!", dur: 3, actor: "kai", at: 1 };
  const sylls = syllables(say, { pitch: 1 }, 7);
  const plan = textPlan(sylls, say.text, table);
  assert.equal(plan.kind, "text");
  const vowels = plan.keys.filter((k) => k.k === 1);
  assert.equal(vowels.length, sylls.length);
  assert.deepEqual(vowels.map((k) => k.v), ["A", "A", "U", "A", "E"]);
  assert.equal(plan.keys[0].v, "M"); // "M" before the first "a"
  for (let i = 1; i < plan.keys.length; i++) assert.ok(plan.keys[i].t0 >= plan.keys[i - 1].t1 - 1e-9, `key ${i} overlaps`);
  // Between syllables the mouth rests (the face's own mouth).
  const gap = vowels[0].t1 + 0.001 - LEAD;
  assert.equal(visemeAt(plan, gap).v === REST || plan.keys.some((k) => gap + LEAD >= k.t0 && gap + LEAD < k.t1), true);
  assert.deepEqual(visemeAt(plan, -1), { v: REST, k: 0 });
  assert.deepEqual(visemeAt(plan, 99), { v: REST, k: 0 });
  // Thoughts have no syllables and so never move the mouth.
  assert.deepEqual(textPlan(syllables({ ...say, bubble: "think" }, null, 7), say.text, table).keys, []);
});

/** An envelope from [seconds, level] runs at LIP_HZ. */
const env = (runs) => runs.flatMap(([s, x]) => Array(Math.round(s * LIP_HZ)).fill(x));

test("audioPlan: silence rests, voiced audio walks the letters in order, short dips stay voiced", () => {
  for (const [name, runs, text, check] of [
    ["one word", [[0.1, 0], [0.4, 0.3], [0.2, 0]], "mama", (p) => {
      assert.equal(p.frames[5].v, REST);
      assert.equal(p.frames[12].v, "M"); // the first voiced letters are the first m
      assert.equal(p.frames[45].v, "A");
      assert.equal(p.frames[55].v, REST);
    }],
    ["a pause splits two words", [[0.3, 0.3], [0.25, 0.001], [0.3, 0.3]], "oh, me", (p) => {
      assert.equal(p.frames[10].v, "O");
      assert.equal(p.frames[40].v, REST);
      assert.equal(p.frames[62].v, "M");
    }],
    ["a 50 ms dip is filled", [[0.2, 0.3], [0.05, 0.01], [0.2, 0.3]], "aaaa", (p) => {
      assert.equal(p.frames[22].v, "A");
    }],
    ["a 10 ms click is dropped", [[0.2, 0], [0.01, 0.5], [0.2, 0]], "a", (p) => {
      assert.ok(p.frames.every((f) => f.v === REST));
    }],
  ]) {
    const plan = audioPlan({ text, env: env(runs), hz: LIP_HZ }, table);
    assert.equal(plan.frames.length, env(runs).length, name);
    check(plan);
  }
  // Louder vowels open wider; consonants open a fixed amount.
  const p = audioPlan({ text: "ma", env: env([[0.2, 0.1], [0.2, 0.4]]), hz: LIP_HZ }, table);
  assert.ok(p.frames[30].k > p.frames[1].k || p.frames[1].v === "M");
  assert.ok(p.frames.every((f) => f.k >= 0 && f.k <= 1));
  // Same input, same plan (no randomness).
  assert.deepEqual(audioPlan({ text: "hello", env: env([[0.5, 0.2]]), hz: LIP_HZ }, table), audioPlan({ text: "hello", env: env([[0.5, 0.2]]), hz: LIP_HZ }, table));
});

/** A minimal renderer and character for faceStyle. */
function rig({ lipSync, tracks, quad } = {}) {
  const r = { catalog, seed: 1, voices: new Map(), syllables: new Map(), sim: { story: { legacy: false, meta: lipSync === undefined ? {} : { lipSync } } }, ...(tracks ? { lipTracks: tracks } : {}) };
  const c = { id: "kai", face: "happy", mouth: "neutral", j: { head: { x: 0, y: 0 } }, facing: 1, scale: 1, alpha: 1, ...(quad ? { quad: {} } : {}) };
  const say = { type: "say", actor: "kai", text: "Mama mia!", dur: 2, videoT: 10, beatId: "b1" };
  const sv = { says: [say] };
  return { r, c, sv, at: (t) => faceStyle(r, c, [c], sv, { videoT: t, cam: { zoom: 1 } }).faceOpts };
}

test("faceStyle: lip shapes while a line is spoken, the old flap with meta.lipSync false", () => {
  const { at } = rig();
  const seen = new Set();
  for (let t = 10; t < 12; t += 1 / 60) {
    const o = at(t);
    assert.ok(o.lip, `lip at ${t}`);
    seen.add(o.lip.v);
    assert.equal(o.talking, o.lip.v !== REST);
    assert.equal(o.lip.shape, catalog.visemes[o.lip.v]);
  }
  assert.ok(seen.has("M") && seen.has("A") && seen.has(REST), [...seen].join());
  assert.equal(at(9).lip, undefined); // not speaking
  const off = rig({ lipSync: false }).at(10.05);
  assert.equal(off.lip, undefined);
  assert.equal(typeof off.talking, "boolean");
  assert.equal(rig({ quad: true }).at(10.2).lip.jaw, true);
});

test("faceStyle: a host audio track drives the mouth, and later bubbles follow their head line's clip", () => {
  const track = { text: "oh", env: env([[0.5, 0.3]]), hz: LIP_HZ };
  const { r, sv, at } = rig({ tracks: { b1: track, b2: { ...track, head: "b1" } } });
  assert.equal(at(10.2).lip.v, "O");
  assert.equal(at(10.6).lip.v, REST); // the clip ended
  sv.says.push({ type: "say", actor: "kai", text: "more", dur: 1, videoT: 10.4, beatId: "b2" });
  assert.equal(at(10.45).lip.v, "O"); // b2's own text is ignored: it plays on in b1's clip
  assert.equal(r.lip.plans.size, 1);
});

/** A context that records what is drawn. */
function fakeCtx() {
  const log = [];
  const ctx = new Proxy({ log }, {
    get(target, k) {
      if (k in target) return target[k];
      return (...a) => log.push([k, ...a]);
    },
    set(target, k, v) {
      target[k] = v;
      return true;
    },
  });
  return ctx;
}

test("drawViseme: every shape draws in both mouth styles and as a jaw, with finite coordinates", () => {
  const at = { pt: (f, u) => ({ x: 100 + f * 20, y: 100 - u * 20 }), f: { x: 1, y: 0 }, u: { x: 0, y: -1 } };
  for (const [name, shape] of Object.entries(catalog.visemes)) {
    for (const o of [{ cartoon: false, jaw: false }, { cartoon: true, jaw: false }, { cartoon: false, jaw: true }]) {
      const ctx = fakeCtx();
      drawViseme(ctx, at, 20, shape, { k: 1, scale: o.cartoon ? 1.35 : 1, mouth: "smile", ...o });
      assert.ok(ctx.log.some(([k]) => k === "stroke" || k === "fill"), `${name} ${JSON.stringify(o)}`);
      for (const [, ...args] of ctx.log) assert.ok(args.every((x) => typeof x !== "number" || Number.isFinite(x)), name);
    }
  }
  // Open shapes fill; the cartoon style adds a tongue on A.
  const fills = (shape, cartoon) => {
    const ctx = fakeCtx();
    drawViseme(ctx, at, 20, shape, { k: 1, scale: 1, cartoon, jaw: false });
    return ctx.log.filter(([k]) => k === "fill").length;
  };
  assert.equal(fills(catalog.visemes.M, false), 0);
  assert.ok(fills(catalog.visemes.A, true) > fills(catalog.visemes.A, false));
});

test("drawFace: the rest shape keeps the face's own mouth; other shapes replace it", () => {
  const axes = { u: { x: 0, y: -1 }, f: { x: 1, y: 0 } };
  const draw = (lip) => {
    const ctx = fakeCtx();
    drawFace(ctx, { x: 0, y: 0 }, 20, axes, catalog.faces.happy, { lip, look: {} });
    return ctx.log.map(([k]) => k).join();
  };
  const rest = draw({ v: REST, k: 0, shape: catalog.visemes.rest, jaw: false });
  assert.equal(rest, draw(undefined)); // happy's smile either way
  assert.notEqual(draw({ v: "O", k: 1, shape: catalog.visemes.O, jaw: false }), rest);
});

test("envelope and lipTracks: RMS per 10 ms; later bubbles share the head line's track", () => {
  const sine = Float32Array.from({ length: 4800 }, (_, i) => 0.5 * Math.sin((2 * Math.PI * 440 * i) / 48000));
  const e = envelope(sine);
  assert.equal(e.length, 10);
  for (const x of e) assert.ok(Math.abs(x - 0.5 / Math.SQRT2) < 0.01, String(x));
  const lines = [
    { kind: "say", id: "a", spoken: "Hello there, my friend!", file: "a.wav", parts: [{ id: "a" }, { id: "a2" }] },
    { kind: "narrate", id: "n", spoken: "Once.", file: "n.wav" },
  ];
  const tracks = lipTracks(lines, () => sine);
  assert.deepEqual(Object.keys(tracks).sort(), ["a", "a2"]);
  assert.equal(tracks.a2.head, "a");
  assert.equal(tracks.a.head, undefined);
  assert.equal(tracks.a2.env, tracks.a.env);
});

test("meta.lipSync is a boolean in the story schema", () => {
  const s = speechStory();
  assert.ok(validate({ ...s, meta: { ...s.meta, lipSync: false } }, catalog).ok);
  assert.ok(!validate({ ...s, meta: { ...s.meta, lipSync: "yes" } }, catalog).ok);
});
