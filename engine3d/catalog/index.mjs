// Node loader for the 3D catalog. The page never reads these files: tools pass the loaded catalog in.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { glbClipDurations } from "../tools/lib/glb.mjs";

const REPO = fileURLToPath(new URL("../../", import.meta.url));

const read = (name) => JSON.parse(readFileSync(new URL(`./${name}.json`, import.meta.url), "utf8"));

/**
 * The whole 3D catalog plus the shared TTS timbres (catalog/story/tts_voices.json). Each character gains
 * clipDurations (seconds per clip, read from its .glb) so the director can time "then" clips in Node.
 */
export function loadCatalog3d() {
  const stages = read("stages");
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
    kinds: read("kinds").kinds,
    actions: read("actions").actions,
    voices: [...Object.keys(voices.timbres), "narrator"],
  };
}
