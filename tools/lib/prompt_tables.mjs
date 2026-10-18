// Catalog tables for LLM prompts (spec 18.2 items 3-4), generated from the catalog so the prompt
// can never drift from the data. Output is deterministic (stable order) so the system prompt caches.

import { movesFor, v1MoveNames } from "../../engine/sim.js";
import { WORLD_COMMANDS } from "../../engine/validator/index.js";

const TRAILS = ["afterimage", "slash_arc"];
const ANCHOR_NOTE = {
  head: "above the head",
  hip: "around the body",
  feet: "at the feet",
};

/** Short behaviour notes for a move, from its flags and events. */
function notes(def) {
  const f = def.flags;
  const out = [];
  if (def.name === "idle") out.push("loops; for pauses prefer wait");
  else if (f.loop) out.push(def.params.cycles !== undefined ? "loops: params.cycles" : "loops: params.distance (px) or cycles");
  if (f.airborne) out.push("airborne");
  if (f.ranged) out.push(`ranged ${f.ranged[0]}-${f.ranged[1]}px`);
  if (f.guard) out.push(`${f.guard[2]} window`);
  if (f.invulnerable) out.push("evasive");
  if (f.hold) out.push("holds pose");
  if (f.durationParam) out.push(`lasts '${f.durationParam}' s`);
  if (def.hits.length > 1) out.push(`${def.hits.length} hits`);
  if (def.events.some((e) => e.pick)) out.push("picks up nearest prop");
  if (def.events.some((e) => e.drop)) out.push("drops held prop");
  if (def.events.some((e) => e.teleport)) out.push("vanishes and reappears dx px ahead");
  if (def.name === "spawn") out.push("appears (character starts hidden)");
  return out.join(", ");
}

/** Anchors a move's beat exposes for {"on": "<id>.<anchor>"}. */
function anchors(def) {
  const hasWindow = def.hits.length > 0 || def.events.some((e) => e.projectile);
  return hasWindow ? "start, windowOpen, hit, end" : "start, end";
}

/** Relative luminance below ~0.2 counts as a dark background. */
function isDark(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255) < 0.2;
}

const fmtParams = (p) => Object.entries(p).map(([k, v]) => `${k}=${v}`).join(" ") || "-";

/** One row object per move, in catalog order. */
export function moveRows(catalog) {
  const v1 = new Set(v1MoveNames(catalog)); // the writer prompt is for v1 scripts (S5: no paired or story-holdable moves)
  return [...movesFor(catalog).values()].filter((d) => v1.has(d.name)).map((d) => ({
    name: d.name,
    category: d.category,
    duration: d.duration,
    params: d.params,
    needsProp: d.needsProp || null,
    anchors: anchors(d),
    notes: notes(d),
  }));
}

function worldRows() {
  return Object.entries(WORLD_COMMANDS).map(([name, spec]) => ({
    name,
    params: Object.entries(spec).map(([k, s]) => {
      let t = "";
      if (s.enum) t = s.enum.join("|");
      else if (s.min !== undefined) t = `${s.min}-${s.max}`;
      else if (s.text) t = `text<=${s.text}`;
      else if (s.type === "color") t = "#rrggbb";
      else if (s.prop) t = "prop name";
      else if (s.character) t = "character id";
      else if (s.theme) t = "theme name";
      return `${k}${s.required ? "*" : ""}:${t}`;
    }).join(" ") || "-",
  }));
}

/** Everything the prompt needs, as plain data. */
export function catalogData(catalog) {
  return {
    moves: moveRows(catalog),
    world: worldRows(),
    fx: catalog.fxNames.map((name) => ({ name, anchor: catalog.fxPresets[name].anchor, sustain: !!catalog.fxPresets[name].sustain })),
    sfx: [...catalog.sfxKeys],
    themes: [...catalog.themeNames],
    props: Object.entries(catalog.props).map(([name, p]) => ({ name, kind: p.kind })),
  };
}

const table = (head, rows) => [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");

/** Markdown tables for the system prompt. */
export function catalogMarkdown(catalog) {
  const d = catalogData(catalog);
  return [
    "### Moves",
    "params are defaults; override any of them in a beat's params. needsProp: the character must hold that prop kind (\"any\" = any prop).",
    table(["name", "category", "duration s", "params", "needsProp", "anchors", "notes"],
      d.moves.map((m) => [m.name, m.category, m.duration, fmtParams(m.params), m.needsProp || "-", m.anchors, m.notes || "-"])),
    "",
    "### World commands (who: \"world\"; * = required param)",
    table(["do", "params"], d.world.map((w) => [w.name, w.params])),
    "",
    "### Beat fx (\"fx\": [...] on a character beat; spawned on that character when the beat starts)",
    table(["fx", "where"], d.fx.filter((f) => f.anchor !== "point" || TRAILS.includes(f.name)).map((f) => [f.name, TRAILS.includes(f.name) ? "motion trail for this move" : ANCHOR_NOTE[f.anchor] + (f.sustain ? ", lingers ~1.6 s" : "")])),
    `Hit-only fx (spawned automatically by hits, explosions and props; do not list them in beats): ${d.fx.filter((f) => f.anchor === "point" && !TRAILS.includes(f.name)).map((f) => f.name).join(", ")}`,
    "",
    `### Props (characters[].prop or spawn_prop): ${d.props.map((p) => `${p.name} (${p.kind})`).join(", ")}`,
    "### Themes (meta.theme). Character colors must contrast with the background color behind the characters:",
    table(["theme", "background behind characters", "good character colors"], d.themes.map((t) => [t, catalog.themes[t].characterBg, isDark(catalog.themes[t].characterBg) ? "bright: light blue, yellow, orange, pink, white" : "strong or dark: red, blue, purple, dark green, black"])),
    `### Sound keys (automatic from moves and hits; listed for reference): ${d.sfx.join(", ")}`,
  ].join("\n");
}
