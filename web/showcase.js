// Showcase page (CATALOG_SPEC 8): every catalog entry as a card with a live preview, read from
// catalog/generated/catalog.json. Previews are tiny stories (web/lib/showcase_scripts.js) run through the
// public engine; they render only while visible, at thumbnail size, and pause off-screen.

import { createEngine } from "../engine/index.js";
import { buildSections } from "./lib/showcase_data.js";
import { loadShowcaseBundles, withBundles, markBundleCards } from "./lib/showcase_bundles.js";
import { scaledContext } from "./lib/scaled_ctx.js";

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, text !== undefined ? { textContent: text } : {});
const store = {
  get: (k, d) => { try { return localStorage.getItem(`showcase.${k}`) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(`showcase.${k}`, v); } catch {} },
};

let [full, vocab] = await Promise.all(["../catalog/generated/catalog.json", "../catalog/generated/engine_vocab.json"].map((u) => fetch(u).then((r) => r.json())));
await Promise.all([document.fonts.load("40px Bangers"), document.fonts.load("20px Inter")]).catch(() => {});
// The "Bundles" switch (CATALOG_BUNDLE_SPEC B5): kept and stored bundles join every section; switching reloads.
const bundlesOn = store.get("bundles", "") === "on";
let loadedBundles = [];
if (bundlesOn) {
  const r = await loadShowcaseBundles(full.catalog);
  loadedBundles = r.bundles;
  full = { ...withBundles(full, r.bundles, r.results), catalog: r.catalog };
  const bad = r.results.filter((x) => !x.ok);
  if (bad.length) console.warn(`bundles not loaded: ${bad.map((x) => `${x.name} (${x.errors[0]?.code})`).join(", ")}`);
}
const catalog = full.catalog;
const sections = markBundleCards(buildSections(full, vocab), loadedBundles);
$("bundles").checked = bundlesOn;
$("bundles").parentElement.title += loadedBundles.length ? `\nloaded: ${loadedBundles.map((b) => `${b.id} ${b.version}`).join(", ")}` : "";
$("bundles").addEventListener("change", () => {
  store.set("bundles", $("bundles").checked ? "on" : "");
  location.reload();
});
const createCanvas = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });

// ---- header controls ----
for (const b of catalog.bodyNames) $("body").add(new Option(b, b));
$("body").value = store.get("body", "stickman");
$("color").value = store.get("color", "#2f7fd9");
const look = () => ({ body: $("body").value, color: $("color").value });
const theme = store.get("theme", "");
if (theme) document.documentElement.dataset.theme = theme;
$("themeToggle").addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "light" : "dark";
  store.set("theme", document.documentElement.dataset.theme);
});
const tags = [...new Set(sections.flatMap((s) => s.cards.flatMap((c) => c.tags)))].sort();
for (const t of tags) $("tag").add(new Option(t, t));

// ---- previews: one engine per visible card, a few kept warm ----
const live = new Map(); // card element → { engine, total, frame, ctx }
const visible = new Set();
const lru = [];
const KEEP = 24;
const placeOpts = {};

function startPreview(node) {
  const c = node._card;
  if (!c.script || live.has(node)) return;
  const canvas = node.querySelector("canvas");
  let script;
  try {
    script = c.script(look(), placeOpts[node._section] || {});
  } catch (e) {
    return showError(node, e.message);
  }
  const engine = createEngine({ catalog, createCanvas });
  const r = engine.load(script);
  if (!r.ok) return showError(node, r.errors.map((e) => `${e.code}: ${e.message}`).join("\n"));
  canvas.width = 640;
  canvas.height = Math.round((640 * r.height) / r.width);
  let ctx = scaledContext(canvas.getContext("2d"), canvas.width / r.width);
  if (c.crop) {
    // A window of c.crop frame px around the first character's head (packed joints: hip, shoulder, neckTop, head, ...).
    const f = engine.getFrame(Math.min(r.totalFrames - 1, 150));
    const [hx, hy] = [f.chars[0].joints[6], f.chars[0].joints[7]];
    const w = c.crop;
    const h = (w * canvas.height) / canvas.width;
    const sx = r.width / 2 + (hx - f.cam.x) * f.cam.zoom;
    const sy = r.height / 2 + (hy - f.cam.y) * f.cam.zoom;
    ctx = scaledContext(canvas.getContext("2d"), canvas.width / w, sx - w / 2, sy - h * 0.42);
  }
  live.set(node, { engine, total: r.totalFrames, frame: 0, ctx });
  lru.push(node);
  while (lru.length > KEEP) {
    const old = lru.find((n) => !visible.has(n));
    if (!old) break;
    lru.splice(lru.indexOf(old), 1);
    live.get(old)?.engine.dispose?.();
    live.delete(old);
  }
}

function showError(node, text) {
  node.querySelector(".err")?.remove();
  node.querySelector(".body").append(el("div", "err", text));
}

/** Rebuild the previews of cards whose look depends on the controls (body, color, time, weather). */
function resetPreviews(filter = () => true) {
  for (const [node, p] of [...live]) {
    if (!filter(node)) continue;
    p.engine.dispose?.();
    live.delete(node);
    lru.splice(lru.indexOf(node), 1);
    if (visible.has(node)) startPreview(node);
  }
}

const observer = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      visible.add(e.target);
      startPreview(e.target);
    } else visible.delete(e.target);
  }
}, { rootMargin: "120px" });

let last = 0;
function tick(ts) {
  if (ts - last >= 1000 / 30) {
    const step = Math.max(1, Math.round(((ts - last) / 1000) * 60));
    last = ts;
    for (const node of visible) {
      const p = live.get(node);
      if (!p) continue;
      p.frame = (p.frame + step) % p.total;
      p.engine.renderFrame(p.ctx, p.frame);
      p.ctx.resetTransform();
    }
  }
  requestAnimationFrame(tick);
}

// ---- cards ----
function copyText(c) {
  return typeof c.copy === "string" ? c.copy : JSON.stringify(c.copy, null, 2);
}

/** A still picture (workbook shapes): the card's draw(ctx, w, h) on white, once. */
function staticCanvas(c) {
  const canvas = el("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  try {
    c.draw(ctx, canvas.width, canvas.height);
  } catch (e) {
    console.warn(`${c.id}: ${e.message}`);
  }
  return canvas;
}

function cardNode(section, c) {
  const node = el("article", "card");
  node.id = `${section.id}/${c.id}`;
  node._card = c;
  node._section = section.id;
  node._text = `${c.name} ${c.description} ${c.tags.join(" ")} ${c.meta || ""}`.toLowerCase();
  if (c.script) node.append(el("canvas"));
  if (c.draw) node.append(staticCanvas(c));
  const body = el("div", "body");
  const row = el("div", "row");
  const name = el("a", "", c.name);
  name.href = `#${section.id}/${c.id}`;
  const title = el("span", "name");
  title.append(name);
  row.append(title);
  body.append(row, el("div", "desc", c.description));
  if (c.meta) body.append(el("div", "meta", c.meta));
  if (c.tags.length) {
    const t = el("div", "tags");
    for (const tag of c.tags) {
      const chip = el("span", "tag", tag);
      chip.addEventListener("click", () => { $("tag").value = tag; applyFilter(); });
      t.append(chip);
    }
    body.append(t);
  }
  const actions = el("div", "actions");
  const copy = el("button", "", c.audio || typeof c.copy === "string" ? "copy name" : "copy JSON");
  copy.type = "button";
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(copyText(c));
      copy.textContent = "copied";
    } catch {
      copy.textContent = "copy failed";
    }
    setTimeout(() => (copy.textContent = c.audio || typeof c.copy === "string" ? "copy name" : "copy JSON"), 1200);
  });
  actions.append(copy);
  if (c.audio) actions.append(audioButton(c));
  if (c.example) actions.append(examplePreviewButton(node, c));
  if (c.link) actions.append(Object.assign(el("a", "", "open in player"), { href: c.link }));
  body.append(actions);
  node.append(body);
  return node;
}

function audioButton(c) {
  const b = el("button", "", "▶ play");
  b.type = "button";
  let audio = null;
  b.addEventListener("click", async () => {
    if (audio && !audio.paused) return audio.pause();
    if (!audio) {
      const ok = await fetch(c.audio, { method: "HEAD" }).then((r) => r.ok).catch(() => false);
      if (!ok) {
        b.textContent = c.audio.includes("catalog_media") ? "no clip: run npm run catalog:media" : "no file: run npm run sfx";
        return;
      }
      audio = new Audio(c.audio);
      audio.addEventListener("play", () => (b.textContent = "❚❚ pause"));
      audio.addEventListener("pause", () => (b.textContent = "▶ play"));
      audio.addEventListener("ended", () => (b.textContent = "▶ play"));
    }
    audio.currentTime = 0;
    audio.play();
  });
  return b;
}

/** Examples preview on request (a story simulates for a moment). */
function examplePreviewButton(node, c) {
  const b = el("button", "", "▶ preview");
  b.type = "button";
  b.addEventListener("click", async () => {
    b.disabled = true;
    b.textContent = "loading…";
    const ex = await fetch(`../catalog/examples/${c.example}`).then((r) => r.json());
    const script = ex.story || ex;
    if (!node.querySelector("canvas")) node.prepend(el("canvas"));
    c.script = () => script;
    live.delete(node);
    visible.add(node);
    startPreview(node);
    b.remove();
  });
  return b;
}

// ---- layout, filters, deep links ----
const main = $("main");
main.innerHTML = "";
for (const s of sections) {
  const sec = el("section");
  sec.id = s.id;
  sec.append(el("h2", "", s.title), el("p", "intro", s.intro));
  if (s.options) {
    const opts = el("div", "opts");
    for (const [k, values] of Object.entries(s.options)) {
      const sel = el("select");
      sel.setAttribute("aria-label", k);
      for (const v of values) sel.add(new Option(`${k}: ${v}`, v));
      sel.addEventListener("change", () => {
        placeOpts[s.id] = { ...(placeOpts[s.id] || {}), [k]: sel.value };
        resetPreviews((n) => n._section === s.id);
      });
      opts.append(sel);
    }
    sec.append(opts);
  }
  const groups = new Map();
  for (const c of s.cards) {
    const g = c.group || "";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(c);
  }
  for (const [g, cards] of groups) {
    const wrap = el("div", "group");
    if (g && groups.size > 1) wrap.append(el("h3", "", g));
    const grid = el("div", "grid");
    for (const c of cards) {
      const node = cardNode(s, c);
      grid.append(node);
      if (c.script) observer.observe(node);
    }
    wrap.append(grid);
    sec.append(wrap);
  }
  main.append(sec);
  const link = el("a");
  link.href = `#${s.id}`;
  link.append(document.createTextNode(s.title), el("span", "", String(s.cards.length)));
  $("nav").append(link);
}

function applyFilter() {
  const q = $("search").value.trim().toLowerCase();
  const tag = $("tag").value;
  let shown = 0;
  for (const node of main.querySelectorAll(".card")) {
    const ok = (!q || q.split(/\s+/).every((w) => node._text.includes(w))) && (!tag || node._card.tags.includes(tag));
    node.classList.toggle("hidden", !ok);
    if (ok) shown++;
  }
  for (const g of main.querySelectorAll(".group")) g.classList.toggle("hidden", !g.querySelector(".card:not(.hidden)"));
  for (const s of main.querySelectorAll("section")) s.classList.toggle("hidden", !s.querySelector(".card:not(.hidden)"));
  $("count").textContent = `${shown} of ${main.querySelectorAll(".card").length}`;
}
$("search").addEventListener("input", applyFilter);
$("tag").addEventListener("change", applyFilter);
const lookDependent = ["characters", "looks", "faces", "moves", "effects", "places", "objects", "activities"];
for (const id of ["body", "color"]) {
  $(id).addEventListener("change", () => {
    store.set(id, $(id).value);
    resetPreviews((n) => lookDependent.includes(n._section) && !n._card.id.startsWith("world-") && !(n._section === "characters" && !n._card.id.startsWith("body-") && id === "body"));
  });
}

function followHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  main.querySelectorAll(".card.target").forEach((n) => n.classList.remove("target"));
  for (const a of $("nav").querySelectorAll("a")) a.classList.toggle("on", a.getAttribute("href") === `#${id.split("/")[0]}`);
  if (!id) return;
  const node = document.getElementById(id);
  if (!node) return;
  if (node.classList.contains("hidden")) {
    $("search").value = "";
    $("tag").value = "";
    applyFilter();
  }
  if (node.classList.contains("card")) node.classList.add("target");
  node.scrollIntoView({ block: node.classList.contains("card") ? "center" : "start" });
}
addEventListener("hashchange", followHash);
applyFilter();
followHash();
requestAnimationFrame(tick);
