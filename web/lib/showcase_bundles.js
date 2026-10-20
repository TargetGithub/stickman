// Bundles in the showcase (CATALOG_BUNDLE_SPEC B5): with the "Bundles" switch on, the bundles kept in this
// browser and those in the project store (/bundles/index.json) are checked, merged into the catalog, and their
// entries become cards in every section like base entries (the section builders are not changed), marked
// with the bundle's name. Their previews declare the bundles they use.

import { checkSources, zipEntries, storeEntries } from "./bundles.js";
import { keptBundles } from "./bundle_store.js";
import { presetsOf, SELF_HASH } from "../../tools/lib/bundle/layout.mjs";

const NS = /^(?:[a-z]+-)?([a-z][a-z0-9_]{2,31}):[a-z]/;

/** Kept and stored bundles, checked (steps 1-11 and 14) and merged. */
export async function loadShowcaseBundles(base) {
  const sources = [];
  for (const r of await keptBundles().catch(() => [])) sources.push({ name: `${r.id} (kept here)`, ...(await zipEntries(r.zip)) });
  const index = await fetch("/bundles/index.json").then((r) => (r.ok ? r.json() : { bundles: [] })).catch(() => ({ bundles: [] }));
  for (const pin of index.bundles || []) {
    if (sources.some((s) => s.entries.length && s.name.startsWith(`${pin.id} `))) continue;
    const got = await storeEntries(pin);
    if (got) sources.push({ name: `${pin.id} (project store)`, ...got });
  }
  return checkSources(sources, base, { determinism: false });
}

/** The generated catalog file's shape with the bundles added: catalog, presets (with good themes), examples. */
export function withBundles(full, loaded, results) {
  const goodThemes = Object.assign({}, ...results.filter((r) => r.ok).map((r) => r.report.goodThemes || {}));
  const presets = loaded.flatMap((b) => presetsOf(b.files).map(({ file, ...p }) => ({ ...p, goodThemes: goodThemes[p.id] || [] })));
  return { ...full, presets: [...full.presets, ...presets] };
}

/** Bundle examples as cards (their scripts come with the bundle, not from catalog/examples). */
export function bundleExampleCards(loaded) {
  return loaded.flatMap((b) => (b.files["examples/index.json"]?.examples || []).map((e) => {
    const raw = b.files[`examples/${e.path}`];
    const script = e.kind === "story" ? raw.story : raw;
    const pins = (script.bundles || []).map((p) => (p.id === b.id && p.hash === SELF_HASH ? { ...p, hash: b.hash } : p));
    return { id: `${b.id}-${e.path.replace(/\.json$/, "").replace("/", "-")}`, name: e.title, description: e.description, tags: [...e.tags, "bundle"], group: `${e.kind} (${b.manifest.name})`,
      meta: `from ${b.manifest.name} ${b.version}`, copy: e.path, script: () => ({ ...script, bundles: pins }) };
  }));
}

/** Mark bundle cards (meta, a "bundle" tag), give their previews the pins, and fix bundle music clip names. */
export function markBundleCards(sections, loaded) {
  const byId = new Map(loaded.map((b) => [b.id, b]));
  const pins = loaded.map(({ id, version, hash }) => ({ id, version, hash }));
  return sections.map((s) => ({
    ...s,
    cards: [...s.cards.map((c) => {
      const b = byId.get(String(c.id).match(NS)?.[1]);
      if (!b) return c;
      const from = `from ${b.manifest.name} ${b.version}${b.manifest.license === "CC-BY-NC-4.0" ? " (NC)" : ""}`;
      const out = { ...c, bundle: b.id, tags: [...c.tags, "bundle"], meta: c.meta ? `${c.meta} · ${from}` : from };
      if (c.script) out.script = (...a) => ({ ...c.script(...a), bundles: pins });
      if (s.id === "music") {
        out.audio = c.audio.replace(`${c.id}.wav`, `${c.id.replace(":", "__")}.wav`);
        out.description = `${c.description} No preview is generated in the browser: \`npm run catalog:media -- --bundle <zip>\` renders a clip.`;
      }
      return out;
    }), ...(s.id === "examples" ? bundleExampleCards(loaded) : [])],
  }));
}
