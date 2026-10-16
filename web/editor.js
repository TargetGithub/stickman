// Move editor (M1.4). Edits raw move data (spec 8.1), previews it with the real runtime (engine/actor.js),
// and exports a literal for /data/moves. See web/editor.html for the layout.

import { catalog } from "../data/index.js";
import { POSE_CHANNELS } from "../engine/types.js";
import { DEG, easings } from "../engine/math.js";
import { BODY, computeJoints, lowestPoint, solveIK2, bendSignOf } from "../engine/skeleton.js";
import { prepareCatalog, rootOffsetAt, CATEGORIES } from "../engine/moves.js";
import { createActor, playMove, stepActor } from "../engine/actor.js";
import { drawCharacter } from "../engine/renderer/character.js";
import { serializeMove, inline } from "./lib/serialize.js";

const $ = (id) => document.getElementById(id);
const poses = catalog.poses;
const view = $("view");
const ctx = view.getContext("2d");
const tl = $("timeline");
const tctx = tl.getContext("2d");
const GROUND = 560;
const FPS = 60;
const DRAFTS_KEY = "stickman.drafts";
const RANGES = { rot: [-360, 360], dx: [-150, 150], dy: [-200, 120] };
const HANDLES = ["head", "shoulder", "hip", "lElbow", "lHand", "rElbow", "rHand", "lKnee", "lFoot", "rKnee", "rFoot"];

const clone = (o) => JSON.parse(JSON.stringify(o));
const drafts = () => JSON.parse(localStorage.getItem(DRAFTS_KEY) || "{}");

const state = {
  draft: null,
  originalName: null,
  prepared: null, // Map of all moves incl. the draft
  problems: "",
  sel: 0,
  t: 0,
  playing: false,
  drag: null,
};

// ---------- data helpers ----------

function def() {
  return state.prepared?.get(state.draft.name) || null;
}

function resolvedPose(i) {
  return def()?.keys[i]?.pose || poses.stand;
}

function revalidate() {
  const others = catalog.moves.filter((m) => m.name !== state.originalName && m.name !== state.draft.name);
  try {
    state.prepared = prepareCatalog([...others, state.draft], poses);
    state.problems = "";
  } catch (e) {
    state.problems = e.message;
  }
  $("problems").textContent = state.problems || "";
  $("problems").className = state.problems ? "problems" : "problems ok";
  if (!state.problems) $("problems").textContent = "Valid ✓";
  $("exportBox").value = serializeMove(state.draft) + ",";
}

function loadMove(raw, originalName = raw.name) {
  state.draft = clone(raw);
  state.draft.flags ||= {};
  state.originalName = originalName;
  state.sel = 0;
  state.t = 0;
  state.playing = false;
  $("v_inplace").checked = !!state.draft.flags.loop;
  syncFields();
  revalidate();
  syncKeyPanel();
}

// ---------- left panel ----------

function fillSelect(sel, values, current) {
  sel.innerHTML = "";
  for (const v of values) sel.add(new Option(v, v, false, v === current));
}

function refreshMoveSelect() {
  const sel = $("moveSelect");
  sel.innerHTML = "";
  for (const m of catalog.moves) sel.add(new Option(m.name, `c:${m.name}`));
  for (const name of Object.keys(drafts())) sel.add(new Option(`${name} (draft)`, `d:${name}`));
}

function syncFields() {
  const d = state.draft;
  $("f_name").value = d.name;
  fillSelect($("f_category"), CATEGORIES, d.category);
  $("f_duration").value = d.duration;
  $("f_mouth").value = d.mouth || "neutral";
  $("f_chain").value = d.chain || "";
  $("f_loop").checked = !!d.flags.loop;
  $("f_airborne").checked = !!d.flags.airborne;
  $("t_params").value = JSON.stringify(d.params || {});
  $("t_root").value = (d.root || []).map((k) => JSON.stringify(k)).join(",\n");
  $("t_hits").value = (d.hits || []).map((k) => JSON.stringify(k)).join(",\n");
  $("t_events").value = (d.events || []).map((k) => JSON.stringify(k)).join(",\n");
}

function bindJson(id, field, asArray) {
  $(id).addEventListener("change", () => {
    try {
      const txt = $(id).value.trim();
      state.draft[field] = asArray ? JSON.parse(`[${txt}]`) : JSON.parse(txt || "{}");
      revalidate();
    } catch (e) {
      $("problems").className = "problems";
      $("problems").textContent = `${field}: invalid JSON (${e.message})`;
    }
  });
}

function bindFields() {
  const on = (id, fn) => $(id).addEventListener("change", () => { fn($(id)); revalidate(); syncKeyPanel(); });
  on("f_name", (el) => (state.draft.name = el.value.trim()));
  on("f_category", (el) => (state.draft.category = el.value));
  on("f_duration", (el) => (state.draft.duration = Number(el.value)));
  on("f_mouth", (el) => (state.draft.mouth = el.value));
  on("f_chain", (el) => (state.draft.chain = el.value.trim() || null));
  on("f_loop", (el) => (state.draft.flags.loop = el.checked || undefined));
  on("f_airborne", (el) => (state.draft.flags.airborne = el.checked || undefined));
  bindJson("t_params", "params", false);
  bindJson("t_root", "root", true);
  bindJson("t_hits", "hits", true);
  bindJson("t_events", "events", true);
}

// ---------- key panel ----------

function explicitChannels(i) {
  const p = state.draft.keys[i]?.pose;
  if (typeof p === "string") return new Set(POSE_CHANNELS);
  return new Set(Object.keys(p || {}));
}

/**
 * Set channels on key i. The key becomes a partial pose holding the edited channels, the channels it
 * already set explicitly, and any channel that differs from the previous key's resolved pose.
 */
function setChannels(i, values) {
  const key = state.draft.keys[i];
  const full = { ...resolvedPose(i), ...values };
  const prev = i > 0 ? resolvedPose(i - 1) : { ...poses.stand };
  const keep = typeof key.pose === "string" ? new Set() : explicitChannels(i);
  const partial = {};
  for (const c of POSE_CHANNELS) {
    if (c in values || keep.has(c) || Math.abs(full[c] - (prev[c] ?? 0)) > 1e-9) partial[c] = Math.round(full[c] * 10) / 10;
  }
  key.pose = partial;
  revalidate();
  syncKeyPanel();
}

function syncKeyPanel() {
  const keys = state.draft.keys;
  state.sel = Math.max(0, Math.min(state.sel, keys.length - 1));
  const key = keys[state.sel];
  $("keyLabel").textContent = `#${state.sel} of ${keys.length}`;
  $("k_t").value = key.t;
  $("k_t").disabled = state.sel === 0 || state.sel === keys.length - 1;
  fillSelect($("k_ease"), Object.keys(easings), key.ease || "linear");
  fillSelect($("k_named"), Object.keys(poses), typeof key.pose === "string" ? key.pose : "stand");
  $("k_snap").checked = !!key.snapHard;
  const pose = resolvedPose(state.sel);
  const explicit = explicitChannels(state.sel);
  for (const ch of POSE_CHANNELS) {
    const row = document.querySelector(`.ch[data-ch="${ch}"]`);
    row.classList.toggle("explicit", explicit.has(ch));
    row.querySelector("input").value = pose[ch];
    row.querySelector("output").textContent = Math.round(pose[ch]);
  }
}

function buildChannelSliders() {
  for (const ch of POSE_CHANNELS) {
    const [min, max] = RANGES[ch] || [-180, 180];
    const row = document.createElement("div");
    row.className = "ch";
    row.dataset.ch = ch;
    row.innerHTML = `<span>${ch}</span><input type="range" min="${min}" max="${max}" step="1"><output></output>`;
    row.querySelector("input").addEventListener("input", (e) => {
      focusKey(state.sel);
      setChannels(state.sel, { [ch]: Number(e.target.value) });
    });
    $("channels").append(row);
  }
}

function focusKey(i) {
  state.sel = i;
  state.t = state.draft.keys[i].t;
  state.playing = false;
  syncKeyPanel();
}

function bindKeyPanel() {
  $("k_t").addEventListener("change", () => {
    const keys = state.draft.keys;
    const i = state.sel;
    const lo = keys[i - 1]?.t ?? 0;
    const hi = keys[i + 1]?.t ?? 1;
    keys[i].t = Math.min(hi - 0.01, Math.max(lo + 0.01, Number($("k_t").value)));
    focusKey(i);
    revalidate();
  });
  $("k_ease").addEventListener("change", () => { state.draft.keys[state.sel].ease = $("k_ease").value; revalidate(); });
  $("k_snap").addEventListener("change", () => { state.draft.keys[state.sel].snapHard = $("k_snap").checked || undefined; revalidate(); });
  $("makeNamed").addEventListener("click", () => { state.draft.keys[state.sel].pose = $("k_named").value; revalidate(); syncKeyPanel(); });
  $("copyPose").addEventListener("click", () => navigator.clipboard.writeText(inline(roundPose(resolvedPose(state.sel)))));
  $("addKey").addEventListener("click", addKeyAtPlayhead);
  $("delKey").addEventListener("click", deleteKey);
  $("prevKey").addEventListener("click", () => focusKey(Math.max(0, state.sel - 1)));
  $("nextKey").addEventListener("click", () => focusKey(Math.min(state.draft.keys.length - 1, state.sel + 1)));
}

const roundPose = (p) => Object.fromEntries(POSE_CHANNELS.map((c) => [c, Math.round(p[c])]));

function addKeyAtPlayhead() {
  const keys = state.draft.keys;
  const t = Math.round(state.t * 100) / 100;
  if (keys.some((k) => Math.abs(k.t - t) < 0.005)) return;
  const d = def();
  const pose = d ? samplePose(d, t) : poses.stand;
  const i = keys.findIndex((k) => k.t > t);
  keys.splice(i, 0, { t, pose: roundPose(pose), ease: keys[i - 1]?.ease || "linear" });
  revalidate();
  focusKey(i);
}

function deleteKey() {
  const keys = state.draft.keys;
  if (state.sel === 0 || state.sel === keys.length - 1) return;
  keys.splice(state.sel, 1);
  revalidate();
  focusKey(state.sel - 1);
}

function samplePose(d, t) {
  const sim = simulate(t);
  return sim.actor.pose || poses.stand;
}

// ---------- simulation for display ----------

function opts() {
  const facing = Number($("v_facing").value);
  const scale = Number($("v_scale").value);
  return { facing, scale, baseX: facing === 1 ? 360 : 740 };
}

/** Run the real runtime from t=0 to t, so the preview matches the engine exactly. */
function simulate(t) {
  const { facing, scale, baseX } = opts();
  const actor = createActor({ x: baseX, facing, scale, groundY: GROUND });
  const d = def();
  if (!d) return { actor, joints: computeJoints(poses.stand, { x: baseX, y: GROUND - 94 * scale }, facing, scale), windows: [] };
  playMove(actor, d.name, state.prepared, { blend: 0 });
  const steps = Math.round(t * d.duration * FPS);
  let r = stepActor(actor, 0, state.prepared);
  for (let i = 0; i < steps; i++) r = stepActor(actor, 1 / FPS, state.prepared);
  return { actor, joints: r.joints, windows: r.openWindows };
}

/** Joints for display; when paused exactly on a key, show that key's pose exactly. */
function displayJoints() {
  const { facing, scale, baseX } = opts();
  const d = def();
  const sim = simulate(state.t);
  const onKey = !state.playing && d && Math.abs(d.keys[state.sel].t - state.t) < 1e-6;
  const x = $("v_inplace").checked ? baseX : sim.actor.x;
  if (!onKey) {
    const dx = x - sim.actor.x;
    const j = Object.fromEntries(Object.entries(sim.joints).map(([k, p]) => [k, { x: p.x + dx, y: p.y }]));
    return { joints: j, windows: sim.windows, onKey: false };
  }
  const pose = resolvedPose(state.sel);
  const rootDy = rootOffsetAt(d, state.t, { ...d.params }).dy;
  const hipBase = GROUND - (BODY.thigh + BODY.shin) * scale;
  let rootY;
  if (state.drag) rootY = state.drag.rootY;
  else if (rootDy >= 0) {
    const raw = computeJoints(pose, { x, y: hipBase }, facing, scale);
    rootY = hipBase + (GROUND - lowestPoint(raw, scale));
  } else rootY = hipBase + rootDy + sim.actor.snapOffset;
  const windows = d.hits.map((hit, index) => ({ hit, index })).filter(({ hit }) => state.t >= hit.t0 && state.t <= hit.t1);
  return { joints: computeJoints(pose, { x, y: rootY }, facing, scale), windows, onKey: true, rootY };
}

// ---------- drawing ----------

function drawStage() {
  const { facing, scale, baseX } = opts();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, view.width, view.height);
  ctx.strokeStyle = "#eeeeee";
  ctx.lineWidth = 1;
  for (let x = 0; x < view.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, view.height); ctx.stroke(); }
  ctx.strokeStyle = "#999999";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(view.width, GROUND); ctx.stroke();

  const dummyScale = Number($("v_dummy").value);
  if (dummyScale) {
    const dx = baseX + facing * Number($("v_gap").value) * scale;
    const raw = computeJoints(poses.stand, { x: dx, y: 0 }, -facing, dummyScale);
    const j = computeJoints(poses.stand, { x: dx, y: GROUND - lowestPoint(raw, dummyScale) }, -facing, dummyScale);
    drawCharacter(ctx, j, { color: "#c4c4c4", scale: dummyScale, facing: -facing });
  }

  const d = def();
  if (!d) return;
  const disp = displayJoints();
  if ($("v_onion").checked && disp.onKey) {
    for (const i of [state.sel - 1, state.sel + 1]) {
      if (i < 0 || i >= d.keys.length) continue;
      const pose = d.keys[i].pose;
      const raw = computeJoints(pose, { x: disp.joints.hip.x, y: 0 }, facing, scale);
      const j = computeJoints(pose, { x: disp.joints.hip.x, y: GROUND - lowestPoint(raw, scale) }, facing, scale);
      drawCharacter(ctx, j, { color: i < state.sel ? "#9fd4ff" : "#ffc29f", scale, facing, alpha: 0.35, outline: false });
    }
  }
  drawCharacter(ctx, disp.joints, { color: "#22aaff", scale, facing, mouth: d.mouth });

  for (const { hit } of disp.windows) {
    const p = disp.joints[hit.part];
    if (!p) continue;
    ctx.strokeStyle = "rgba(230, 40, 40, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 26 * scale, 0, Math.PI * 2); ctx.stroke();
  }
  if (disp.onKey && $("v_handles").checked) {
    for (const name of HANDLES) {
      const p = disp.joints[name];
      ctx.fillStyle = state.drag?.handle === name ? "#ff8800" : "rgba(224, 36, 94, 0.85)";
      ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
    }
  }
  $("timeLabel").textContent = `t=${state.t.toFixed(3)}  ${(state.t * d.duration).toFixed(2)}s / ${d.duration}s${disp.onKey ? "  (editing key " + state.sel + ")" : ""}`;
}

const TL_PAD = 30;
const tToX = (t) => TL_PAD + t * (tl.width - 2 * TL_PAD);
const xToT = (x) => Math.min(1, Math.max(0, (x - TL_PAD) / (tl.width - 2 * TL_PAD)));

function drawTimeline() {
  const W = tl.width;
  tctx.fillStyle = "#111216";
  tctx.fillRect(0, 0, W, tl.height);
  tctx.font = "11px Inter";
  tctx.fillStyle = "#6a6d75";
  const rows = [["keys", 28], ["root", 56], ["hits", 80], ["events", 104]];
  for (const [label, y] of rows) {
    tctx.fillText(label, 2, y + 4);
    tctx.strokeStyle = "#24262c";
    tctx.beginPath(); tctx.moveTo(TL_PAD, y); tctx.lineTo(W - TL_PAD, y); tctx.stroke();
  }
  for (let i = 0; i <= 10; i++) {
    tctx.fillStyle = "#3a3d45";
    tctx.fillRect(tToX(i / 10), 8, 1, tl.height - 12);
  }
  const d = state.draft;
  for (const h of d.hits || []) {
    tctx.fillStyle = "rgba(230, 60, 60, 0.7)";
    tctx.fillRect(tToX(h.t0), 74, tToX(h.t1) - tToX(h.t0), 12);
  }
  for (const k of d.root || []) {
    tctx.fillStyle = "#7bd88f";
    tctx.beginPath(); tctx.arc(tToX(k.t), 56, 4, 0, Math.PI * 2); tctx.fill();
  }
  for (const e of d.events || []) {
    tctx.fillStyle = "#c9a0ff";
    tctx.fillRect(tToX(e.t) - 1, 98, 3, 12);
  }
  d.keys.forEach((k, i) => {
    const x = tToX(k.t);
    tctx.save();
    tctx.translate(x, 28);
    tctx.rotate(Math.PI / 4);
    tctx.fillStyle = i === state.sel ? "#ffcc55" : typeof k.pose === "string" ? "#4aa3ff" : "#e8e8ea";
    tctx.fillRect(-6, -6, 12, 12);
    tctx.restore();
    if (k.snapHard) { tctx.fillStyle = "#ffcc55"; tctx.fillText("snap", x - 12, 14); }
  });
  tctx.fillStyle = "#ff5a5a";
  tctx.fillRect(tToX(state.t) - 1, 4, 2, tl.height - 8);
}

// ---------- interaction ----------

function canvasPoint(canvas, e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * canvas.width, y: ((e.clientY - r.top) / r.height) * canvas.height };
}

function bindTimeline() {
  let dragKey = -1;
  tl.addEventListener("mousedown", (e) => {
    const p = canvasPoint(tl, e);
    const keys = state.draft.keys;
    const hit = keys.findIndex((k) => Math.abs(tToX(k.t) - p.x) < 9 && Math.abs(p.y - 28) < 12);
    if (hit >= 0) {
      focusKey(hit);
      if (hit > 0 && hit < keys.length - 1) dragKey = hit;
    } else {
      state.t = xToT(p.x);
      state.playing = false;
    }
  });
  window.addEventListener("mousemove", (e) => {
    if (dragKey < 0) return;
    const keys = state.draft.keys;
    const t = Math.round(xToT(canvasPoint(tl, e).x) * 100) / 100;
    keys[dragKey].t = Math.min(keys[dragKey + 1].t - 0.01, Math.max(keys[dragKey - 1].t + 0.01, t));
    state.t = keys[dragKey].t;
    revalidate();
    syncKeyPanel();
  });
  window.addEventListener("mouseup", () => (dragKey = -1));
}

const angleOf = (v, facing) => Math.atan2(facing * v.x, v.y) / DEG;
const near = (a, ref) => a + 360 * Math.round((ref - a) / 360);

/** Turn a dragged joint position into pose channels (inverse of spec 5.3 for that joint). */
function solveDrag(handle, mouse, joints, pose) {
  const { facing, scale } = opts();
  const r = facing * (pose.rot || 0) * DEG;
  const c = joints.center;
  const un = (p) => {
    const x = p.x - c.x;
    const y = p.y - c.y;
    return { x: c.x + x * Math.cos(-r) - y * Math.sin(-r), y: c.y + x * Math.sin(-r) + y * Math.cos(-r) };
  };
  const m = un(mouse);
  const J = Object.fromEntries(Object.entries(joints).map(([k, p]) => [k, un(p)]));
  const ang = (a, b) => angleOf({ x: b.x - a.x, y: b.y - a.y }, facing);
  const lean = pose.lean;
  const side = handle[0] === "l" || handle[0] === "r" ? handle[0] : "";
  const ua = side + "UA", fa = side + "FA", th = side + "TH", sh = side + "SH";
  switch (handle) {
    case "lHand": case "rHand": {
      const ik = solveIK2(J.shoulder, BODY.upperArm * scale, BODY.forearm * scale, m, bendSignOf(J.shoulder, J[side + "Elbow"], J[side + "Hand"]));
      const uaW = ang(J.shoulder, ik.mid);
      const faW = ang(ik.mid, ik.end);
      return { [ua]: near(uaW + lean, pose[ua]), [fa]: near(faW - uaW, pose[fa]) };
    }
    case "lElbow": case "rElbow":
      return { [ua]: near(ang(J.shoulder, m) + lean, pose[ua]) };
    case "lFoot": case "rFoot": {
      const ik = solveIK2(J.hip, BODY.thigh * scale, BODY.shin * scale, m, bendSignOf(J.hip, J[side + "Knee"], J[side + "Foot"]));
      const thW = ang(J.hip, ik.mid);
      const shW = ang(ik.mid, ik.end);
      return { [th]: near(thW + lean, pose[th]), [sh]: near(thW - shW, pose[sh]) };
    }
    case "lKnee": case "rKnee":
      return { [th]: near(ang(J.hip, m) + lean, pose[th]) };
    case "head":
      return { head: near(180 - lean - ang(J.neckTop, m), pose.head) };
    case "shoulder":
      return { lean: near(180 - ang(J.hip, m), pose.lean) };
    case "hip":
      return { dx: pose.dx + facing * (m.x - J.hip.x), dy: pose.dy + (m.y - J.hip.y) };
  }
  return {};
}

function bindStage() {
  view.addEventListener("mousedown", (e) => {
    const disp = def() && displayJoints();
    if (!disp?.onKey || !$("v_handles").checked) return;
    const p = canvasPoint(view, e);
    let best = null;
    for (const name of HANDLES) {
      const q = disp.joints[name];
      const dist = Math.hypot(q.x - p.x, q.y - p.y);
      if (dist < 16 && (!best || dist < best.dist)) best = { name, dist };
    }
    if (best) state.drag = { handle: best.name, rootY: disp.rootY };
  });
  window.addEventListener("mousemove", (e) => {
    if (!state.drag) return;
    const disp = displayJoints();
    const values = solveDrag(state.drag.handle, canvasPoint(view, e), disp.joints, resolvedPose(state.sel));
    for (const k of Object.keys(values)) values[k] = Math.round(values[k] * 10) / 10;
    setChannels(state.sel, values);
  });
  window.addEventListener("mouseup", () => (state.drag = null));
}

function bindGlobal() {
  $("play").addEventListener("click", () => {
    state.playing = !state.playing;
    if (state.playing && state.t >= 1) state.t = 0;
  });
  document.addEventListener("keydown", (e) => {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
    const d = def();
    const frame = d ? 1 / (d.duration * FPS) : 0.01;
    if (e.code === "Space") { e.preventDefault(); $("play").click(); }
    else if (e.code === "ArrowRight") { state.playing = false; state.t = Math.min(1, state.t + frame); }
    else if (e.code === "ArrowLeft") { state.playing = false; state.t = Math.max(0, state.t - frame); }
    else if (e.code === "KeyK") addKeyAtPlayhead();
    else if (e.code === "Delete" || e.code === "Backspace") deleteKey();
  });
  $("moveSelect").addEventListener("change", () => {
    const [kind, name] = $("moveSelect").value.split(/:(.*)/);
    if (kind === "c") loadMove(catalog.moves.find((m) => m.name === name));
    else loadMove(drafts()[name], name);
  });
  $("newMove").addEventListener("click", () => loadMove({
    name: "new_move", category: "emote", duration: 0.6, params: {}, flags: {},
    keys: [{ t: 0, pose: "stand", ease: "inOutQuad" }, { t: 0.5, pose: "guard", ease: "inOutQuad" }, { t: 1, pose: "stand" }],
  }, null));
  $("copyMove").addEventListener("click", () => navigator.clipboard.writeText($("exportBox").value));
  $("saveDraft").addEventListener("click", () => {
    const all = drafts();
    all[state.draft.name] = state.draft;
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(all));
    refreshMoveSelect();
  });
  $("revert").addEventListener("click", () => {
    const orig = catalog.moves.find((m) => m.name === state.originalName);
    if (orig) loadMove(orig);
  });
  for (const id of ["v_scale", "v_facing", "v_dummy", "v_gap", "v_onion", "v_inplace", "v_handles"]) $(id).addEventListener("input", () => {});
}

let last = null;
function frame(ts) {
  const d = def();
  if (state.playing && d && last !== null) {
    state.t += ((ts - last) / 1000) * Number($("speed").value) / d.duration;
    if (state.t >= 1) {
      if ($("loopPlay").checked) state.t -= 1;
      else { state.t = 1; state.playing = false; }
    }
  }
  last = ts;
  $("play").textContent = state.playing ? "❚❚ Pause" : "▶ Play";
  drawStage();
  drawTimeline();
  requestAnimationFrame(frame);
}

buildChannelSliders();
bindFields();
bindKeyPanel();
bindTimeline();
bindStage();
bindGlobal();
refreshMoveSelect();
const start = new URLSearchParams(location.search).get("move") || "front_kick";
$("moveSelect").value = `c:${start}`;
loadMove(catalog.moves.find((m) => m.name === start) || catalog.moves[0]);
await document.fonts.ready;
requestAnimationFrame(frame);
