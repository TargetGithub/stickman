// The printables set (docs/PRINTABLES_SPEC.md section 4): every standalone printable the KidsLearningPlatform site
// serves, as a list of items { id, title, description, category, strand, grade, skills, tags, keywords, script }.
// Pure and deterministic: the same catalog gives the same items in the same order. Printing is tools/printables.mjs.

import { GRADES, GRADE_RULES } from "../../engine/workbook/grades.js";
import { CATEGORY_OF_STRAND, gradeTag } from "./printables_manifest.mjs";

/** A stable seed per item id (FNV-1a, 31 bits). */
export function seedOf(id) {
  let h = 0x811c9dc5;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return h & 0x7fffffff;
}

const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const titleCase = (s) => s.replace(/_/g, " ").replace(/\b[a-z]/g, (c) => c.toUpperCase());
const gi = (g) => GRADES.indexOf(g);
const uniq = (xs) => [...new Set(xs.filter(Boolean))];

/** Page instructions read aloud by a grown-up; short enough for every grade (pre-K allows 50 characters). */
function instructionsFor(b) {
  switch (b.activity) {
    case "choose": return "Circle the best answer.";
    case "math_facts": return "Solve each problem.";
    case "number_line": return "Write the missing numbers.";
    case "place_value": return b.task === "expand" ? "Write each number in expanded form." : "Count the blocks. Write the number.";
    case "clock": return b.task === "draw" ? "Draw the hands to show each time." : "Write the time on each clock.";
    case "coins": return "Add up the money. Write the total.";
    case "fractions": return b.task === "shade" ? "Shade each shape to show the fraction." : "Write the fraction that is shaded.";
    case "read_passage": return "Read, then answer the questions.";
    case "write_lines": return b.model ? "Copy the sentence on the lines." : "Write your answer on the lines.";
    case "trace_letters": return "Trace, then write on your own.";
    case "trace_shapes": return "Trace each shape.";
    case "word_search": return "Find and circle each word.";
    case "maze": return "Find the way through the maze.";
    case "dot_to_dot": return "Join the dots, starting at 1.";
    case "count": return "Count. Write how many.";
    case "pattern": return "Draw what comes next.";
    case "find_shapes": return `Colour every ${b.target.replace(/_/g, " ")}. How many?`;
    case "colour_by_shape": return "Colour each shape by the key.";
    case "colour_page": return "Colour the picture.";
    case "match": return "Draw a line to match.";
    case "draw_prompt": return "Draw in the box.";
    default: return undefined;
  }
}

/**
 * Items whose stream from the plain id seed hits a generator gap get a salted seed. coins can draw a total it cannot
 * make in 9 pieces ($4.59 at grade 3); the validator catches it, so the set never ships a broken page.
 */
const SEED_SALT = { "g3-money-dollars": "4" };

/** One item: pages [{ title?, blocks, layout? }] become a student document and, where pages have answers, a key. */
function item(meta, pages) {
  const id = `${gradeTag(meta.grade)}-${kebab(meta.slug)}`;
  const script = {
    kind: "workbook",
    version: 1,
    title: meta.title,
    seed: seedOf(SEED_SALT[id] ? `${id}#${SEED_SALT[id]}` : id),
    grade: meta.grade,
    page: { size: "letter" },
    documents: [
      { id: "student", title: meta.title, pages: pages.map((p, i) => ({
        id: `p${i + 1}`,
        title: p.title || meta.title,
        ...(p.instructions !== null && (p.instructions || instructionsFor(p.blocks[0])) ? { instructions: p.instructions || instructionsFor(p.blocks[0]) } : {}),
        ...(p.layout ? { layout: p.layout } : {}),
        blocks: p.blocks,
      })) },
      { id: "answers", answersFor: "student", title: meta.title },
    ],
  };
  const category = meta.category || CATEGORY_OF_STRAND[meta.strand];
  return {
    id, title: meta.title, description: meta.description, category, strand: meta.strand, grade: meta.grade,
    skills: meta.skills || [], tags: uniq(meta.tags || []), keywords: uniq(meta.keywords || []), script,
  };
}

// ---- skill sheets: one per skill in education/skills.json, its example plus a second page where that is new practice

const SKILL_TITLES = {
  letter_look_alikes_prek: "Letter Look-Alikes", count_to_5_prek: "Count to 5", add_pictures_prek: "Adding Within 5",
  ab_patterns_prek: "AB Patterns", count_to_10_k: "Count to 10", number_line_10_k: "Number Lines to 10",
  add_within_10_k: "Addition Within 10", sub_within_10_k: "Subtraction Within 10", make_ten_k: "Make Ten",
  add_within_20_1: "Addition Within 20", sub_within_20_1: "Subtraction Within 20", tens_ones_1: "Tens and Ones",
  add_tens_1: "Adding Tens", time_half_hour_1: "Time to the Half Hour", coins_1: "Counting Coins",
  add_2digit_regroup_2: "2-Digit Addition with Regrouping", sub_2digit_borrow_2: "2-Digit Subtraction with Regrouping",
  time_5_minutes_2: "Time to 5 Minutes", units_2: "Units of Measure", add_3digit_3: "3-Digit Addition",
  sub_3digit_3: "3-Digit Subtraction", place_value_4digit_3: "Place Value to Thousands", time_minute_3: "Time to the Minute",
  add_sub_4digit_4: "4-Digit Subtraction", multi_digit_mul_4: "2-Digit by 1-Digit Multiplication",
  long_division_4: "Long Division", decimals_tenths_4: "Adding Tenths", place_value_large_4: "Place Value to Hundred Thousands",
  multi_digit_mul_5: "3-Digit by 2-Digit Multiplication", two_digit_divisors_5: "Dividing by 2-Digit Numbers",
  decimals_hundredths_5: "Adding Hundredths", volume_conversion_5: "Volume and Unit Conversion", copy_words_k: "Copy Words",
  first_words_prek: "First Words", listening_prek: "Listening Story", decodable_story_k: "Read a Short Story",
  story_details_1: "Story Details", nonfiction_facts_1: "Nonfiction Facts", sequence_inference_2: "Sequence and Inference",
  theme_character_3: "Theme and Character", theme_point_of_view_5: "Theme and Point of View",
  main_idea_evidence_5: "Main Idea and Evidence", spelling_3: "Grade 3 Spelling Words", spelling_4: "Grade 4 Spelling Words",
  spelling_5: "Grade 5 Spelling Words", word_families_k: "Word Family -at", blends_1: "Consonant Blends",
  skip_count_patterns_1: "Skip Counting by 2s", skip_count_2: "Skip Counting by 5s", money_dollars_3: "Dollars and Cents",
  area_perimeter_3: "Area and Perimeter", deduction_5: "Logic Puzzles", negative_numbers_5: "Counting Back Past Zero",
};

/** Titles for names that do not read well title-cased (keyed by the name without its grade suffix). */
const NICE = {
  coins_quarters: "Counting Quarters", cause_effect: "Cause and Effect", nouns_verbs: "Nouns and Verbs", problem_solution: "Problem and Solution",
  synonyms_antonyms: "Synonyms and Antonyms", parts_of_speech: "Parts of Speech", rules_citizenship: "Rules and Citizenship",
  weather_seasons: "Weather and Seasons", needs_wants: "Needs and Wants", earth_space: "Earth and Space", halves_quarters: "Halves and Quarters",
  prefixes_suffixes: "Prefixes and Suffixes", powers_of_ten: "Powers of Ten", fractions_concepts: "Fraction Concepts", time_elapsed: "Elapsed Time",
  essay: "Explanatory Essay", paragraph: "Write a Paragraph", sentences: "Complete Sentences", hundreds: "Hundreds, Tens and Ones",
  thirds: "Thirds and Fourths", pennies: "Counting Pennies",
};
const niceTitle = (base) => NICE[base] || titleCase(base);

/** Skills whose example is covered by a bigger pack below; the pack carries the skill id instead. */
const PACKED = new Set(["shape_lesson", "maze", "dot_to_dot"]);

const bump = (b, key, d, lo, hi) => ({ ...b, [key]: Math.max(lo, Math.min(hi, (b[key] ?? 4) + d)) });

/** Pages for a skill's example block. */
function skillPages(ex, ed) {
  switch (ex.activity) {
    case "choose": {
      // The whole question set, split evenly into pages of about the example's count (inline, so no question repeats).
      const qs = ed.questions.sets[ex.set].questions;
      const per = ex.count || 6;
      const n = Math.ceil(qs.length / per);
      const size = Math.ceil(qs.length / n);
      return Array.from({ length: n }, (_, i) => ({ blocks: [{ activity: "choose", questions: qs.slice(i * size, (i + 1) * size) }] }));
    }
    case "math_facts": {
      const t = ed.math.templates[ex.template];
      const forced = t.missing && t.missing !== "answer";
      const form = t.form === "stacked" ? "across" : "stacked";
      const second = forced || t.op === "÷" && form === "across" && t.form === "stacked" ? { ...ex, count: (ex.count || t.count) + (ex.count >= 20 ? -4 : 2) } : { ...ex, form };
      return [{ blocks: [ex] }, { blocks: [second] }];
    }
    case "number_line":
      // Lines that count back cross zero again on the second page; others draw new starts with the same step.
      if (ex.rows?.some((r) => r.step < 0)) return [{ blocks: [ex] }, { blocks: [{ ...ex, rows: [{ start: 3, step: -1 }, { start: 6, step: -2 }, { start: 15, step: -5 }] }] }];
      return [{ blocks: [ex] }, { blocks: [ex.rows ? { activity: "number_line", step: ex.rows[0].step, count: 3, length: ex.length, ...(ex.blanks ? { blanks: ex.blanks } : {}) } : bump(ex, "count", 1, 1, 6)] }];
    case "clock":
      return [{ blocks: [ex] }, { blocks: [{ ...ex, task: ex.task === "draw" ? "read" : "draw" }] }];
    case "coins":
      return [{ blocks: [ex] }, { blocks: [ex.totals ? { activity: "coins", count: 4 } : bump(ex, "count", -1, 1, 6)] }];
    case "place_value":
      return [{ blocks: [ex] }, { blocks: [ex.numbers ? { activity: "place_value", task: ex.task, count: 4 } : bump(ex, "count", -1, 1, 8)] }];
    case "fractions":
      return [{ blocks: [ex] }, { blocks: [{ ...ex, task: ex.task === "shade" ? "name" : "shade" }] }];
    case "count":
      return [{ blocks: [ex] }, { blocks: [{ ...ex, item: { shape: ex.item.shape === "star" ? "heart" : "star" }, groups: [...ex.groups].reverse() }] }];
    case "pattern":
      return [{ blocks: [ex] }, { blocks: [{ ...ex, repeat: "AAB" }] }, { blocks: [{ ...ex, repeat: "ABB" }] }];
    default:
      return [{ blocks: [ex] }];
  }
}

function skillSheets(ed) {
  const out = [];
  for (const [name, k] of Object.entries(ed.skills.skills)) {
    if (PACKED.has(k.example.activity)) continue;
    const src = k.example.set ? ed.questions.sets[k.example.set] : k.example.passage ? ed.passages.passages[k.example.passage] : k.example.template ? ed.math.templates[k.example.template] : null;
    const title = SKILL_TITLES[name] || niceTitle(name.replace(/_(prek|k|\d)$/, ""));
    const words = k.example.words || [];
    out.push(item({
      slug: name.replace(/_(prek|k|\d)$/, ""), title, grade: k.grade, strand: k.strand, skills: [name],
      description: `${k.description}${src?.description && src.description !== k.description ? ` ${src.description}` : ""}`,
      tags: [...k.tags, ...(src?.tags || [])],
      keywords: [...words, ...(k.example.text ? [k.example.text] : []), src?.title],
    }, skillPages(k.example, ed)));
  }
  return out;
}

// ---- packs built from the education catalog

const skillsAt = (ed, test) => Object.entries(ed.skills.skills).filter(([, k]) => test(k)).map(([n]) => n);

function shapePacks(ed) {
  const shapes = Object.entries(ed.shapes);
  return shapes.map(([name, s]) => {
    const grade = s.grade;
    const others = shapes.filter(([n, o]) => n !== name && gi(o.grade) <= gi(grade)).map(([n]) => n);
    const distractors = [others[seedOf(name) % others.length], others[(seedOf(name) >> 5) % others.length]].filter((d, i, a) => a.indexOf(d) === i);
    const label = name.replace(/_/g, " ");
    const count = Math.min(GRADE_RULES[grade].countMax, 6);
    return item({
      slug: `shape-${name}`, title: `Meet the ${titleCase(name)}`, grade, strand: "measure_shapes",
      description: `${s.description} A lesson page, tracing and a find-the-${label} hunt.`,
      skills: skillsAt(ed, (k) => k.example.activity === "shape_lesson" && k.grade === grade),
      tags: ["shapes", "geometry", ...(s.tags || [])], keywords: [label, ...(s.examples || [])],
    }, [
      { blocks: [{ activity: "shape_lesson", shape: name }], instructions: null },
      { title: `Trace the ${titleCase(name)}`, blocks: [{ activity: "trace_shapes", shapes: [name] }] },
      { title: `Find the ${titleCase(name)}s`, blocks: [{ activity: "find_shapes", target: name, count, distractors }] },
    ]);
  });
}

function letterPacks(ed) {
  const glyphs = ed.letters.glyphs;
  const out = [];
  for (const up of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    const low = up.toLowerCase();
    if (!glyphs[up] || !glyphs[low]) continue;
    out.push(item({
      slug: `letter-${low}`, title: `Letter ${up}${low}`, grade: "k", strand: "phonics",
      description: `Trace and write the capital ${up} and the lowercase ${low}, with stroke order shown.`,
      skills: ["capital_letters_prek", "lowercase_letters_k"], tags: ["letters", "alphabet", "handwriting", "uppercase", "lowercase"],
      keywords: [`letter ${up}`, `letter ${low}`, "abc"],
    }, [{ title: `Capital ${up}`, blocks: [{ activity: "trace_letters", text: up }] }, { title: `Lowercase ${low}`, blocks: [{ activity: "trace_letters", text: low }] }]));
  }
  const NAMES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  for (let d = 0; d <= 9; d++) {
    const grade = d <= 5 ? "prek" : "k";
    const pages = [{ title: `The Number ${d}`, blocks: [{ activity: "trace_letters", text: String(d) }] }];
    if (d > 0) pages.push({ title: `Count ${d}`, blocks: [{ activity: "count", item: { shape: ["star", "heart", "circle"][d % 3] }, groups: [d, d] }], instructions: `Count. Write ${d} in the box.` });
    out.push(item({
      slug: `number-${d}`, title: `Number ${d}`, grade, strand: "numbers",
      description: `Trace the number ${d} (${NAMES[d]})${d ? ` and count groups of ${d}` : ""}.`,
      skills: skillsAt(ed, (k) => k.grade === grade && k.example.activity === "count"), tags: ["numbers", "counting", "handwriting", "tracing"],
      keywords: [NAMES[d], `number ${d}`, "123"],
    }, pages));
  }
  return out;
}

/** Topics already covered by a skill sheet's word search, and the strand of each topic. */
const TOPIC_SKIP = new Set(["fam_at", "blends", "spelling_3", "spelling_4", "spelling_5"]);
const TOPIC_STRAND = (t) => /^sight_/.test(t) ? "sight_words" : /^(fam_|cvc|digraphs|silent_e|vowel_teams|compound)/.test(t) ? "phonics"
  : /^(weather|plants|habitats|body|matter|space|earth|ecosystems|community|maps|government|economics)$/.test(t) ? "science_social"
  : /^(math_words|geometry)$/.test(t) ? "measure_shapes" : "grammar";
const TOPIC_TITLES = { sight_prek: "Pre-K Sight Words", sight_k: "Kindergarten Sight Words", sight_1: "Grade 1 Sight Words", sight_2: "Grade 2 Sight Words", sight_3: "Grade 3 Sight Words", cvc_words: "CVC Words", body: "Human Body", silent_e: "Silent E Words", math_words: "Math Words" };

function wordSearches(ed) {
  const out = [];
  for (const [topic, t] of Object.entries(ed.words.topics)) {
    if (TOPIC_SKIP.has(topic)) continue;
    const entries = Object.entries(t.words).filter(([w]) => /^[a-z]+$/i.test(w));
    // The grade is the one most of the words suit, never pre-K (no word search there).
    const gs = entries.map(([, g]) => gi(g)).sort((a, b) => a - b);
    const grade = GRADES[Math.max(1, gs[Math.floor(gs.length / 2)])];
    const r = GRADE_RULES[grade];
    const want = { k: 5, 1: 6, 2: 8 }[grade] || 10;
    const words = entries.filter(([w, g]) => gi(g) <= gi(grade) && w.length <= r.wordGrid).map(([w]) => w.toLowerCase()).slice(0, want);
    if (words.length < 3) continue;
    const label = TOPIC_TITLES[topic] || (topic.startsWith("fam_") ? `Word Family -${topic.slice(4)}` : titleCase(topic));
    const strand = TOPIC_STRAND(topic);
    out.push(item({
      slug: `word-search-${topic.replace(/_/g, "-")}`, title: `${label} Word Search`, grade, strand,
      description: `A word search with ${words.length} ${t.description.replace(/\.$/, "").toLowerCase()} words, with the word list to tick off.`,
      skills: skillsAt(ed, (k) => k.grade === grade && k.strand === strand && k.example.activity === "word_search"),
      tags: ["word-search", "vocabulary", "spelling", ...(t.tags || [])], keywords: [label, ...words],
    }, [{ blocks: [{ activity: "word_search", words }] }]));
  }
  return out;
}

const MAZE_ENDS = [
  [{ preset: "doopi" }, { object: "mushroom_hut" }], [{ preset: "mooka" }, { object: "treasure_chest" }],
  [{ preset: "tara" }, { object: "cake" }], [{ preset: "pip" }, { object: "ice_cream" }],
  [{ preset: "kai" }, { object: "pirate_ship" }], [{ preset: "becky" }, { object: "balloon" }],
  [{ preset: "bo" }, { object: "kite" }], [{ preset: "nani" }, { object: "flower" }],
];

function mazePacks(ed) {
  const out = [];
  GRADES.forEach((grade, g) => {
    const max = GRADE_RULES[grade].mazeMax;
    for (let pack = 0; pack < 2; pack++) {
      const sizes = [0.55, 0.7, 0.85, 1].map((f) => Math.max(4, Math.round(max * f - pack)));
      const pages = sizes.map((n, i) => {
        const [start, end] = MAZE_ENDS[(g * 2 + pack + i) % MAZE_ENDS.length];
        return { title: `Maze ${i + 1}`, blocks: [{ activity: "maze", size: [n, n], start, end }] };
      });
      out.push(item({
        slug: `mazes-${pack + 1}`, title: `Maze Pack ${pack + 1}`, grade, strand: "logic",
        description: `Four mazes from ${sizes[0]} x ${sizes[0]} to ${sizes[3]} x ${sizes[3]}, each with one path from start to finish.`,
        skills: skillsAt(ed, (k) => k.grade === grade && k.example.activity === "maze"), tags: ["mazes", "puzzles", "problem-solving", "fine-motor"],
        keywords: ["maze", "labyrinth", "path"],
      }, pages));
    }
  });
  return out;
}

function dotPacks(ed) {
  const out = Object.entries(ed.dotPictures).map(([name, p]) => item({
    slug: `dot-to-dot-${name}`, title: `Dot-to-Dot ${titleCase(name)}`, grade: p.grade, strand: "logic",
    description: `Join the numbered dots to draw a ${name.replace(/_/g, " ")}, then colour it in.`,
    skills: skillsAt(ed, (k) => k.example.activity === "dot_to_dot"), tags: ["dot-to-dot", "counting", "number-order", "fine-motor"],
    keywords: [name, "connect the dots", "join the dots"],
  }, [{ blocks: [{ activity: "dot_to_dot", subject: { picture: name } }] }]));
  const SHAPES = ["star", "heart", "hexagon", "arrow"];
  for (const grade of ["1", "2", "3", "4", "5"]) {
    const max = Math.min(GRADE_RULES[grade].dotsMax, 40);
    out.push(item({
      slug: "dot-to-dot-shapes", title: "Shape Dot-to-Dots", grade, strand: "logic",
      description: `Four shapes to draw by joining up to ${max} numbered dots.`,
      skills: [], tags: ["dot-to-dot", "number-order", "shapes", "fine-motor"], keywords: [...SHAPES, "connect the dots"],
    }, SHAPES.map((shape, i) => ({ title: `Dot-to-Dot ${titleCase(shape)}`, blocks: [{ activity: "dot_to_dot", subject: { shape }, points: Math.round(max * (0.55 + i * 0.15)) }] }))));
  }
  return out;
}

function colourByShape(ed) {
  return Object.entries(ed.pictures).map(([name, p]) => item({
    slug: `colour-by-shape-${name}`, title: `Colour by Shape: ${titleCase(name)}`, grade: "k", category: "art", strand: "art",
    description: `${p.description || `A ${name} made of shapes.`} Colour each shape with the crayon in the key.`,
    skills: [], tags: ["colouring", "shapes", "colours"], keywords: [name, "color by shape", "colour by code"],
  }, [{ blocks: [{ activity: "colour_by_shape", picture: name }] }]));
}

/** Colouring pages: friendly cast and objects only (no fight gear). */
const COLOURING = [
  ["doopi", "waveA", "kite", "Doopi Flies a Kite"], ["mooka", "danceA1", "cake", "Mooka's Party"], ["tara", "jumpPeak", "balloon", "Tara and the Balloon"],
  ["pip", "sit", "book", "Pip Reads a Book"], ["becky", "dog_sit", "football", "Becky and the Ball"], ["kai", "pointPose", "pirate_ship", "Kai Spots a Ship"],
  ["nani", "stand", "watering_can", "Nani's Garden"], ["bo", "waveB", "bus", "Bo Waits for the Bus"], ["peepa", "danceB1", "ice_cream", "Peepa's Ice Cream"],
  ["tutu", "shrugPose", "snowball", "Tutu in the Snow"], ["zizi", "runA", "bike", "Zizi Goes Riding"], ["kony", "sit", "picnic_blanket", "Kony's Picnic"],
];

function colouringPages() {
  return COLOURING.map(([preset, pose, object, title], i) => item({
    slug: `colouring-${preset}`, title, grade: i % 2 ? "k" : "prek", category: "art", strand: "art",
    description: `A big colouring page of ${titleCase(preset)} with a ${object.replace(/_/g, " ")}, plus a page to draw your own picture.`,
    skills: [], tags: ["colouring", "characters", "fine-motor", "drawing"], keywords: [preset, object.replace(/_/g, " "), "coloring page", "color"],
  }, [
    { blocks: [{ activity: "colour_page", art: [{ preset, pose }, { object }] }] },
    { title: "Your Turn to Draw", blocks: [{ activity: "draw_prompt", prompt: `Draw ${titleCase(preset)} a new friend.`, starter: { preset } }], instructions: null },
  ]));
}

/** Pattern and matching packs for the youngest grades. */
function logicPacks(ed) {
  const SEQS = [["circle", "square"], ["star", "heart"], ["triangle", "circle", "square"], ["heart", "oval"]];
  const out = ["prek", "k", "1"].map((grade) => item({
    slug: "patterns", title: "What Comes Next?", grade, strand: "logic",
    description: "Picture patterns (AB, AAB, ABB, ABC) to finish by drawing the missing shapes.",
    skills: skillsAt(ed, (k) => k.example.activity === "pattern"), tags: ["patterns", "shapes", "reasoning"], keywords: ["pattern", "sequence", "what comes next"],
  }, SEQS.map((s, i) => ({ title: `Pattern ${i + 1}`, blocks: [{ activity: "pattern", sequence: s.map((shape) => ({ shape })), repeat: s.length === 3 ? "ABC" : ["AB", "AAB", "ABB", "AB"][i] }] }))));
  const SETS = { k: ["circle", "square", "triangle", "star"], 1: ["hexagon", "pentagon", "octagon", "diamond", "oval"], 2: ["trapezoid", "parallelogram", "kite", "heptagon", "right_triangle", "semicircle"] };
  for (const [grade, shapes] of Object.entries(SETS)) {
    out.push(item({
      slug: "match-shape-names", title: "Match the Shape Names", grade, strand: "measure_shapes",
      description: `Draw lines to match ${shapes.length} shapes to their names: ${shapes.map((s) => s.replace(/_/g, " ")).join(", ")}.`,
      skills: [], tags: ["matching", "shapes", "vocabulary"], keywords: [...shapes.map((s) => s.replace(/_/g, " ")), "match"],
    }, [{ blocks: [{ activity: "match", pairs: shapes.map((shape) => [{ shape }, { text: shape.replace(/_/g, " ") }]) }] }]));
  }
  return out;
}

const TEMPLATE_TITLES = {
  add_2digit_1digit: "Add 1-Digit to 2-Digit Numbers", add_2digit_no_regroup: "2-Digit Addition", sub_2digit_no_borrow: "2-Digit Subtraction",
  add_3digit_no_regroup: "3-Digit Addition, No Regrouping", mul_facts_0_5: "Multiplication Facts 0-5", mul_facts_6_10: "Multiplication Facts 6-10",
  mul_by_tens: "Multiply by Multiples of Ten", add_4digit: "4-Digit Addition", mul_2digit_by_2digit: "2-Digit by 2-Digit Multiplication",
  sub_decimals_tenths: "Subtracting Tenths", div_4digit_by_1digit: "Long Division, 4-Digit Numbers", sub_decimals_hundredths: "Subtracting Hundredths",
};

/** Math templates, question sets and passages no skill sheet uses get a sheet of their own. */
function leftovers(ed) {
  const used = (key) => new Set(Object.values(ed.skills.skills).map((k) => k.example[key]).filter(Boolean));
  const out = [];
  const usedT = used("template");
  for (const [name, t] of Object.entries(ed.math.templates)) {
    if (usedT.has(name)) continue;
    const strand = /^(mul|div)|decimal/.test(name) || t.op === "×" || t.op === "÷" ? "operations" : "numbers";
    const ex = { activity: "math_facts", template: name, count: t.count };
    out.push(item({
      slug: name.replace(/_/g, "-"), title: TEMPLATE_TITLES[name] || titleCase(name).slice(0, 40), grade: t.grade, strand,
      description: `${t.description} Two pages of practice.`, skills: [], tags: ["math-facts", "practice", ...(t.tags || [])], keywords: [t.op === "×" ? "multiplication" : t.op === "÷" ? "division" : t.op === "+" ? "addition" : "subtraction"],
    }, skillPages(ex, ed)));
  }
  const usedS = used("set");
  for (const [name, s] of Object.entries(ed.questions.sets)) {
    if (usedS.has(name)) continue;
    out.push(item({
      slug: name.replace(/_(prek|k|\d)$/, ""), title: niceTitle(name.replace(/_(prek|k|\d)$/, "")), grade: s.grade, strand: s.strand,
      description: s.description, skills: [], tags: ["quiz", ...(s.tags || [])], keywords: [],
    }, skillPages({ activity: "choose", set: name, count: 6 }, ed)));
  }
  const usedP = used("passage");
  for (const [name, p] of Object.entries(ed.passages.passages)) {
    if (usedP.has(name)) continue;
    out.push(item({
      slug: `story-${name.replace(/_/g, "-")}`, title: p.title, grade: p.grade, strand: "reading",
      description: p.description || `Read "${p.title}" and answer the questions.`, skills: [], tags: ["reading", "comprehension", ...(p.tags || [])], keywords: [p.title],
    }, [{ blocks: [{ activity: "read_passage", passage: name }] }]));
  }
  return out;
}

/** Original sentences and prompts for writing practice, two sheets per grade from K. */
const WRITING = {
  k: [["I see a cat.", "We can run."], ["Tell about your pet.", "Mom has a red hat."]],
  1: [["The dog ran to the park.", "I like to read books."], ["My friend and I play tag.", "Tell about your best day."]],
  2: [["Frogs can jump very far.", "Tell how to make a sandwich."], ["The wind blew the leaves away.", "Write about a time you helped someone."]],
  3: [["Describe your favourite season and why you like it.", "Write a story about a lost key."], ["Explain how to care for a plant.", "Tell about a place you would like to visit."]],
  4: [["Write a letter to a friend about your week.", "Describe a tool that makes life easier."], ["Should kids have homework? Give your opinion.", "Write a story that starts at a train station."]],
  5: [["Explain why water is important to living things.", "Write a story told by an old tree."], ["Compare two hobbies. Which is better and why?", "Describe an invention you would like to build."]],
};

function writingSheets(ed) {
  const out = [];
  for (const [grade, sheets] of Object.entries(WRITING)) {
    sheets.forEach((pair, i) => {
      const blocks = pair.map((text) => (/[?]|^(Tell|Draw|Write|Describe|Explain|Compare|Should)/.test(text) ? { activity: "write_lines", prompt: text } : { activity: "write_lines", model: text, rows: 4 }));
      out.push(item({
        slug: `writing-${i + 1}`, title: gi(grade) <= 2 ? `Sentence Writing ${i + 1}` : `Writing Prompts ${i + 1}`, grade, strand: "handwriting",
        description: `Handwriting and writing practice: ${pair.join(" ")}`,
        skills: skillsAt(ed, (k) => k.grade === grade && k.strand === "handwriting"), tags: ["writing", "handwriting", "sentences"], keywords: ["writing prompt", "journal"],
      }, blocks.map((b, j) => ({ title: b.model ? "Copy the Sentence" : "Write About It", blocks: [b] }))));
    });
  }
  return out;
}

/** Drawing sheets for grades 1-5: an original prompt to draw, then lines to write about the picture. */
const DRAWING = {
  1: ["Draw your favourite animal at home.", "Draw what you see out of a window."], 2: ["Draw a plant and label its parts.", "Draw a map of your bedroom."],
  3: ["Draw a machine that helps clean up.", "Draw a new kind of playground."], 4: ["Draw a comic about a rainy day.", "Draw a city in the year 3000."],
  5: ["Design a poster for a reading club.", "Draw the water cycle with arrows."],
};

function drawingSheets() {
  const out = [];
  for (const [grade, prompts] of Object.entries(DRAWING)) {
    prompts.forEach((prompt, i) => out.push(item({
      slug: `draw-and-write-${i + 1}`, title: `Draw and Write ${i + 1}`, grade, category: "art", strand: "art",
      description: `${prompt} Then write about your picture on the lines.`,
      skills: [], tags: ["drawing", "writing", "creativity"], keywords: ["draw", "art", prompt],
    }, [{ layout: "halves", instructions: "Draw, then write about it.", blocks: [{ slot: 0, activity: "draw_prompt", prompt }, { slot: 1, activity: "write_lines", prompt: "Tell about your picture.", rows: 3 }] }])));
  }
  return out;
}

/** Every item, in a stable order. Ids are unique (the tool checks). */
export function printablesSet(catalog) {
  const ed = catalog.education;
  return [
    ...skillSheets(ed), ...shapePacks(ed), ...letterPacks(ed), ...wordSearches(ed), ...mazePacks(ed), ...dotPacks(ed),
    ...colourByShape(ed), ...colouringPages(), ...logicPacks(ed), ...leftovers(ed), ...writingSheets(ed), ...drawingSheets(),
  ];
}

/** The hand-picked top materials, best first (the manifest's featured ranks). Missing ids are skipped. */
export const FEATURED = [
  "k-letter-a", "prek-shape-circle", "k-mazes-1", "prek-count-to-5", "k-dot-to-dot-fish", "prek-colouring-doopi",
  "k-add-within-10", "g1-time-half-hour", "g1-word-search-sight-1", "k-rhyming", "g2-add-2digit-regroup",
  "g1-story-details", "g3-times-tables", "g3-fractions", "g2-coins-quarters", "k-colour-by-shape-house", "g4-long-division",
  "g3-mazes-1", "g4-equivalent-fractions", "g5-decimals-hundredths", "g2-plants", "g3-text-evidence", "g5-figurative-language", "g4-mazes-1",
];
