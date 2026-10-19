// mergeBundles (docs/CATALOG_BUNDLE_SPEC.md 7.2): the engine catalog with bundles' entries added. Pure,
// no I/O: the caller reads and checks the bundles (tools/lib/bundle/) and passes their entries here.
// Bundles are add-only (5.2): every name they add carries their own id, so nothing is replaced.

const KEYED = ["poses", "bodies", "faces", "fxPresets", "themes", "objects", "props", "activities", "musicMoods", "scales"];

/**
 * @param {object} base  the engine catalog (loadCatalog)
 * @param {Array<{ id: string, version: string, hash: string, entries: object }>} bundles  entries: the
 *   catalog fragment of each bundle (tools/lib/bundle/layout.mjs catalogFragment: poses, moves, bodies,
 *   faces, fxPresets, themes, objects, props, activities, musicMoods, scales), in file order
 * @returns {object} a new catalog; base is not changed
 */
export function mergeBundles(base, bundles) {
  const sorted = [...bundles].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)); // ascending id, not script order
  const out = { ...base };
  for (const k of KEYED) out[k] = { ...(base[k] || {}) };
  out.moves = [...base.moves];
  for (const b of sorted) {
    for (const k of KEYED) {
      for (const [name, v] of Object.entries(b.entries[k] || {})) {
        if (name in out[k]) throw new Error(`mergeBundles: ${b.id} adds '${name}' to ${k}, which is already there`);
        out[k][name] = v;
      }
    }
    out.moves.push(...(b.entries.moves || []));
  }
  const added = (k) => sorted.flatMap((b) => Object.keys(b.entries[k] || {}));
  out.fxNames = [...base.fxNames, ...sorted.flatMap((b) => Object.entries(b.entries.fxPresets || {}).filter(([, f]) => !f.internal).map(([n]) => n))];
  out.themeNames = [...base.themeNames, ...added("themes")];
  out.faceNames = [...base.faceNames, ...added("faces")];
  out.bodyNames = [...base.bodyNames, ...added("bodies")];
  out.activityNames = [...base.activityNames, ...added("activities")];
  out.bundles = [...(base.bundles || []), ...sorted.map(({ id, version, hash }) => ({ id, version, hash }))].sort((a, b) => (a.id < b.id ? -1 : 1));
  return out;
}
