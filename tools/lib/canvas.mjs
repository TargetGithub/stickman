// Node canvas backend adapter (ADR-001). Tools use this instead of importing a backend directly,
// so switching backends is one line.
//
//   const backend = await loadBackend("napi");   // or "skia"
//   const canvas = backend.createCanvas(1920, 1080);
//   const ctx = canvas.getContext("2d");
//   await backend.savePng(canvas, "out/x.png");
//   const rgba = backend.readRGBA(canvas);        // Uint8Array/Uint8ClampedArray, w*h*4

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const DEFAULT_BACKEND = "napi";

const FONT_DIR = resolve(new URL("../../assets/fonts/", import.meta.url).pathname);
const FONTS = [
  { family: "Bangers", file: "Bangers-Regular.ttf" },
  { family: "Inter", file: "Inter.ttf" },
];

export async function loadBackend(name = DEFAULT_BACKEND) {
  if (name === "skia") {
    const sk = await import("skia-canvas");
    for (const f of FONTS) sk.FontLibrary.use(f.family, [`${FONT_DIR}/${f.file}`]);
    return {
      name: "skia-canvas",
      createCanvas(w, h) {
        const c = new sk.Canvas(w, h);
        c.gpu = false; // CPU raster only: deterministic output
        return c;
      },
      readRGBA: (canvas) => canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data,
      async encodePng(canvas) {
        return canvas.toBuffer("png");
      },
      async savePng(canvas, path) {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, await canvas.toBuffer("png"));
      },
    };
  }
  if (name === "napi") {
    const nr = await import("@napi-rs/canvas");
    for (const f of FONTS) nr.GlobalFonts.registerFromPath(`${FONT_DIR}/${f.file}`, f.family);
    return {
      name: "@napi-rs/canvas",
      createCanvas: (w, h) => nr.createCanvas(w, h),
      readRGBA: (canvas) => canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data,
      async encodePng(canvas) {
        return canvas.encode("png");
      },
      async savePng(canvas, path) {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, await canvas.encode("png"));
      },
    };
  }
  throw new Error(`unknown canvas backend '${name}' (use skia or napi)`);
}
