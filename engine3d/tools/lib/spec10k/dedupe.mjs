// Duplicate detection across specs and existing episodes. Text is normalised (lower case, no accents or
// punctuation, stop words out, light stemming); candidates come from MinHash LSH over word shingles so 10,000+
// records stay fast; each candidate pair is then scored with IDF-weighted Jaccard, so words every title in a
// series shares ("alphabet train") count little and the distinguishing words ("g", "volcano") count a lot.
// Deterministic: fixed hash seeds, stable ordering.

const STOP = new Set(("a an the and or but of to in on at by for with from into onto is are was were be been it its this that these those " +
  "we you your our us i me my he she they them their his her what which who whom how why when where can will let lets s t do does did " +
  "so as if then than up out about over all any some each every very just also not no yes oh ok okay").split(" "));

/** Normalise text to tokens. Numbers and single letters are kept (they often carry the difference). */
export function tokens(text) {
  return String(text ?? "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim().split(" ")
    .filter((w) => w && !STOP.has(w))
    .map(stem);
}

export function stem(w) {
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("es") && /(sh|ch|x|ss)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export const normalise = (text) => tokens(text).join(" ");

/** Word unigrams plus bigrams (bigrams keep some word order). */
export function shingles(text) {
  const t = tokens(text);
  const out = new Set(t);
  for (let i = 1; i < t.length; i++) out.add(`${t[i - 1]}_${t[i]}`);
  return out;
}

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

const NUM_HASH = 63;
const BAND_ROWS = 3; // 21 bands of 3 rows: a pair with (rare-shingle) Jaccard 0.5 is a candidate ~94% of the time, 0.4 ~75%
const SEEDS = (() => {
  let x = 0x9e3779b9;
  const next = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x; };
  return Array.from({ length: NUM_HASH }, () => [next() | 1, next()]);
})();

function minhash(set) {
  const sig = new Array(NUM_HASH).fill(0xffffffff);
  for (const sh of set) {
    const h = fnv1a(sh);
    for (let i = 0; i < NUM_HASH; i++) {
      const v = (Math.imul(SEEDS[i][0], h) + SEEDS[i][1]) >>> 0;
      if (v < sig[i]) sig[i] = v;
    }
  }
  return sig;
}

/**
 * IDF-weighted Jaccard of two shingle sets.
 * @param {Set<string>} a
 * @param {Set<string>} b
 * @param {(s: string) => number} w  weight per shingle
 */
export function weightedJaccard(a, b, w) {
  let inter = 0, uni = 0;
  for (const x of a) { const wx = w(x); uni += wx; if (b.has(x)) inter += wx; }
  for (const x of b) if (!a.has(x)) uni += w(x);
  return uni ? inter / uni : 0;
}

/** Thresholds per field (IDF-weighted Jaccard); exact = same normalised text. */
export const THRESHOLDS = { title: 0.72, objective: 0.7, hook: 0.6, story: 0.55 };

/**
 * Find exact and near duplicates per field.
 * @param {{ id: string, source: "spec" | "existing", fields: Record<string, string> }[]} records
 * @param {{ thresholds?: Record<string, number>, allow?: { a: string, b: string, field?: string }[] }} [opts]
 * @returns {{ field: string, a: string, b: string, kind: "exact" | "near", score: number, textA: string, textB: string }[]}
 */
export function findDuplicates(records, opts = {}) {
  const thr = { ...THRESHOLDS, ...(opts.thresholds ?? {}) };
  const allowed = new Set((opts.allow ?? []).flatMap((p) => [`${p.field ?? "*"}|${p.a}|${p.b}`, `${p.field ?? "*"}|${p.b}|${p.a}`]));
  const isAllowed = (f, a, b) => allowed.has(`${f}|${a}|${b}`) || allowed.has(`*|${a}|${b}`);
  const out = [];
  for (const field of Object.keys(thr)) {
    const docs = records.map((r) => ({ id: r.id, source: r.source, text: r.fields[field] ?? "" })).filter((d) => normalise(d.text));
    const sets = docs.map((d) => shingles(d.text));
    const df = new Map();
    for (const s of sets) for (const x of s) df.set(x, (df.get(x) ?? 0) + 1);
    const N = Math.max(docs.length, 2);
    const w = (x) => Math.log(1 + N / (df.get(x) ?? 1));
    const seen = new Set();
    const report = (i, j, kind, score) => {
      const [a, b] = docs[i].id < docs[j].id ? [i, j] : [j, i];
      const key = `${a}|${b}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (docs[a].source === "existing" && docs[b].source === "existing") return; // not our business
      if (docs[a].id === docs[b].id) return;
      if (isAllowed(field, docs[a].id, docs[b].id)) return;
      out.push({ field, a: docs[a].id, b: docs[b].id, kind, score: Math.round(score * 1000) / 1000, textA: docs[a].text, textB: docs[b].text });
    };
    // Exact.
    const byNorm = new Map();
    docs.forEach((d, i) => { const n = normalise(d.text); if (!byNorm.has(n)) byNorm.set(n, []); byNorm.get(n).push(i); });
    for (const group of byNorm.values()) for (let x = 1; x < group.length; x++) report(group[0], group[x], "exact", 1);
    // Near: LSH candidates, then weighted Jaccard.
    // Shingles in more than 5% of the documents (series words, the cast) are left out of the MinHash: they carry
    // little IDF weight anyway and would put thousands of records in one bucket.
    const common = Math.max(50, 0.05 * docs.length);
    const buckets = new Map();
    sets.forEach((s, i) => {
      const rare = new Set([...s].filter((x) => df.get(x) <= common));
      const sig = minhash(rare.size ? rare : s);
      for (let band = 0; band < NUM_HASH / BAND_ROWS; band++) {
        const key = `${band}:${sig.slice(band * BAND_ROWS, band * BAND_ROWS + BAND_ROWS).join(",")}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(i);
      }
    });
    const tried = new Set();
    for (const group of buckets.values()) {
      if (group.length < 2) continue;
      for (let x = 0; x < group.length; x++) for (let y = x + 1; y < group.length; y++) {
        const i = group[x], j = group[y];
        const k = i < j ? i * 1e6 + j : j * 1e6 + i;
        if (tried.has(k)) continue;
        tried.add(k);
        const score = weightedJaccard(sets[i], sets[j], w);
        if (score >= thr[field] && score < 1) report(i, j, "near", score);
        else if (score >= 1 && normalise(docs[i].text) !== normalise(docs[j].text)) report(i, j, "near", score);
      }
    }
  }
  return out.sort((p, q) => (p.field < q.field ? -1 : p.field > q.field ? 1 : q.score - p.score || (p.a < q.a ? -1 : 1)));
}

/**
 * Same primary standard and the same distinct_by (sub-skill, example set, difficulty): a re-skin.
 * @param {object[]} specs
 */
export function sameDistinctBy(specs) {
  const seen = new Map();
  const out = [];
  for (const s of specs) {
    if (!s?.distinct_by || !s.standards?.length) continue;
    const key = [s.standards[0], normalise(s.distinct_by.sub_skill), normalise(s.distinct_by.example_set), s.distinct_by.difficulty].join("|");
    if (seen.has(key)) out.push({ a: seen.get(key), b: s.id, key });
    else seen.set(key, s.id);
  }
  return out;
}

/** Dedupe records from specs. */
export function specRecord(s) {
  return {
    id: s.id, source: "spec",
    fields: {
      title: s.title,
      objective: s.objective,
      hook: [s.hook?.promise, s.hook?.line, s.hook?.visual].join(". "),
      story: [s.story?.premise, s.story?.problem, s.story?.resolution].join(". "),
    },
  };
}

/** Dedupe records from an existing episode (title and YouTube title are both checked as titles). */
export function existingRecords(e) {
  const out = [{ id: e.id, source: "existing", fields: { title: e.title, story: e.story } }];
  if (e.ytTitle) out.push({ id: `${e.id}~yt`, source: "existing", fields: { title: e.ytTitle.split("|")[0] } });
  return out;
}
