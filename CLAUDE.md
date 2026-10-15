# CLAUDE.md

Working rules for developing this project.

## Sources of truth
- Behavior and script schema: `stickman-engine-spec.md` (v1.1).
- Module interfaces and data shapes: `docs/ARCHITECTURE.md` section 4.
- Current milestone and tasks: `docs/IMPLEMENTATION_PLAN.md`.
- If code and these documents disagree, fix one of them in the same change.

## Hard rules for `/engine`
- No dependencies, no I/O, no network, no globals beyond the engine instance.
- Never use `Math.random`, `Date.now` or `performance.now` (a test enforces this). Use streams from `deriveRng(seed, name)`.
- Never import `/data`; the catalog is injected via `createEngine({ catalog })`.
- The simulation never reads canvas state or font metrics. Text layout is renderer-only.
- Iterate arrays in stable order where order matters.
- Logic modules stay under about 350 lines. Split instead of growing.
- Plain ES modules with JSDoc types. No build step.

## Data
- Poses are authored facing right. Angles in degrees.
- Moves follow spec 8.1. Attacks need `hits`; windups take at least 15% of the duration.
- No blood or gore anywhere.

## Tests
- `npm test` runs `node --test`. Unit tests must not need a canvas backend; tag canvas tests as integration.
- New module → table-driven unit tests in `tests/unit/<module>.test.js`.
- Validator changes → add fixtures in `tests/fixtures/bad/` with expected codes.
- Golden frames are updated only deliberately and reviewed by eye.

## Milestone workflow
- Finish a milestone with green tests and a demo artifact in `out/demos/`.
- Stop for Sridhar's visual review at the checkpoints listed in `docs/REQUIREMENTS.md` section 6.
