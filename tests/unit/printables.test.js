// The printables set and its manifest (docs/PRINTABLES_SPEC.md): the item list is valid, deterministic and covers
// every grade and strand; the manifest builder ranks, versions and counts. No canvas: printing is the tool's job.
import { test } from "node:test";
import assert from "node:assert/strict";
import { workbookCatalogSync } from "../../catalog/index.js";
import { validate } from "../../engine/index.js";
import { printablesSet, FEATURED, seedOf } from "../../tools/lib/printables_set.mjs";
import { buildManifest, buildVersion, activitiesOf, gradeTag, CATEGORIES, GRADE_ORDER, TYPE_OF_ACTIVITY, MANIFEST_SCHEMA } from "../../tools/lib/printables_manifest.mjs";

const catalog = workbookCatalogSync();
const set = printablesSet(catalog);

/** A fake item and its files, for the manifest builder. */
const fake = (id, category, grade, activity = "maze", hash = `h-${id}`) => ({
  item: { id, title: id, description: `About ${id}.`, category, strand: CATEGORIES.find((c) => c.id === category).strands[0], grade, skills: [], tags: ["t"], keywords: ["a", "b"],
    script: { documents: [{ id: "student", pages: [{ id: "p1", blocks: [{ activity }] }] }, { id: "answers", answersFor: "student" }] } },
  files: { pdf: `${category}/${id}.pdf`, pdfBytes: 1000, pages: 1, key: activity === "maze" ? `${category}/${id}-answers.pdf` : null, keyBytes: 900, keyPages: 1, thumb: `thumbs/${id}.webp`, thumbW: 240, thumbH: 311, hash },
});

test("item ids are unique, carry the grade and match the folder rules", () => {
  const ids = set.map((it) => it.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const it of set) {
    assert.match(it.id, /^(prek|k|g[1-5])-[a-z0-9]+(-[a-z0-9]+)*$/, it.id);
    assert.ok(it.id.startsWith(`${gradeTag(it.grade)}-`), it.id);
    assert.ok(CATEGORIES.some((c) => c.id === it.category && c.strands.includes(it.strand)), `${it.id}: ${it.category}/${it.strand}`);
    assert.ok(it.title.length <= 40 && it.description.length > 10, it.id);
  }
});

test("every item validates with no errors or warnings and has 1-4 pages", () => {
  for (const it of set) {
    const r = validate(it.script, catalog);
    assert.deepEqual([...r.errors, ...r.warnings].map((i) => `${i.code} ${i.path}`), [], it.id);
    const pages = it.script.documents[0].pages.length;
    assert.ok(pages >= 1 && pages <= 4, `${it.id}: ${pages} pages`);
    for (const a of activitiesOf(it.script)) assert.ok(TYPE_OF_ACTIVITY[a], `${it.id}: ${a} has a type`);
  }
});

test("the set is deterministic and names known skills", () => {
  assert.deepEqual(printablesSet(catalog), set);
  assert.equal(seedOf("k-letter-a"), seedOf("k-letter-a"));
  assert.notEqual(seedOf("k-letter-a"), seedOf("k-letter-b"));
  const skills = catalog.education.skills.skills;
  for (const it of set) for (const s of it.skills) assert.ok(skills[s], `${it.id}: unknown skill ${s}`);
});

test("every skill is practised, and every strand with skills at a grade has items at that grade", () => {
  const skills = catalog.education.skills.skills;
  const practised = new Set(set.flatMap((it) => it.skills));
  for (const name of Object.keys(skills)) assert.ok(practised.has(name), `skill ${name} has no printable`);
  for (const k of Object.values(skills)) assert.ok(set.some((it) => it.strand === k.strand && it.grade === k.grade), `${k.strand} at ${k.grade}`);
  for (const c of CATEGORIES) for (const g of GRADE_ORDER) {
    if (g === "prek" && c.id === "grammar") continue; // the skills map has no pre-K grammar
    assert.ok(set.some((it) => it.category === c.id && it.grade === g), `${c.id} at ${g}`);
  }
});

test("the featured list names items in the set", () => {
  const ids = new Set(set.map((it) => it.id));
  for (const id of FEATURED) assert.ok(ids.has(id), id);
  assert.equal(new Set(FEATURED).size, FEATURED.length);
});

test("the manifest lists every item with its files, sorted by rank", () => {
  const entries = [fake("k-a", "math", "k"), fake("g1-b", "logic", "1", "choose"), fake("g2-c", "art", "2", "colour_page"), fake("prek-d", "math", "prek", "count")];
  const m = buildManifest(entries, { featured: ["g2-c"] });
  assert.equal(m.schema, MANIFEST_SCHEMA);
  assert.equal(m.count, 4);
  assert.deepEqual(m.items.map((it) => it.rank), [1, 2, 3, 4]);
  assert.equal(m.items[0].id, "g2-c");
  assert.deepEqual(m.items.map((it) => it.featured), [true, false, false, false]);
  const a = m.items.find((it) => it.id === "k-a");
  assert.deepEqual(Object.keys(a), ["id", "title", "description", "category", "strand", "grade", "skills", "types", "tags", "keywords", "pages", "pdf", "pdfBytes",
    "answerKey", "answerKeyPages", "answerKeyBytes", "thumb", "thumbW", "thumbH", "rank", "featured", "version", "hash"]);
  assert.equal(a.answerKey, "math/k-a-answers.pdf");
  assert.deepEqual(a.types, ["maze"]);
  assert.equal(a.keywords, "a b");
  const b = m.items.find((it) => it.id === "g1-b");
  assert.equal(b.answerKey, null);
  assert.equal(b.answerKeyBytes, 0);
  assert.equal(m.totalBytes, 4 * 1000 + 900);
  assert.equal(m.grades.find((g) => g.id === "k").count, 1);
  assert.equal(m.categories.find((c) => c.id === "math").count, 2);
  assert.equal(m.types.find((t) => t.id === "quiz").count, 1);
});

test("ranks after the featured list take the categories in turn", () => {
  const entries = [fake("k-m1", "math", "k"), fake("k-m2", "math", "k"), fake("k-m3", "math", "k"), fake("k-l1", "logic", "k"), fake("k-l2", "logic", "k")];
  const m = buildManifest(entries, {});
  assert.deepEqual(m.items.map((it) => it.category), ["math", "logic", "math", "logic", "math"]);
  // Within a category: the type weight first (tracing before quiz), then the grade.
  const w = buildManifest([fake("k-q", "math", "k", "choose"), fake("g2-t", "math", "2", "trace_letters"), fake("prek-t", "math", "prek", "trace_letters")], {});
  assert.deepEqual(w.items.map((it) => it.id), ["prek-t", "g2-t", "k-q"]);
});

test("item versions start at 1 and grow only when the files change", () => {
  const first = buildManifest([fake("k-a", "math", "k"), fake("k-b", "math", "k")], {});
  assert.deepEqual(first.items.map((it) => it.version), [1, 1]);
  const again = buildManifest([fake("k-a", "math", "k"), fake("k-b", "math", "k")], { previous: first });
  assert.deepEqual(again.items.map((it) => it.version), [1, 1]);
  assert.equal(again.version, first.version);
  const changed = buildManifest([fake("k-a", "math", "k", "maze", "new"), fake("k-b", "math", "k")], { previous: again });
  assert.equal(changed.items.find((it) => it.id === "k-a").version, 2);
  assert.equal(changed.items.find((it) => it.id === "k-b").version, 1);
  assert.notEqual(changed.version, first.version);
  assert.match(changed.version, /^[0-9a-f]{8}$/);
  assert.equal(buildVersion([{ id: "x", hash: "1" }, { id: "y", hash: "2" }]), buildVersion([{ id: "y", hash: "2" }, { id: "x", hash: "1" }]));
});

test("the manifest refuses duplicate ids, unknown categories and unknown grades", () => {
  assert.throws(() => buildManifest([fake("k-a", "math", "k"), fake("k-a", "logic", "k")]), /duplicate/);
  const bad = fake("k-a", "math", "k");
  bad.item.category = "cooking";
  assert.throws(() => buildManifest([bad]), /unknown category/);
  const g = fake("k-a", "math", "k");
  g.item.grade = "6";
  assert.throws(() => buildManifest([g]), /unknown grade/);
});

test("the featured count caps the featured flags", () => {
  const entries = ["a", "b", "c"].map((x) => fake(`k-${x}`, "math", "k"));
  const m = buildManifest(entries, { featured: ["k-c", "k-b", "k-a", "k-zz"], featuredCount: 2 });
  assert.deepEqual(m.items.filter((it) => it.featured).map((it) => it.id), ["k-c", "k-b"]);
});
