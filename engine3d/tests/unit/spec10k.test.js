// engine3d/tools/spec10k.mjs: the 10K spec schema, retention rules, allocation, dedupe and reports.
// Uses a small programme built in a temp folder, so it never needs the external disk.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateSchema } from "../../tools/lib/spec10k/jsonschema.mjs";
import { retentionErrors, validateSpec, impliedFeatures } from "../../tools/lib/spec10k/rules.mjs";
import { BANDS, buildSlotIndex, loadProgramme, parseSlots, splitId } from "../../tools/lib/spec10k/load.mjs";
import { findDuplicates, sameDistinctBy, specRecord, stem, tokens } from "../../tools/lib/spec10k/dedupe.mjs";
import { allocationErrors, freezeSlots, replaceBlock } from "../../tools/lib/spec10k/alloc.mjs";
import { aggregateNeeds, coverage, bandIndexMd } from "../../tools/lib/spec10k/reports.mjs";
import { usEnglishIssues } from "../../tools/lib/spec10k/usenglish.mjs";
import { batchBriefMd, nextSlots, statusMd } from "../../tools/lib/spec10k/batch.mjs";

const schema = JSON.parse(readFileSync(new URL("../../tools/lib/spec10k/spec.schema.json", import.meta.url), "utf8"));
const example = JSON.parse(readFileSync(new URL("../fixtures/spec10k/kg0101.json", import.meta.url), "utf8"));
const clone = (x) => structuredClone(x);
const TOOL = fileURLToPath(new URL("../../tools/spec10k.mjs", import.meta.url));

const SERIES = {
  features: { hook: "", tracker: "", progress: "", timer_ring: "", challenge: "", keyword: "", call: "" },
  featureAliases: { progress_tracker: "tracker" },
  interactionTypes: {},
  series: {
    counting_parade: { bands: ["pk", "kg"], subjects: ["math"], magic: ["firefly_count"], mechanics: [] },
    peekaboo_world: { bands: ["bb"], subjects: ["ela"], magic: ["peekaboo_pop"], mechanics: [] },
  },
  magic: { firefly_count: "x", peekaboo_pop: "x", confetti_shower_soft: "x" },
};

/** Eight bands; kg has one math strand of 3 and one ela strand of 2, the others 1 video each. */
function bandsJson() {
  const bands = {};
  for (const b of BANDS) bands[b] = { name: b, ages: "x", total: 1, lengthS: [90, 720], why: "", framework: "", host: "", sidekick: "", voice: "", music: "", subjects: { math: { budget: 1, label: "Math", strands: { s: 1 } } } };
  bands.kg = { ...bands.kg, total: 5, lengthS: [210, 420], subjects: { math: { budget: 3, label: "Math", strands: { CC_counting_cardinality: 3 } }, ela: { budget: 2, label: "ELA", strands: { RF: 2 } } } };
  return { total: 12, bands };
}
const kgRows = () => [
  { key: "kg.math.cc.b5", subject: "math", strand: "CC_counting_cardinality", standards: ["K.CC.B.5"], text: "How many, up to 20 / 10 scattered.", count: 3, series: ["counting_parade"], variants: ["line", "scattered"] },
  { key: "kg.ela.rf.3a", subject: "ela", strand: "RF", standards: ["RF.K.3a"], text: "Letter sounds.", count: 2, series: [] },
];

function programme(rows = kgRows()) {
  const allocation = Object.fromEntries(BANDS.map((b) => [b, { band: b, rows: [] }]));
  for (const b of BANDS) if (b !== "kg") allocation[b].rows = [{ key: `${b}.m`, subject: "math", strand: "s", standards: ["XX"], text: "x", count: 1 }];
  allocation.kg.rows = rows;
  for (const b of BANDS) freezeSlots(allocation[b]);
  return { bands: bandsJson(), series: SERIES, allocation, slotIndex: buildSlotIndex(allocation) };
}

const names = {
  characters: new Set(["robot", "bunny", "duck"]), props: new Set(["jar", "flower", "fence", "table"]), stages: new Set(["night"]),
  features: new Set(["hook", "tracker", "progress", "keyword", "challenge", "timer_ring", "call", "number_block", "path", "progress_tracker"]),
  aliases: { progress_tracker: "tracker" },
  sounds: new Set(["pop", "ding", "boing", "whoosh", "sparkle"]), skills: new Set(["count_to_10_k"]),
};

test("the filled example passes schema, retention, allocation and catalog checks", () => {
  const r = validateSpec(example, { schema, programme: programme(), names, file: "/x/kg0101.json" });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});

test("schema errors (table)", () => {
  const cases = [
    ["missing field", (s) => { delete s.hook; }, /missing required field "hook"/],
    ["bad id", (s) => { s.id = "k0101"; }, /does not match/],
    ["bad subject", (s) => { s.subject = "maths"; }, /must be one of/],
    ["unknown field", (s) => { s.extra = 1; }, /unknown field "extra"/],
    ["thumbnail title too long", (s) => { s.thumbnails[0].title_text = "A VERY LONG TITLE TEXT"; }, /longer than 18/],
    ["difficulty out of range", (s) => { s.distinct_by.difficulty = 6; }, /above the maximum 5/],
    ["new need without description", (s) => { s.needs.props.push({ name: "new:thing" }); }, /missing required field "description"/],
    ["need with bad name", (s) => { s.needs.props.push("Big Jar"); }, /does not match/],
    ["too few scenes", (s) => { s.scenes = s.scenes.slice(0, 2); }, /at least 3 items/],
    ["wrong schema tag", (s) => { s.schema = "v2"; }, /must be "toybox-10k-spec\/1"/],
  ];
  for (const [name, mutate, re] of cases) {
    const s = clone(example);
    mutate(s);
    const errs = validateSchema(schema, s);
    assert.ok(errs.some((e) => re.test(e)), `${name}: ${errs.join("; ")}`);
  }
});

test("retention and timing rules (table)", () => {
  const cases = [
    ["hook over 8 s", (s) => { s.hook.duration_s = 9; }, /hook.duration_s 9 > 8/],
    ["gap over 15 s", (s) => { s.interactions = s.interactions.filter((x) => x.t !== 152); }, /interaction gap 25 s between t=140 and t=165/],
    ["first prompt late", (s) => { s.interactions = s.interactions.filter((x) => x.t > 15); }, /first interaction at 18 s/],
    ["silent ending", (s) => { s.interactions = s.interactions.filter((x) => x.t < 270); }, /leaves 34 s with no prompt/],
    ["out of order", (s) => { [s.interactions[1], s.interactions[2]] = [s.interactions[2], s.interactions[1]]; }, /time order/],
    ["late tease", (s) => { s.progress_tracker.tease_t = 61; }, /tease the final surprise early/],
    ["labels vs steps", (s) => { s.progress_tracker.steps = 6; }, /5 labels for 6 steps/],
    ["scene gap", (s) => { s.scenes[2].start_s = 80; }, /starts at 80 s, expected 75 s/],
    ["short chapter", (s) => { s.scenes[5].dur_s = 8; s.scenes[6].start_s = 248; s.scenes[6].dur_s = 52; }, /YouTube chapters need at least 10 s/],
    ["length mismatch", (s) => { s.target_length_s = 320; }, /add up to 300 s but target_length_s is 320/],
    ["early recap", (s) => { s.recap.t = 100; }, /recap.t 100 s is too early/],
    ["first scene not hook", (s) => { s.scenes[0].purpose = "teach"; }, /purpose "hook"/],
  ];
  assert.deepEqual(retentionErrors(example), []);
  for (const [name, mutate, re] of cases) {
    const s = clone(example);
    mutate(s);
    const errs = retentionErrors(s);
    assert.ok(errs.some((e) => re.test(e)), `${name}: ${errs.join("; ")}`);
  }
});

test("allocation, band, series and catalog rules (table)", () => {
  const p = programme();
  const cases = [
    ["slot outside rows", (s) => { s.id = "kg0190"; }, "/x/kg0190.json", /not inside any allocation row/],
    ["subject of another row", (s) => { s.id = "kg0104"; }, "/x/kg0104.json", /belongs to subject ela/],
    ["standard not in row", (s) => { s.standards = ["K.CC.A.1"]; }, null, /include none of row kg.math.cc.b5/],
    ["file name", () => {}, "/x/other.json", /file name must be kg0101.json/],
    ["length outside band", (s) => { s.target_length_s = 430; s.scenes[6].dur_s += 130; }, null, /outside the kg range 210-420/],
    ["series not for band", (s) => { s.series = "peekaboo_world"; }, null, /not a kg series/],
    ["unknown magic", (s) => { s.magical_moment.id = "big_bang"; }, null, /not in the library/],
    ["unknown catalog prop", (s) => { s.needs.props.push("spaceship"); }, null, /"spaceship" is not in the catalog/],
    ["cast not in needs", (s) => { s.cast.push({ who: "duck", role: "guest who quacks" }); }, null, /cast "duck" is missing/],
    ["scene character not in needs", (s) => { s.scenes[1].characters.push("duck"); }, null, /uses "duck"/],
    ["unknown skill", (s) => { s.skills = ["nope_k"]; }, null, /skills: "nope_k"/],
    ["banned word", (s) => { s.story.problem = "There was blood on the fence."; }, null, /banned word "blood"/],
    ["too few check questions", (s) => { s.check.questions = s.check.questions.slice(0, 2); }, null, /at least 3 questions/],
  ];
  for (const [name, mutate, file, re] of cases) {
    const s = clone(example);
    mutate(s);
    const r = validateSpec(s, { schema, programme: p, names, file: file ?? `/x/${s.id}.json` });
    assert.ok(r.errors.some((e) => re.test(e)), `${name}: ${r.errors.join("; ")}`);
  }
});

test("blood is allowed only in grade 3-5 science and health", () => {
  const s = clone(example);
  Object.assign(s, { id: "g40101", band: "g4", subject: "science", strand: "s", standards: ["XX"], series: "counting_parade" });
  s.story.problem = "Blood carries oxygen from the lungs to the body.";
  const ctx = { schema, names, file: "/x/g40101.json" };
  assert.ok(!validateSpec(s, ctx).errors.some((e) => /banned word "blood"/.test(e)));
  s.subject = "ela";
  assert.ok(validateSpec(s, ctx).errors.some((e) => /banned word "blood"/.test(e)));
});

test("babies: no timers, no tests, no confetti", () => {
  const s = clone(example);
  Object.assign(s, { id: "bb0101", band: "bb", subject: "math", strand: "s", standards: ["XX"], series: "peekaboo_world", target_length_s: 300 });
  s.check.questions = s.check.questions.slice(0, 1);
  s.magical_moment.id = "confetti_shower_soft";
  const r = validateSpec(s, { schema, programme: programme(), names, file: "/x/bb0101.json" });
  assert.ok(r.errors.some((e) => /no "point_before_timer"/.test(e)));
  assert.ok(r.errors.some((e) => /no "spot_mistake"/.test(e)));
  assert.ok(r.errors.some((e) => /too loud or fast/.test(e)));
  assert.ok(!r.errors.some((e) => /check needs/.test(e)));
});

test("ids and slots", () => {
  assert.deepEqual(splitId("g30456"), { band: "g3", slot: 456 });
  assert.equal(splitId("g101"), null);
  assert.deepEqual(parseSlots("0101-0112"), [101, 112]);
  assert.equal(parseSlots("101-112"), null);
});

test("allocation checks and slot freezing", () => {
  const p = programme();
  assert.deepEqual(allocationErrors(p), []);
  assert.equal(p.allocation.kg.rows[0].slots, "0101-0103");
  assert.equal(p.allocation.kg.rows[1].slots, "0104-0105");
  const bad = programme([{ ...kgRows()[0], count: 2 }, { ...kgRows()[1], strand: "XX" }]);
  const errs = allocationErrors(bad);
  assert.ok(errs.some((e) => /CC_counting_cardinality: rows add up to 2, budget is 3/.test(e)), errs.join("; "));
  assert.ok(errs.some((e) => /strand XX is not a ela strand/.test(e)));
  const gap = programme();
  gap.allocation.kg.rows[1].slots = "0105-0106";
  assert.ok(allocationErrors(gap).some((e) => /expected 0104/.test(e)));
  // Frozen rows keep their range; new rows continue after the last one.
  const a = { rows: [{ count: 2, slots: "0101-0102" }, { count: 3 }] };
  assert.equal(freezeSlots(a), 1);
  assert.equal(a.rows[1].slots, "0103-0105");
  assert.equal(replaceBlock("a <!-- x:start -->old<!-- x:end --> b", "x", "new"), "a <!-- x:start -->\nnew\n<!-- x:end --> b");
});

test("text normalisation", () => {
  assert.deepEqual(tokens("The Fireflies' Counting-Party!"), ["firefly", "count", "party"]);
  assert.equal(stem("boxes"), "box");
  assert.equal(stem("glass"), "glass");
});

test("dedupe: exact, near, series stems and re-skins", () => {
  const rec = (id, title, story = "", objective = "", hook = "", source = "spec") => ({ id, source, fields: { title, story, objective, hook } });
  const letters = "bcdfghjklmnpqrstvwxz".split("").map((l, i) => rec(`pk${String(101 + i).padStart(4, "0")}`, `Alphabet Train: Letter ${l.toUpperCase()} Finds a ${["Hat", "Map", "Kite", "Drum", "Boat"][i % 5]}`));
  const records = [
    ...letters,
    rec("kg0101", "Firefly Count!", "Bunny hosts a night garden party and the fireflies are the lights."),
    rec("kg0150", "firefly count", "Robo builds a sandcastle at the beach and counts the shells."),
    rec("g10120", "Pond Splash Count", "Bunny hosts a night garden party where the fireflies are the party lights."),
    rec("pk07", "Five Senses Detectives", "", "", "", "existing"),
    rec("pk07~yt", "Five Senses Detectives", "", "", "", "existing"),
    rec("pk0300", "The Five Senses Detectives"),
  ];
  const d = findDuplicates(records);
  const has = (field, a, b, kind) => d.some((x) => x.field === field && ((x.a === a && x.b === b) || (x.a === b && x.b === a)) && (!kind || x.kind === kind));
  assert.ok(has("title", "kg0101", "kg0150", "exact"));
  assert.ok(has("title", "pk0300", "pk07", "exact"));
  assert.ok(!has("title", "pk07", "pk07~yt"), "existing vs existing is not reported");
  assert.ok(has("story", "kg0101", "g10120", "near"));
  assert.ok(!has("story", "kg0101", "kg0150"));
  assert.ok(!d.some((x) => x.a.startsWith("pk01") && x.b.startsWith("pk01") && x.field === "title"), "letters of one series are not duplicates");
  // The allow list silences a reviewed pair.
  assert.ok(!findDuplicates(records, { allow: [{ a: "g10120", b: "kg0101", field: "story" }] }).some((x) => x.field === "story" && x.a === "g10120"));
  const s1 = clone(example), s2 = clone(example);
  s2.id = "kg0102";
  assert.equal(sameDistinctBy([s1, s2]).length, 1);
  s2.distinct_by.difficulty = 3;
  assert.equal(sameDistinctBy([s1, s2]).length, 0);
  assert.equal(specRecord(example).fields.title, "Firefly Count!");
});

test("coverage, needs and index", () => {
  const p = programme();
  const s2 = { ...clone(example), id: "kg0199" };
  const c = coverage(p, [example, s2]);
  assert.equal(c.bands.kg.written, 1);
  assert.equal(c.bands.kg.rows[0].ids[0], "kg0101");
  assert.deepEqual(c.stray, ["kg0199"]);
  const n = aggregateNeeds([example, { ...clone(example), id: "kg0102" }]);
  assert.equal(n.new.characters.find((x) => x.name === "firefly").count, 2);
  assert.equal(n.new.props.find((x) => x.name === "lantern_ten_frame").count, 2);
  assert.equal(n.existing.features.find((x) => x.name === "timer_ring").count, 2);
  assert.ok(impliedFeatures(example).includes("call"));
  const old = clone(example);
  old.needs.features = ["progress_tracker"];
  assert.equal(aggregateNeeds([old]).existing.features.find((x) => x.name === "tracker").count, 1, "aliases count under the stable name");
  assert.match(validateSpec(old, { schema, names }).warnings[0], /use the retention-kit name "tracker"/);
  assert.match(bandIndexMd(p, "kg", [example]), /\| \[kg0101\]\(kg0101.json\) \| Firefly Count! \|/);
});

test("CLI: validate and plan against a programme folder", () => {
  const root = mkdtempSync(join(tmpdir(), "spec10k-"));
  mkdirSync(join(root, "allocation"));
  mkdirSync(join(root, "schema"));
  mkdirSync(join(root, "specs", "kg"), { recursive: true });
  const p = programme();
  writeFileSync(join(root, "allocation", "bands.json"), JSON.stringify(p.bands));
  writeFileSync(join(root, "allocation", "series.json"), JSON.stringify({ ...SERIES, series: { counting_parade: { ...SERIES.series.counting_parade, name: "x", format: "", tracker: "" } } }));
  for (const b of BANDS) writeFileSync(join(root, "allocation", `${b}.json`), JSON.stringify(p.allocation[b]));
  writeFileSync(join(root, "PLAN.md"), "# P\n<!-- summary:start -->\n<!-- summary:end -->\n<!-- bands:start -->\n<!-- bands:end -->\n");
  writeFileSync(join(root, "specs", "kg", "kg0101.json"), JSON.stringify(example));
  const run = (...a) => spawnSync(process.execPath, [TOOL, ...a, "--root", root], { encoding: "utf8" });
  const v = run("validate");
  assert.equal(v.status, 0, v.stdout + v.stderr);
  assert.match(v.stdout, /1 specs, 0 with errors/);
  const pl = run("plan");
  assert.equal(pl.status, 0, pl.stdout + pl.stderr);
  const plan = readFileSync(join(root, "PLAN.md"), "utf8");
  assert.match(plan, /\| \*\*kg\*\* kg \| x \| 5 \|/);
  assert.match(plan, /2 standard rows, slots kg0101-kg0105/);
  assert.deepEqual(loadProgramme(root).allocation.kg.rows[0].slots, "0101-0103");
  const bad = clone(example);
  bad.hook.duration_s = 12;
  writeFileSync(join(root, "specs", "kg", "kg0101.json"), JSON.stringify(bad));
  const v2 = run("validate");
  assert.equal(v2.status, 1);
  assert.match(v2.stdout, /hook.duration_s 12 > 8/);
});

test("batches: next free slots, brief with siblings, status", () => {
  const p = programme();
  const slots = nextSlots(p, "kg", new Set(["kg0101"]), 3);
  assert.deepEqual(slots.map((x) => x.id), ["kg0102", "kg0103", "kg0104"]);
  assert.equal(slots[2].row.key, "kg.ela.rf.3a");
  const md = batchBriefMd(p, "kg", slots, [example], "kg-001");
  assert.match(md, /Write exactly these ids.*kg0102, kg0103, kg0104/);
  assert.match(md, /\| kg0101 \| Firefly Count! \|/);
  assert.match(md, /Nothing written in this row yet/);
  assert.equal(nextSlots(p, "kg", new Set(["kg0101", "kg0102", "kg0103", "kg0104", "kg0105"]), 3).length, 0);
  const st = statusMd(p, coverage(p, [example]), aggregateNeeds([example]), { invalid: 0, dups: 0, when: "now" });
  assert.match(st, /\| kg kg \| 1 \| 5 \|/);
  assert.match(st, /`lantern_ten_frame` \(1\)/);
});

test("US English lint (table)", () => {
  const cases = [
    // [field mutation, expected error word or null, expected warning word or null]
    [(s) => { s.title = "Colour Count!"; }, "colour", null],
    [(s) => { s.objective = "I can organise grey blocks in the centre of my favourite rug."; }, "organise", null],
    [(s) => { s.story.premise = "Mum takes Baby Bear to the theatre."; }, "mum", null],
    [(s) => { s.recap.points[0] = "Practise maths every day."; }, "maths", null],
    [(s) => { s.check.questions[0].q = "Which shapes are labelled?"; }, "labelled", null],
    [(s) => { s.needs.props.push({ name: "new:mummy_bear", description: "The mother bear of the Bear family." }); }, null, "mummy"],
    [(s) => { s.needs.props.push({ name: "new:pyjamas", description: "Striped sleep clothes for Baby Bear." }); }, "pyjamas", null],
    [(s) => { s.hook.line = "Put a full stop at the end!"; }, null, "full stop"],
    [(s) => { s.scenes[1].visuals = "Bunny puts on her jumper and trousers by the cot."; }, null, "jumper"],
    [(s) => { s.scenes[1].purpose = "practise"; }, null, null],
    [(s) => { s.needs.props.push("metre_stick"); }, null, null],
    [(s) => { s.title = "Color, Gray and Center Fun"; }, null, null],
  ];
  for (const [mutate, err, warn] of cases) {
    const s = clone(example);
    mutate(s);
    const r = usEnglishIssues(s);
    if (err) assert.ok(r.errors.some((e) => e.includes(`"${err}"`)), `expected error ${err}: ${r.errors.join("; ")}`);
    else assert.deepEqual(r.errors, [], `unexpected errors: ${r.errors.join("; ")}`);
    if (warn) assert.ok(r.warnings.some((w) => w.includes(`"${warn}"`)), `expected warning ${warn}: ${r.warnings.join("; ")}`);
    else if (!err) assert.deepEqual(r.warnings, [], `unexpected warnings: ${r.warnings.join("; ")}`);
  }
});
