#!/usr/bin/env node
// Validate Lottie3D files: node lottie3d/validate-cli.mjs file.json [...]
import { readFileSync } from "node:fs";
import { formatErrors, validate } from "./validate.js";

let failed = 0;
for (const file of process.argv.slice(2)) {
  const r = validate(readFileSync(file, "utf8"));
  if (r.ok) console.log(`ok   ${file}`);
  else {
    failed++;
    console.log(`FAIL ${file}\n${formatErrors(r.errors).replace(/^/gm, "  ")}`);
  }
}
process.exit(failed ? 1 : 0);
