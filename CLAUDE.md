# CLAUDE.md

Working rules for developing this project.

## Sources of truth
- Behavior and script schema: `stickman-engine-spec.md` (v1.1).
- Catalog layout, the build and the AI context pack: `docs/CATALOG_SPEC.md`; how to add things: `catalog/README.md`.
- Module interfaces and data shapes: `docs/ARCHITECTURE.md` section 4.
- Printable workbooks (`kind: "workbook"`, PDF): `docs/WORKBOOK_SPEC.md`.
- The printables set for KidsLearningPlatform (`tools/printables.mjs`, manifest): `docs/PRINTABLES_SPEC.md`.
- Current milestone and tasks: `docs/IMPLEMENTATION_PLAN.md`.
- If code and these documents disagree, fix one of them in the same change.

## Hard rules for `/engine`
- No dependencies, no I/O, no network, no globals beyond the engine instance.
- Never use `Math.random`, `Date.now` or `performance.now` (a test enforces this). Use streams from `deriveRng(seed, name)`.
- Never import `catalog/` (or the legacy `data/`); the catalog is injected via `createEngine({ catalog })`.
- The simulation never reads canvas state or font metrics. Text layout is renderer-only.
- Iterate arrays in stable order where order matters.
- Logic modules stay under about 350 lines. Split instead of growing.
- Plain ES modules with JSDoc types. No build step.

## Catalog
- The catalog lives in `catalog/` (JSON). `data/index.js` only re-exports it for one more release; import `catalog/index.js`.
- Never edit `catalog/generated/` or `catalog/manifest.json`; run `npm run catalog:build` after every catalog change.
- Every entry needs a description (and tags, see `catalog/README.md`); the build fails without one.
- Poses are authored facing right. Angles in degrees.
- Moves follow spec 8.1. Attacks need `hits`; windups take at least 15% of the duration.
- No blood or gore anywhere.

## Tests
- `npm test` runs `node --test`. Unit tests must not need a canvas backend; tag canvas tests as integration.
- New module → table-driven unit tests in `tests/unit/<module>.test.js`.
- Validator changes → add fixtures in `tests/fixtures/bad/` with expected codes.
- Golden frames are updated only deliberately (`npm run golden:update`) and reviewed by eye.
- Use the public API (`engine/index.js`) from tools and pages; reach into engine modules only for engine work.

## Milestone workflow
- Finish a milestone with green tests and a demo artifact in `out/demos/`.
- Stop for Sridhar's visual review at the checkpoints listed in `docs/REQUIREMENTS.md` section 6.
