// Showcase page data (CATALOG_SPEC 8, 11): every catalog section has cards, every entry is on the page,
// deep links are unique, every preview script validates, and a new catalog entry appears with no code change.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { buildSections, SECTION_IDS } from "../../web/lib/showcase_data.js";
import { validate } from "../../engine/index.js";

const read = (p) => JSON.parse(readFileSync(new URL(`../../catalog/generated/${p}`, import.meta.url), "utf8"));
const FULL = read("catalog.json");
const VOCAB = read("engine_vocab.json");
const SECTIONS = buildSections(FULL, VOCAB);
const ids = (id) => new Set(SECTIONS.find((s) => s.id === id).cards.map((c) => c.id));

test("every section from the spec has a renderer and cards", () => {
  assert.deepEqual(SECTIONS.map((s) => s.id), SECTION_IDS);
  for (const s of SECTIONS) {
    assert.ok(s.title && s.intro, s.id);
    assert.ok(s.cards.length > 0, `${s.id} has no cards`);
    for (const c of s.cards) assert.ok(c.name && c.description && Array.isArray(c.tags) && c.copy !== undefined, `${s.id}/${c.id}`);
  }
});

test("every catalog entry has a card", () => {
  const c = FULL.catalog;
  const expect = {
    characters: [...c.bodyNames.map((b) => `body-${b}`), ...FULL.presets.map((p) => p.id)],
    looks: ["eyes", "brows", "mouthStyle", "hair", "outfit", "accessories"].flatMap((k) => c.appearance[k].map((n) => `${k}-${n}`)),
    faces: c.faceNames,
    moves: c.moves.filter((m) => !m.flags?.partner).map((m) => m.name),
    effects: [...c.fxNames, ...["shake", "slowmo", "flash", "fade", "text_pop", "caption"].map((n) => `world-${n}`)],
    sounds: c.sfxKeys,
    places: [...c.themeNames, ...FULL.ambience.map((a) => `ambience-${a.name}`)],
    objects: [...Object.keys(c.objects), ...Object.keys(c.props).map((p) => `prop-${p}`)],
    activities: c.activityNames,
    macros: Object.keys(VOCAB.macroParams),
    camera: [...VOCAB.enums.cameraMode, ...VOCAB.enums.transition.map((t) => `transition-${t}`), ...VOCAB.enums.cardKind.map((k) => `card-${k}`)],
    music: Object.keys(c.musicMoods),
    examples: FULL.examples.map((e) => e.path.replace(/\.json$/, "").replace("/", "-")),
    rules: VOCAB.codes,
  };
  for (const [section, names] of Object.entries(expect)) {
    const have = ids(section);
    for (const n of names) assert.ok(have.has(n), `${section}: no card for ${n}`);
  }
  const world = SECTIONS.flatMap((s) => s.cards.filter((x) => x.id.startsWith("world-")).map((x) => x.id.slice(6)));
  assert.deepEqual(new Set(world), new Set(Object.keys(VOCAB.worldCommands)), "every world command is shown once");
  assert.equal(world.length, new Set(world).size);
});

test("deep links: card ids are unique within each section and safe in a URL hash", () => {
  for (const s of SECTIONS) {
    const seen = new Set();
    for (const c of s.cards) {
      assert.ok(!seen.has(c.id), `${s.id}/${c.id} twice`);
      assert.match(c.id, /^[a-z0-9_-]+$/i, `${s.id}/${c.id}`);
      seen.add(c.id);
    }
  }
});

test("every preview script validates, on every body plan", () => {
  for (const body of FULL.catalog.bodyNames) {
    const look = { body, color: "#2f7fd9" };
    for (const s of SECTIONS) {
      for (const c of s.cards) {
        if (!c.script) continue;
        const r = validate(c.script(look, s.options ? { time: "night", weather: "rain" } : {}), FULL.catalog);
        assert.deepEqual(r.errors.map((e) => `${e.code} ${e.path} ${e.message}`), [], `${s.id}/${c.id} on ${body}`);
      }
    }
  }
});

test("sounds and examples point at files the repository has or makes", () => {
  for (const c of SECTIONS.find((s) => s.id === "examples").cards) assert.ok(existsSync(new URL(`../../catalog/examples/${c.example}`, import.meta.url)), c.example);
  for (const c of SECTIONS.find((s) => s.id === "sounds").cards) assert.match(c.audio, /^\.\.\/assets\/sfx\/generated\/[a-z_]+\.wav$/);
  for (const c of SECTIONS.find((s) => s.id === "music").cards) assert.match(c.audio, /^\.\.\/out\/catalog_media\/moods\/[a-z_]+\.wav$/);
});

test("a new catalog entry appears with no page change", () => {
  const full = structuredClone(FULL);
  const wave = full.catalog.moves.find((m) => m.name === "wave");
  full.catalog.moves.push({ ...structuredClone(wave), name: "wave_big", description: "A big wave with both arms.", tags: ["emote", "test"] });
  full.catalog.themes.test_stage = { ...structuredClone(full.catalog.themes.white_stage), description: "A test stage.", tags: ["test"] };
  full.catalog.themeNames.push("test_stage");
  full.presets.push({ ...structuredClone(full.presets[0]), id: "zed", name: "Zed" });
  const sections = buildSections(full, VOCAB);
  const card = (s, id) => sections.find((x) => x.id === s).cards.find((c) => c.id === id);
  for (const [s, id] of [["moves", "wave_big"], ["places", "test_stage"], ["characters", "zed"]]) {
    assert.ok(card(s, id), `${s}/${id}`);
    assert.deepEqual(validate(card(s, id).script({ body: "kid", color: "#c2185b" }), full.catalog).errors, [], `${s}/${id}`);
  }
});

test("the old move catalog page sends visitors to the showcase", () => {
  const html = readFileSync(new URL("../../web/catalog.html", import.meta.url), "utf8");
  assert.match(html, /showcase\.html#moves/);
});
