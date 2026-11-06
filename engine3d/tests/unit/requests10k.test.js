import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { compileScript } from "../../runtime/compile.js";
import { validateScript } from "../../runtime/validate.js";

// Engine requests from the 10K scripts session (10K/ENGINE_REQUESTS.md).
const catalog = loadCatalog3d();
const script = (name) => JSON.parse(readFileSync(new URL(`../../scripts/tour/${name}.json`, import.meta.url), "utf8"));

test("#2 duck, chick and hen have a named wing that point can aim", () => {
  for (const s of ["duck", "chick", "hen", "duckling"]) assert.ok(catalog.critters[s].parts.some((p) => p.name === "wing"), s);
  assert.deepEqual(validateScript(script("bird_point"), catalog).errors, []);
});

const rolls = [
  { to: [2.5, 0.33, 0], r: 0.33, axis: 2, sign: -1 },
  { to: [-2.5, 0.33, 0], r: 0.33, axis: 2, sign: 1 },
  { to: [0, 0.33, 2], r: 0.33, axis: 0, sign: 1 },
];
for (const c of rolls) {
  test(`#5 roll turns by distance / radius (${c.to})`, () => {
    const s = { kind: "video3d", version: 1, meta: { seed: 1 }, objects: [{ id: "ball", kind: "prop", model: "ball", size: 0.8, pivot: [0, c.r, 0], at: [0, c.r, 0] }],
      scenes: [{ id: "a", beats: [{ dur: 2, do: [{ do: "roll", target: "ball", to: c.to, dur: 1 }] }] }] };
    assert.deepEqual(validateScript(s, catalog).errors, []);
    const plan = compileScript(s, { catalog });
    const seg = plan.timeline ?? plan;
    const json = JSON.stringify(seg);
    const dist = Math.hypot(c.to[0], c.to[2]);
    const deg = Math.round((c.sign * dist / c.r) * (180 / Math.PI) * 1000) / 1000;
    assert.ok(json.includes(String(deg)), `rotation ${deg} in the plan`);
  });
}

test("#5 roll needs to", () => {
  const s = { kind: "video3d", version: 1, objects: [{ id: "ball", kind: "prop", model: "ball" }], scenes: [{ id: "a", beats: [{ dur: 1, do: [{ do: "roll", target: "ball" }] }] }] };
  assert.ok(validateScript(s, catalog).errors.some((e) => e.code === "E3D_REQUIRED"));
});
