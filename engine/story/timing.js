// Story timing rules shared by the director, the compiler and the renderer (STORY_SPEC 7.2, 7.3, 15). Milestone: S1.

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

/** World beat durations in story seconds, for their end anchor. */
export const WORLD_DURATION = {
  slowmo: (p) => p.duration ?? 0,
  fade: (p) => p.dur ?? 1,
  flash: (p) => p.dur ?? 0.1,
  caption: (p) => p.dur ?? 2,
  desaturate: (p) => p.dur ?? 0.5,
  zoom_punch: (p) => p.dur ?? 0.2,
  text_pop: (p) => p.dur ?? 0.8,
  shake: () => 0.3,
  narrate: (p) => narrateDuration(p),
  title_card: (p) => cardDuration("title_card", p),
  chapter_card: (p) => cardDuration("chapter_card", p),
  time_card: (p) => cardDuration("time_card", p),
  end_card: (p) => cardDuration("end_card", p),
  set_time: (p) => p.dur ?? 0,
  set_weather: (p) => p.dur ?? 0,
  shot: (p) => p.dur ?? 0,
  set_glow: (p) => p.dur ?? 0,
  set_grade: (p) => p.dur ?? 0,
};
