// Public API (spec 15.1). Milestone M5.
// Usage:
//   const engine = createEngine({ catalog });
//   const result = engine.load(script);
//   engine.renderFrame(ctx, n);

/**
 * @param {{ catalog: object }} opts  Data catalog (see /data/index.js). The engine never imports /data itself.
 */
export function createEngine(opts) {
  if (!opts || !opts.catalog) throw new Error("createEngine: catalog is required");
  return {
    load(script) { throw new Error("not implemented: load"); },
    renderFrame(ctx, n) { throw new Error("not implemented: renderFrame"); },
    getAudioEvents() { throw new Error("not implemented: getAudioEvents"); },
    getAnchors() { throw new Error("not implemented: getAnchors"); },
    getMeta() { throw new Error("not implemented: getMeta"); },
    dispose() {},
  };
}
