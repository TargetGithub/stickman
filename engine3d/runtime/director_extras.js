// More director moves, kept apart from director.js so each file stays small: feelings, paint, stage lights,
// clocks, lamp aim and paths. Like the rest of the director they only record timeline data. Pure: no
// three.js, no I/O, no clocks.

import { localBounds } from "./bounds.js";
import { withDefaults } from "./teach_layout.js";

/** Teaching-kit kinds paint can recolour (their `color`: a stroke, an arrow, a number line's beam, shaded fraction parts). */
export const PAINT_KIT = ["stroke", "pointer", "number_line", "fraction_bar", "fraction_circle"];
const FRACTIONS = ["fraction_bar", "fraction_circle"];

/** Feelings a face can show (critters, shapes with face: true, and Robo through his face morphs). */
export const FEELINGS = ["happy", "sad", "surprised", "angry", "worried", "sleepy", "joyful"];

/** "3:25" → minutes after 12:00 (0-719). */
export function parseClock(text) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(text));
  if (!m || +m[1] < 1 || +m[1] > 12 || +m[2] > 59) throw new Error(`clock time "${text}" must look like 3:25 (1-12 hours)`);
  return (+m[1] % 12) * 60 + +m[2];
}

/** "#ffcc00" → [r, g, b] in 0-1 (sRGB, as written in the catalog). */
export const rgb = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255);

/** The colour name an object's main colour is drawn in (after its recolor map, for critters and props). */
export function mainColor(o, catalog) {
  if (PAINT_KIT.includes(o.kind)) return withDefaults(o).color;
  const c = o.color ??(o.kind === "critter" ? catalog.critters[o.species]?.color ?? "white" : o.kind === "prop" ? catalog.props[o.model]?.color ?? "white" : o.kind === "letter" ? "blue" : "red");
  return o.recolor?.[c] ?? c;
}

/** Every colour name a critter or prop is built with (parts, eyes, cheeks, mouth), after its recolor map. */
export function modelColors(o, catalog) {
  const m = o.kind === "critter" ? catalog.critters[o.species] : o.kind === "prop" ? catalog.props[o.model] : null;
  if (!m) return [];
  const main = o.color ?? m.color;
  const used = m.parts.map((p) => p.c ?? main);
  if (m.eyes) used.push(m.eyes.color ?? "ink", "white");
  if (m.eyes && m.cheeks) used.push(m.cheeks.color ?? "pink");
  if (m.mouth) used.push(m.mouth.color ?? "ink");
  return [...new Set(used.map((c) => o.recolor?.[c] ?? c))];
}

/**
 * Add the extra moves to a director.
 * @param {object} d  the director
 * @param {{ catalog, tl, obj, now, sound, getStage, V }} k  director internals
 */
export function installExtras(d, { catalog, tl, obj, now, sound, getStage, V }) {
  let lit = false;
  const lying = new Map(); // id → its standing pose, while it lies down (lie)
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
    /**
     * A card's or page's picture comes alive (#85): the flat picture swells to its full depth, steps out of the card
     * toward the camera and wiggles; back: true flattens it into the card again.
     */
    alive(id, { at: t = 0, dur = 0.8, out = 0.35, back = false, sound: s = "magic_sparkle" } = {}) {
      let pid = id;
      try { obj(`${id}_pic`); pid = `${id}_pic`; } catch { /* the target is the picture itself */ }
      const p = obj(pid);
      const sc = Array.isArray(p.scale) ? p.scale : [1, 1, 1];
      const full = [sc[0], sc[1], Math.max(sc[2], sc[0])];
      const pos = now(pid, "position", t) ?? p.at;
      if (back) {
        tl.tween(pid, "scale", { start: t, dur, to: sc, ease: "quadInOut" });
        tl.tween(pid, "position", { start: t, dur, to: p.at, ease: "quadInOut" });
      } else {
        tl.tween(pid, "scale", { start: t, dur, to: full, ease: "backOut" });
        tl.tween(pid, "position", { start: t, dur, to: [pos[0], pos[1], pos[2] + out], ease: "backOut" });
        d.wiggle(pid, { at: t + dur, deg: 10, dur: 0.7 });
      }
      if (s) sound(s, t, { volume: 0.6 });
      return d;
    },
    /**
     * Put an object back the way it started (#98): position, rotation and size glide back over dur (0: at once).
     * A part ("box#lid") goes back to its rest pose. A hidden object stays hidden; a lying one stands as it was.
     */
    reset(id, { at: t = 0, dur = 0.5, ease = "quadInOut" } = {}) {
      const [base, part] = String(id).split("#");
      const o = obj(base);
      // Size goes back only on a shown object: a hidden one keeps its zero size until a show or pop.
      const sc = now(id, "scale", t);
      const shown = now(id, "visible", t) !== false && Array.isArray(sc) && sc.some((v) => v > 1e-3);
      const to = part != null ? { position: [0, 0, 0], rotation: [0, 0, 0] } : { position: o.at, rotation: o.rotation, ...(shown ? { scale: o.scale } : {}) };
      for (const [prop, v] of Object.entries(to)) {
        if (dur > 0) tl.tween(id, prop, { start: t, dur, to: v, ease });
        else tl.set(id, prop, v, t);
      }
      if (part == null) tl.set(id, "hop", 0, t + dur);
      lying.delete(base);
      return d;
    },
    /**
     * Lie down (critters, characters, props): pose "side" lays it on its side facing the camera (side 1: head to
     * the left), "back" on its back face up (head to the left with side 1, so the camera sees its profile), "up" stands it again. It turns about its
     * base and lifts by its half thickness so it rests on the floor; then look or feel as usual (looks up at the sky:
     * a look after lying on its back). Works from the object's rest rotation and position at that time.
     */
    lie(id, { at: t = 0, pose = "side", side = 1, dur = 0.8, ease = "quadInOut" } = {}) {
      const o = obj(id);
      const b = localBounds({ ...o, at: [0, 0, 0], rotation: [0, 0, 0] }, catalog);
      const p = [...(now(id, "position", t) ?? o.at)];
      const rest = lying.get(id) ?? { y: p[1], rot: [...(now(id, "rotation", t) ?? o.rotation ?? [0, 0, 0])] };
      lying.set(id, rest);
      let rot = [...rest.rot];
      let y = rest.y;
      if (pose === "side") {
        rot = [rest.rot[0], rest.rot[1], rest.rot[2] + 90 * side];
        y = rest.y + (side > 0 ? b.max[0] : -b.min[0]);
      } else if (pose === "back") {
        // Face up, head to the left (side 1) or right: the camera sees the profile, as when lying on the grass.
        rot = [-90, 0, 90 * side];
        y = rest.y - b.min[2];
      } else lying.delete(id);
      d.tween(id, "position", [p[0], Math.round(y * 1000) / 1000, p[2]], { at: t, dur, ease });
      return d.tween(id, "rotation", rot, { at: t, dur, ease });
    },
    /**
     * Roll along the floor to `to`: glide there and turn by distance / radius about the axis across the path, so
     * a ball's surface does not slide. The object turns about its pivot, so give a ball `pivot: [0, r, 0]` (its
     * centre; its at is then the centre too). radius defaults to pivot[1], else half the object's size.
     */
    roll(id, { at: t = 0, to, dur = 1, ease = "quadInOut", radius } = {}) {
      const o = obj(id);
      const from = now(id, "position", t) ?? o.at;
      const r = radius ?? (o.pivot?.[1] > 0 ? o.pivot[1] : 0.5 * (o.size ?? 1));
      const k = 180 / Math.PI / r;
      const rot = [...(now(id, "rotation", t) ?? o.rotation ?? [0, 0, 0])];
      rot[2] -= (V(to)[0] - from[0]) * k;
      rot[0] += (V(to)[2] - from[2]) * k;
      d.tween(id, "position", V(to), { at: t, dur, ease });
      return d.tween(id, "rotation", rot.map((x) => Math.round(x * 1000) / 1000), { at: t, dur, ease });
    },
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

    /**
     * Blend an object's main colour to another catalog colour (the parts drawn in its main colour change).
     * from: blend the parts drawn in that colour instead (a plant's "leaf" parts), timeline prop "tint:<from>".
     */
    paint(id, { at: t = 0, color, dur = 0.8, ease = "sineInOut", from } = {}) {
      const o = obj(id);
      if (!catalog.colors[color]) throw new Error(`unknown color "${color}"`);
      if (from != null && !catalog.colors[from]) throw new Error(`unknown color "${from}"`);
      const main = mainColor(o, catalog);
      const to = rgb(catalog.colors[color].hex);
      if (FRACTIONS.includes(o.kind)) {
        // Fraction parts: the shaded colour (as shade's color does), or with from: <its empty colour> the empty parts.
        const empty = withDefaults(o).empty;
        if (from != null && from !== empty && from !== main) throw new Error(`paint "${id}": from must be its colour "${main}" or its empty colour "${empty}"`);
        if (from === empty && from !== main) {
          if (!o.paintEmpty) {
            o.paintEmpty = true;
            tl.base(id, "emptyColor", rgb(catalog.colors[empty].hex));
          }
          tl.tween(id, "emptyColor", { start: t, dur, to, ease });
        } else tl.tween(id, "shadeColor", { start: t, dur, to, ease });
        return d;
      }
      if (o.kind === "letter" && Array.isArray(o.colors) && from == null) {
        // Letters in several colours: every character blends from its own colour (props "tint@<character index>").
        if (!o.paintChars) {
          o.paintChars = true;
          Array.from(o.text).forEach((ch, i) => ch.trim() && tl.base(id, `tint@${i}`, rgb(catalog.colors[o.colors[i] ?? o.color ?? "blue"].hex)));
        }
        Array.from(o.text).forEach((ch, i) => ch.trim() && tl.tween(id, `tint@${i}`, { start: t, dur, to, ease }));
        return d;
      }
      if (from == null || from === main) {
        if (!o.paint) {
          o.paint = main;
          tl.base(id, "tint", rgb(catalog.colors[o.paint].hex));
        }
        tl.tween(id, "tint", { start: t, dur, to: rgb(catalog.colors[color].hex), ease });
        return d;
      }
      o.paintParts ??= [];
      if (!o.paintParts.includes(from)) {
        o.paintParts.push(from);
        tl.base(id, `tint:${from}`, rgb(catalog.colors[from].hex));
      }
      tl.tween(id, `tint:${from}`, { start: t, dur, to: rgb(catalog.colors[color].hex), ease });
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
      // A rig may bring its own sky (dusk): used when the action names no background.
      const bg = background ?? (rig ? catalog.lights[rig].background : null);
      if (bg) tw("background", rgb(catalog.colors[bg].hex));
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
  return { stageBases };
}
