// Writing bundle folders (CATALOG_BUNDLE_SPEC B6): scaffold a new bundle, add a reviewed draft to one (from
// draft.mjs or svg_import.mjs with --bundle), and write the files of a chat reply into one. Every name gets the
// bundle's id; the example story uses each new entry so the bundle can check clean. Pack and check afterwards.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ENGINE_VERSION } from "../../engine/index.js";
import { formatJson } from "./json_format.mjs";
import { moveFileFor } from "./catalog_write.mjs";
import { RESERVED_IDS } from "./bundle/layout.mjs";

const ID = /^[a-z][a-z0-9_]{2,31}$/;
const sentence = (s) => `${String(s).trim().replace(/^./, (c) => c.toUpperCase()).replace(/[.!]?$/, ".")}`;
const readJson = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : d);
const writeJson = (p, v) => (mkdirSync(dirname(p), { recursive: true }), writeFileSync(p, formatJson(v)));
export const EXAMPLE = "examples/stories/first_look.json";

/** A new bundle folder: manifest, README, licence note and an example story that later entries join. */
export function scaffoldBundle(dir, id, { name, author = "Your Name", license = "CC-BY-4.0", audience = ["kids", "general"] } = {}) {
  if (!ID.test(id) || RESERVED_IDS.includes(id)) throw new Error(`"${id}" cannot be a bundle id: use 3-32 lowercase letters, digits and _, not ${RESERVED_IDS.join(", ")}`);
  if (existsSync(join(dir, "bundle.json"))) throw new Error(`${dir} already holds a bundle`);
  const title = name || id.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  writeJson(join(dir, "bundle.json"), {
    schemaVersion: 1, id, version: "0.1.0", name: title, description: `${title}: describe in one sentence what this bundle adds.`, author: { name: author }, license,
    engineVersion: `^${ENGINE_VERSION}`, catalogVersion: "1", audience, files: [], contentHash: `sha256-${"0".repeat(64)}`,
  });
  writeFileSync(join(dir, "README.md"), `# ${title}\n\nWhat this bundle adds, and how to use it. Shown as plain text on the import page.\n\nMake entries with \`node tools/draft.mjs move|object|theme "<description>" --bundle ${dir}\` (or by hand), review them, then\n\`node tools/bundle.mjs pack ${dir} --i-made-this\` and \`node tools/bundle.mjs check <zip>\`.\n`);
  writeJson(join(dir, "examples/index.json"), { examples: [{ path: EXAMPLE.slice("examples/".length), kind: "story", title: `${title} first look`, description: `A short scene that shows everything ${title} adds.`, tags: ["example"] }] });
  writeJson(join(dir, EXAMPLE), { story: {
    version: 2,
    bundles: [{ id, version: "0.1.0", hash: "self" }],
    meta: { title: `${title} first look`, format: "landscape", seed: 1, kind: "clip", audience: audience.includes("kids") ? "kids" : "general" },
    cast: [{ id: "kai", name: "Kai", color: "#3fd8ff" }],
    locations: [{ id: "here", theme: "white_stage", set: [] }],
    scenes: [{ id: "s1", location: "here", cast: [{ id: "kai", x: 1200, facing: 1 }], beats: [{ id: "b1", at: 0.5, who: "kai", do: "wave" }, { id: "end", at: { after: "b1", delay: 0.5 }, who: "world", do: "fade", params: { to: "black", dur: 0.5 } }] }],
  } });
  return { id, files: ["bundle.json", "README.md", "examples/index.json", EXAMPLE] };
}

/** Make the scaffold's example use a new entry (an author reviews and changes it). */
function useInExample(dir, kind, name) {
  const p = join(dir, EXAMPLE);
  const ex = readJson(p, null);
  const story = ex?.story;
  if (!story?.scenes?.[0]?.beats) return false;
  const scene = story.scenes[0];
  const end = scene.beats.find((b) => b.id === "end");
  const beats = scene.beats.filter((b) => b !== end);
  const last = beats[beats.length - 1]?.id;
  const n = beats.length + 1;
  if (kind === "move") beats.push({ id: `b${n}`, at: last ? { after: last, delay: 0.3 } : 0.5, who: "kai", do: name });
  else if (kind === "object") story.locations[0].set.push({ id: `o${story.locations[0].set.length + 1}`, object: name, x: 1500 + 350 * story.locations[0].set.length });
  else if (kind === "theme") story.locations[0].theme = name;
  else return false;
  scene.beats = end ? [...beats, { ...end, at: { after: beats[beats.length - 1].id, delay: 0.5 } }] : beats;
  writeJson(p, ex);
  return true;
}

/**
 * Add a reviewed draft to a bundle folder.
 * @param {"move"|"object"|"theme"} kind
 * @returns {{ name: string, file: string, inExample: boolean }}
 */
export function addToBundle(dir, kind, name, entry, { description, file } = {}) {
  const manifest = readJson(join(dir, "bundle.json"), null);
  if (!manifest?.id) throw new Error(`${dir} is not a bundle folder (no bundle.json): run node tools/bundle.mjs new <id> first`);
  const full = name.includes(":") ? name : `${manifest.id}:${name}`;
  const doc = { description: sentence(description), tags: ["draft"] };
  let rel;
  if (kind === "move") {
    const group = file || moveFileFor(entry);
    if (group === "defeat") throw new Error("defeat moves stay built-in (CATALOG_BUNDLE_SPEC 1)");
    rel = `moves/${group}.json`;
    const list = readJson(join(dir, rel), []);
    if (list.some((m) => m.name === full)) throw new Error(`move "${full}" is already in ${rel}`);
    const { name: _, description: __, tags: ___, ...rest } = entry;
    list.push({ name: full, ...doc, ...rest });
    writeJson(join(dir, rel), list);
  } else {
    rel = kind === "object" ? "world/objects.json" : kind === "theme" ? "world/themes.json" : null;
    if (!rel) throw new Error(`cannot add a ${kind} to a bundle with this tool`);
    const table = readJson(join(dir, rel), {});
    if (table[full]) throw new Error(`"${full}" is already in ${rel}`);
    const { description: _, tags: __, ...rest } = entry;
    table[full] = { ...doc, ...rest };
    writeJson(join(dir, rel), table);
  }
  return { name: full, file: rel, inExample: useInExample(dir, kind, full) };
}

/**
 * Write the files of a chat reply ({ "files": { "<path>": <json> } }) into a bundle folder. Only paths of the
 * bundle layout are written (the manifest keeps its files[] and hash for pack to rewrite); others are listed.
 */
export function writeReplyFiles(dir, reply, pathPattern) {
  const grammar = new RegExp(pathPattern);
  const written = [];
  const skipped = [];
  for (const [path, value] of Object.entries(reply?.files || {})) {
    if (path === "bundle.json") {
      const m = readJson(join(dir, "bundle.json"), {});
      const keep = ["schemaVersion", "id", "files", "contentHash", "engineVersion", "catalogVersion"];
      writeJson(join(dir, path), { ...value, ...Object.fromEntries(keep.filter((k) => k in m).map((k) => [k, m[k]])) });
      written.push(path);
    } else if (grammar.test(path) && path !== "README.md" && path !== "LICENSE.txt") {
      writeJson(join(dir, path), value);
      written.push(path);
    } else skipped.push(path);
  }
  return { written, skipped };
}
