// Step 1 (CATALOG_BUNDLE_SPEC 6.2): reading a zip and checking archive, size and path limits. Pure: the
// caller passes the bytes and an inflate adapter (Node zlib or the browser's DecompressionStream);
// reading a folder is the Node adapter's job (tools/lib/bundle_node.mjs). An entry is { path, bytes }.

export const ARCHIVE_LIMITS = { zipBytes: 1024 * 1024, totalBytes: 2 * 1024 * 1024, fileBytes: 256 * 1024, entries: 65, ratio: 20 };

/** Directories a zip may list as entries of their own (section 3). */
const DIRS = ["characters/", "characters/presets/", "moves/", "effects/", "world/", "story/", "examples/", "examples/clips/", "examples/stories/"];

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const issue = (code, path, message, fix) => ({ code, file: path || "", path: "", message, fix });

/**
 * Read a zip archive: stored or deflate entries, no encryption, ZIP64 or multi-disk; the central
 * directory and the local headers must agree; decompression stops at the size caps.
 * @param {Uint8Array} bytes
 * @param {{ inflateRaw: (data: Uint8Array, maxBytes: number) => Uint8Array | Promise<Uint8Array> }} io
 * @returns {Promise<{ entries: Array<{ path: string, bytes: Uint8Array }>, issues: object[] }>}
 */
export async function readZip(bytes, io) {
  const issues = [];
  const bad = (message, fix = "Make the zip again with a plain zip tool (stored or deflate entries, no password).") => ({ entries: [], issues: [...issues, issue("E_BUNDLE_ARCHIVE", "", message, fix)] });
  if (bytes.length > ARCHIVE_LIMITS.zipBytes) return { entries: [], issues: [issue("E_BUNDLE_SIZE", "", `The archive is ${bytes.length} bytes.`, `Keep the zip under ${ARCHIVE_LIMITS.zipBytes} bytes.`)] };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 22 - 0xffff); p--) {
    if (view.getUint32(p, true) === 0x06054b50) { eocd = p; break; }
  }
  if (eocd < 0) return bad("This is not a zip archive (no end of central directory).");
  if (view.getUint16(eocd + 4, true) !== 0 || view.getUint16(eocd + 6, true) !== 0) return bad("Multi-disk zip archives are not supported.");
  const count = view.getUint16(eocd + 10, true);
  const cdSize = view.getUint32(eocd + 12, true);
  const cdOff = view.getUint32(eocd + 16, true);
  if (count === 0xffff || cdOff === 0xffffffff) return bad("ZIP64 archives are not supported.");
  if (cdOff + cdSize > eocd) return bad("The central directory is outside the archive.");
  if (count > ARCHIVE_LIMITS.entries + DIRS.length) return { entries: [], issues: [issue("E_BUNDLE_SIZE", "", `The archive has ${count} entries.`, `Use at most ${ARCHIVE_LIMITS.entries - 1} files plus bundle.json.`)] };
  const entries = [];
  const dec = new TextDecoder("utf-8", { fatal: true });
  let total = 0;
  let p = cdOff;
  for (let n = 0; n < count; n++) {
    if (p + 46 > eocd || view.getUint32(p, true) !== 0x02014b50) return bad("A central directory entry is broken.");
    const madeBy = view.getUint16(p + 4, true) >> 8;
    const flags = view.getUint16(p + 8, true);
    const method = view.getUint16(p + 10, true);
    const crc = view.getUint32(p + 16, true);
    const csize = view.getUint32(p + 20, true);
    const usize = view.getUint32(p + 24, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const disk = view.getUint16(p + 34, true);
    const attrs = view.getUint32(p + 38, true);
    const local = view.getUint32(p + 42, true);
    let name;
    try {
      name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    } catch {
      return bad("An entry name is not valid UTF-8.");
    }
    p += 46 + nameLen + extraLen + commentLen;
    if (flags & 0x41) return bad(`'${name}' is encrypted.`, "Make the zip without a password.");
    if (disk !== 0) return bad("Multi-disk zip archives are not supported.");
    if (csize === 0xffffffff || usize === 0xffffffff || local === 0xffffffff) return bad("ZIP64 entries are not supported.");
    if (madeBy === 3 && ((attrs >>> 16) & 0xf000) === 0xa000) {
      issues.push(issue("E_BUNDLE_PATH", name, `'${name}' is a symbolic link.`, "Put the real file in the bundle."));
      continue;
    }
    if (name.endsWith("/")) {
      if (!DIRS.includes(name) || usize !== 0) issues.push(issue("E_BUNDLE_PATH", name, `The folder '${name}' is not part of the bundle layout.`, "Use only the folders of the bundle layout (CATALOG_BUNDLE_SPEC 3)."));
      continue;
    }
    if (method !== 0 && method !== 8) return bad(`'${name}' uses compression method ${method}.`);
    if (usize > ARCHIVE_LIMITS.fileBytes) {
      issues.push(issue("E_BUNDLE_SIZE", name, `'${name}' is ${usize} bytes.`, `Keep each file under ${ARCHIVE_LIMITS.fileBytes} bytes.`));
      continue;
    }
    if (method === 8 && usize > ARCHIVE_LIMITS.ratio * Math.max(csize, 1)) {
      issues.push(issue("E_BUNDLE_SIZE", name, `'${name}' expands ${(usize / Math.max(csize, 1)).toFixed(0)} times.`, `Entries may expand at most ${ARCHIVE_LIMITS.ratio} times.`));
      continue;
    }
    total += usize;
    if (total > ARCHIVE_LIMITS.totalBytes) return { entries: [], issues: [...issues, issue("E_BUNDLE_SIZE", "", "The files add up to more than the 2 MB limit.", `Keep the bundle under ${ARCHIVE_LIMITS.totalBytes} bytes uncompressed.`)] };
    if (local + 30 > bytes.length || view.getUint32(local, true) !== 0x04034b50) return bad(`The local header of '${name}' is missing.`);
    const lNameLen = view.getUint16(local + 26, true);
    const lExtra = view.getUint16(local + 28, true);
    const lMethod = view.getUint16(local + 8, true);
    const lName = bytes.subarray(local + 30, local + 30 + lNameLen);
    const cName = bytes.subarray(p - nameLen - extraLen - commentLen, p - extraLen - commentLen);
    if (lMethod !== method || lName.length !== nameLen || lName.some((b, k) => b !== cName[k])) return bad(`The local header of '${name}' does not match the central directory.`);
    const start = local + 30 + lNameLen + lExtra;
    if (start + csize > cdOff) return bad(`'${name}' runs past the end of its data.`);
    const data = bytes.subarray(start, start + csize);
    let out;
    try {
      out = method === 0 ? data : await io.inflateRaw(data, usize);
    } catch {
      return bad(`'${name}' could not be decompressed (or is larger than it says).`);
    }
    if (out.length !== usize || crc32(out) !== crc) return bad(`'${name}' is damaged (size or checksum mismatch).`);
    entries.push({ path: name, bytes: new Uint8Array(out) });
  }
  return { entries, issues };
}

/**
 * Path and size rules for the entries of a zip or a folder (step 1).
 * @param {Array<{ path: string, bytes: Uint8Array }>} entries
 * @param {string} pathPattern  the manifest's files[].path pattern (bundle.schema.json): the closed grammar
 */
export function checkEntries(entries, pathPattern) {
  const out = [];
  const grammar = new RegExp(pathPattern);
  const seen = new Map();
  if (entries.length > ARCHIVE_LIMITS.entries) out.push(issue("E_BUNDLE_SIZE", "", `The bundle has ${entries.length} files.`, `Use at most ${ARCHIVE_LIMITS.entries - 1} files plus bundle.json.`));
  let total = 0;
  for (const e of entries) {
    total += e.bytes.length;
    if (e.bytes.length > ARCHIVE_LIMITS.fileBytes) out.push(issue("E_BUNDLE_SIZE", e.path, `'${e.path}' is ${e.bytes.length} bytes.`, `Keep each file under ${ARCHIVE_LIMITS.fileBytes} bytes.`));
    const p = e.path;
    const why = p.includes("\\") ? "uses a backslash" : p.startsWith("/") || /^[a-zA-Z]:/.test(p) ? "is an absolute path" : p.split("/").includes("..") ? "leaves the bundle folder (..)" : p !== "bundle.json" && !grammar.test(p) ? "is not a bundle file" : null;
    if (why) out.push(issue("E_BUNDLE_PATH", p, `'${p}' ${why}.`, "Bundles hold only the JSON files of the bundle layout, README.md and LICENSE.txt (CATALOG_BUNDLE_SPEC 3); no images, SVG or other files."));
    const key = p.normalize("NFC").toLowerCase();
    if (seen.has(key)) out.push(issue("E_BUNDLE_PATH", p, `'${p}' is in the bundle twice${seen.get(key) !== p ? ` (as '${seen.get(key)}')` : ""}.`, "Keep one copy of each file."));
    seen.set(key, p);
  }
  if (total > ARCHIVE_LIMITS.totalBytes) out.push(issue("E_BUNDLE_SIZE", "", `The files add up to ${total} bytes.`, `Keep the bundle under ${ARCHIVE_LIMITS.totalBytes} bytes uncompressed.`));
  return out;
}
