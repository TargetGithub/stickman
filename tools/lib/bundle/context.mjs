// The AI context pack of one bundle (CATALOG_BUNDLE_SPEC 10.3): bundle_<id>.md, in the style of the base pack
// (CATALOG_SPEC 7.1: tables, defaults left out, no keyframes). It sits next to the base pack in a chat project.
// Budget 6 KB: rows are short, and a large bundle lists its last entries by name only. Pure.

import { catalogFragment, presetsOf } from "./layout.mjs";
import { contrastRatio } from "../../../engine/validator/semantic.js";

export const CONTEXT_BUDGET = 6 * 1024;
const CAST_COLORS = ["#3fd8ff", "#2fd3c0", "#8a2be2", "#ffc04d", "#ff3b3b", "#1a1a1a", "#ffffff"];
const MIN_CONTRAST = 1.6;

const cut = (s, n = 70) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const cell = (s) => String(s).replace(/\|/g, "/");
const table = (head, rows) => (rows.length ? [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n") : "");
const height = (d) => Math.round(d.headR * 2 + d.neck + d.torso + d.thigh + d.shin);
const kv = (o) => Object.entries(o || {}).map(([k, v]) => `${k} ${v}`).join(", ");

/** The `bundles` line scripts copy: this bundle and its dependencies. */
export const pinsLine = (bundle) => JSON.stringify([...(bundle.manifest.dependencies || []), { id: bundle.id, version: bundle.version, hash: bundle.hash }].map(({ id, version, hash }) => ({ id, version, hash })));

/**
 * @param {{ id, version, hash, manifest, files }} bundle  checkBundle(...).bundle
 * @param {object} merged  the catalog with the bundle (and its dependencies)
 * @param {{ goodThemes?: Record<string, string[]> }} [report]
 * @returns {string} Markdown
 */
export function bundleContextPack(bundle, merged, report = {}) {
  const m = bundle.manifest;
  const f = catalogFragment(bundle.files);
  const sections = [];
  const add = (title, head, rows) => rows.length && sections.push({ title, head, rows });
  add("Body plans (cast `body`)", ["body", "rig", "height px", "look"], Object.entries(f.bodies).map(([n, b]) => [n, b.rig, height(b.dims), cut(`${b.draw}${b.appearance ? `, ${kv(b.appearance)}` : ""}${b.quad ? `, ${kv(b.quad)}` : ""}`, 50)]));
  add("Characters (presets: copy the cast entry)", ["id", "role", "cast", "good themes"], presetsOf(bundle.files).map((p) => [p.id, p.role, `\`${JSON.stringify({ name: p.name, ...p.cast })}\``, (report.goodThemes?.[p.id] || []).slice(0, 4).join(", ")]));
  add("Moves (character beat `do`)", ["move", "category", "s", "params", "about"], f.moves.filter((x) => !x.flags?.partner).map((x) => [x.name, `${x.category}${x.rig === "quadruped" ? " (dog)" : ""}${x.pair ? `, pair → ${x.pair.partnerMove}` : ""}`, x.duration, kv(x.params), cut(x.description)]));
  add("Faces (`face`)", ["face", "about"], Object.entries(f.faces).map(([n, x]) => [n, cut(x.description)]));
  add("Effects (beat `fx`)", ["fx", "about"], Object.entries(f.fxPresets).map(([n, x]) => [n, cut(x.description)]));
  add("Themes (location `theme`)", ["theme", "good character colours", "about"], Object.entries(f.themes).map(([n, t]) => [n, CAST_COLORS.filter((c) => contrastRatio(c, t.characterBg) >= MIN_CONTRAST).join(" "), cut(t.description, 50)]));
  add("Objects (location `set`, `spawn_object`)", ["object", "behavior", "states", "about"], Object.entries(f.objects).map(([n, o]) => [n, o.behavior, (o.states || []).join("/"), cut(o.description, 50)]));
  add("Props (cast `prop`)", ["prop", "kind", "about"], Object.entries(f.props).map(([n, p]) => [n, p.kind, cut(p.description, 50)]));
  add("Activities (`@activity` name)", ["activity", "players", "about"], Object.entries(f.activities).map(([n, a]) => [n, a.players.join("-"), cut(a.description, 50)]));
  add("Music moods (scene `music.mood`)", ["mood", "bpm", "about"], Object.entries(f.musicMoods).map(([n, x]) => [n, x.tempo.join("-"), cut(x.description, 50)]));
  const head = [
    `# Bundle ${m.name} (${bundle.id} ${bundle.version})`,
    "",
    `${m.description} By ${m.author.name}, licence ${m.license}${m.license === "CC-BY-NC-4.0" ? " (non-commercial: videos using it must not be monetized)" : ""}. Audience: ${m.audience.join(", ")}.`,
    "",
    "Names with a colon come from this bundle. A script that uses any of them starts with this line (copy it exactly):",
    "",
    "```json",
    `"bundles": ${pinsLine(bundle)}`,
    "```",
    "",
    "Everything else (moves, faces, themes, rules) is in the base catalog pack.",
  ].join("\n");
  const render = (secs, rest) => [head, ...secs.map((s) => `## ${s.title}\n\n${table(s.head, s.rows)}`), rest].filter(Boolean).join("\n\n") + "\n";
  let text = render(sections, "");
  if (new TextEncoder().encode(text).length <= CONTEXT_BUDGET) return text;
  // Over budget: keep whole rows while they fit, then list the remaining names.
  const kept = sections.map((s) => ({ ...s, rows: [] }));
  const left = [];
  for (let i = 0; i < sections.length; i++) {
    for (const row of sections[i].rows) {
      kept[i].rows.push(row);
      if (new TextEncoder().encode(render(kept.filter((s) => s.rows.length), "")).length > CONTEXT_BUDGET - 900) {
        kept[i].rows.pop();
        left.push(row[0]);
      }
    }
  }
  const more = `## Also in this bundle\n\n${left.join(", ")}`;
  text = render(kept.filter((s) => s.rows.length), more);
  while (new TextEncoder().encode(text).length > CONTEXT_BUDGET && left.length) {
    left.pop();
    text = render(kept.filter((s) => s.rows.length), `## Also in this bundle\n\n${left.join(", ")} …`);
  }
  return text;
}
