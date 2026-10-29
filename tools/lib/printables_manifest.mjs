// The printables taxonomy and manifest (docs/PRINTABLES_SPEC.md sections 2 and 6). Pure: no I/O. The manifest is
// one JSON file the site fetches once and searches on the client.

export const MANIFEST_SCHEMA = 1;

export const GRADE_LABELS = { prek: "Pre-K", k: "Kindergarten", 1: "Grade 1", 2: "Grade 2", 3: "Grade 3", 4: "Grade 4", 5: "Grade 5" };
export const GRADE_ORDER = ["prek", "k", "1", "2", "3", "4", "5"];

/** "prek", "k", "g1" ... "g5": the grade part of ids and folder names. */
export const gradeTag = (g) => (/^\d$/.test(g) ? `g${g}` : g);

/** Subjects (the top-level category), each with the skills-map strands it holds. */
export const CATEGORIES = [
  { id: "math", label: "Math", strands: ["numbers", "operations", "measure_shapes"] },
  { id: "phonics", label: "Phonics & Sight Words", strands: ["phonics", "sight_words"] },
  { id: "reading", label: "Reading", strands: ["reading"] },
  { id: "writing", label: "Writing & Handwriting", strands: ["handwriting"] },
  { id: "grammar", label: "Grammar & Vocabulary", strands: ["grammar"] },
  { id: "science", label: "Science & Social Studies", strands: ["science_social"] },
  { id: "logic", label: "Logic & Puzzles", strands: ["logic"] },
  { id: "art", label: "Colouring & Drawing", strands: ["art"] },
];

export const CATEGORY_OF_STRAND = Object.fromEntries(CATEGORIES.flatMap((c) => c.strands.map((s) => [s, c.id])));

/** The format a child sees (the "type" filter), from the engine activity. */
export const TYPE_OF_ACTIVITY = {
  trace_letters: "tracing", trace_shapes: "tracing", shape_lesson: "lesson", colour_page: "colouring", colour_by_shape: "colouring",
  draw_prompt: "drawing", find_shapes: "puzzle", match: "puzzle", pattern: "puzzle", maze: "maze", dot_to_dot: "dot-to-dot",
  word_search: "word-search", count: "worksheet", math_facts: "worksheet", number_line: "worksheet", place_value: "worksheet",
  clock: "worksheet", coins: "worksheet", fractions: "worksheet", choose: "quiz", read_passage: "reading", write_lines: "writing",
};

export const TYPES = [
  { id: "worksheet", label: "Worksheets" }, { id: "quiz", label: "Quizzes" }, { id: "reading", label: "Reading passages" },
  { id: "writing", label: "Writing" }, { id: "tracing", label: "Tracing" }, { id: "lesson", label: "Lessons" },
  { id: "word-search", label: "Word searches" }, { id: "maze", label: "Mazes" }, { id: "dot-to-dot", label: "Dot-to-dot" },
  { id: "puzzle", label: "Puzzles" }, { id: "colouring", label: "Colouring" }, { id: "drawing", label: "Drawing" },
];

/** Engine activities used by a workbook script, in page order. */
export function activitiesOf(script) {
  const seen = [];
  for (const doc of script.documents) for (const p of doc.pages || []) for (const b of p.blocks) if (!seen.includes(b.activity)) seen.push(b.activity);
  return seen;
}

/** Kinds that families look for most often rank first after the featured list (a stand-in until the site has data). */
const TYPE_WEIGHT = { tracing: 9, maze: 8, colouring: 8, "dot-to-dot": 7, worksheet: 7, "word-search": 6, lesson: 6, reading: 5, puzzle: 5, quiz: 4, writing: 4, drawing: 3 };

/**
 * @param {{ item: object, files: { pdf: string, pdfBytes: number, pages: number, key?: string|null, keyBytes?: number, keyPages?: number, thumb: string, thumbW: number, thumbH: number, hash: string } }[]} entries
 * @param {{ featured?: string[], previous?: object|null, featuredCount?: number }} [opts]
 * @returns {object} the manifest (MANIFEST_SCHEMA 1)
 */
export function buildManifest(entries, opts = {}) {
  const { featured = [], previous = null, featuredCount = 24 } = opts;
  const ids = new Set();
  for (const { item } of entries) {
    if (ids.has(item.id)) throw new Error(`duplicate printable id ${item.id}`);
    ids.add(item.id);
    if (!CATEGORIES.some((c) => c.id === item.category)) throw new Error(`${item.id}: unknown category ${item.category}`);
    if (!GRADE_ORDER.includes(item.grade)) throw new Error(`${item.id}: unknown grade ${item.grade}`);
  }
  const prev = new Map((previous?.items || []).map((it) => [it.id, it]));
  const types = (item) => [...new Set(activitiesOf(item.script).map((a) => TYPE_OF_ACTIVITY[a]).filter(Boolean))];

  // Rank: the featured list in its order, then the categories taken in turn, each by type weight, grade and id, so
  // any slice of the ranking mixes subjects (a total, stable order).
  const pick = featured.filter((id) => ids.has(id)).slice(0, featuredCount);
  const score = (e) => Math.max(0, ...types(e.item).map((t) => TYPE_WEIGHT[t] || 0));
  const queues = CATEGORIES.map((c) => entries.filter((e) => e.item.category === c.id && !pick.includes(e.item.id)).sort((a, b) => score(b) - score(a)
    || GRADE_ORDER.indexOf(a.item.grade) - GRADE_ORDER.indexOf(b.item.grade) || (a.item.id < b.item.id ? -1 : 1)));
  const order = pick.map((id) => entries.find((e) => e.item.id === id));
  while (queues.some((q) => q.length)) for (const q of queues) if (q.length) order.push(q.shift());
  const rank = new Map(order.map((e, i) => [e.item.id, i + 1]));

  const items = entries.map(({ item, files }) => {
    const old = prev.get(item.id);
    const version = !old ? 1 : old.hash === files.hash ? old.version : old.version + 1;
    return {
      id: item.id, title: item.title, description: item.description, category: item.category, strand: item.strand, grade: item.grade,
      skills: item.skills, types: types(item), tags: item.tags, keywords: item.keywords.join(" "),
      pages: files.pages, pdf: files.pdf, pdfBytes: files.pdfBytes,
      answerKey: files.key || null, answerKeyPages: files.key ? files.keyPages : 0, answerKeyBytes: files.key ? files.keyBytes : 0,
      thumb: files.thumb, thumbW: files.thumbW, thumbH: files.thumbH,
      rank: rank.get(item.id), featured: pick.includes(item.id), version, hash: files.hash,
    };
  }).sort((a, b) => a.rank - b.rank);

  const used = (key, id) => items.filter((it) => it[key] === id).length;
  const strandLabels = opts.strandLabels || {};
  return {
    schema: MANIFEST_SCHEMA,
    version: buildVersion(items),
    generator: "StickMan tools/printables.mjs",
    count: items.length,
    totalBytes: items.reduce((n, it) => n + it.pdfBytes + it.answerKeyBytes, 0),
    grades: GRADE_ORDER.map((id) => ({ id, label: GRADE_LABELS[id], count: used("grade", id) })),
    categories: CATEGORIES.map((c) => ({ id: c.id, label: c.label, count: used("category", c.id),
      strands: c.strands.map((s) => ({ id: s, label: strandLabels[s] || (s === "art" ? "Colouring and drawing" : s), count: used("strand", s) })) })),
    types: TYPES.map((t) => ({ ...t, count: items.filter((it) => it.types.includes(t.id)).length })),
    items,
  };
}

/** A short content version for the whole set: changes whenever any file changes (FNV-1a over the item hashes). */
export function buildVersion(items) {
  let h = 0x811c9dc5;
  for (const it of [...items].sort((a, b) => (a.id < b.id ? -1 : 1))) for (const ch of `${it.id}:${it.hash};`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0");
}
