// Issue formatting, closest-match suggestions, timeline text.
// Milestone: M3. Spec: sections 16, 16.3. Interfaces: docs/ARCHITECTURE.md section 4.

/** Best candidate by edit distance, or null. */
export function closestMatch(name, candidates) {
  throw new Error("not implemented: closestMatch");
}

/** Human/LLM-readable text for a list of issues. */
export function formatIssues(issues) {
  throw new Error("not implemented: formatIssues");
}

/** Timeline rows as aligned text (spec 16.3 example). */
export function formatTimeline(timeline) {
  throw new Error("not implemented: formatTimeline");
}
