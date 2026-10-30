// More director moves, kept apart from director.js so each file stays small: feelings, paint, stage lights,
// clocks, lamp aim and paths. Like the rest of the director they only record timeline data. Pure: no
// three.js, no I/O, no clocks.

/** Feelings a face can show (critters, shapes with face: true, and Robo through his face morphs). */
export const FEELINGS = ["happy", "sad", "surprised", "angry", "worried", "sleepy"];

/** "3:25" → minutes after 12:00 (0-719). */
export function parseClock(text) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(text));
  if (!m || +m[1] < 1 || +m[1] > 12 || +m[2] > 59) throw new Error(`clock time "${text}" must look like 3:25 (1-12 hours)`);
  return (+m[1] % 12) * 60 + +m[2];
}

/** "#ffcc00" → [r, g, b] in 0-1 (sRGB, as written in the catalog). */
export const rgb = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255);

/** The colour name an object is drawn in when the script gives none. */
export function mainColor(o, catalog) {
  if (o.color) return o.color;
  if (o.kind === "critter") return catalog.critters[o.species]?.color ?? "white";
  if (o.kind === "prop") return catalog.props[o.model]?.color ?? "white";
  if (o.kind === "letter") return "blue";
  return "red";
}

/**
 * Add the extra moves to a director.
 * @param {object} d  the director
 * @param {{ catalog, tl, obj, now, sound, getStage, V }} k  director internals
 */
export function installExtras(d, { catalog, tl, obj, now, sound, getStage, V }) {
  let lit = false;
  // The stage's light and colours become timeline props of the target "stage" the first time they change.
  const stageBases = () => {
    if (lit) return;
    lit = true;
    const s = { ...catalog.stages[getStage().preset ?? "playroom"], ...getStage() };
    const rig = catalog.lights[s.lights];
    tl.base("stage", "background", rgb(catalog.colors[s.background].hex));
    if (s.floor) tl.base("stage", "floor", rgb(catalog.colors[s.floor].hex));
    if (s.rug) tl.base("stage", "rug", rgb(catalog.colors[s.rug].hex));
    tl.base("stage", "sun", rig.sun.intensity);
    tl.base("stage", "hemi", rig.hemisphere[0]);
    tl.base("stage", "sky", rgb(rig.hemisphere[1]));
    tl.base("stage", "ground", rgb(rig.hemisphere[2]));
    tl.base("stage", "environment", rig.environment);
  };

  Object.assign(d, {
    /** Change a face's feeling (eyebrows, mouth, eyes, head tilt; Robo's face morphs). */
    feel(id, { at: t = 0, feeling = "happy", dur = 0.35, sound: s } = {}) {
      obj(id);
      if (!FEELINGS.includes(feeling)) throw new Error(`unknown feeling "${feeling}" (known: ${FEELINGS.join(", ")})`);
      tl.set(id, "feelingFrom", now(id, "feeling", t) ?? "happy", t);
      tl.set(id, "feeling", feeling, t);
      tl.set(id, "feelAt", t, t);
      tl.set(id, "feelDur", dur, t);
      sound(s, t);
      return d;
    },

    /** Blend an object's main colour to another catalog colour (the parts drawn in its main colour change). */
    paint(id, { at: t = 0, color, dur = 0.8, ease = "sineInOut" } = {}) {
      const o = obj(id);
      if (!catalog.colors[color]) throw new Error(`unknown color "${color}"`);
      if (!o.paint) {
        o.paint = mainColor(o, catalog);
        tl.base(id, "tint", rgb(catalog.colors[o.paint].hex));
      }
      tl.tween(id, "tint", { start: t, dur, to: rgb(catalog.colors[color].hex), ease });
      return d;
    },

    /** Change the light rig and/or the background, floor and rug colours (day to night, a dim theatre). */
    lights({ at: t = 0, dur = 2, ease = "sineInOut", rig, background, floor, rug } = {}) {
      stageBases();
      const tw = (prop, to) => tl.tween("stage", prop, { start: t, dur, to, ease });
      if (rig) {
        const r = catalog.lights[rig];
        if (!r) throw new Error(`unknown light rig "${rig}"`);
        tw("sun", r.sun.intensity);
        tw("hemi", r.hemisphere[0]);
        tw("sky", rgb(r.hemisphere[1]));
        tw("ground", rgb(r.hemisphere[2]));
        tw("environment", r.environment);
      }
      if (background) tw("background", rgb(catalog.colors[background].hex));
      if (floor && tl.valueAt("stage", "floor", t)) tw("floor", rgb(catalog.colors[floor].hex));
      if (rug && tl.valueAt("stage", "rug", t)) tw("rug", rgb(catalog.colors[rug].hex));
      return d;
    },

    /**
     * Turn a clock's hands forward to a time ("3:30"): the minute hand sweeps round and the hour hand creeps
     * with it, as on a real clock. Going "back" in time goes forward round the dial instead.
     */
    clock(id, { at: t = 0, to, dur = 1.5, ease = "quadInOut", sound: s, minuteHand } = {}) {
      const o = obj(id);
      if (o.kind !== "clock") throw new Error(`clock needs a clock object, "${id}" is a ${o.kind}`);
      if (to != null) {
        const from = now(id, "minutes", t);
        let target = parseClock(to);
        while (target < from) target += 720;
        tl.tween(id, "minutes", { start: t, dur, from, to: target, ease });
      }
      // minuteHand: false hides the long hand (hour-hand-only lessons), true brings it back.
      if (minuteHand != null) tl.tween(id, "minuteHand", { start: t, dur: 0.5, to: minuteHand ? 1 : 0, ease: minuteHand ? "backOut" : "backIn" });
      sound(s, t);
      return d;
    },

    /** Point a lamp at a spot. */
    aim(id, { at: t = 0, to, dur = 1, ease = "quadInOut" } = {}) {
      const o = obj(id);
      if (o.kind !== "lamp") throw new Error(`aim needs a lamp, "${id}" is a ${o.kind}`);
      tl.tween(id, "aim", { start: t, dur, to: V(to), ease });
      return d;
    },

    /**
     * Travel through points at an even speed (a train on its track, a route on a map), easing in at the start
     * and out at the end. face: true turns the object (it faces +z) toward where it is going.
     */
    path(id, { at: t = 0, points, dur = 3, face = false } = {}) {
      obj(id);
      const pts = [now(id, "position", t), ...points.map((p) => V(p))];
      const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2]));
      const total = lens.reduce((a, b) => a + b, 0) || 1;
      let start = t;
      let yaw = (now(id, "rotation", t) ?? [0, 0, 0])[1];
      const r = now(id, "rotation", t) ?? [0, 0, 0];
      lens.forEach((len, i) => {
        const sd = (dur * len) / total;
        const n = lens.length;
        const ease = n === 1 ? "quadInOut" : i === 0 ? "quadIn" : i === n - 1 ? "quadOut" : "linear";
        tl.tween(id, "position", { start, dur: sd, from: pts[i], to: pts[i + 1], ease });
        const [dx, dz] = [pts[i + 1][0] - pts[i][0], pts[i + 1][2] - pts[i][2]];
        if (face && Math.hypot(dx, dz) > 1e-6) {
          let want = (Math.atan2(dx, dz) * 180) / Math.PI;
          while (want - yaw > 180) want -= 360;
          while (want - yaw < -180) want += 360;
          tl.tween(id, "rotation", { start, dur: Math.min(0.3, sd), to: [r[0], want, r[2]], ease: "quadOut" });
          yaw = want;
        }
        start += sd;
      });
      return d;
    },
  });
}
