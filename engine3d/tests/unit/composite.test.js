import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { expandComposite, expandObjects } from "../../runtime/composite.js";
import { validateScript } from "../../runtime/validate.js";
import { compileScript } from "../../runtime/compile.js";

const catalog = loadCatalog3d();
const ids = (o) => expandComposite(o, catalog).objects.map((x) => x.id);

const cases = [
  { name: "picture card", o: { id: "c", kind: "card", text: "apple", picture: "apple" }, has: ["c", "c_rim", "c_back", "c_pic", "c_text"] },
  { name: "word tile grows with the word", o: { id: "t", kind: "card", style: "tile", text: "ship" }, has: ["t_back", "t_text"], check: (r) => assert.ok(r.objects.find((x) => x.id === "t_text").width > 0.4) },
  { name: "quote card has a tag and a pin", o: { id: "q", kind: "card", style: "quote", text: "The fog rolled in.", tag: "S3" }, has: ["q_tag", "q_pin"] },
  { name: "page numbers each line", o: { id: "p", kind: "page", title: "T", lines: ["One.", "Two.", "Three."] }, has: ["p_paper", "p_title", "p_l1", "p_l3", "p_n3", "p_spine"] },
  { name: "script page has no numbers", o: { id: "p", kind: "page", style: "script", lines: ["FOX: Hi."] }, lacks: ["p_n1"] },
  { name: "evidence board: six pins and sockets", o: { id: "b", kind: "board", labels: ["who", "what", "where", "when", "why", "how"] }, has: ["b_h6", "b_pin6", "b_s6_1", "b_leg3"] },
  { name: "columns: rows of sockets", o: { id: "b", kind: "board", layout: "columns", labels: ["A", "B"], rows: 2, easel: false }, has: ["b_s2_2", "b_div1"], lacks: ["b_leg1"] },
  { name: "venn: three regions", o: { id: "v", kind: "board", layout: "venn", labels: ["Frogs", "Toads"] }, has: ["v_ring1", "v_ring2", "v_s3_1"] },
  { name: "timeline: ticks", o: { id: "t", kind: "board", layout: "timeline", labels: ["a", "b", "c"] }, has: ["t_t3", "t_s3_1", "t_line"] },
];
for (const c of cases) {
  test(`composite: ${c.name}`, () => {
    const r = expandComposite(c.o, catalog);
    assert.deepEqual(r.errors, []);
    const list = r.objects.map((x) => x.id);
    for (const h of c.has ?? []) assert.ok(list.includes(h), `missing ${h}`);
    for (const h of c.lacks ?? []) assert.ok(!list.includes(h), `unexpected ${h}`);
    assert.equal(r.objects[0].kind, "group");
    for (const x of r.objects.slice(1)) assert.equal(x.parent, c.o.id);
    c.check?.(r);
  });
}

const bad = [
  { o: { id: "c", kind: "card" }, code: "E3D_REQUIRED" },
  { o: { id: "c", kind: "card", style: "fancy", text: "x" }, code: "E3D_STYLE" },
  { o: { id: "c", kind: "card", picture: "unicorn_xyz" }, code: "E3D_PICTURE" },
  { o: { id: "p", kind: "page", lines: [] }, code: "E3D_LINES" },
  { o: { id: "p", kind: "page", lines: ["a"], size: 1 }, code: "E3D_RANGE" },
  { o: { id: "b", kind: "board", labels: [] }, code: "E3D_LABELS" },
  { o: { id: "b", kind: "board", labels: ["a"], layout: "spiral" }, code: "E3D_LAYOUT" },
];
for (const b of bad) test(`composite error ${b.code} (${JSON.stringify(b.o).slice(0, 40)})`, () => assert.ok(expandComposite(b.o, catalog).errors.some((e) => e.code === b.code)));

test("composite: hud and hidden carry over; children share the HUD", () => {
  const r = expandComposite({ id: "c", kind: "card", text: "hi", hud: true, hidden: true }, catalog);
  assert.equal(r.objects[0].hidden, true);
  assert.ok(r.objects.every((x) => x.hud === true));
});

test("composite: expandObjects passes other objects through and warns on unknown fields", () => {
  const r = expandObjects([{ id: "a", kind: "shape", shape: "cube" }, { id: "c", kind: "card", text: "x", wobble: 1 }], catalog);
  assert.equal(r.objects[0].id, "a");
  assert.ok(r.errors.some((e) => e.warn && e.path === "objects[1].wobble"));
});

test("composite tour scripts validate and compile, pieces are targets", () => {
  for (const f of ["composite_tour", "composite_boards"]) {
    const s = JSON.parse(readFileSync(new URL(`../../scripts/tour/${f}.json`, import.meta.url), "utf8"));
    const v = validateScript(s, catalog);
    assert.deepEqual(v.errors, [], f);
    const plan = compileScript(s, { catalog });
    assert.ok(plan.objects.some((o) => o.id.endsWith("_s1_1")));
  }
  assert.ok(ids({ id: "x", kind: "card", text: "a" }).includes("x_text"));
});
