// Catalog checks for the education files (WORKBOOK_SPEC 8): shape facts agree with the drawings, pictures use
// catalog shapes, print approvals name real presets, props and objects. Pure: src is readCatalogDir().

import { cornerPoints, straightSides } from "../../engine/workbook/shape_facts.js";

const CURVED_KINDS = ["ellipse", "sector", "crescent", "ring", "path"];

/** @returns {{ file, path, message }[]} */
export function educationIssues(src) {
  const out = [];
  const bad = (file, path, message) => out.push({ file, path, message });
  const shapes = src.files["education/shapes.json"];
  for (const [name, s] of Object.entries(shapes)) {
    const g = s.geometry;
    const f = "education/shapes.json";
    if (s.curved !== CURVED_KINDS.includes(g.kind)) bad(f, `${name}.curved`, `a ${g.kind} geometry is ${CURVED_KINDS.includes(g.kind) ? "" : "not "}curved`);
    const corners = cornerPoints(g).length;
    if ((corners || !s.curved) && corners !== s.corners) bad(f, `${name}.corners`, `the drawing has ${corners} corners, the facts say ${s.corners}`);
    const sides = straightSides(g);
    if (sides !== null && sides !== s.sides) bad(f, `${name}.sides`, `the drawing has ${sides} sides, the facts say ${s.sides}`);
    if (s.rightAngles > s.corners) bad(f, `${name}.rightAngles`, "more square corners than corners");
  }
  for (const [name, p] of Object.entries(src.files["education/shape_pictures.json"])) {
    p.parts.forEach((q, i) => {
      if (!shapes[q.shape]) bad("education/shape_pictures.json", `${name}.parts[${i}].shape`, `unknown shape "${q.shape}"`);
    });
  }
  // Tracing letters: every capital, lowercase letter and digit, each stroke starting with M and staying in the
  // em box (descenders reach 1.45).
  const glyphs = src.files["education/letters.json"].glyphs;
  for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789") if (!glyphs[ch]) bad("education/letters.json", `glyphs.${ch}`, `no tracing letter for "${ch}"`);
  for (const [ch, g] of Object.entries(glyphs)) {
    g.strokes.forEach((s, i) => {
      if (s[0]?.[0] !== "M" || s.length < 2) bad("education/letters.json", `glyphs.${ch}.strokes[${i}]`, "a stroke starts with M and draws at least one segment");
      const nums = s.flatMap((c) => c.slice(1));
      if (nums.some((v, k) => (k % 2 ? v < -0.15 || v > 1.55 : v < -0.15 || v > g.w + 0.15))) bad("education/letters.json", `glyphs.${ch}.strokes[${i}]`, "a point lies outside the em box");
    });
  }

  // Dot pictures: the grade's dot limit holds; word lists: no blocked word.
  const DOTS = { prek: 10, k: 15, 1: 25, 2: 40 };
  for (const [name, p] of Object.entries(src.files["education/dot_pictures.json"])) {
    if (p.points.length > DOTS[p.grade]) bad("education/dot_pictures.json", `${name}.points`, `${p.points.length} dots is over the grade ${p.grade} limit of ${DOTS[p.grade]}`);
  }
  const blocked = new Set((src.catalog.blocklist || []).map((w) => w.toLowerCase()));
  for (const [topic, t] of Object.entries(src.files["education/words.json"].topics)) {
    for (const w of Object.keys(t.words)) if (blocked.has(w)) bad("education/words.json", `topics.${topic}.${w}`, "a blocked word");
  }

  const known = {
    presets: new Set(src.presets.map((p) => p.id)),
    props: new Set(Object.keys(src.catalog.props)),
    objects: new Set(Object.keys(src.catalog.objects)),
  };
  const art = src.files["education/line_art.json"];
  for (const group of ["presets", "props", "objects"]) {
    for (const [id, e] of Object.entries(art[group])) {
      if (!known[group].has(id)) bad("education/line_art.json", `${group}.${id}`, `no ${group.slice(0, -1)} "${id}" in the catalog`);
      for (const pose of e.poses || []) if (!src.catalog.poses[pose]) bad("education/line_art.json", `${group}.${id}.poses`, `unknown pose "${pose}"`);
    }
  }
  return out;
}
