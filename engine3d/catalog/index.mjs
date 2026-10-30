// Node loader for the 3D catalog. The page never reads these files: tools pass the loaded catalog in.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { glbClipDurations } from "../tools/lib/glb.mjs";

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
  return out;
}

/**
 * The whole 3D catalog plus the shared TTS timbres (catalog/story/tts_voices.json). Each character gains
 * clipDurations (seconds per clip, read from its .glb) so the director can time "then" clips in Node.
 */
export function loadCatalog3d() {
  const stages = read("stages");
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
