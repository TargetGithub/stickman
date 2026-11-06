// Review sheet for the Toybox 10K asset wave: each model in NAMES gets a 3/4 close-up (one still every 2 s, from
// t = 1), critters a second still with a feeling (surprised, then sad, alternating) and a wave of the head, and the
// last still lines every one up side by side so sizes compare.
//   node engine3d/tools/render3d.mjs engine3d/scenes/sheet10k.js --speech off --music off --res 720p --stills <times>
// panels(catalog, names) gives the still times. A batch under review gets its own two-line scene file:
//   import { makeSheet } from "./sheet10k.js";  export const meta = makeSheet.meta;  export default makeSheet(["goat", "kitten"]);

export const meta = { seed: 11, stage: { preset: "studio", fog: null }, music: false };

export const NAMES = ["bear", "cat", "dog", "sheep", "duck"];

const FEEL = ["surprised", "sad", "joyful", "worried"];

/** [name, time, label] per still, in order. */
export function panels(catalog, NAMES) {
  const out = [];
  let t = 1;
  for (const n of NAMES) {
    out.push([n, t, n]);
    t += 2;
    if (catalog?.critters?.[n]) { out.push([`${n}_feel`, t, `${n} feeling`]); t += 2; }
  }
  out.push(["lineup", t, "lineup"]);
  return out;
}

export function makeSheet(NAMES) { return (d) => sheet(d, NAMES); }
makeSheet.meta = meta;

export default function sheet10k(d) { sheet(d, NAMES); }

function sheet(d, NAMES) {
  const spot = (i) => [i * 8, 0, 0];
  let t = 1;
  const shot = (i, h, at) => {
    const [x] = spot(i);
    const dist = 0.8 + h * 1.75;
    d.set("camera", "position", [x + dist * 0.3, h * 0.62 + 0.2, dist], at - 1).set("camera", "lookAt", [x, h * 0.48, 0], at - 1).set("camera", "fov", 34, at - 1);
  };
  const height = (n) => {
    const m = d.catalog.critters[n] ?? d.catalog.props[n];
    let top = 0.6;
    for (const p of m?.parts ?? []) top = Math.max(top, (p.at?.[1] ?? 0) + ((p.s?.[1] ?? 0.2) / 2) + (p.on === "head" ? m.head?.at?.[1] ?? 0 : 0));
    return top;
  };
  NAMES.forEach((n, i) => {
    const critter = !!d.catalog.critters[n];
    const id = `m${i}`;
    d.add(critter ? { id, kind: "critter", species: n, at: spot(i), rotation: [0, 25, 0] } : { id, kind: "prop", model: n, at: spot(i), rotation: [0, 25, 0] });
    shot(i, height(n), t);
    t += 2;
    if (critter) {
      d.feel(id, { feeling: FEEL[i % FEEL.length], at: t - 1.2 });
      shot(i, height(n), t);
      t += 2;
    }
  });
  // Lineup: everything side by side at size 1, in a row.
  const row = 100;
  let x = 0;
  const xs = NAMES.map((n) => { const w = Math.max(0.9, height(n) * 0.75); const at = x + w / 2; x += w + 0.25; return at; });
  NAMES.forEach((n, i) => {
    const critter = !!d.catalog.critters[n];
    const o = { id: `l${i}`, at: [row + xs[i] - x / 2, 0, 0], rotation: [0, -12, 0] };
    d.add(critter ? { ...o, kind: "critter", species: n } : { ...o, kind: "prop", model: n });
  });
  const top = Math.max(...NAMES.map(height));
  const span = Math.max(x, top * 1.7);
  d.set("camera", "position", [row, top * 0.6 + 0.3, span * 0.95 + 1], t - 1).set("camera", "lookAt", [row, top * 0.42, 0], t - 1).set("camera", "fov", 36, t - 1);
  d.end(t + 1);
}
