#!/usr/bin/env node
// Review sheet for a batch of moves (S5 move batches): one row per move and body plan.
// Usage: node tools/move_sheet.mjs [out.png] [--category life] [--rig quadruped] [--moves a,b,c] [--plans stickman,buddy] [--frames 8] [--color #22aaff]

import { moveSheet } from "./lib/filmstrip.mjs";
import { catalog } from "../catalog/index.js";

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const out = args.find((a, i) => !a.startsWith("--") && !(args[i - 1] || "").startsWith("--")) || "out/demos/moves.png";
const names = opt("--moves", null)?.split(",");
const category = opt("--category", null);
const rig = opt("--rig", null);
const defs = catalog.moves.filter((m) => (names ? names.includes(m.name) : (!category || m.category === category) && (!rig || (m.rig || "humanoid") === rig)));
if (!defs.length) {
  console.error("no moves matched");
  process.exit(2);
}
await moveSheet(defs, out, { plans: opt("--plans", "stickman").split(","), frames: Number(opt("--frames", 8)), color: opt("--color", undefined) });
console.log(`wrote ${out} (${defs.length} moves)`);
