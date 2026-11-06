// Allocation checks, slot freezing and the allocation tables in PLAN.md.
import { BANDS, FIRST_NEW_SLOT, fmtSlot, parseSlots } from "./load.mjs";

/**
 * Problems with the allocation: unknown subject/strand/series, strand sums != budgets, bad slot ranges.
 * @param {ReturnType<import("./load.mjs").loadProgramme>} p
 * @returns {string[]}
 */
export function allocationErrors(p) {
  const e = [];
  let total = 0;
  for (const b of BANDS) {
    const band = p.bands.bands[b];
    if (!band) { e.push(`bands.json has no band ${b}`); continue; }
    total += band.total;
    const subjSum = Object.values(band.subjects).reduce((a, s) => a + s.budget, 0);
    if (subjSum !== band.total) e.push(`${b}: subject budgets add up to ${subjSum}, band total is ${band.total}`);
    for (const [sk, s] of Object.entries(band.subjects)) {
      const st = Object.values(s.strands).reduce((a, c) => a + c, 0);
      if (st !== s.budget) e.push(`${b}.${sk}: strand budgets add up to ${st}, subject budget is ${s.budget}`);
    }
    const rows = p.allocation[b].rows ?? [];
    if (!rows.length) continue;
    const keys = new Set();
    const strandSum = {};
    let next = FIRST_NEW_SLOT;
    for (const r of rows) {
      const where = `${b} row ${r.key ?? "?"}`;
      if (!r.key) e.push(`${where}: no key`);
      else if (keys.has(r.key)) e.push(`${where}: duplicate key`);
      keys.add(r.key);
      const subj = band.subjects[r.subject];
      if (!subj) e.push(`${where}: unknown subject ${r.subject}`);
      else if (!(r.strand in subj.strands)) e.push(`${where}: strand ${r.strand} is not a ${r.subject} strand of ${b}`);
      if (!Array.isArray(r.standards) || !r.standards.length) e.push(`${where}: no standards`);
      if (!r.text) e.push(`${where}: no standard text`);
      if (!Number.isInteger(r.count) || r.count < 1) e.push(`${where}: count must be a positive integer`);
      for (const s of r.series ?? []) {
        const ser = p.series.series[s];
        if (!ser) e.push(`${where}: unknown series ${s}`);
        else if (!ser.bands.includes(b)) e.push(`${where}: series ${s} is not a ${b} series`);
      }
      const k = `${r.subject}.${r.strand}`;
      strandSum[k] = (strandSum[k] ?? 0) + (r.count ?? 0);
      if (r.slots != null) {
        const sl = parseSlots(r.slots);
        if (!sl) e.push(`${where}: slots "${r.slots}" must look like 0101-0112`);
        else {
          if (sl[0] !== next) e.push(`${where}: slots start at ${fmtSlot(sl[0])}, expected ${fmtSlot(next)} (ranges are contiguous in row order)`);
          if (sl[1] - sl[0] + 1 !== r.count) e.push(`${where}: slots ${r.slots} hold ${sl[1] - sl[0] + 1}, count is ${r.count}`);
          next = sl[1] + 1;
        }
      } else next += r.count ?? 0;
    }
    for (const [sk, s] of Object.entries(band.subjects)) {
      for (const [st, budget] of Object.entries(s.strands)) {
        const got = strandSum[`${sk}.${st}`] ?? 0;
        if (got !== budget) e.push(`${b}.${sk}.${st}: rows add up to ${got}, budget is ${budget}`);
      }
    }
  }
  if (total !== p.bands.total) e.push(`band totals add up to ${total}, programme total is ${p.bands.total}`);
  return e;
}

/**
 * Give rows without `slots` a range, continuing after the last frozen row. Returns the number of rows changed.
 * Frozen ranges never move: once specs exist, re-balancing means editing counts AND ranges by hand.
 * @param {{ rows: object[] }} bandAlloc
 */
export function freezeSlots(bandAlloc) {
  let next = FIRST_NEW_SLOT;
  let changed = 0;
  for (const r of bandAlloc.rows) {
    if (r.slots) { next = parseSlots(r.slots)[1] + 1; continue; }
    r.slots = `${fmtSlot(next)}-${fmtSlot(next + r.count - 1)}`;
    next += r.count;
    changed++;
  }
  return changed;
}

const esc = (s) => String(s ?? "").replace(/\|/g, "\\|");

/** Markdown: the programme summary table. */
export function summaryTable(p) {
  const subjects = ["ela", "math", "science", "social_studies", "critical_thinking", "sel", "health", "arts"];
  const head = `| Band | Ages | Total | ${subjects.map((s) => s.replace("_", " ")).join(" | ")} | Rows |`;
  const lines = [head, `|${"---|".repeat(subjects.length + 4)}`];
  const col = Object.fromEntries(subjects.map((s) => [s, 0]));
  let rows = 0;
  for (const b of BANDS) {
    const band = p.bands.bands[b];
    const n = p.allocation[b].rows?.length ?? 0;
    rows += n;
    lines.push(`| **${b}** ${band.name} | ${band.ages} | ${band.total} | ${subjects.map((s) => { const v = band.subjects[s]?.budget ?? 0; col[s] += v; return v || "–"; }).join(" | ")} | ${n} |`);
  }
  lines.push(`| **All** | 0-11 | ${p.bands.total} | ${subjects.map((s) => col[s]).join(" | ")} | ${rows} |`);
  return lines.join("\n");
}

/**
 * Markdown: one band's subject → strand budgets, then (detail) every standard row.
 * @param {boolean} [detail]  false = strand tables plus a pointer to the shard brief (PLAN.md)
 */
export function bandTables(p, b, detail = true) {
  const band = p.bands.bands[b];
  const rows = p.allocation[b].rows ?? [];
  const out = [`### ${b} · ${band.name} (ages ${band.ages}) · ${band.total} videos`, "", `**Why ${band.total}:** ${band.why}`, "",
    `Framework: ${band.framework}. Length ${band.lengthS[0]}-${band.lengthS[1]} s. Host: ${band.host}; sidekick: ${band.sidekick}. Voice: ${band.voice}. Music: ${band.music}.`, ""];
  out.push("| Subject | Strand | Videos |", "|---|---|---|");
  for (const [sk, s] of Object.entries(band.subjects)) for (const [st, n] of Object.entries(s.strands)) out.push(`| ${s.label} | ${st} | ${n} |`);
  if (!rows.length) { out.push("", "_Rows not written yet._", ""); return out.join("\n"); }
  if (!detail) {
    const n = rows.length, first = rows[0].slots?.slice(0, 4), last = rows[n - 1].slots?.slice(5);
    out.push("", `${n} standard rows, slots ${b}${first}-${b}${last}. Every row (standard, count, slots, series, variants, existing episodes): [shards/${b}.md](shards/${b}.md) and \`allocation/${b}.json\`.`, "");
    return out.join("\n");
  }
  out.push("", "| Slots | Subject · strand | Standard(s) | What it covers | Videos | Series | How the videos differ |", "|---|---|---|---|---|---|---|");
  for (const r of rows) {
    out.push(`| ${r.slots ?? "–"} | ${r.subject} · ${r.strand} | ${esc(r.standards.join(", "))} | ${esc(r.text)} | ${r.count} | ${esc((r.series ?? []).join(", "))} | ${esc((r.variants ?? []).join("; "))}${r.existing?.length ? ` (existing: ${r.existing.join(", ")})` : ""} |`);
  }
  out.push("");
  return out.join("\n");
}

/** Replace the text between <!-- name:start --> and <!-- name:end --> markers. */
export function replaceBlock(md, name, body) {
  const a = `<!-- ${name}:start -->`, z = `<!-- ${name}:end -->`;
  const i = md.indexOf(a), j = md.indexOf(z);
  if (i < 0 || j < i) throw new Error(`markers ${a} ... ${z} not found`);
  return `${md.slice(0, i + a.length)}\n${body}\n${md.slice(j)}`;
}

/** Markdown: series table (formats, mechanics, trackers, magic pools). */
export function seriesTable(p) {
  const out = ["| Series | Bands | Subjects | Format | Interaction mechanics | Progress tracker | Magical moments |", "|---|---|---|---|---|---|---|"];
  for (const [k, s] of Object.entries(p.series.series)) out.push(`| \`${k}\` **${esc(s.name)}** | ${s.bands.join(", ")} | ${s.subjects.join(", ")} | ${esc(s.format)} | ${s.mechanics.join(", ")} | ${esc(s.tracker)} | ${s.magic.join(", ")} |`);
  return out.join("\n");
}

/** Markdown: the magical-moment library and the interaction types. */
export function magicTable(p) {
  const out = ["| Id | Moment |", "|---|---|"];
  for (const [k, v] of Object.entries(p.series.magic)) out.push(`| \`${k}\` | ${esc(v)} |`);
  out.push("", "| Interaction type | Meaning |", "|---|---|");
  for (const [k, v] of Object.entries(p.series.interactionTypes)) out.push(`| \`${k}\` | ${esc(v)} |`);
  return out.join("\n");
}
