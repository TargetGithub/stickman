// Safe arithmetic evaluator for move params (no eval).
// Milestone: M0. Spec: section 8.1. Interfaces: docs/ARCHITECTURE.md section 4.

/** Compile '+ - * / ( )', numbers and param names into (params) => number. */
export function compileExpr(src, allowedNames) {
  throw new Error("not implemented: compileExpr");
}

/** Return value if number, else evaluate the expression string. */
export function evalParam(value, params) {
  throw new Error("not implemented: evalParam");
}
