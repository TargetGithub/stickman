// The line-art context and the bounds recorder (WORKBOOK_SPEC 6, W1), against a recording fake context.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lineArtContext, parseColour, luminance } from "../../engine/renderer/line_art.js";
import { boundsContext } from "../../engine/renderer/bounds_ctx.js";

/** A fake 2D context that logs what reaches it: [op, fillStyle | strokeStyle, lineWidth]. */
function recorder(scale = 1) {
  const log = [];
  const ctx = {
    fillStyle: "#000", strokeStyle: "#000", lineWidth: 1, dash: [],
    getTransform: () => ({ a: scale, b: 0, c: 0, d: scale }),
    getLineDash() { return this.dash; },
    setLineDash(d) { this.dash = d; },
    save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {},
    fill() { log.push(["fill", this.fillStyle]); },
    stroke() { log.push(["stroke", this.strokeStyle, this.lineWidth]); },
    fillRect() { log.push(["fillRect", this.fillStyle]); },
    strokeRect() { log.push(["strokeRect", this.strokeStyle, this.lineWidth]); },
    fillText() { log.push(["fillText", this.fillStyle]); },
    drawImage() { log.push(["drawImage"]); },
  };
  return { ctx, log };
}

test("parseColour and luminance", () => {
  for (const [c, rgba] of [["#fff", [255, 255, 255, 1]], ["#000000", [0, 0, 0, 1]], ["#ff000080", [255, 0, 0, 128 / 255]], ["rgba(10, 20, 30, 0.5)", [10, 20, 30, 0.5]], ["rgb(1,2,3)", [1, 2, 3, 1]], ["white", [255, 255, 255, 1]], ["transparent", [0, 0, 0, 0]]]) {
    assert.deepEqual(parseColour(c), rgba, c);
  }
  assert.ok(Math.abs(luminance([255, 255, 255]) - 1) < 1e-9);
  assert.equal(luminance([0, 0, 0]), 0);
});

test("fills: light ones turn white with an outline, dark ones stay black, faint and gradient ones vanish", () => {
  const cases = [
    ["#5ec8ff", 1, [["fill", "#ffffff"], ["stroke", "#000000", 1.4]]],
    ["#222222", 1, [["fill", "#000000"]]],
    ["#5ec8ff", 0.2, []],
    ["rgba(0,0,0,0.2)", 1, []],
    [{ addColorStop() {} }, 1, []],
  ];
  for (const [fill, alpha, want] of cases) {
    const { ctx, log } = recorder();
    const g = lineArtContext(ctx);
    g.fillStyle = fill;
    g.globalAlpha = alpha;
    g.beginPath();
    g.fill();
    assert.deepEqual(log, want, JSON.stringify(fill));
  }
});

test("strokes: limbs become hollow tubes, shape outlines one line, highlights white, thin lines black", () => {
  const run = (setup) => {
    const { ctx, log } = recorder(2);
    const g = lineArtContext(ctx, { outline: 1, hollowMin: 5 });
    setup(g);
    return log;
  };
  // A 9-unit limb at scale 2 (18 device px): black, then paper 1 device px narrower on each side.
  assert.deepEqual(run((g) => { g.strokeStyle = "#5ec8ff"; g.lineWidth = 9; g.beginPath(); g.stroke(); }), [["stroke", "#000000", 9], ["stroke", "#ffffff", 8]]);
  // The outline of a filled shape: one line, capped at 2.2 x the outline width.
  assert.deepEqual(run((g) => { g.fillStyle = "#fff"; g.strokeStyle = "#111"; g.lineWidth = 9; g.beginPath(); g.fill(); g.stroke(); }).slice(-1), [["stroke", "#000000", 1.1]]);
  assert.deepEqual(run((g) => { g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 9; g.beginPath(); g.stroke(); }), [["stroke", "#ffffff", 9]]);
  assert.deepEqual(run((g) => { g.strokeStyle = "#884422"; g.lineWidth = 1; g.beginPath(); g.stroke(); }), [["stroke", "#000000", 1]]);
  // A dark rim then its coloured core (strokeGroup's outline): the core adds nothing.
  const rim = run((g) => { g.strokeStyle = "#111"; g.lineWidth = 13; g.beginPath(); g.stroke(); g.strokeStyle = "#5ec8ff"; g.lineWidth = 9; g.beginPath(); g.stroke(); });
  assert.deepEqual(rim, [["stroke", "#000000", 13], ["stroke", "#ffffff", 12]]);
});

test("images are dropped, text is ink, the real context is reachable", () => {
  const { ctx, log } = recorder();
  const g = lineArtContext(ctx);
  g.drawImage();
  g.fillStyle = "#f00";
  g.fillText("hi", 0, 0);
  g.shadowBlur = 12;
  assert.deepEqual(log, [["fillText", "#000000"]]);
  assert.equal(ctx.shadowBlur, undefined);
  assert.equal(g.__real, ctx);
});

test("boundsContext records what is drawn, through transforms, with half the stroke width", () => {
  const cases = [
    [(c) => c.fillRect(10, 20, 30, 40), { x0: 10, y0: 20, x1: 40, y1: 60 }],
    [(c) => { c.translate(100, 0); c.scale(2, 2); c.beginPath(); c.arc(0, 0, 5, 0, 7); c.fill(); }, { x0: 90, y0: -10, x1: 110, y1: 10 }],
    [(c) => { c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(10, 0); c.stroke(); }, { x0: -2, y0: -2, x1: 12, y1: 2 }],
    [(c) => { c.save(); c.translate(50, 50); c.restore(); c.beginPath(); c.rect(0, 0, 1, 1); c.fill(); }, { x0: 0, y0: 0, x1: 1, y1: 1 }],
    [(c) => { c.beginPath(); c.moveTo(0, 0); c.lineTo(5, 5); }, null],
  ];
  for (const [draw, want] of cases) {
    const b = boundsContext();
    draw(b.ctx);
    assert.deepEqual(b.bounds(), want);
  }
  const b = boundsContext();
  b.ctx.someNewMethod?.(); // unknown calls are no-ops
  assert.equal(b.ctx.measureText("abcd").width > 0, true);
});
