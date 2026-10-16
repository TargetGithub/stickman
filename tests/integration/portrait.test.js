// Acceptance criterion 6: in 9:16, followed characters stay inside the frame and below the top
// safe area (12%) on every frame of every sample script rendered as portrait.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { simulate, frameAt } from "../../engine/sim.js";
import { toScreen } from "../../engine/camera.js";
import { unpackJoints, BODY } from "../../engine/skeleton.js";
import { catalog } from "../../data/index.js";

const SAMPLES = ["m3_duel", "m4_dojo", "m5_portrait", "m7_unarmed_reel", "m7_emotes_reel", "m7_style_reel"];

for (const name of SAMPLES) {
  test(`portrait framing: ${name}`, () => {
    const script = JSON.parse(readFileSync(new URL(`../../scripts/samples/${name}.json`, import.meta.url), "utf8"));
    script.meta.format = "portrait";
    const sim = simulate(script, catalog);
    const { width: W, height: H } = sim.format;
    for (let n = 0; n < sim.totalFrames; n++) {
      const f = frameAt(sim, n);
      for (const c of f.chars) {
        if (c.alpha < 0.5) continue;
        const j = unpackJoints(c.joints);
        const pts = [toScreen(f.cam, W, H, { x: j.head.x, y: j.head.y - BODY.headR * c.scale }), ...Object.values(j).map((p) => toScreen(f.cam, W, H, p))];
        const out = Math.max(0, ...pts.map((p) => Math.max(-p.x, p.x - W, H * 0.12 - p.y)));
        assert.ok(out <= 8, `${name} frame ${n}: ${c.id} is ${out.toFixed(0)}px outside the safe frame`);
      }
    }
  });
}
