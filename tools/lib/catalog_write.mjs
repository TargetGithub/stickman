// Adds a reviewed draft to catalog/ (CATALOG_SPEC 6, 9): a move into its moves file, an object or a theme
// into world/. The entry gets the description it was drafted from and the tag "draft", so it is easy to
// find and finish; run npm run catalog:build afterwards (it checks the entry on every body plan).

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { formatJson } from "./json_format.mjs";
import { CATALOG_DIR } from "./catalog_files.mjs";
import { MOVE_FILES } from "../../catalog/index.js";

/** The moves file a new move goes into, by category (attacks: armed when they need a prop). */
export function moveFileFor(def) {
  const byCategory = { movement: "movement", defensive: "defensive", reaction: "reactions", emote: "emotes", utility: "utility", life: "life", interaction: "interactions", defeat: "defeat" };
  if (def.category === "attack") return def.needsProp ? "armed" : "unarmed";
  return byCategory[def.category] || "life";
}

/** "a little hop of joy" → "A little hop of joy." */
const sentence = (s) => `${String(s).trim().replace(/^./, (c) => c.toUpperCase()).replace(/[.!]?$/, ".")}`;

/**
 * @param {"move"|"object"|"theme"} kind
 * @param {string} name
 * @param {object} entry  the draft's data (no name)
 * @param {{ description: string, file?: string, root?: string }} opts
 * @returns {string} the catalog file written (relative to catalog/)
 */
export function addToCatalog(kind, name, entry, { description, file, root = CATALOG_DIR }) {
  const doc = { description: sentence(description), tags: ["draft"] };
  if (kind === "move") {
    const f = file || moveFileFor(entry);
    if (!MOVE_FILES.includes(f)) throw new Error(`no moves file "${f}" (use one of ${MOVE_FILES.join(", ")})`);
    for (const m of MOVE_FILES) {
      if (JSON.parse(readFileSync(join(root, `moves/${m}.json`), "utf8")).some((x) => x.name === name)) throw new Error(`move "${name}" already exists in moves/${m}.json`);
    }
    const rel = `moves/${f}.json`;
    const list = JSON.parse(readFileSync(join(root, rel), "utf8"));
    const { name: _, description: __, tags: ___, ...rest } = entry;
    list.push({ name, ...doc, ...rest });
    writeFileSync(join(root, rel), formatJson(list));
    return rel;
  }
  const rel = kind === "object" ? "world/objects.json" : kind === "theme" ? "world/themes.json" : null;
  if (!rel) throw new Error(`cannot add a ${kind}`);
  const table = JSON.parse(readFileSync(join(root, rel), "utf8"));
  if (table[name]) throw new Error(`"${name}" already exists in ${rel}`);
  const { description: _, tags: __, ...rest } = entry;
  table[name] = { ...doc, ...rest };
  writeFileSync(join(root, rel), formatJson(table));
  return rel;
}
