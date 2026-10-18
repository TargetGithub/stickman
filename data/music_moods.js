// Music moods (STORY_SPEC 15, S7.1). The generator (tools/lib/music_gen.mjs) builds seeded loops from these.
//   scale         interval set for melodies and chords (SCALES below)
//   roots         MIDI notes the key's tonic may take (around the pad register)
//   tempo         [lo, hi] beats per minute; meter beats per bar (3 for a waltz)
//   progressions  chord pool: scale degrees (0 = tonic), one chord per bar
//   bass          8-step patterns per bar: r root, 5 fifth, o octave, . rest (3/4 uses 6 steps)
//   drums         patterns per intensity level (16 steps; 12 in 3/4): k kick, s snare, h hat, o open hat
//   melody        rhythms (8 steps a bar: x note, - hold, . rest), range (scale steps around the tonic), leap (0-1)
//   arp           arpeggio step per bar (8 or 16 notes), or null
//   patches       instrument per part (tools/lib/instruments.mjs): lead, bass, pad, arp
//   intensity     the level a scene starts at (0-1) when it gives none; layers come in as intensity rises
//   swing         0-0.3 (delays off-beat eighths)

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};

const POP = { low: ["k.......k.......", "k...h...k...h..."], medium: ["k.h.s.h.k.h.s.h.", "k.h.s.hkk.h.s.h."], high: ["khhhskhhkhhhskhh", "k.hks.hkk.hks.ho"] };
const ROCK = { low: ["k.......k.k.....", "k...h...k.k.h..."], medium: ["k.h.s.h.kkh.s.h.", "k.hhs.h.k.hhs.hh"], high: ["khhhskhhkkhhskho", "kkhhskhhkkhhskhs"] };

export const musicMoods = {
  happy: {
    scale: "major", roots: [60, 62, 65], tempo: [112, 126], meter: 4, swing: 0.05,
    progressions: [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 0, 4], [3, 4, 0, 0]],
    bass: ["r...r.5.", "r.r.5.r.", "r..r.5o."],
    drums: POP,
    melody: { rhythms: ["x.x.x.x-", "x-x.x.x.", "x.xx.x--", "x-x-x---"], range: [0, 9], leap: 0.3 },
    arp: [0, 1, 2, 1, 0, 1, 2, 1],
    patches: { lead: "square_soft", bass: "pluck", pad: "warm_pad", arp: "pluck_high" },
    intensity: 0.6,
  },
  playful: {
    scale: "major", melodyScale: [0, 2, 4, 7, 9], roots: [62, 64, 67], tempo: [124, 138], meter: 4, swing: 0.18,
    progressions: [[0, 3, 4, 0], [0, 5, 1, 4], [0, 0, 3, 4]],
    bass: ["r.5.r.5.", "r..5r.5.", "o.5.r..."],
    drums: { low: ["k...h...k...h...", "k.....h.k.....h."], medium: ["k.hhs.h.k.hhs.h.", "k.h.s.hhk.h.s.hh"], high: ["khhhshhkkhhhshho", "k.hks.hkkhhks.hk"] },
    melody: { rhythms: ["x.x.x.x.", "xx.x.x..", "x.xxx.x.", "x..xx.x."], range: [2, 11], leap: 0.45 },
    arp: [0, 2, 1, 2, 0, 2, 1, 2],
    patches: { lead: "toy", bass: "bouncy_bass", pad: "soft_pad", arp: "pluck_high" },
    intensity: 0.6,
  },
  calm: {
    scale: "lydian", roots: [60, 62, 64], tempo: [72, 84], meter: 4, swing: 0,
    progressions: [[0, 1, 0, 4], [0, 3, 5, 4], [0, 5, 3, 1]],
    bass: ["r.......", "r...5...", "r...o..."],
    drums: { low: ["................"], medium: ["k.......h.......", "k.......k...h..."], high: ["k...h...k.h.h...", "k...h.h.k...h..."] },
    melody: { rhythms: ["x---x---", "x-x-x---", "x---x-x-", "x-------"], range: [0, 7], leap: 0.2 },
    arp: [0, 1, 2, 3, 2, 1, 0, 1],
    patches: { lead: "flute", bass: "soft_bass", pad: "warm_pad", arp: "bell" },
    intensity: 0.4,
  },
  sad: {
    scale: "minor", roots: [57, 60, 62], tempo: [64, 74], meter: 4, swing: 0,
    progressions: [[0, 5, 2, 6], [0, 3, 6, 2], [5, 6, 0, 0], [0, 6, 5, 4]],
    bass: ["r.......", "r...5...", "r...o..."],
    drums: { low: ["................"], medium: ["................", "k..............."], high: ["k.......k.......", "k...h...k...h..."] },
    melody: { rhythms: ["x---x-x-", "x-------", "x-x-x---", "x---x---"], range: [-2, 7], leap: 0.15 },
    arp: [0, 1, 2, 1, 0, 1, 2, 1],
    patches: { lead: "flute", bass: "soft_bass", pad: "dark_pad", arp: "bell" },
    intensity: 0.35,
  },
  tense: {
    scale: "harmonic", roots: [57, 59, 62], tempo: [90, 102], meter: 4, swing: 0,
    progressions: [[0, 0, 5, 4], [0, 1, 0, 4], [0, 5, 0, 6]],
    bass: ["rrrrrrrr", "r.r.r.r.", "rr.rr.r."],
    drums: { low: ["k.......k.......", "k.......k...k..."], medium: ["k...h...k.k.h...", "k..hh...k..hh..."], high: ["k.hhs.hhk.hhs.hh", "kkh.s.h.kkh.s.hk"] },
    melody: { rhythms: ["x---....", "x-x-....", "x---x---", "....x-x-"], range: [0, 6], leap: 0.1 },
    arp: [0, 2, 0, 2, 0, 2, 0, 2],
    patches: { lead: "reed", bass: "pulse_bass", pad: "dark_pad", arp: "pluck_dark" },
    intensity: 0.5,
  },
  mysterious: {
    scale: "phrygian", roots: [57, 60, 62], tempo: [78, 90], meter: 4, swing: 0,
    progressions: [[0, 1, 0, 6], [0, 5, 1, 0], [0, 6, 5, 1]],
    bass: ["r.......", "r...r...", "r..5...."],
    drums: { low: ["................"], medium: ["k.........h.....", "k.......h......."], high: ["k...h..hk...h...", "k..h..h.k...h..h"] },
    melody: { rhythms: ["x---..x-", "x-x-----", "....x---", "x--x----"], range: [0, 8], leap: 0.35 },
    arp: [0, 2, 4, 2, 1, 3, 2, 0],
    patches: { lead: "glass", bass: "soft_bass", pad: "dark_pad", arp: "bell" },
    intensity: 0.45,
  },
  heroic: {
    scale: "mixolydian", roots: [58, 60, 62], tempo: [104, 116], meter: 4, swing: 0,
    progressions: [[0, 6, 3, 0], [0, 3, 6, 4], [0, 4, 6, 3]],
    bass: ["r.r.5.r.", "r..rr.5.", "r.5.o.5."],
    drums: { low: ["k...s...k...s...", "k.......s......."], medium: ["k.s.s.s.k.s.ssss", "k..ss.s.k..ss.s."], high: ["kss.sss.kss.ssss", "k.sssks.k.sssksk"] },
    melody: { rhythms: ["x--x-x-x", "x-x-x---", "x--xx---", "x.x.x---"], range: [0, 9], leap: 0.4 },
    arp: [0, 1, 2, 3, 2, 1, 0, 1],
    patches: { lead: "brass", bass: "pluck", pad: "warm_pad", arp: "pluck_high" },
    intensity: 0.6,
  },
  battle: {
    scale: "minor", roots: [57, 59, 62], tempo: [134, 148], meter: 4, swing: 0,
    progressions: [[0, 5, 6, 0], [0, 6, 5, 6], [0, 3, 5, 4]],
    bass: ["rrrrrrrr", "r.rrr.rr", "rr5rr5ro"],
    drums: ROCK,
    melody: { rhythms: ["x.x.x.x-", "xx.xx.x-", "x-x.x.xx", "x.xxx.x-"], range: [0, 9], leap: 0.3 },
    arp: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1],
    patches: { lead: "square", bass: "saw_bass", pad: "dark_pad", arp: "pluck_dark" },
    intensity: 0.75,
  },
  boss: {
    scale: "harmonic", roots: [55, 57, 59], tempo: [142, 156], meter: 4, swing: 0,
    progressions: [[0, 5, 1, 4], [0, 0, 5, 4], [0, 6, 5, 4]],
    bass: ["rrrrrrrr", "rr.rr.rr", "r5r5r5ro"],
    drums: { low: ["k.k.....k.k.....", "kk......kk......"], medium: ["kkh.s.hhkkh.s.hh", "k.kks.h.k.kks.hh"], high: ["kkhhskhhkkhhskho", "kkkhskhhkkkhskhs"] },
    melody: { rhythms: ["x-x-x.x.", "x.x.xx--", "xx.x.x-x", "x---x.x."], range: [-1, 8], leap: 0.35 },
    arp: [0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2],
    patches: { lead: "brass", bass: "saw_bass", pad: "dark_pad", arp: "pluck_dark" },
    intensity: 0.8,
  },
  triumphant: {
    scale: "major", roots: [58, 60, 62], tempo: [100, 112], meter: 4, swing: 0,
    progressions: [[0, 3, 4, 0], [0, 5, 3, 4], [3, 4, 0, 0], [0, 4, 3, 4]],
    bass: ["r...r.5.", "r.5.r.5.", "r..rr.o."],
    drums: { low: ["k...s...k...s...", "k.......s......."], medium: ["k.h.s.h.k.h.s.hs", "k.hhs.h.k.hhs.h."], high: ["k.hks.hkk.hks.ho", "kkh.s.hhkkh.ssss"] },
    melody: { rhythms: ["x--x-x--", "x-x-x---", "x.x.x---", "x--xx-x-"], range: [2, 11], leap: 0.4 },
    arp: [0, 1, 2, 3, 2, 1, 2, 3],
    patches: { lead: "brass", bass: "pluck", pad: "warm_pad", arp: "bell" },
    intensity: 0.7,
  },
  lullaby: {
    scale: "major", roots: [64, 65, 67], tempo: [60, 70], meter: 3, swing: 0,
    progressions: [[0, 3, 4, 0], [0, 5, 3, 4], [0, 0, 4, 0]],
    bass: ["r.....", "r...5.", "r..5.."],
    drums: { low: ["............"], medium: ["............"], high: ["k.....h.....", "k...h...h..."] },
    melody: { rhythms: ["x-x-x-", "x---x-", "x-----", "x-xx-x"], range: [0, 7], leap: 0.2 },
    arp: [0, 1, 2, 1, 2, 1],
    patches: { lead: "music_box", bass: "soft_bass", pad: "soft_pad", arp: "music_box" },
    intensity: 0.3,
  },
};

export const MOOD_NAMES = Object.keys(musicMoods);
