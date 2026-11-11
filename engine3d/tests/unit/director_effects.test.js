import { test } from "node:test";
import assert from "node:assert/strict";
import { loadCatalog3d } from "../../catalog/index.mjs";
import { compileScript } from "../../runtime/compile.js";

const catalog = loadCatalog3d();
const script = (objects, actions, dur = 4) => ({ kind: "video3d", version: 1, description: "x", meta: { title: "t", seed: 1 }, camera: { position: [0, 1.5, 9], lookAt: [0, 1, 0], fov: 40 }, objects, scenes: [{ id: "a", beats: [{ dur, do: actions }] }] });

const mists = [
  { name: "a short word gets a couple of puffs", o: { id: "w", kind: "letter", text: "cat", size: 0.5 }, min: 2 },
  { name: "a wide card gets more", o: { id: "c", kind: "text_card", text: "The ship sailed into the fog.", width: 5, size: 0.3 }, min: 8 },
];
for (const c of mists) {
  test(`mist: ${c.name}`, () => {
    const p = compileScript(script([c.o], [{ do: "mist", target: c.o.id, amount: 0.7, at: 0.1 }]), { catalog });
    const puffs = p.objects.filter((o) => o.id.startsWith(`${c.o.id}~mist`));
    assert.ok(puffs.length >= c.min, `${puffs.length} puffs`);
    assert.ok(Math.abs(p.timeline.valueAt(puffs[0].id, "fade", 2) - 0.7) < 1e-9);
  });
}

const rewinds = [
  { name: "back to the start", back: 3, want: [0, 0, 0] },
  { name: "back half way", back: 2, want: [1, 0, 0] },
];
for (const c of rewinds) {
  test(`rewind: ${c.name}`, () => {
    const p = compileScript(script([{ id: "b", kind: "prop", model: "ball" }], [{ do: "move", target: "b", to: [2, 0, 0], dur: 2, ease: "linear" }, { do: "rewind", at: 3, back: c.back, dur: 0.5 }], 4), { catalog });
    const v = p.timeline.valueAt("b", "position", 3.9);
    assert.ok(v.every((x, i) => Math.abs(x - c.want[i]) < 1e-9), JSON.stringify(v));
  });
}
