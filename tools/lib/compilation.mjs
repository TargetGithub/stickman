// Compilations (tools/compilation.mjs): rendered episodes joined into one long video with chapters, for YouTube
// (kids watch in long sessions; 20-30 minutes also earns mid-roll ads). Pure functions; ffmpeg runs in the tool.

/** A compilation's target length (s). */
export const COMPILATION = { min: 20 * 60, max: 30 * 60 };

/** "m:ss", or "h:mm:ss" from an hour on (the form YouTube reads as a chapter timestamp). */
export function timestamp(s) {
  const t = Math.floor(s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const ss = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** The chapter name of an episode: "Doopi & Friends 2: Peepa Steals the Rainbow" → "2. Peepa Steals the Rainbow". */
export function chapterName(title) {
  const m = /^.*?(\d+)\s*:\s*(.+)$/.exec(title ?? "");
  return m ? `${Number(m[1])}. ${m[2].trim()}` : String(title ?? "Episode");
}

/**
 * Chapters for parts played back to back.
 * @param {Array<{ title: string, dur: number }>} parts  dur in seconds (the video file's own length)
 * @returns {Array<{ title, start, end }>}
 */
export function chapters(parts) {
  let t = 0;
  return parts.map((p) => {
    const c = { title: chapterName(p.title), start: t, end: t + p.dur };
    t += p.dur;
    return c;
  });
}

/** An ffmpeg metadata file (FFMETADATA1) with the title and one chapter per part, in milliseconds. */
export function ffmetadata(title, list) {
  const esc = (s) => String(s).replace(/([=;#\\\n])/g, "\\$1");
  const lines = [";FFMETADATA1", `title=${esc(title)}`];
  for (const c of list) lines.push("", "[CHAPTER]", "TIMEBASE=1/1000", `START=${Math.round(c.start * 1000)}`, `END=${Math.round(c.end * 1000)}`, `title=${esc(c.title)}`);
  return `${lines.join("\n")}\n`;
}

/** A YouTube description: the title, then the chapter list (YouTube needs the first at 0:00 and three or more). */
export function description(title, list) {
  return `${title}\n\n${list.map((c) => `${timestamp(c.start)} ${c.title}`).join("\n")}\n`;
}

/**
 * Why rendered episodes cannot be joined without re-encoding, or null: they must share size and frame rate.
 * @param {Array<{ slug?, resolution?: { width, height }, outputWidth?, outputHeight?, fps }>} metas  meta.json files
 */
export function mismatch(metas) {
  const key = (m) => `${m.resolution?.width ?? m.outputWidth}x${m.resolution?.height ?? m.outputHeight}@${m.fps}`;
  const keys = [...new Set(metas.map(key))];
  return keys.length > 1 ? `episodes differ in size or frame rate (${metas.map((m) => `${m.slug ?? "?"} ${key(m)}`).join(", ")}); render them alike` : null;
}

/**
 * Split episodes, in order, into compilations of COMPILATION.min..max seconds: each takes episodes until it reaches
 * the minimum, unless the next one would pass the maximum. A short remainder joins the last group if it fits.
 * @param {number[]} durs  episode lengths (s)
 * @returns {number[][]}  indexes into durs
 */
export function plan(durs, { min = COMPILATION.min, max = COMPILATION.max } = {}) {
  const groups = [];
  let cur = [];
  let len = 0;
  durs.forEach((d, i) => {
    if (cur.length && (len >= min || len + d > max)) {
      groups.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(i);
    len += d;
  });
  if (cur.length) {
    const last = groups.at(-1);
    const sum = (g) => g.reduce((a, i) => a + durs[i], 0);
    if (last && len < min && sum(last) + len <= max) last.push(...cur);
    else groups.push(cur);
  }
  return groups;
}
