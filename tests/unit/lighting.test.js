// Light rigs (ENGINE_V3_SPEC 5.2, ADR-024): rig selection and overrides, blending over set_light, shading
// tones, contact and cast shadows, fog veils, and the catalog's presets.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lightRigOf, resolveRig, blendRigs, lightAt, shadeTones, contactShadow, castShadow, scaleRig, CONTACT_MIN, fogAt, fogVeils, ambientTint, lightDir, mixHex, hexToRgb } from "../../engine/lighting.js";
import { depthOf } from "../../engine/depth.js";
import { catalog } from "../../catalog/index.js";
import { validate } from "../../engine/index.js";

const L = catalog.lights;
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("the catalog ships the time-of-day map and every preset it names, with a flat preset", () => {
  for (const t of ["dawn", "day", "dusk", "night"]) assert.ok(L.rigs[L.byTime[t]], t);
  assert.ok(L.rigs.flat.flat);
  assert.deepEqual(catalog.lightNames, Object.keys(L.rigs));
  for (const [name, r] of Object.entries(L.rigs)) if (!r.flat) for (const k of ["key", "fill", "rim", "ambient", "shadow", "fog"]) assert.ok(r[k], `${name}.${k}`);
});

test("lightRigOf: scene light, then location light, then the time of day; flat is null", () => {
  assert.equal(lightRigOf(catalog, {}, null, { time: "day" }).name, "noon");
  assert.equal(lightRigOf(catalog, {}, { light: "indoor" }, { time: "night" }).name, "indoor");
  assert.equal(lightRigOf(catalog, { light: "stage" }, { light: "indoor" }, { time: "night" }).name, "stage");
  assert.equal(lightRigOf(catalog, { light: "flat" }, null, { time: "dusk" }), null);
  assert.equal(lightRigOf(catalog, {}, null, { time: "dusk" }).name, "golden");
  assert.equal(lightRigOf({}, {}, null, { time: "day" }), null, "a catalog without lights is flat");
  const over = lightRigOf(catalog, { light: { preset: "noon", key: { angle: 30 }, fog: { density: 0 } } }, null, {});
  assert.equal(over.key.angle, 30);
  assert.equal(over.key.color, L.rigs.noon.key.color, "other key fields keep the preset's values");
  assert.equal(over.fog.density, 0);
  assert.equal(resolveRig(L, "nope"), null);
  assert.ok(!("description" in over) && !("tags" in over));
});

test("blendRigs and lightAt: presets blend over dur, overrides apply to the current rig, flat fades out", () => {
  const a = resolveRig(L, "noon");
  const b = resolveRig(L, "golden");
  const mid = blendRigs(a, b, 0.5);
  near(mid.key.angle, (a.key.angle + b.key.angle) / 2);
  near(mid.shadow.length, (a.shadow.length + b.shadow.length) / 2);
  assert.equal(mid.name, "golden");
  assert.equal(blendRigs(a, b, 0.2).name, "noon");
  const events = [{ videoT: 2, params: { preset: "golden", dur: 2 } }, { videoT: 6, params: { angle: 90, fog: 0.1 } }, { videoT: 8, params: { preset: "flat", dur: 1 } }];
  assert.equal(lightAt(a, events, 1, L), a);
  near(lightAt(a, events, 3, L).key.angle, (a.key.angle + b.key.angle) / 2);
  assert.equal(lightAt(a, events, 5, L).key.angle, b.key.angle);
  const tweaked = lightAt(a, events, 7, L);
  assert.equal(tweaked.key.angle, 90);
  assert.equal(tweaked.name, "golden");
  assert.equal(tweaked.fill.color, b.fill.color, "overrides keep the current preset");
  near(lightAt(a, events, 8.5, L).key.strength, b.key.strength / 2);
  assert.equal(lightAt(a, events, 10, L), null, "faded to flat");
  assert.equal(lightAt(null, [{ videoT: 0, params: { preset: "noon", dur: 2 } }], 1, L).key.strength, a.key.strength / 2, "from flat the effect fades in");
});

test("shading tones are three flat tones around the base, with the rim and the light direction", () => {
  const rig = resolveRig(L, "noon");
  const t = shadeTones("#3fd8ff", rig);
  assert.equal(t.base, "#3fd8ff");
  const lum = (h) => hexToRgb(h).reduce((s, v) => s + v, 0);
  assert.ok(lum(t.lit) > lum(t.base) && lum(t.dark) < lum(t.base), "lit is lighter, dark is darker");
  assert.equal(t.rim, rig.rim.color);
  near(Math.hypot(t.dir.x, t.dir.y), 1);
  assert.ok(t.dir.x < 0 && t.dir.y < 0, "noon light comes from the upper right");
  assert.deepEqual(lightDir(90), { x: Math.cos(Math.PI / 2), y: -1 });
  assert.equal(mixHex("#000000", "#ffffff", 0.5), "#808080");
});

test("contact and cast shadows follow the key light", () => {
  const golden = resolveRig(L, "golden"); // low on the right: shadows fall left
  const sh = contactShadow(golden, 1, 220);
  assert.ok(sh.dx < 0 && sh.rx > 44 && sh.ry === 9 && Math.abs(sh.alpha - Math.max(CONTACT_MIN, golden.shadow.alpha * 1.2)) < 1e-9);
  const noon = contactShadow(resolveRig(L, "noon"), 2, 220);
  assert.ok(Math.abs(noon.dx) < Math.abs(sh.dx) && noon.ry === 18);
  // V3.9: the contact shadow keeps its full strength under the automatic look (scaleRig), unlike the cast shadow.
  const weak = scaleRig(golden, 0.2);
  assert.equal(contactShadow(weak, 1, 220).alpha, sh.alpha);
  assert.ok(castShadow(weak).alpha < castShadow(golden).alpha);
  assert.equal(contactShadow(blendRigs(golden, weak, 0.5), 1, 220).alpha, sh.alpha);
  const cast = castShadow(golden);
  assert.ok(cast.d < 0 && cast.c > 0, "lies flat on the floor, sheared away from the light (to the left)");
  const wall = castShadow(resolveRig(L, "indoor"));
  assert.ok(wall.d > 0 && wall.alpha < golden.shadow.alpha);
  assert.ok(wall.tx > 0 && wall.ty < 0, "the wall silhouette stands beside the figure, away from the light, a little up the wall");
  assert.deepEqual([cast.tx, cast.ty], [0, 0]);
  assert.equal(castShadow(resolveRig(L, "stage")), null);
});

test("fog by depth: none at or in front of the stage line, the density at the far end; veils compose to it", () => {
  const rig = resolveRig(L, "moonlit");
  const depth = depthOf({});
  assert.equal(fogAt(rig, 0, depth), 0);
  assert.equal(fogAt(rig, 300, depth), 0);
  near(fogAt(rig, depth.far, depth), rig.fog.density);
  near(fogAt(rig, depth.far / 2, depth), rig.fog.density / 2);
  assert.equal(fogAt(null, -1000, depth), 0);
  const fogs = [0.4, 0.2, 0.2, 0];
  const veils = fogVeils(fogs, 0.5);
  // Everything behind node k ends up covered by fog(k): check by composing the veils drawn after each node.
  const after = (k) => 1 - veils.slice(k + 1).reduce((p, a) => p * (1 - a), 1);
  fogs.forEach((f, k) => near(after(k), f));
  near(1 - veils.reduce((p, a) => p * (1 - a), 1), 0.5, 1e-6);
  assert.deepEqual(fogVeils([0, 0], 0), [0, 0]);
  assert.deepEqual(ambientTint(resolveRig(L, "noon")), null);
  assert.deepEqual(ambientTint(resolveRig(L, "golden")), { color: L.rigs.golden.ambient.color, alpha: L.rigs.golden.ambient.strength });
});

test("the validator knows set_light and light presets", () => {
  const story = (light, beatParams) => ({
    version: 3, meta: { title: "L", format: "landscape", seed: 1, kind: "clip", audience: "kids" },
    cast: [{ id: "a", color: "#3d7bd9" }], locations: [{ id: "p", theme: "city_park", ...(light ? { light } : {}) }],
    scenes: [{ id: "s1", location: "p", cast: [{ id: "a", x: 1200, facing: 1 }], beats: [{ id: "b1", at: 0, who: "a", do: "wave" }, ...(beatParams ? [{ id: "l", at: 0.5, who: "world", do: "set_light", params: beatParams }] : []), { id: "b2", at: { after: "b1", delay: 1.5 }, who: "a", do: "wave" }] }],
  });
  assert.deepEqual(validate(story("golden", { preset: "moonlit", dur: 2 }), catalog).errors, []);
  assert.deepEqual(validate(story({ preset: "indoor", shadow: { cast: "wall" } }, { angle: 45, fog: 0.2 }), catalog).errors, []);
  assert.deepEqual(validate(story("sunny"), catalog).errors.map((e) => e.code), ["E_LIGHT_UNKNOWN"]);
  assert.deepEqual(validate(story(null, { preset: "sunny" }), catalog).errors.map((e) => e.code), ["E_LIGHT_UNKNOWN"]);
  assert.deepEqual(validate(story(null, { brightness: 2 }), catalog).errors.map((e) => e.code), ["E_WORLD_PARAM"]);
  const v2 = { ...story("golden"), version: 2 };
  assert.ok(validate(v2, catalog).errors.some((e) => e.code === "E_SCHEMA_UNKNOWN_FIELD"), "v2 has no light field");
});

test("scaleRig: the look strength scales light, rim, tint, shadows and haze, and keeps colours and angles", async () => {
  const { scaleRig } = await import("../../engine/lighting.js");
  const rig = resolveRig(L, "golden");
  const s = scaleRig(rig, 0.2);
  near(s.key.strength, rig.key.strength * 0.2);
  near(s.rim.strength, rig.rim.strength * 0.2);
  near(s.ambient.strength, rig.ambient.strength * 0.2);
  near(s.shadow.alpha, rig.shadow.alpha * 0.2);
  near(s.fog.density, rig.fog.density * 0.2);
  assert.deepEqual([s.key.angle, s.key.color, s.shadow.length], [rig.key.angle, rig.key.color, rig.shadow.length]);
  assert.equal(scaleRig(rig, 1), rig);
  assert.equal(scaleRig(null, 0.2), null);
});
