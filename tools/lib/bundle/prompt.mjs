// The "make a bundle" prompt for chat apps (CATALOG_BUNDLE_SPEC B6): a lean prompt for a project that has the
// catalog pack attached, with the bundle rules, one keyframe example and the bundle schemas of the kinds asked
// for. The reply is one JSON object { "files": { "<path>": <content> } }, written by `bundle.mjs reply`. Pure.

export const KIND_FILES = {
  poses: { schema: "poses.schema.json", path: "moves/poses.json" },
  moves: { schema: "moves.schema.json", path: "moves/<group>.json (movement, unarmed, armed, defensive, reactions, emotes, utility, life, interactions, quadruped)" },
  bodies: { schema: "bodies.schema.json", path: "characters/bodies.json" },
  faces: { schema: "faces.schema.json", path: "characters/faces.json" },
  presets: { schema: "preset.schema.json", path: "characters/presets/<name>.json" },
  fx: { schema: "fx.schema.json", path: "effects/fx.json" },
  themes: { schema: "themes.schema.json", path: "world/themes.json" },
  objects: { schema: "objects.schema.json", path: "world/objects.json" },
  props: { schema: "props.schema.json", path: "world/props.json" },
  activities: { schema: "activities.schema.json", path: "story/activities.json" },
  moods: { schema: "music_moods.schema.json", path: "story/music_moods.json" },
};

/** The one keyframe example (the worked example's move). */
const EXAMPLE_MOVE = {
  name: "robo_pals:robot_dance", description: "A stiff, happy robot dance: square arms, two jerky turns and a little bounce.", tags: ["dance", "robot", "happy"],
  category: "emote", duration: 1.6, face: "happy",
  keys: [{ t: 0, pose: "stand" }, { t: 0.2, pose: "robo_pals:arms_square", ease: "snap" }, { t: 0.45, pose: { lean: 6, head: -10, lUA: 100, lFA: 70 }, ease: "snap" }, { t: 1, pose: "stand", ease: "outQuad" }],
  root: [{ t: 0, dx: 0, dy: 0 }, { t: 0.5, dx: 0, dy: -10, ease: "outQuad" }, { t: 1, dx: 0, dy: 0, ease: "inQuad" }],
  events: [{ t: 0.45, turn: true, sfx: "pop" }],
};

/** A schema without its title and descriptions, on one line: what the model needs, smaller. */
const compact = (s) => JSON.stringify(s, (k, v) => (k === "title" || k === "description" || k === "$schema" ? undefined : v));

/**
 * @param {{ id: string, version: string, audience: string[] }} manifest  the bundle folder's manifest
 * @param {string} request  what to make, in the author's words
 * @param {{ kinds?: string[], schemas: Record<string, object>, header: string }} opts  header: the lean header line
 */
export function makeBundlePrompt(manifest, request, { kinds = ["poses", "moves", "objects"], schemas, header }) {
  const unknown = kinds.filter((k) => !KIND_FILES[k]);
  if (unknown.length) throw new Error(`unknown kinds: ${unknown.join(", ")} (use ${Object.keys(KIND_FILES).join(", ")})`);
  const id = manifest.id;
  const files = ["common.schema.json", "examples.schema.json", ...new Set(kinds.map((k) => KIND_FILES[k].schema))];
  return [
    header,
    "# Your task",
    `Make the catalog data for a Stickman catalog bundle with the id "${id}": ${request.trim()}`,
    `Write only these kinds of entries: ${kinds.map((k) => `${k} (${KIND_FILES[k].path})`).join(", ")}. Also write one example story that uses every entry you add.`,
    "Rules:",
    [
      `Every entry you add is named "${id}:<name>" (lowercase letters, digits and _ after the colon), both as a key and wherever you refer to it. A name without a colon is a base catalog name from the attached pack (base pose names are camelCase, such as walkA).`,
      "Bundles hold data only. Use the existing moves, poses, faces, sounds, layer kinds, object shapes, prop shapes and face parts by name; new drawing needs engine code. The schemas below list every allowed value and range.",
      "Every entry except poses has a description (8-200 characters, one sentence, no links) and 1-6 lowercase tags. Keep it family-friendly: no blood, gore or weapons that hurt.",
      "Moves: keys sorted by t from 0 to 1, a pose name or a partial pose (angles in degrees, authored facing right); duration 0.2-6 s; feet on the floor at the start and the end unless the move holds or jumps; attacks need hits with the first t0 at 0.15 or later.",
      `The example: examples/stories/<name>.json holds {"story": {...}} (a version 2 story, the format in the pack) that starts with "bundles": [{"id": "${id}", "version": "${manifest.version}", "hash": "self"}] and uses every entry you add (poses through a move); list it in examples/index.json. Audience: ${manifest.audience.join(", ")}.`,
      'Do not write bundle.json, files[] or contentHash: the tools compute them.',
    ].map((r) => `- ${r}`).join("\n"),
    "One move, as an example of the format:",
    `\`\`\`json\n${JSON.stringify(EXAMPLE_MOVE)}\n\`\`\``,
    `The bundle schemas your files must match (JSON Schema; "common.schema.json#/$defs/x" refers to the first one):\n${files.map((f) => `${f}: ${compact(schemas[f])}`).join("\n")}`,
    'Reply with only one JSON object in a single ```json code block: {"files": {"<path>": <the file\'s JSON>, ...}}. No explanation before or after it.',
  ].join("\n\n") + "\n";
}

/** An offline reply (--mock): a pose, a move that uses it and the example, so the whole flow can be tried. */
export function mockBundleReply(manifest) {
  const id = manifest.id;
  return { files: {
    "moves/poses.json": { [`${id}:arms_up`]: { lUA: 160, lFA: 20, rUA: -160, rFA: 20 } },
    "moves/emotes.json": [{
      name: `${id}:happy_hop`, description: "A happy little hop with both arms up in the air.", tags: ["happy", "hop"], category: "emote", duration: 1.2, face: "happy",
      keys: [{ t: 0, pose: "stand" }, { t: 0.4, pose: `${id}:arms_up`, ease: "outQuad" }, { t: 1, pose: "stand", ease: "inOutQuad" }],
      root: [{ t: 0, dx: 0, dy: 0 }, { t: 0.4, dx: 0, dy: -30, ease: "outQuad" }, { t: 0.8, dx: 0, dy: 0, ease: "inQuad" }, { t: 1, dx: 0, dy: 0 }],
    }],
    "examples/index.json": { examples: [{ path: "stories/first_look.json", kind: "story", title: "Happy hop", description: "Kai waves, then does a happy hop.", tags: ["example"] }] },
    "examples/stories/first_look.json": { story: {
      version: 2, bundles: [{ id, version: manifest.version, hash: "self" }],
      meta: { title: "Happy hop", format: "landscape", seed: 1, kind: "clip", audience: manifest.audience.includes("kids") ? "kids" : "general" },
      cast: [{ id: "kai", name: "Kai", color: "#3fd8ff" }],
      locations: [{ id: "here", theme: "white_stage" }],
      scenes: [{ id: "s1", location: "here", cast: [{ id: "kai", x: 1200, facing: 1 }], beats: [
        { id: "b1", at: 0.5, who: "kai", do: "wave" }, { id: "b2", at: { after: "b1", delay: 0.3 }, who: "kai", do: `${id}:happy_hop` },
        { id: "end", at: { after: "b2", delay: 0.5 }, who: "world", do: "fade", params: { to: "black", dur: 0.5 } }] }],
    } },
  } };
}
