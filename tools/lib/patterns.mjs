// Composition for the music generator (STORY_SPEC 15, S7.2): a mood + seed + length → a list of notes.
// Form: a short intro, 8-bar sections (A, A', B, A', ...), and a final bar on the tonic, with the tempo
// nudged so the bars fill the length exactly (the ending lands on the scene's last beat). The melody is
// motif-based: a 2-bar idea, repeated against the next chords and varied in later sections. Layers come
// in with intensity, bar by bar: pad, bass, lead, drums (low → high patterns), arpeggio.

import { mulberry32, hash32 } from "../../engine/math.js";

const PAN = { lead: 0.15, arp: -0.35, bass: 0, pad: 0, kick: 0, snare: 0.05, hat: 0.3, open: 0.3, tom: -0.2 };
const DRUM_OF = { k: "kick", s: "snare", h: "hat", o: "open" };

/** Drum level for an intensity: none, low, medium, high. */
export const drumLevel = (i) => (i < 0.3 ? null : i < 0.55 ? "low" : i < 0.78 ? "medium" : "high");

/**
 * @param {object} mood  a catalog music mood; scales: catalog.scales
 * @param {{ seed:string|number, seconds:number, intensityAt:(t:number)=>number }} o
 * @returns {{ notes, tempo, bars, barSec, meter, root }}
 */
export function compose(mood, scales, { seed, seconds, intensityAt }) {
  const rng = mulberry32(hash32(`music:${seed}`));
  const pick = (list) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  const meter = mood.meter ?? 4;
  const [lo, hi] = mood.tempo;
  const want = lo + rng() * (hi - lo);
  const bars = Math.max(2, Math.round(seconds / ((60 / want) * meter)));
  const barSec = seconds / bars; // exact fit: the last bar ends on the last frame
  const tempo = (60 * meter) / barSec;
  const step8 = barSec / (meter * 2);
  const step16 = barSec / (meter * 4);
  const swing = (mood.swing ?? 0) * step8;
  const root = pick(mood.roots);
  const scale = scales[mood.scale];
  const mscale = mood.melodyScale ?? scale;
  const deg = (d, sc = scale) => root + 12 * Math.floor(d / sc.length) + sc[((d % sc.length) + sc.length) % sc.length];
  const triad = (d) => [deg(d), deg(d + 2), deg(d + 4)];
  const notes = [];
  const add = (inst, t, dur, midi, vel, part = inst) => notes.push({ inst, t, dur, midi, vel: Math.max(0.05, Math.min(1, vel)), pan: PAN[part] ?? 0 });

  // Form: intro, sections, ending.
  const intro = bars >= 8 ? 2 : bars >= 4 ? 1 : 0;
  const ending = bars >= 3 ? 1 : 0;
  const plan = []; // per bar: { chord, section, phraseBar, kind }
  const progA = pick(mood.progressions);
  let progB = pick(mood.progressions);
  if (mood.progressions.length > 1) while (progB === progA) progB = pick(mood.progressions);
  for (let b = 0; b < bars; b++) {
    if (b < intro) plan.push({ chord: progA[b % progA.length], kind: "intro", section: -1, phraseBar: b });
    else if (b >= bars - ending) plan.push({ chord: 0, kind: "end", section: -1, phraseBar: 0 });
    else {
      const k = b - intro;
      const section = Math.floor(k / 8);
      const prog = section % 3 === 2 ? progB : progA;
      plan.push({ chord: prog[(k % 8) % prog.length], kind: section % 3 === 2 ? "B" : section === 0 ? "A" : "A2", section, phraseBar: k % 8 });
    }
  }
  if (ending && bars - ending - 1 >= intro && plan[bars - 2].kind !== "intro") plan[bars - 2].chord = 4; // dominant before the final tonic

  // Melody motifs per section kind: 2 bars of { step, len, deg }.
  const motifs = new Map();
  const steps = meter * 2;
  const makeMotif = () => {
    const out = [];
    let d = mood.melody.range[0] + Math.floor(rng() * (mood.melody.range[1] - mood.melody.range[0] + 1) * 0.6);
    for (let bar = 0; bar < 2; bar++) {
      const rh = pick(mood.melody.rhythms);
      for (let s = 0; s < steps; s++) {
        if (rh[s] !== "x") continue;
        let len = 1;
        while (s + len < steps && rh[s + len] === "-") len++;
        const leap = rng() < mood.melody.leap;
        d += leap ? pick([-4, -3, 3, 4]) : pick([-2, -1, -1, 1, 1, 2, 0]);
        d = Math.max(mood.melody.range[0], Math.min(mood.melody.range[1], d));
        out.push({ step: bar * steps + s, len, deg: d });
      }
    }
    return out;
  };
  const motifFor = (kind) => {
    if (!motifs.has(kind)) {
      if (kind === "A2" && motifs.has("A")) {
        // A' keeps A's rhythm and contour with a quarter of the notes moved.
        motifs.set(kind, motifs.get("A").map((n) => (rng() < 0.25 ? { ...n, deg: n.deg + pick([-1, 1, 2]) } : n)));
      } else motifs.set(kind, makeMotif());
    }
    return motifs.get(kind);
  };
  /** Nearest chord tone (in melody degrees around d) for strong beats. */
  const snap = (d, chord) => {
    const tones = [0, 2, 4].map((x) => chord + x);
    let best = d;
    let dist = Infinity;
    for (let o = -14; o <= 14; o += 7) for (const t of tones) if (Math.abs(t + o - d) < dist) [dist, best] = [Math.abs(t + o - d), t + o];
    return best;
  };

  plan.forEach((p, b) => {
    const t0 = b * barSec;
    const level = Math.max(0, Math.min(1, intensityAt(t0)));
    const chord = triad(p.chord);
    const sw = (s) => (s % 2 ? swing : 0);
    const humanize = () => (rng() - 0.5) * 0.08;
    // Pad: the chord held over the bar.
    for (const m of chord) add(mood.patches.pad, t0, barSec * (p.kind === "end" ? 0.8 : 0.98), m, 0.42 + 0.18 * level, "pad");
    // Bass.
    if (level >= 0.15 || p.kind === "end") {
      const rootNote = chord[0] - 24 + (chord[0] - 24 < 33 ? 12 : 0);
      const pat = p.kind === "end" ? "r".padEnd(steps, ".") : pick(mood.bass);
      for (let s = 0; s < steps; s++) {
        const c = pat[s];
        if (c === "." || !c) continue;
        let len = 1;
        while (s + len < steps && pat[s + len] === ".") len++;
        const m = c === "5" ? rootNote + 7 : c === "o" ? rootNote + 12 : rootNote;
        add(mood.patches.bass, t0 + s * step8 + sw(s), Math.min(len, 2) * step8 * 0.9, m, 0.7 + 0.2 * level + humanize(), "bass");
      }
    }
    // Lead melody (not in the intro).
    if (p.kind !== "intro" && (level >= 0.25 || p.kind === "end")) {
      if (p.kind === "end") add(mood.patches.lead, t0, barSec * 0.75, deg(0, mscale) + 12, 0.7, "lead");
      else {
        const motif = motifFor(p.kind);
        const half = p.phraseBar % 2;
        const cadence = p.phraseBar % 4 === 3;
        for (const n of motif.filter((x) => Math.floor(x.step / steps) === half)) {
          const s = n.step % steps;
          if (cadence && s >= steps / 2) continue; // the phrase breathes before the next one
          const strong = s === 0 || s === steps / 2;
          const d = strong ? snap(n.deg + (p.phraseBar >= 4 ? 1 : 0), p.chord) : n.deg + (p.phraseBar >= 4 ? 1 : 0);
          add(mood.patches.lead, t0 + s * step8 + sw(s), n.len * step8 * 0.92, deg(d, mscale) + 12, 0.62 + 0.25 * level + humanize(), "lead");
        }
        if (cadence) add(mood.patches.lead, t0 + (steps / 2) * step8, (steps / 2) * step8 * 0.9, chord[pick([0, 0, 1])] + 12, 0.6 + 0.2 * level, "lead");
      }
    }
    // Arpeggio.
    if (mood.arp && level >= 0.6 && p.kind !== "end") {
      const n = mood.arp.length;
      const stepT = barSec / n;
      mood.arp.forEach((k, i) => add(mood.patches.arp, t0 + i * stepT, stepT * 0.9, chord[k % 3] + 12 * (1 + Math.floor(k / 3)), 0.4 + 0.2 * level + humanize(), "arp"));
    }
    // Drums, with a fill in the last bar of a section.
    const lvl = drumLevel(level);
    if (p.kind === "end") {
      if (lvl) {
        add("kick", t0, 0.3, 0, 0.9);
        add("open", t0, 0.3, 0, 0.6);
      }
    } else if (lvl && p.kind !== "intro") {
      const pat = pick(mood.drums[lvl]);
      const fill = p.phraseBar === 7 && lvl !== "low" && b < bars - 2;
      for (let s = 0; s < pat.length; s++) {
        if (fill && s >= pat.length / 2) {
          if (s % 2 === 0 || lvl === "high") add(s % 4 === 0 ? "tom" : "snare", t0 + s * step16, step16, 0, 0.5 + 0.4 * (s / pat.length));
          continue;
        }
        const inst = DRUM_OF[pat[s]];
        if (inst) add(inst, t0 + s * step16 + (s % 4 === 2 ? swing / 2 : 0), step16, 0, (inst === "hat" ? 0.45 : 0.8) + 0.15 * level + humanize());
      }
    }
  });
  return { notes, tempo, bars, barSec, meter, root };
}
