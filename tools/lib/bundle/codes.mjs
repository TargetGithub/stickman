// The bundle tool's own codes (CATALOG_BUNDLE_SPEC 6, 7.4): import checks, not validator codes, so they
// live here and not in catalog/docs/codes.json. Codes the validator reports for scripts that use bundles
// (E_BUNDLE_MISSING, E_BUNDLE_UNDECLARED ...) come with B3. tests/unit/bundle_check.test.js keeps this
// table, the codes the pipeline can report and the fixtures in tests/fixtures/bundles/bad/ in step.

export const BUNDLE_CODES = {
  E_BUNDLE_ARCHIVE: { step: 1, meaning: "The zip cannot be read or uses a feature the importer refuses (encryption, ZIP64, other compression, damaged entries)." },
  E_BUNDLE_SIZE: { step: 1, meaning: "A size or count cap is exceeded: archive 1 MB, files 2 MB in all, 256 KB each, 65 entries, 20:1 expansion." },
  E_BUNDLE_PATH: { step: 1, meaning: "A file outside the closed path grammar, a duplicate path (also after NFC and case folding), a symlink or a stray folder." },
  E_BUNDLE_JSON: { step: 2, meaning: "A file is not strict JSON (UTF-8 without BOM, no comments, trailing commas or duplicate keys, depth 32, strings 4,096 characters), or a text file breaks the text rules." },
  E_BUNDLE_MANIFEST: { step: 3, meaning: "bundle.json does not match bundle.schema.json; the checker's code is in the message." },
  E_BUNDLE_RESERVED: { step: 3, meaning: "The bundle id is reserved (base, core, self ...) or on the bundle blocklist." },
  E_BUNDLE_COMPAT: { step: 4, meaning: "engineVersion or catalogVersion does not include the running engine or catalog format, or the schemaVersion is unsupported." },
  E_BUNDLE_FILES: { step: 5, meaning: "The files in the bundle differ from manifest.files (missing, extra, unsorted or duplicated), or a required file is missing." },
  E_BUNDLE_HASH: { step: 5, meaning: "A file's canonical SHA-256 or the contentHash does not match the manifest." },
  E_BUNDLE_SCHEMA: { step: 6, meaning: "A file does not match its bundle schema; the checker's code is in the message." },
  E_BUNDLE_NAMESPACE: { step: 7, meaning: "An entry name or preset id does not start with '<bundle id>:', or a preset file is not named after its id." },
  E_BUNDLE_COLLISION: { step: 7, meaning: "A name is defined twice in the bundle, or a bundle with this id is already loaded with another hash." },
  E_BUNDLE_REF: { step: 8, meaning: "A reference names nothing: no such base entry, own entry or dependency entry of that kind." },
  E_BUNDLE_DEPENDENCY: { step: 8, meaning: "A namespaced name from an undeclared bundle, a dependency that is not loaded or has another hash, a cycle, or an unlisted transitive dependency." },
  E_BUNDLE_CAP: { step: 9, meaning: "A resource cap of step 9 is exceeded (entries, particles, sustained bursts, path commands and coordinates, generated items, expressions, colours)." },
  E_BUNDLE_TEXT: { step: 10, meaning: "Visible text has a blocked word, an unsupported glyph, a URL or an @ handle." },
  W_BUNDLE_SOFT: { step: 10, meaning: "Visible text has a soft word for an audience the bundle claims; the fix gives the alternative." },
  E_BUNDLE_AUDIENCE: { step: 10, meaning: "A preset claims an audience the bundle does not, or an example fails the rules of an audience the bundle claims." },
  W_BUNDLE_REVIEW: { step: 10, meaning: "A hit FX whose particles are all reds: a human should check it does not read as blood." },
  E_BUNDLE_MOVE: { step: 11, meaning: "A move fails the move checks (loader rules, draft rules on every body plan of its rig, wind-up, guard, paired-move rules)." },
  E_BUNDLE_BODY: { step: 11, meaning: "A body plan fails: a move of its rig breaks on it, its quadruped map is incomplete, or its stride is out of range." },
  E_BUNDLE_ENTRY: { step: 11, meaning: "An FX, theme, object, activity or mood breaks a semantic rule of its schema section (section 4)." },
  E_BUNDLE_PRESET: { step: 11, meaning: "A preset's cast entry does not validate on stage." },
  E_BUNDLE_EXAMPLE: { step: 11, meaning: "An example script does not validate, is too long, misses its own bundle pin, or the examples leave an added entry unused." },
  E_BUNDLE_DETERMINISM: { step: 12, meaning: "The same script with this bundle gave different frames in two runs (an engine bug the data triggers)." },
  E_BUNDLE_BLOCKED: { step: 14, meaning: "The content hash is on the bundle blocklist." },
  W_BUNDLE_UNREVIEWED: { step: 14, meaning: "The content hash is not on the allow list: the bundle is imported with the unreviewed banner." },
};
