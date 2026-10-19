// Script schema v3 (ENGINE_V3_SPEC 7, V3.2): the v2 story schema plus the optional depth fields. A v2
// script is a valid v3 script. docs/schema/script-v3.schema.json is generated from jsonSchemaV3
// (tests/unit/schema_v3.test.js keeps them equal); validate() checks with schemaV3For(catalog).
//   scenes[].depth            { near, far, focal, horizon }: the scene's depth range and projection
//   scenes[].cast[].z         where a character stands in depth (0 the stage line; + toward the camera)
//   set[].z                   a set piece's depth (locations and scenes)
//   beats[].to                gains { x?, z }: walk to a depth (and an x)
// `layer` names stay accepted and map to z presets (engine/depth.js LAYER_Z); a node gives one or the other.

import { jsonSchemaV2, schemaV2For } from "./schema_v2.js";
import { DEPTH } from "../depth.js";

const Z = { type: "number", minimum: -4000, maximum: 2000, description: "Depth in px: 0 the stage line, positive toward the camera, negative away (checked against the scene's depth range: E_DEPTH_RANGE)." };

/** The scene depth block. */
export const DEPTH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  description: `The scene's depth lane (defaults: near ${DEPTH.near}, far ${DEPTH.far}, focal ${DEPTH.focal}, horizon ${DEPTH.horizon}).`,
  properties: {
    near: { type: "number", minimum: 0, maximum: 2000, description: "Nearest z a node may have (toward the camera)." },
    far: { type: "number", minimum: -4000, maximum: 0, description: "Farthest z a node may have." },
    focal: { type: "number", minimum: 600, maximum: 8000, description: "Camera focal length: scale = focal / (focal - z)." },
    horizon: { type: "number", minimum: 0, maximum: 800, description: "How far (px) the feet line rises for a node at infinite distance." },
  },
};

/** The v3 `to` destination: the v2 forms plus a depth. */
function destV3(dest) {
  return {
    ...dest,
    "x-formMessage": 'Use {"x": <px>}, {"near": "<id>"}, {"exit": "left"|"right"} or {"z": <depth>, "x"?: <px>}.',
    oneOf: [{ type: "object", required: ["z"], additionalProperties: false, properties: { z: Z, x: { type: "number" } } }, ...dest.oneOf],
  };
}

/** jsonSchemaV2 (or a catalog variant of it) with the v3 fields added; the input is not changed. */
export function withDepth(v2) {
  const s = JSON.parse(JSON.stringify(v2));
  s.title = "StickmanStoryV3";
  s.description = "A v2 story with the optional depth fields of ENGINE_V3_SPEC 7 (z on placements, set pieces and walks; a scene depth block).";
  s.properties.version = { const: 3 };
  const setZ = (piece) => { piece.properties.z = Z; };
  for (const loc of [s.properties.locations.items]) setZ(loc.properties.set.items);
  const scene = s.properties.scenes.items.oneOf[0];
  scene.properties.depth = DEPTH_SCHEMA;
  setZ(scene.properties.set.items);
  scene.properties.cast.items.properties.z = Z;
  const beat = scene.properties.beats.items.oneOf[0];
  beat.properties.to = destV3(beat.properties.to);
  return s;
}

export const jsonSchemaV3 = withDepth(jsonSchemaV2);

/** jsonSchemaV3 with the catalog's mood and activity names; the prebuilt object for the base catalog. */
export function schemaV3For(catalog) {
  const v2 = schemaV2For(catalog);
  return v2 === jsonSchemaV2 ? jsonSchemaV3 : withDepth(v2);
}
