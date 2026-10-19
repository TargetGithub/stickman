// Step 9 (CATALOG_BUNDLE_SPEC 6.2): resource caps beyond the schemas' per-file limits. Pure.

import { MOVE_GROUPS, entryList } from "./layout.mjs";

export const CAPS = {
  entries: 256,
  perKind: { move: 64, pose: 128, body: 4, face: 16, preset: 24, fx: 24, theme: 8, object: 32, prop: 8, activity: 8, mood: 8 },
  particles: 120, // sum of layer counts per FX preset
  sustainBursts: 60, // rate × duration
  pathCommands: { object: 1600, bundle: 4000 },
  pathX: [-600, 600],
  pathY: [-1200, 50],
  layerItems: 400,
  exprTokens: 16,
};

/** World x range the background generators cover (engine/renderer/background_kinds.js SPAN), in px. */
const STAGE_SPAN = 14800;
/** Layer fields that set how far apart generated items are. */
const SPACING_FIELDS = ["spacing", "step", "wavelength", "minW"];

const issue = (file, path, message, fix) => ({ code: "E_BUNDLE_CAP", file, path, message, fix });

/** Tokens of a move expression (expr.js grammar: numbers, names, + - * / ( )). */
export const exprTokens = (s) => String(s).match(/[0-9]*\.?[0-9]+|[a-z_][a-z0-9_]*|[-+*/()]/gi) || [];

export function checkCaps(files) {
  const out = [];
  const entries = entryList(files);
  if (entries.length > CAPS.entries) out.push(issue("", "", `The bundle adds ${entries.length} entries.`, `Keep it to ${CAPS.entries}; split it into two bundles.`));
  const counts = {};
  for (const e of entries) counts[e.kind] = (counts[e.kind] || 0) + 1;
  for (const [kind, max] of Object.entries(CAPS.perKind)) {
    if ((counts[kind] || 0) > max) out.push(issue("", "", `The bundle adds ${counts[kind]} ${kind} entries.`, `Keep it to ${max}.`));
  }

  for (const [name, fx] of Object.entries(files["effects/fx.json"] || {})) {
    const n = (fx.layers || []).reduce((s, l) => s + (l.count || 0), 0);
    if (n > CAPS.particles) out.push(issue("effects/fx.json", `${name}.layers`, `'${name}' spawns ${n} particles per burst.`, `Keep the sum of the layers' count to ${CAPS.particles}.`));
    if (fx.sustain && fx.sustain.rate * fx.sustain.duration > CAPS.sustainBursts) out.push(issue("effects/fx.json", `${name}.sustain`, `'${name}' emits ${(fx.sustain.rate * fx.sustain.duration).toFixed(0)} bursts.`, `Keep rate × duration to ${CAPS.sustainBursts}.`));
  }

  let total = 0;
  for (const [name, o] of Object.entries(files["world/objects.json"] || {})) {
    const n = (o.paths || []).reduce((s, p) => s + (p.d?.length || 0), 0);
    total += n;
    if (n > CAPS.pathCommands.object) out.push(issue("world/objects.json", `${name}.paths`, `'${name}' has ${n} path commands.`, `Keep it to ${CAPS.pathCommands.object} per object; simplify the drawing.`));
    (o.paths || []).forEach((p, i) => (p.d || []).forEach((cmd, j) => {
      const nums = cmd.slice(1);
      for (let k = 0; k + 1 < nums.length; k += 2) {
        const [x, y] = [nums[k], nums[k + 1]];
        if (x < CAPS.pathX[0] || x > CAPS.pathX[1] || y < CAPS.pathY[0] || y > CAPS.pathY[1]) {
          out.push(issue("world/objects.json", `${name}.paths[${i}].d[${j}]`, `The point (${x}, ${y}) is outside the object area.`, `Keep x in ${CAPS.pathX.join("..")} and y in ${CAPS.pathY.join("..")} (y up is negative).`));
          return;
        }
      }
    }));
  }
  if (total > CAPS.pathCommands.bundle) out.push(issue("world/objects.json", "", `The objects have ${total} path commands in all.`, `Keep it to ${CAPS.pathCommands.bundle} per bundle.`));

  for (const [name, t] of Object.entries(files["world/themes.json"] || {})) {
    (t.layers || []).forEach((l, i) => {
      const f = SPACING_FIELDS.find((k) => typeof l[k] === "number" && l[k] > 0);
      const items = f ? Math.ceil(STAGE_SPAN / l[f]) : l.count ?? 0;
      if (items > CAPS.layerItems) out.push(issue("world/themes.json", `${name}.layers[${i}]`, `The '${l.kind}' layer makes about ${items} items.`, f ? `Use a ${f} of at least ${Math.ceil(STAGE_SPAN / CAPS.layerItems)}.` : `Use a count of at most ${CAPS.layerItems}.`));
    });
  }

  for (const g of MOVE_GROUPS) {
    (files[`moves/${g}.json`] || []).forEach((m, i) => {
      const exprs = [...(m.root || []).flatMap((k, j) => [[`root[${j}].dx`, k.dx], [`root[${j}].dy`, k.dy]]), ...(m.hits || []).map((h, j) => [`hits[${j}].damage`, h.damage])];
      for (const [p, v] of exprs) {
        if (typeof v === "string" && exprTokens(v).length > CAPS.exprTokens) out.push(issue(`moves/${g}.json`, `[${i}].${p}`, `The expression has ${exprTokens(v).length} tokens.`, `Keep expressions to ${CAPS.exprTokens} tokens.`));
      }
    });
  }

  // Colours: rgba channels 0-255 (the schemas only check the digit count).
  const walk = (v, file, path) => {
    if (typeof v === "string") {
      const m = v.match(/^rgba\((\d{1,3}), ?(\d{1,3}), ?(\d{1,3}),/);
      if (m && m.slice(1).some((c) => +c > 255)) out.push(issue(file, path, `${v} has a channel above 255.`, "Use r, g and b from 0 to 255."));
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, file, `${path}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, file, path ? `${path}.${k}` : k);
  };
  for (const [rel, v] of Object.entries(files)) if (rel.endsWith(".json") && !rel.startsWith("examples/")) walk(v, rel, "");
  return out;
}
