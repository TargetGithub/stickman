// Node loader for the 3D catalog. The page never reads these files: tools pass the loaded catalog in.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { glbClipDurations } from "../tools/lib/glb.mjs";
import { expandVariants } from "./variants.mjs";

const REPO = fileURLToPath(new URL("../../", import.meta.url));

const read = (name) => JSON.parse(readFileSync(new URL(`./${name}.json`, import.meta.url), "utf8"));

/**
 * Critters and props: models.json plus every file in models/ (one file per theme, so themes can be added
 * without touching each other). A name may be defined only once.
 */
function readModels() {
  const files = ["models", ...readdirSync(new URL("./models/", import.meta.url)).filter((f) => f.endsWith(".json")).sort().map((f) => `models/${f.slice(0, -5)}`)];
  const out = { critters: {}, props: {} };
  for (const f of files) {
    const m = read(f);
    for (const k of ["critters", "props"]) {
      for (const [name, v] of Object.entries(m[k] ?? {})) {
        if (out.critters[name] || out.props[name]) throw new Error(`catalog ${f}.json: model "${name}" is already defined`);
        out[k][name] = v;
      }
    }
  }
  // Entries with `like` are variants of another model (variants.mjs): expanded here, after every file is read.
  return expandVariants(out);
}

/** stages.json plus every file in stages/ (one per theme, like models/); a stage name may be defined once. */
function readStages() {
  const stages = read("stages");
  let files = [];
  try {
    files = readdirSync(new URL("./stages/", import.meta.url)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return stages;
  }
  for (const f of files) {
    const extra = read(`stages/${f.slice(0, -5)}`);
    for (const [name, v] of Object.entries(extra.stages ?? {})) {
      if (stages.stages[name]) throw new Error(`catalog stages/${f}: stage "${name}" is already defined`);
      stages.stages[name] = v;
    }
    Object.assign(stages.lights, extra.lights ?? {});
  }
  return stages;
}

/**
 * The whole 3D catalog plus the shared TTS timbres (catalog/story/tts_voices.json). Each character gains
 * clipDurations (seconds per clip, read from its .glb) so the director can time "then" clips in Node.
 */
export function loadCatalog3d() {
  const stages = readStages();
  const models = readModels();
  const voices = JSON.parse(readFileSync(new URL("../../catalog/story/tts_voices.json", import.meta.url), "utf8"));
  return {
    colors: read("colors").colors,
    materials: read("materials").materials,
    shapes: read("shapes").shapes,
    fonts: read("fonts").fonts,
    characters: Object.fromEntries(Object.entries(read("characters").characters).map(([k, c]) => [k, { ...c, clipDurations: glbClipDurations(REPO + c.file) }])),
    stages: stages.stages,
    lights: stages.lights,
    sounds: read("sounds").sounds,
    critters: models.critters,
    props: models.props,
    kinds: read("kinds").kinds,
    actions: read("actions").actions,
    voices: [...Object.keys(voices.timbres), "narrator"],
    musicMoods: Object.keys(JSON.parse(readFileSync(new URL("../../catalog/story/music_moods.json", import.meta.url), "utf8")).moods ?? {}),
  };
}
