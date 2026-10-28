// Build a plan from either input form, the same way in Node and in the page: a JSON script (compile.js) or a
// JS scene module whose default export takes the director (and may export meta { seed, voice }).

import { compileScript } from "./compile.js";
import { createDirector } from "./director.js";

/**
 * @param {{ script?: object, sceneUrl?: string, catalog: object, speech?: object }} o
 */
export async function buildPlan({ script, sceneUrl, catalog, speech = {} }) {
  if (script) return compileScript(script, { catalog, speech });
  const mod = await import(sceneUrl);
  const d = createDirector({ catalog, seed: mod.meta?.seed ?? 1, speech, voice: mod.meta?.voice ?? "soft" });
  if (mod.meta?.stage) d.stage(mod.meta.stage);
  await mod.default(d);
  return d.plan();
}
