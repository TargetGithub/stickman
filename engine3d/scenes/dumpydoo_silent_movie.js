// DumpyDoo in "The Silly Day": a slapstick short (about 10 minutes) in the spirit of the old silent comedies: a
// bowler hat and a springy cane, a waddle with the toes turned out, a look to the audience, the iris in and out.
// For kids it adds colourful title cards read aloud in a baby voice, DumpyDoo's own little lines (lip-synced) and
// a different music mood for each chapter. The gags are original; the script is
// engine3d/scripts/series/dumpydoo/SILENT_MOVIE.md.
//   node engine3d/tools/render3d.mjs engine3d/scenes/dumpydoo_silent_movie.js --res 1080p --fps 30 --speech tts
// Chapters live in scenes/silent/ (acts_a: opening, hat, banana, door; acts_b: bee, seesaw, mirror; acts_c:
// factory, rain cloud, finale; acts_d: paint bucket, balloons, pup, skateboard; acts_e: nap, bath, magic hat); shared moves in
// scenes/silent/kit.js.

import { filmLook } from "../runtime/film_look.js";
import { card, IRISES } from "./silent/kit.js";
import { cast, opening, chapterHat, chapterBanana, chapterDoor } from "./silent/acts_a.js";
import { chapterBee, chapterSeesaw, chapterMirror } from "./silent/acts_b.js";
import { chapterFactory, chapterCloud, finale } from "./silent/acts_c.js";
import { chapterPaint, chapterBalloons, chapterPup, chapterSkate } from "./silent/acts_d.js";
import { chapterBath, chapterNap, chapterMagic } from "./silent/acts_e.js";

export const meta = { seed: 52, music: "playful", musicGain: 0.3 };

export default function silentMovie(d) {
  IRISES.length = 0; // the plan is built more than once (before and after speech is measured)
  d.stage({ preset: "town" });
  cast(d);
  let t = 0;
  t = opening(d, t);
  t = chapterHat(d, t);
  t = chapterBanana(d, t);
  t = chapterDoor(d, t);
  t = chapterPaint(d, t);
  t = chapterBee(d, t);
  t = chapterSeesaw(d, t);
  t = chapterBalloons(d, t);
  t = chapterMagic(d, t, "Chapter Eight\n\nThe Magic Hat");
  t = chapterMirror(d, t);
  t = chapterPup(d, t);
  t = chapterNap(d, t, "Chapter Eleven\n\nForty Winks");
  t = chapterFactory(d, t);
  t = chapterSkate(d, t);
  t = chapterCloud(d, t);
  t = chapterBath(d, t, "Chapter Fifteen\n\nBubble Trouble");
  t = finale(d, t);
  // The iris closes on DumpyDoo far down the road; then the last card.
  const irisOut = t - 2.4;
  t = card(d, "The End", t + 0.4, 4, { music: "happy" });
  filmLook(d, {
    irises: [
      { at: 0, dur: 0.01, to: 0, center: [0.24, 0.42] },
      ...IRISES,
      { at: irisOut, dur: 2.2, to: 0.07, center: [0.48, 0.5] },
      { at: irisOut + 2.6, dur: 0.4, to: 0 },
    ],
  });
  d.end(t);
}
