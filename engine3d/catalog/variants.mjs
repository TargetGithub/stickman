// Model variants: a critter or prop entry with `like` is built from another model instead of from scratch, so a
// family (Mommy, Daddy and Baby Bear), a recolor (a golden fish) or a dressed-up look (a goat in a straw hat) reuses
// the base model's parts, face rig and named parts. Pure and Node-only: catalog/index.mjs expands every variant
// when the catalog loads, so the page, the director and the validator only ever see plain models.
//
// Fields of a variant entry (everything else is copied over the base, top level):
//   like     name of the base critter or prop (may itself be a variant; no cycles)
//   scale    number: every length in the base (part at, s, hang, repeat radius, fur length, head, eyes, mouth,
//            cheeks, brows) is multiplied by it, so a grown-up bear is a bigger bear with the same proportions
//   recolor  { "<colour>": "<colour>" }: part, eye, mouth, cheek and brow colours and the main colour are swapped
//   drop     [part names]: parts with these names are removed (a tail, a hat)
//   dropIndex [part numbers, 0-based]: unnamed parts removed by their place in the base's list (a camel's humps)
//   add      [parts]: appended after scaling, in the variant's own units (glasses, a scarf, horns)
//   eyes, mouth, head, cheeks, brows: an object is merged into the base's (change one field, keep the rest)

const LEN_KEYS = ["at", "s", "hang"];
const FACE_KEYS = ["eyes", "mouth", "head", "cheeks", "brows"];
const OWN_KEYS = new Set(["like", "scale", "recolor", "drop", "dropIndex", "add"]);

const clone = (v) => JSON.parse(JSON.stringify(v));
const mul = (v, k) => (Array.isArray(v) ? v.map((x) => (typeof x === "number" ? x * k : x)) : typeof v === "number" ? v * k : v);

function scalePart(p, k) {
  const q = { ...p };
  for (const key of LEN_KEYS) if (q[key] != null) q[key] = mul(q[key], k);
  if (q.repeat) q.repeat = { ...q.repeat, radius: q.repeat.radius * k };
  if (q.fur && typeof q.fur === "object" && q.fur.length != null) q.fur = { ...q.fur, length: q.fur.length * k };
  return q;
}

function scaleFace(m, k) {
  if (m.head?.at) m.head = { ...m.head, at: mul(m.head.at, k) };
  for (const key of ["eyes", "mouth", "cheeks"]) {
    if (!m[key]) continue;
    m[key] = { ...m[key] };
    if (m[key].at) m[key].at = mul(m[key].at, k);
    if (m[key].size != null) m[key].size *= k;
  }
  if (m.brows?.size != null) m.brows = { ...m.brows, size: m.brows.size * k };
}

function recolorModel(m, map) {
  const rc = (c) => (c != null && map[c] != null ? map[c] : c);
  m.parts = m.parts.map((p) => (p.c != null ? { ...p, c: rc(p.c) } : p));
  if (m.color != null) m.color = rc(m.color);
  for (const key of ["eyes", "mouth", "cheeks", "brows"]) {
    if (!m[key]) continue;
    m[key] = { ...m[key] };
    for (const f of ["color", "iris", "lid", "white", "rim"]) if (m[key][f] != null) m[key][f] = rc(m[key][f]);
  }
}

/** Build one variant from its (already expanded) base. */
export function applyVariant(base, v) {
  const m = clone(base);
  if (v.scale != null) {
    m.parts = m.parts.map((p) => scalePart(p, v.scale));
    scaleFace(m, v.scale);
  }
  if (v.recolor) recolorModel(m, v.recolor);
  if (v.dropIndex) {
    for (const i of v.dropIndex) if (!(Number.isInteger(i) && i >= 0 && i < m.parts.length)) throw new Error(`variant of ${v.like}: dropIndex ${i} is not a part number (0-${m.parts.length - 1})`);
    const gone = new Set(v.dropIndex);
    m.parts = m.parts.filter((_, i) => !gone.has(i));
  }
  if (v.drop) {
    const drop = new Set(v.drop);
    m.parts = m.parts.filter((p) => !drop.has(p.name));
  }
  for (const [key, val] of Object.entries(v)) {
    if (OWN_KEYS.has(key)) continue;
    m[key] = FACE_KEYS.includes(key) && val && typeof val === "object" && !Array.isArray(val) && m[key] ? { ...m[key], ...clone(val) } : clone(val);
  }
  if (v.add) m.parts.push(...clone(v.add));
  m.variantOf = v.like;
  return m;
}

/**
 * Expand every `like` entry in place ({ critters, props } as read from the model files). Throws on an unknown
 * base, a cycle, a drop that names no part, or a variant whose result has no parts.
 */
export function expandVariants(models) {
  const find = (name) => models.critters[name] ?? models.props[name];
  const done = new Set();
  const expand = (name, stack) => {
    const entry = find(name);
    if (!entry?.like || done.has(name)) return entry;
    if (stack.includes(name)) throw new Error(`catalog variant cycle: ${[...stack, name].join(" -> ")}`);
    const baseName = entry.like;
    if (!find(baseName)) throw new Error(`catalog variant "${name}": unknown base "${baseName}"`);
    const base = expand(baseName, [...stack, name]);
    for (const n of entry.drop ?? []) if (!base.parts.some((p) => p.name === n)) throw new Error(`catalog variant "${name}": drop "${n}" names no part of "${baseName}"`);
    const out = applyVariant(base, entry);
    const section = models.critters[name] ? "critters" : "props";
    models[section][name] = out;
    done.add(name);
    return out;
  };
  for (const section of ["critters", "props"]) for (const name of Object.keys(models[section])) expand(name, []);
  return models;
}
