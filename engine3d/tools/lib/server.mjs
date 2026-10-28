// One local HTTP server per render: serves the page, the runtime, three.js and the repo's assets (GET), and
// receives frames over a WebSocket per render job (/ws/<job>, see ws.mjs). A frame is acked only once the
// job's handler has accepted it, so the page's in-flight limit is the backpressure.

import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { acceptSocket } from "./ws.mjs";

export const REPO = fileURLToPath(new URL("../../../", import.meta.url));
const THREE_DIR = fileURLToPath(new URL("../../node_modules/three/", import.meta.url));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".ttf": "font/ttf", ".glb": "model/gltf-binary", ".png": "image/png" };
// Only these trees are served; nothing else in the repo (scripts, .env) is reachable from the page.
const ROOTS = [["/three/", THREE_DIR], ["/engine3d/runtime/", join(REPO, "engine3d/runtime/")], ["/engine3d/assets/", join(REPO, "engine3d/assets/")],
  ["/engine3d/scenes/", join(REPO, "engine3d/scenes/")], ["/assets/fonts/", join(REPO, "assets/fonts/")]];

function resolve(url) {
  for (const [prefix, dir] of ROOTS) {
    if (!url.startsWith(prefix)) continue;
    const file = normalize(join(dir, decodeURIComponent(url.slice(prefix.length))));
    if (file.startsWith(dir.endsWith(sep) ? dir : dir + sep) && existsSync(file) && statSync(file).isFile()) return file;
  }
  return null;
}

/**
 * @param {(job:string, index:number, rgba:Buffer) => Promise<void>} onFrame
 * @returns {Promise<{ origin:string, close:() => Promise<void> }>}
 */
export async function startServer(onFrame) {
  const server = createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    const file = req.method === "GET" ? resolve(u.pathname) : null;
    if (!file) {
      res.statusCode = 404;
      return res.end();
    }
    res.setHeader("content-type", TYPES[extname(file)] ?? "application/octet-stream");
    createReadStream(file).pipe(res);
  });
  server.on("upgrade", (req, socket) => {
    const job = new URL(req.url, "http://x").pathname.match(/^\/ws\/(\w+)$/)?.[1];
    if (!job) return socket.destroy();
    acceptSocket(req, socket, (msg, reply) => {
      const i = msg.readUInt32LE(0);
      onFrame(job, i, msg.subarray(4)).then(() => reply(String(i)), (e) => reply(`error ${i} ${e.message}`.slice(0, 120)));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}
