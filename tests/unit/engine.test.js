// Public API (spec 15.1), without a canvas backend: a no-op 2D context records that drawing runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createEngine, scriptSchema, ENGINE_VERSION } from "../../engine/index.js";
import { catalog } from "../../catalog/index.js";

const sample = JSON.parse(readFileSync(new URL("../../scripts/samples/m4_dojo.json", import.meta.url), "utf8"));

/** A CanvasRenderingContext2D stand-in that accepts every call and counts them. */
function nullContext() {
  let calls = 0;
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key === "calls") return calls;
      if (key in target) return target[key];
      if (key === "measureText") return (s) => ({ width: String(s).length * 10 });
      if (key === "createLinearGradient" || key === "createRadialGradient") return () => gradient;
      return () => { calls++; };
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  });
  return ctx;
}

test("load → ok with frame count, size and timeline", () => {
  const engine = createEngine({ catalog });
  const r = engine.load(sample);
  assert.equal(r.ok, true);
  assert.equal(r.fps, 60);
  assert.deepEqual([r.width, r.height], [1920, 1080]);
  assert.ok(r.totalFrames > 600);
  assert.match(r.timeline, /hero\s+front_kick/);
  const meta = engine.getMeta();
  assert.equal(meta.totalFrames, r.totalFrames);
  assert.equal(meta.engineVersion, ENGINE_VERSION);
  assert.equal(meta.theme, "dojo_dusk");
});

test("invalid scripts return errors instead of throwing; nothing is loaded", () => {
  const engine = createEngine({ catalog });
  const r = engine.load({ ...sample, beats: [{ at: 1, who: "hero", do: "super_kick" }] });
  assert.equal(r.ok, false);
  assert.equal(r.errors[0].code, "E_MOVE_UNKNOWN");
  assert.equal(r.totalFrames, 0);
  assert.throws(() => engine.renderFrame(nullContext(), 0), /no script loaded/);
  assert.equal(createEngine({ catalog }).load(null).ok, false);
});

test("renderFrame draws every frame in range and rejects others", () => {
  const engine = createEngine({ catalog });
  const { totalFrames } = engine.load(sample);
  const ctx = nullContext();
  for (let n = 0; n < totalFrames; n += 7) engine.renderFrame(ctx, n);
  engine.renderFrame(ctx, totalFrames - 1);
  assert.ok(ctx.calls > totalFrames, "drawing happened");
  assert.throws(() => engine.renderFrame(ctx, totalFrames), RangeError);
  assert.throws(() => engine.renderFrame(ctx, 1.5), RangeError);
});

test("anchors carry video times; audio and frames are available; dispose unloads", () => {
  const engine = createEngine({ catalog });
  engine.load(sample);
  const hit = engine.getAnchors().find((a) => a.beatId === "fk" && a.anchor === "hit");
  assert.ok(hit.videoT >= hit.t, "video time runs ahead of story time after slowmo/hitstop");
  assert.ok(engine.getAudioEvents().length > 0);
  assert.equal(engine.getAudioEvents(), engine.getAudioEvents(), "cached");
  assert.equal(engine.getFrame(10).chars.length, 2);
  assert.ok(engine.getEvents().some((e) => e.type === "hit"));
  engine.dispose();
  assert.throws(() => engine.getMeta(), /no script loaded/);
});

test("createEngine needs a catalog; scriptSchema exports enums", () => {
  assert.throws(() => createEngine({}), /catalog is required/);
  assert.ok(scriptSchema(catalog).properties.beats.items.properties.do.enum.includes("jab"));
});
