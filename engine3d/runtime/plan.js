// Build a plan from either input form, the same way in Node and in the page: a JSON script (compile.js) or a
// JS scene module whose default export takes the director (and may export meta { seed, voice }).

import { compileScript } from "./compile.js";
import { createDirector } from "./director.js";

/**
 * @param {{ script?: object, sceneUrl?: string, catalog: object, speech?: object }} o
 */
export async function buildPlan({ script, sceneUrl, catalog, speech = {} }) {
  if (script) return { ...compileScript(script, { catalog, speech }), meta: script.meta ?? {} };
  const mod = await import(sceneUrl);
  const d = createDirector({ catalog, seed: mod.meta?.seed ?? 1, speech, voice: mod.meta?.voice ?? "soft" });
  if (mod.meta?.stage) d.stage(mod.meta.stage);
  await mod.default(d);
  return { ...d.plan(), meta: mod.meta ?? {} };
}

/**
 * The thumbnail frame's time: meta.thumbnail { t } (absolute seconds), or { scene, at } (seconds into that
 * scene, from the plan's scene starts, so it stays on the right picture when real TTS clips change beat
 * lengths). Default 1 s.
 * @param {{ scenes?: Array<{ id:string, start:number }>, duration:number }} plan
 * @param {{ t?: number, scene?: string, at?: number }} [thumb]
 */
export function thumbnailTime(plan, thumb) {
  if (thumb?.scene == null) return thumb?.t ?? 1;
  const scene = (plan.scenes ?? []).find((s) => s.id === thumb.scene);
  if (!scene) throw new Error(`thumbnail: no scene "${thumb.scene}"`);
  return Math.min(scene.start + (thumb.at ?? 0), Math.max(0, plan.duration - 1 / 60));
}
