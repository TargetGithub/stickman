// Authoring bundles (CATALOG_BUNDLE_SPEC B6): bundle.mjs new, the "make a bundle" prompt and its reply (the
// copy-paste flow, here with the offline mock reply), and drafts written into a bundle folder.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scaffoldBundle, addToBundle, writeReplyFiles, EXAMPLE } from "../../tools/lib/bundle_write.mjs";
import { makeBundlePrompt, mockBundleReply, KIND_FILES } from "../../tools/lib/bundle/prompt.mjs";
import { packBundleDir, readBundleDir, nodeContext } from "../../tools/lib/bundle_node.mjs";
import { checkBundle } from "../../tools/lib/bundle/check.mjs";
import { mockDraft, checkDraft } from "../../tools/lib/draft.mjs";
import { catalog } from "../../catalog/index.js";

const tmp = () => mkdtempSync(join(tmpdir(), "stickman-bundle-"));
const ctx = nodeContext();
const PATTERN = ctx.schemas["bundle.schema.json"].properties.files.items.properties.path.pattern;
const packAndCheck = (dir) => {
  const p = packBundleDir(dir);
  assert.deepEqual(p.issues, []);
  return checkBundle(readBundleDir(dir).entries, ctx);
};

test("the copy-paste flow: new, prompt, a reply (mock), pack: the bundle checks clean", () => {
  const dir = tmp();
  scaffoldBundle(dir, "hop_pals", { author: "Test Author" });
  const manifest = JSON.parse(readFileSync(join(dir, "bundle.json"), "utf8"));
  const prompt = makeBundlePrompt(manifest, "a happy hop", { schemas: ctx.schemas, header: "Use the Stickman catalog files attached to this project (catalog version 1-test)." });
  assert.match(prompt, /"hop_pals:<name>"/);
  assert.match(prompt, /"hash": "self"/);
  const { written, skipped } = writeReplyFiles(dir, mockBundleReply(manifest), PATTERN);
  assert.deepEqual(skipped, []);
  assert.ok(written.includes("moves/emotes.json"));
  const r = packAndCheck(dir);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.report.counts, { pose: 1, move: 1 });
  assert.ok(r.report.steps.filter((s) => s.step <= 12).every((s) => !s.skipped), "every step up to 12 ran");
  rmSync(dir, { recursive: true });
});

test("drafts written into a bundle folder (draft.mjs --write --bundle): namespaced, in the example, clean", () => {
  const dir = tmp();
  scaffoldBundle(dir, "draft_pals");
  for (const [kind, description] of [["object", "a red mailbox on a post"], ["move", "a little hop of joy with both arms up"], ["theme", "a quiet snowy park at night"]]) {
    const draft = mockDraft(kind, description, catalog);
    assert.deepEqual(checkDraft(kind, draft, catalog), [], kind);
    const r = addToBundle(dir, kind, draft.name, draft.entry, { description });
    assert.equal(r.name, `draft_pals:${draft.name}`);
    assert.ok(r.inExample, kind);
  }
  const story = JSON.parse(readFileSync(join(dir, EXAMPLE), "utf8")).story;
  assert.match(JSON.stringify(story), /draft_pals:/);
  const r = packAndCheck(dir);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(Object.keys(r.report.counts).sort(), ["move", "object", "theme"]);
  assert.throws(() => addToBundle(dir, "move", "draft_pals:x", { category: "defeat" }, { description: "a defeat move" }), /defeat moves stay built-in/);
  rmSync(dir, { recursive: true });
});

test("bundle.mjs new refuses reserved ids and an existing bundle", () => {
  const dir = tmp();
  assert.throws(() => scaffoldBundle(join(dir, "a"), "world"), /cannot be a bundle id/);
  assert.throws(() => scaffoldBundle(join(dir, "b"), "Bad-Id"), /cannot be a bundle id/);
  scaffoldBundle(join(dir, "c"), "fine_id");
  assert.throws(() => scaffoldBundle(join(dir, "c"), "fine_id"), /already holds a bundle/);
  rmSync(dir, { recursive: true });
});

test("the make-a-bundle prompt: lean, one keyframe example, only the schemas asked for", () => {
  const manifest = { id: "acme_pack", version: "0.1.0", audience: ["kids"] };
  const header = "Use the Stickman catalog files attached to this project (catalog version 1-test).";
  const text = makeBundlePrompt(manifest, "a robot that waves", { kinds: ["moves", "bodies"], schemas: ctx.schemas, header });
  assert.ok(text.startsWith(header));
  assert.ok(text.includes("moves.schema.json:") && text.includes("bodies.schema.json:") && text.includes("common.schema.json:"));
  assert.ok(!text.includes("themes.schema.json:"), "only the kinds asked for");
  assert.equal((text.match(/"keys":\[\{"t"/g) || []).length, 1, "one keyframe example");
  assert.match(text, /\{"files": \{"<path>"/);
  assert.ok(text.length < 30000, `${text.length} characters`);
  assert.throws(() => makeBundlePrompt(manifest, "x", { kinds: ["spells"], schemas: ctx.schemas, header }), /unknown kinds: spells/);
  assert.ok(makeBundlePrompt(manifest, "x", { kinds: Object.keys(KIND_FILES), schemas: ctx.schemas, header }).includes("music_moods.schema.json:"));
});

test("a reply's files: only bundle paths are written, and the manifest keeps its id and hashes for pack", () => {
  const dir = tmp();
  scaffoldBundle(dir, "safe_pack");
  const { written, skipped } = writeReplyFiles(dir, { files: { "../evil.json": {}, "assets/logo.svg": "x", "bundle.json": { id: "other", name: "Safe Pack", files: ["x"] }, "characters/faces.json": {} } }, PATTERN);
  assert.deepEqual(skipped, ["../evil.json", "assets/logo.svg"]);
  assert.deepEqual(written, ["bundle.json", "characters/faces.json"]);
  const m = JSON.parse(readFileSync(join(dir, "bundle.json"), "utf8"));
  assert.equal(m.id, "safe_pack");
  assert.equal(m.name, "Safe Pack");
  assert.deepEqual(m.files, []);
  rmSync(dir, { recursive: true });
});
