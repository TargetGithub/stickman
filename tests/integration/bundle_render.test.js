// Bundle render checks and the contact sheet with the real canvas backend (CATALOG_BUNDLE_SPEC 6.2 steps 12
// and 13, section 8; integration only).
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBackend } from "../../tools/lib/canvas.mjs";
import { checkBundle } from "../../tools/lib/bundle/check.mjs";
import { contactSheet } from "../../tools/lib/bundle/render.mjs";
import { catalogWithBundles } from "../../tools/lib/bundle/load.mjs";
import { readBundleDir, nodeContext } from "../../tools/lib/bundle_node.mjs";
import { catalog as base } from "../../catalog/index.js";

const backend = await loadBackend();
const io = { createCanvas: backend.createCanvas, now: () => performance.now() };
const dir = new URL("../fixtures/bundles/robo_pals", import.meta.url).pathname;

test("robo_pals passes the render checks: pixel hashes in both orders, render smoke, frame budget", () => {
  const r = checkBundle(readBundleDir(dir).entries, { ...nodeContext(), render: io });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings.map((w) => w.code), ["W_BUNDLE_UNREVIEWED"]);
  assert.ok(r.report.fullyChecked);
  assert.deepEqual(Object.keys(r.report.frameMs).sort(), ["body robo_pals:boxbot", "example stories/bolt_dances.json", "move robo_pals:robot_dance", "object robo_pals:charging_pad"]);
});

test("the contact sheet shows every entry", () => {
  const r = checkBundle(readBundleDir(dir).entries, { ...nodeContext(), determinism: false });
  const merged = catalogWithBundles(base, [r.bundle]);
  const canvas = contactSheet(r.bundle.files, merged, io, { title: "robo_pals", pins: merged.bundles.map(({ id, version, hash }) => ({ id, version, hash })) });
  assert.equal(canvas.width, 4 * 384);
  assert.ok(canvas.height > 3 * 216, `${canvas.height}`);
  const px = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let dark = 0;
  for (let i = 0; i < px.length; i += 4 * 97) if (px[i] < 200) dark++;
  assert.ok(dark > 100, "the sheet has drawings on it");
});
