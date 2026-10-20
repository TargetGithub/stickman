// Output frame rate for record.mjs (`--fps`): the simulation always runs at the engine's 60 fps, and a
// lower output rate renders only the simulation frames nearest each output frame's time. Frames are random
// access, so skipping costs nothing; 30 fps takes every 2nd frame, 24 fps alternates steps of 2 and 3. Pure.

/** Output rates record.mjs accepts. */
export const OUTPUT_FPS = [24, 25, 30, 60];

/**
 * Parse an `--fps` value against the simulation rate.
 * @returns {{ fps:number } | { error:string }}
 */
export function parseOutputFps(value, simFps) {
  if (value === null || value === undefined) return { fps: simFps };
  const fps = Number(value);
  if (!OUTPUT_FPS.includes(fps)) return { error: `--fps must be one of ${OUTPUT_FPS.join(", ")}, not "${value}"` };
  if (fps > simFps) return { error: `--fps ${fps} is above the engine's ${simFps} fps` };
  return { fps };
}

/**
 * The simulation frames to render for frames from..to (inclusive) at an output rate.
 * Output frame k shows time k / outFps from `from`; it takes the simulation frame nearest that time.
 * @returns {number[]}  ascending simulation frame numbers, the first always `from`
 */
export function outputFrames(from, to, simFps, outFps) {
  if (outFps === simFps) return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
  const count = Math.floor(((to - from + 1) * outFps) / simFps);
  const out = [];
  for (let k = 0; k < count; k++) out.push(Math.min(to, from + Math.round((k * simFps) / outFps)));
  return out;
}
