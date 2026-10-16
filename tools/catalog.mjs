#!/usr/bin/env node
// Print move/FX/SFX/theme/world-command catalog tables for prompts (spec 18.2).
// Usage: node tools/catalog.mjs [--format md|json]

import { catalogData, catalogMarkdown } from "./lib/prompt_tables.mjs";
import { catalog } from "../data/index.js";

const args = process.argv.slice(2);
const format = args.includes("--format") ? args[args.indexOf("--format") + 1] : "md";
if (format === "json") console.log(JSON.stringify(catalogData(catalog), null, 2));
else if (format === "md") console.log(catalogMarkdown(catalog));
else {
  console.error("usage: node tools/catalog.mjs [--format md|json]");
  process.exit(2);
}
