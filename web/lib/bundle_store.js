// Bundles kept in this browser (CATALOG_BUNDLE_SPEC 6.3): IndexedDB, keyed by content hash. Each record is
// the zip as imported plus what the import page showed: { hash, id, version, name, license, zip, report }.
// Bundles are never edited after import; removing one deletes its record.

const DB = "stickman-bundles";
const STORE = "bundles";

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "hash" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}

export const keepBundle = (record) => tx("readwrite", (s) => s.put(record));
export const keptBundle = (hash) => tx("readonly", (s) => s.get(hash));
export const keptBundles = () => tx("readonly", (s) => s.getAll());
export const forgetBundle = (hash) => tx("readwrite", (s) => s.delete(hash));
