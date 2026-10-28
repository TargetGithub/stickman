// Headless Chromium for engine3d. "gpu" draws on the Mac's GPU through ANGLE's Metal backend; "swiftshader"
// is Chromium's CPU rasteriser (what a GPU-less CI box or a container gets).

import { chromium } from "playwright";

export const GL_MODES = {
  gpu: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"],
  swiftshader: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
};

export async function launchBrowser(mode = "gpu") {
  if (!GL_MODES[mode]) throw new Error(`--gl must be ${Object.keys(GL_MODES).join(" or ")}`);
  // Keep background pages at full speed: render chunks run in pages nobody looks at.
  return chromium.launch({ headless: true, args: [...GL_MODES[mode], "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] });
}

/** A page with window.engine3d ready. Page errors are rethrown in Node with the page's message. */
export async function openPlayer(browser, origin) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("crash", () => console.error("  page crashed (renderer process died)"));
  await page.goto(`${origin}/engine3d/runtime/page.html`);
  await page.waitForFunction(() => window.engine3d, null, { timeout: 30_000 }).catch(() => {
    throw new Error(`the page did not start: ${errors.join("; ") || "timeout"}`);
  });
  return { page, errors };
}
