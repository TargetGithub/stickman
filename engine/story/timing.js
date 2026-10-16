// Story timing rules shared by the director and the renderer (STORY_SPEC 7.2, 7.3, 15). Milestone: S1.

/** World commands that show a full-screen card: the story clock holds while they show. */
export const CARD_COMMANDS = ["title_card", "chapter_card", "time_card", "end_card"];

/** Card kind for a card world command. */
export const cardKind = (command) => command.replace("_card", "");

/** How long a card world command shows (video seconds). */
export function cardDuration(command, p) {
  return p.dur ?? (command === "title_card" || command === "end_card" ? 3 : 2.5);
}

/** Reading time for a narration box: 1.2 s + 0.06 s per character, at least 2.5 s. */
export function narrateDuration(p) {
  return p.dur ?? Math.max(2.5, 1.2 + 0.06 * String(p.text || "").length);
}
