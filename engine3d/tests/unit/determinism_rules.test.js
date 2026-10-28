// The page draws from an explicit clock: no wall time, no Math.random, no animation-frame callbacks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const BANNED = /Math\.random|Date\.now|performance\.now|requestAnimationFrame|new Date\(/;
for (const dir of ["runtime", "scenes"]) {
  test(`${dir}/ has no clocks or Math.random`, () => {
    const base = new URL(`../../${dir}/`, import.meta.url);
    for (const f of readdirSync(base).filter((f) => f.endsWith(".js"))) {
      const code = readFileSync(new URL(f, base), "utf8").replace(/\/\/.*$/gm, "");
      assert.ok(!BANNED.test(code), `${dir}/${f} uses ${code.match(BANNED)?.[0]}`);
    }
  });
}
