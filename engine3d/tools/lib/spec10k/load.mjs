// Loading the 10K programme: allocation (bands, series, rows per band), the specs on disk, the existing
// Toy Box episodes (for dedupe) and the catalog names a spec's `needs` may use.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_ROOT = process.env.TOYBOX_10K ?? "/Volumes/DISK1MAC/AI Backup files - Youtube/Toybox/10K";
export const BANDS = ["bb", "pk", "kg", "g1", "g2", "g3", "g4", "g5"];
/** First slot for new specs; 1..100 are legacy slots (existing episodes, see IDS.md). */
export const FIRST_NEW_SLOT = 101;

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

/** "0101-0115" -> [101, 115] */
export function parseSlots(s) {
  const m = /^(\d{4})-(\d{4})$/.exec(s ?? "");
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}
export const fmtSlot = (n) => String(n).padStart(4, "0");
/** "kg0123" -> { band: "kg", slot: 123 } */
export function splitId(id) {
  const m = /^(bb|pk|kg|g[1-5])(\d{4})$/.exec(id ?? "");
  return m ? { band: m[1], slot: Number(m[2]) } : null;
}

/**
 * The allocation: bands.json, series.json and allocation/<band>.json (bands without a file have no rows yet).
 * @param {string} root  the 10K folder
 */
export function loadProgramme(root) {
  const dir = join(root, "allocation");
  const bands = readJson(join(dir, "bands.json"));
  const series = readJson(join(dir, "series.json"));
  const allocation = {};
  for (const b of BANDS) {
    const f = join(dir, `${b}.json`);
    allocation[b] = existsSync(f) ? readJson(f) : { band: b, rows: [] };
  }
  return { root, bands, series, allocation, slotIndex: buildSlotIndex(allocation) };
}

/** Map "kg0123" -> the allocation row whose slot range holds it (rows without slots are skipped). */
export function buildSlotIndex(allocation) {
  const idx = new Map();
  for (const [b, a] of Object.entries(allocation)) {
    for (const row of a.rows ?? []) {
      const r = parseSlots(row.slots);
      if (!r) continue;
      for (let n = r[0]; n <= r[1]; n++) idx.set(`${b}${fmtSlot(n)}`, row);
    }
  }
  return idx;
}

/**
 * Every spec file under <root>/specs/<band>/*.json.
 * @returns {{ file: string, band: string, spec: object | null, error?: string }[]}
 */
export function loadSpecs(root) {
  const out = [];
  for (const b of BANDS) {
    const dir = join(root, "specs", b);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
      const file = join(dir, f);
      try { out.push({ file, band: b, spec: readJson(file) }); } catch (e) { out.push({ file, band: b, spec: null, error: `not valid JSON: ${e.message}` }); }
    }
  }
  return out;
}

/**
 * The existing Toy Box episodes as dedupe records: scripts (title, YouTube title and description) plus
 * registry entries that only have a planned title.
 * @param {string} repo  repository root
 */
export function loadExisting(repo) {
  const dir = join(repo, "engine3d/scripts/series/toybox");
  const reg = readJson(join(dir, "episodes.json"));
  const out = new Map();
  for (const f of readdirSync(dir).filter((x) => /^[a-z]+\d+_.*\.json$/.test(x)).sort()) {
    const m = readJson(join(dir, f)).meta ?? {};
    const id = m.episode ?? f.slice(0, 4);
    out.set(id, { id, title: m.title ?? "", ytTitle: m.youtube?.title ?? "", story: (m.youtube?.description ?? "").split("\n\n")[0], skills: m.skills ?? [], audience: m.audience ?? "" });
  }
  for (const [id, e] of Object.entries(reg.episodes ?? {})) {
    if (!out.has(id)) out.set(id, { id, title: e.title ?? "", ytTitle: "", story: "", skills: e.skills ?? [], audience: e.audience ?? "" });
  }
  return [...out.values()];
}

/**
 * Names a spec may use without `new:`.
 * @param {object} catalog  loadCatalog3d()
 * @param {object} series   series.json (its `features` are the retention-kit names)
 * @param {Record<string, object>} [skills]  catalog/education/skills.json skills
 */
export function catalogNames(catalog, series, skills) {
  const keys = (o) => Object.keys(o ?? {});
  return {
    characters: new Set([...keys(catalog.characters), ...keys(catalog.critters)]),
    props: new Set([...keys(catalog.props), ...keys(catalog.shapes)]),
    stages: new Set(keys(catalog.stages)),
    features: new Set([...keys(catalog.kinds), ...keys(catalog.actions), ...keys(series?.features), ...keys(series?.featureAliases)]),
    aliases: series?.featureAliases ?? {},
    sounds: new Set(keys(catalog.sounds)),
    skills: skills ? new Set(keys(skills)) : null,
  };
}
