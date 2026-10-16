// Smoke test: every module loads and exposes its planned interface (docs/ARCHITECTURE.md section 4).
// Replace or extend per module as milestones land.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const expected = {
  "../../engine/math.js": ["lerp", "clamp", "mulberry32", "hash32", "deriveRng", "valueNoise1D", "easings", "DEG"],
  "../../engine/expr.js": ["compileExpr", "evalParam"],
  "../../engine/skeleton.js": ["BODY", "computeJoints", "solveIK2", "bendSignOf", "lowestPoint", "packJoints", "unpackJoints"],
  "../../engine/pose.js": ["fillPose", "blendPose", "samplePoseKeys"],
  "../../engine/moves.js": ["prepareCatalog", "startMove", "stepMove", "rootOffsetAt"],
  "../../engine/props.js": ["attachProp", "propTransform", "detachProp"],
  "../../engine/physics.js": ["stepBody", "launch", "separate", "stepProjectiles"],
  "../../engine/combat.js": ["buildHurtboxes", "sweptHit", "resolveAimPoint", "applyAimIK", "requiredStartX", "deriveReach", "ikWeight"],
  "../../engine/world.js": ["createWorld", "command", "stepWorld", "OUTCOMES"],
  "../../engine/actor.js": ["createActor", "playMove", "advanceMove", "poseActor", "stepActor"],
  "../../engine/clock.js": ["createClock", "requestSlowmo", "requestHitstop", "requestFreeze", "tick", "storyToVideo"],
  "../../engine/fx.js": ["createFx", "emitFx", "stepFx", "liveParticles", "shakeOffset"],
  "../../engine/camera.js": ["createCamera", "setCameraKey", "stepCamera", "cameraState"],
  "../../engine/director.js": ["resolveSchedule", "stepDirector", "onAnchor"],
  "../../engine/sim.js": ["simulate"],
  "../../engine/framestore.js": ["createStore", "writeFrame", "frameView", "jointsAt"],
  "../../engine/audio_events.js": ["collectAudioEvents"],
  "../../engine/index.js": ["createEngine"],
  "../../engine/validator/index.js": ["validate", "jsonSchema"],
  "../../engine/renderer/index.js": ["createRenderer", "renderFrame"],
};

for (const [path, names] of Object.entries(expected)) {
  test(`interface: ${path.replace("../../", "")}`, async () => {
    const mod = await import(path);
    for (const name of names) assert.ok(name in mod, `missing export ${name}`);
  });
}

test("default catalog loads", async () => {
  const { catalog } = await import("../../data/index.js");
  assert.ok(catalog.poses.stand, "stand pose exists");
  assert.equal(catalog.sfxKeys.length, 23);
  assert.equal(catalog.themeNames.length, 7);
});

test("engine code avoids forbidden time and randomness sources", async () => {
  const { readdir } = await import("node:fs/promises");
  const root = new URL("../../engine/", import.meta.url);
  const files = (await readdir(root, { recursive: true })).filter((f) => f.endsWith(".js"));
  for (const f of files) {
    const src = await readFile(new URL(f, root), "utf8");
    for (const banned of ["Math.random", "Date.now", "performance.now"]) {
      assert.ok(!src.includes(banned), `${f} uses ${banned}`);
    }
  }
});

test("sample scripts parse as JSON", async () => {
  const src = await readFile(new URL("../../scripts/samples/showdown.json", import.meta.url), "utf8");
  const script = JSON.parse(src);
  assert.equal(script.version, 1);
});
