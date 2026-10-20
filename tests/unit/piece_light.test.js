// Light on set pieces and props (ADR-035): tones from the rig, contact shadows, band widths, the layer pass.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pieceTones, pieceContact, lightDir, hexToRgb } from "../../engine/lighting.js";
import { bandWidths, screenRect, drawLit, propBox } from "../../engine/renderer/piece_light.js";
import { setPieceDef, glows } from "../../engine/renderer/objects.js";
import { catalog } from "../../catalog/index.js";

const RIG = catalog.lights.rigs;

test("pieceTones: dark is a darkening multiply, lit a brightening layer; stronger keys give stronger tones", () => {
  for (const name of ["noon", "dawn", "golden", "moonlit", "indoor", "stage", "gloom"]) {
    const t = pieceTones(RIG[name]);
    assert.ok(hexToRgb(t.dark).every((v) => v < 255), `${name}: dark darkens`);
    assert.ok(t.litAlpha > 0 && t.litAlpha < 1, `${name}: lit alpha`);
    assert.deepEqual(t.dir, lightDir(RIG[name].key.angle));
  }
  const weak = pieceTones({ ...RIG.noon, key: { ...RIG.noon.key, strength: 0.06 } });
  assert.ok(weak.litAlpha < pieceTones(RIG.noon).litAlpha);
});

test("pieceContact: standing pieces get a shadow away from the light; flat, lifted and opted-out ones none", () => {
  const cases = [
    [{ w: 220, h: 120 }, 0, true],
    [{ w: 220, h: 8 }, 0, false], // a trapdoor lies flat
    [{ w: 220, h: 120 }, 400, false], // lifted off the floor
    [{ w: 220, h: 120, shadow: false }, 0, false],
    [{ r: 24 }, 0, true], // a ball
  ];
  for (const [def, lift, want] of cases) assert.equal(!!pieceContact(RIG.noon, def, lift), want, JSON.stringify(def));
  assert.ok(pieceContact(RIG.golden, { w: 200, h: 300 }).dx < 0, "golden's key is on the right: the shadow falls left");
  assert.ok(pieceContact(RIG.dawn, { w: 200, h: 300 }).dx > 0, "dawn's key is on the left");
});

test("bandWidths grow with the piece and stay bounded; the margin keeps clear of outlines", () => {
  for (const [size, scale] of [[5, 1], [100, 1], [400, 1], [100, 0.5]]) {
    const b = bandWidths(size, scale);
    assert.ok(b.dark >= 3 && b.dark <= 36 && b.lit < b.dark && b.rim < b.lit && b.margin >= 1.5, `${size}`);
  }
});

test("screenRect: transformed, padded past the frame edge, null when off frame", () => {
  const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  assert.deepEqual(screenRect(I, { x0: 10.5, y0: 20, x1: 30.2, y1: 40 }, 100, 100), { x0: 10, y0: 20, x1: 31, y1: 40 });
  assert.deepEqual(screenRect(I, { x0: -500, y0: 0, x1: 50, y1: 10 }, 100, 100, 40), { x0: -40, y0: 0, x1: 50, y1: 10 });
  assert.equal(screenRect(I, { x0: 200, y0: 0, x1: 300, y1: 10 }, 100, 100, 40), null);
  assert.deepEqual(screenRect({ ...I, a: 2, d: 2, e: 5 }, { x0: 0, y0: 0, x1: 10, y1: 10 }, 100, 100), { x0: 5, y0: 0, x1: 25, y1: 20 });
});

test("set pieces: props, frame items and unknown shapes are not set pieces; glowing shapes keep their look", () => {
  const cases = [["bench", true], ["campfire", true], ["flower", false], ["car", false], ["football", false], ["nope", false]];
  for (const [name, want] of cases) assert.equal(!!setPieceDef(catalog, { object: name }), want, name);
  assert.equal(glows(catalog.objects.campfire), true);
  assert.equal(glows(catalog.objects.bench), false);
  assert.equal(glows({ paths: [], draw: "campfire" }), false, "imported drawings are shaded");
});

test("drawLit draws straight to the frame without tones, a canvas factory or a box (v2, unit tests)", () => {
  const seen = [];
  const draw = (g) => seen.push(g);
  const ctx = {};
  for (const [tones, r, box] of [[null, { createCanvas: () => {} }, {}], [pieceTones(RIG.noon), {}, {}], [pieceTones(RIG.noon), { createCanvas: () => {} }, null]]) drawLit(ctx, r, tones, box, draw);
  assert.deepEqual(seen, [ctx, ctx, ctx]);
  const b = propBox({ butt: { x: 0, y: 0 }, tip: { x: 100, y: -50 } }, 10);
  assert.ok(b.x0 < 0 && b.x1 > 100 && b.y0 < -50 && b.y1 > 0);
});
