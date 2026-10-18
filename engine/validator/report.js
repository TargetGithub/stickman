// Issue formatting, closest-match suggestions, and the readable timeline (spec 16, 16.3).

/** Levenshtein distance. */
export function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/** Best candidate for a misspelled name, or null if nothing is close. Substring matches win ties. */
export function closestMatch(name, candidates) {
  const lower = String(name).toLowerCase();
  let best = null;
  let bestScore = Infinity;
  let bestShared = 0;
  for (const c of candidates) {
    const cl = c.toLowerCase();
    let score = editDistance(lower, cl);
    if (cl.includes(lower) || lower.includes(cl)) score -= 1.5;
    const shared = lower.split("_").filter((p) => p.length > 2 && cl.includes(p)).length;
    score -= shared;
    if (score < bestScore) {
      bestScore = score;
      best = c;
      bestShared = shared;
    }
  }
  // Close by spelling, or sharing a word (flying_kick → front_kick) and not too far off.
  const ok = bestScore <= Math.max(1.5, lower.length / 3) || (bestShared > 0 && bestScore <= lower.length / 2);
  return best !== null && ok ? best : null;
}

/** Candidates ordered by closeness, for "use one of" lists. */
export function nearest(name, candidates, count = 6) {
  const lower = String(name).toLowerCase();
  return [...candidates]
    .map((c) => ({ c, d: editDistance(lower, c.toLowerCase()) - (c.includes(lower.split("_")[0]) ? 2 : 0) }))
    .sort((a, b) => a.d - b.d || a.c.localeCompare(b.c))
    .slice(0, count)
    .map((x) => x.c);
}

/** Issues as text, one per line plus an indented fix. */
export function formatIssues(issues) {
  return issues
    .map((i) => `${i.code.startsWith("W_") ? "warning" : "error"} ${i.code}${i.path ? ` at ${i.path}` : ""}: ${i.message}${i.fix ? `\n    fix: ${i.fix}` : ""}`)
    .join("\n");
}

const num = (v) => (v == null ? "  -  " : v.toFixed(2));

/**
 * Readable timeline of executed beats (spec 16.3), from a simulation result. Beats a macro expanded into
 * (S6) are indented under a "@macro id" line where the macro starts.
 */
export function formatTimeline(sim) {
  const macros = new Map((sim.story?.expansions || []).filter((x) => x.beats).map((x) => [x.id, x]));
  const opened = new Set();
  const rows = [...sim.beats]
    .filter((b) => b.firedAt != null)
    .sort((a, b) => a.firedAt - b.firedAt || a.index - b.index)
    .flatMap((b) => {
      const head = [];
      const m = b.expandedFrom ? macros.get(b.expandedFrom) : null;
      if (m && !opened.has(m.id)) {
        opened.add(m.id);
        head.push(`t=${b.firedAt.toFixed(2).padStart(6)}  @${m.macro} ${m.id} (${m.beats.length} beat${m.beats.length === 1 ? "" : "s"})`);
      }
      const who = `${b.expandedFrom ? "  " : ""}${b.who}`.padEnd(6);
      const what = b.do.padEnd(12);
      let detail;
      if (b.who === "world") {
        const p = b.params || {};
        detail = b.do === "slowmo" ? `x${p.scale} for ${p.duration}s story` : Object.entries(p).map(([k, v]) => `${k}=${v}`).join(" ");
      } else {
        detail = `${num(b.startedAt)}-${num(b.endedAt)}`;
        if (b.outcome) detail += `  outcome ${b.outcome}`;
        if (b.notes.length) detail += `  (${b.notes.join("; ")})`;
        if (b.state === "skipped") detail += "  SKIPPED";
      }
      return [...head, `t=${b.firedAt.toFixed(2).padStart(6)}  ${who} ${what} ${detail}`.trimEnd()];
    });
  const pending = sim.beats.filter((b) => b.firedAt == null).map((b) => `never ran: ${b.id} (${b.who} ${b.do})`);
  return [...rows, ...pending, `video length ${sim.durationSec.toFixed(2)}s`].join("\n");
}
