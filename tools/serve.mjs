#!/usr/bin/env node
// Minimal static file server for /web pages (no dependencies).
// Usage: node tools/serve.mjs [port]
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const port = Number(process.argv[2] || 5173);
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".ttf": "font/ttf", ".otf": "font/otf", ".woff2": "font/woff2", ".zip": "application/zip", ".md": "text/plain; charset=utf-8", ".txt": "text/plain; charset=utf-8" };

createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  // The bundle store (CATALOG_BUNDLE_SPEC 6.3) is served at /bundles/, from $STICKMAN_BUNDLES when it is set.
  const store = process.env.STICKMAN_BUNDLES ? resolve(process.env.STICKMAN_BUNDLES) : null;
  const base = store && urlPath.startsWith("/bundles/") ? store : root;
  const file = normalize(join(base, store && base === store ? urlPath.slice("/bundles".length) : urlPath === "/" ? "/web/index.html" : urlPath));
  if (!file.startsWith(base)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`serving ${root} at http://localhost:${port}/`));
