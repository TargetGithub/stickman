// Read a .glb's animation clip lengths in Node (no three.js): a clip lasts as long as its longest sampler
// input, and glTF requires every input accessor to carry min/max.

import { readFileSync } from "node:fs";

/** @returns {Record<string, number>} clip name → seconds */
export function glbClipDurations(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file} is not a .glb`);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
  const out = {};
  for (const a of gltf.animations ?? []) {
    out[a.name] = Math.max(...a.samplers.map((s) => gltf.accessors[s.input].max[0]));
  }
  return out;
}
