// American English for the 10K programme: British spellings are errors, British-only words are warnings.
// Only displayed text is checked (titles, narration ideas, on-screen text, notes) plus the names of new assets
// (`new:mummy_bear`); existing catalog identifiers (`metre_stick`) and other ids are left alone.

/** [british, american] spelling pairs; inflected forms are generated below. Errors. */
const SPELLING = [
  ["colour", "color"], ["favourite", "favorite"], ["flavour", "flavor"], ["neighbour", "neighbor"], ["behaviour", "behavior"],
  ["honour", "honor"], ["harbour", "harbor"], ["humour", "humor"], ["labour", "labor"], ["rumour", "rumor"], ["odour", "odor"],
  ["armour", "armor"], ["vapour", "vapor"], ["parlour", "parlor"], ["glamour", "glamor"], ["savoury", "savory"],
  ["centre", "center"], ["theatre", "theater"], ["metre", "meter"], ["litre", "liter"], ["fibre", "fiber"], ["sombre", "somber"],
  ["kilometre", "kilometer"], ["centimetre", "centimeter"], ["millimetre", "millimeter"], ["millilitre", "milliliter"],
  ["grey", "gray"], ["mum", "mom"], ["maths", "math"], ["programme", "program"], ["aeroplane", "airplane"],
  ["tyre", "tire"], ["kerb", "curb"], ["cheque", "check"], ["jewellery", "jewelry"], ["pyjamas", "pajamas"], ["cosy", "cozy"],
  ["moustache", "mustache"], ["aluminium", "aluminum"], ["sulphur", "sulfur"], ["plough", "plow"], ["mould", "mold"],
  ["moult", "molt"], ["smoulder", "smolder"], ["sceptical", "skeptical"], ["defence", "defense"], ["offence", "offense"],
  ["licence", "license"], ["catalogue", "catalog"], ["skilful", "skillful"], ["wilful", "willful"], ["enrol", "enroll"],
  ["fulfil", "fulfill"], ["ageing", "aging"], ["manoeuvre", "maneuver"], ["oesophagus", "esophagus"], ["haemoglobin", "hemoglobin"],
  ["anaemia", "anemia"], ["paediatric", "pediatric"], ["foetus", "fetus"], ["practise", "practice"], ["analyse", "analyze"],
  ["paralyse", "paralyze"], ["travelled", "traveled"], ["travelling", "traveling"], ["traveller", "traveler"],
  ["cancelled", "canceled"], ["cancelling", "canceling"], ["labelled", "labeled"], ["labelling", "labeling"],
  ["modelled", "modeled"], ["modelling", "modeling"], ["levelled", "leveled"], ["fuelled", "fueled"], ["signalled", "signaled"],
  ["learnt", "learned"], ["dreamt", "dreamed"], ["whilst", "while"], ["amongst", "among"],
  ["doughnut", "donut"], ["storey", "story"], ["draught", "draft"],
];

/** -ise verbs with -ize spellings in US English. */
const IZE = ["organis", "recognis", "realis", "apologis", "memoris", "summaris", "categoris", "criticis", "emphasis", "prioritis",
  "visualis", "sympathis", "minimis", "maximis", "finalis", "personalis", "energis", "colouris", "familiaris", "symbolis",
  "harmonis", "itemis", "standardis", "utilis", "specialis", "fertilis", "magnetis", "sterilis", "theoris", "hypothesis",
  "characteris", "patronis", "vaporis", "fossilis", "civilis", "authoris", "capitalis", "agonis", "idealis", "mobilis"];

/** British-only words with the US word. Warnings (some have other senses: check before changing). */
const VOCAB = [
  ["nappy", "diaper"], ["nappies", "diapers"], ["jumper", "sweater"], ["trousers", "pants"], ["biscuit", "cookie"],
  ["biscuits", "cookies"], ["sweets", "candy"], ["rubbish", "trash"], ["pavement", "sidewalk"], ["lorry", "truck"],
  ["torch", "flashlight"], ["full stop", "period"], ["nought", "zero"], ["queue", "line"], ["wellies", "rain boots"],
  ["wellington boots", "rain boots"], ["petrol", "gas"], ["postbox", "mailbox"], ["car park", "parking lot"],
  ["motorway", "highway"], ["cot", "crib"], ["pram", "stroller"], ["dummy", "pacifier"], ["crisps", "chips"],
  ["sledge", "sled"], ["aubergine", "eggplant"], ["courgette", "zucchini"], ["coriander", "cilantro"], ["sweetcorn", "corn"],
  ["ice lolly", "popsicle"], ["trainers", "sneakers"], ["dressing gown", "bathrobe"], ["flannel", "washcloth"],
  ["mobile phone", "cell phone"], ["bin lorry", "garbage truck"], ["dustbin", "trash can"], ["fortnight", "two weeks"],
  ["grandad", "grandpa"], ["holidaymakers", "vacationers"], ["marrow", "squash"], ["bobble hat", "knit hat"],
  ["ladybird", "ladybug"], ["ladybirds", "ladybugs"], ["gran", "grandma"], ["nan", "grandma"], ["crumpet", "pancake or muffin"],
  ["crumpets", "pancakes or muffins"], ["tea towel", "dish towel"], ["washing line", "clothesline"], ["rucksack", "backpack"],
  ["fancy dress", "costume"], ["zebra crossing", "crosswalk"], ["lollipop lady", "crossing guard"], ["pushchair", "stroller"],
  ["headteacher", "principal"], ["playtime", "recess"], ["trolley", "cart"], ["kitchen roll", "paper towel"], ["loo", "bathroom"],
  ["plaster", "bandage (if it means a bandage)"], ["rubber", "eraser (if it means an eraser)"], ["football", "soccer (if it means soccer)"],
  ["holiday", "vacation (if it means a trip)"], ["bonnet", "hood (if it is a car)"], ["zed", "zee"], ["washing up", "dishes"], ["mummy", "mommy (unless it is an Egyptian mummy)"], ["mummies", "mommies (unless Egyptian mummies)"],
];

/** word -> US word, for single-word spelling entries and their inflections. */
export const US_SPELLING = (() => {
  const m = new Map();
  for (const [b, a] of SPELLING) {
    m.set(b, a);
    if (/our$/.test(b)) for (const suf of ["s", "ed", "ing", "ful", "less", "ite", "ites", "able", "ably"]) m.set(b + suf, a + suf);
    if (/re$/.test(b)) { m.set(`${b}s`, `${a}s`); m.set(`${b}d`, `${a}ed`); }
    if (!/(ed|ing|er)$/.test(b) && !/re$|our$/.test(b) && !m.has(`${b}s`)) m.set(`${b}s`, `${a}s`);
  }
  m.set("greys", "grays"); m.set("greyish", "grayish"); m.set("mums", "moms");
  m.set("practised", "practiced"); m.set("practising", "practicing"); m.set("practises", "practices");
  m.set("analysed", "analyzed"); m.set("analysing", "analyzing"); m.set("cosier", "cozier"); m.set("cosiest", "coziest");
  for (const s of IZE) for (const [bs, as] of [["e", "e"], ["ed", "ed"], ["es", "es"], ["ing", "ing"], ["ation", "ation"], ["ations", "ations"], ["er", "er"]]) m.set(`${s}${bs}`, `${s.replace(/is$/, "iz")}${as}`);
  m.delete("emphasise"); m.set("emphasise", "emphasize"); m.delete("hypothesise"); m.set("hypothesise", "hypothesize");
  m.delete("hypothesis"); m.delete("emphasis"); // nouns are the same in both
  return m;
})();

/** Fields whose strings are identifiers, never displayed text. */
const ID_FIELDS = new Set(["schema", "id", "band", "status", "subject", "strand", "standards", "skills", "series", "who", "characters", "objects", "sound", "type", "purpose"]);

/**
 * Every displayed string of a spec with its path (needs and ids skipped), plus new: asset names.
 * @param {object} s
 * @returns {{ path: string, text: string, isName?: boolean }[]}
 */
export function displayedStrings(s) {
  const out = [];
  const walk = (v, path, key) => {
    if (typeof v === "string") { if (!ID_FIELDS.has(key)) out.push({ path, text: v }); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`, key)); return; }
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) {
      if (k === "needs") continue;
      if (path === "magical_moment" && k === "id") continue;
      walk(x, path ? `${path}.${k}` : k, k);
    }
  };
  walk(s, "", "");
  for (const g of ["characters", "props", "stages", "features"]) {
    for (const n of s.needs?.[g] ?? []) {
      if (typeof n === "object") { out.push({ path: `needs.${g}`, text: n.name.slice(4).replace(/_/g, " "), isName: true }); out.push({ path: `needs.${g}.description`, text: n.description }); }
    }
  }
  for (const c of s.cast ?? []) if (c.who?.startsWith("new:")) out.push({ path: "cast.who", text: c.who.slice(4).replace(/_/g, " "), isName: true });
  if (s.magical_moment?.id?.startsWith("new:")) out.push({ path: "magical_moment.id", text: s.magical_moment.id.slice(4).replace(/_/g, " "), isName: true });
  return out;
}

/**
 * British spellings (errors) and British-only words (warnings) in a spec's displayed text.
 * @param {object} s
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function usEnglishIssues(s) {
  const errors = new Set(), warnings = new Set();
  for (const { path, text } of displayedStrings(s)) {
    const lower = text.toLowerCase();
    for (const w of lower.match(/[a-z]+/g) ?? []) {
      const us = US_SPELLING.get(w);
      if (us) errors.add(`US English: "${w}" -> "${us}" (${path})`);
    }
    for (const [b, a] of VOCAB) {
      if (new RegExp(`\\b${b}\\b`).test(lower)) warnings.add(`US English: "${b}" is British; say "${a}" unless it means something else (${path})`);
    }
  }
  return { errors: [...errors], warnings: [...warnings] };
}

export const US_VOCAB = VOCAB;
