// Time of day and weather (STORY_SPEC 5.2). Milestone: S1.
// Presentation layers over the theme: a color grade per time of day, and weather layers (cloud
// tint, rain streaks, snow, fog, wind streaks). set_time / set_weather world commands blend to a new
// state over `dur`. Everything is a pure function of the scene look, the event list and the frame time.

import { mulberry32 } from "../math.js";

const TIMES = ["dawn", "day", "dusk", "night"];
const WEATHERS = ["clear", "cloudy", "rain", "snow", "wind", "fog"];

const TIME_GRADE = {
  dawn: [{ op: "multiply", color: "255,205,185", alpha: 0.35 }, { op: "screen", color: "255,170,140", alpha: 0.08 }],
  day: [],
  dusk: [{ op: "multiply", color: "255,160,120", alpha: 0.4 }, { op: "screen", color: "120,60,90", alpha: 0.06 }],
  night: [{ op: "multiply", color: "70,82,150", alpha: 0.62 }, { op: "screen", color: "20,30,70", alpha: 0.1 }],
};
const WEATHER_TINT = {
  cloudy: { color: "175,180,192", alpha: 0.32 },
  rain: { color: "150,160,182", alpha: 0.4 },
  snow: { color: "220,230,245", alpha: 0.15 },
  fog: { color: "205,210,218", alpha: 0.18 },
};

// Fixed particle tables (deterministic constants, shared by every frame).
const table = (seed, n) => {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, () => ({ x: rng(), y: rng(), s: 0.6 + rng() * 0.8, ph: rng() * 6.283 }));
};
const RAIN = table(0x5a17, 220);
const SNOW = table(0x5f0, 160);
const WIND = table(0x31d, 26);

const onehot = (names, name) => Object.fromEntries(names.map((n) => [n, n === name ? 1 : 0]));

function blendTo(w, names, name, u) {
  for (const n of names) w[n] = w[n] * (1 - u) + (n === name ? u : 0);
}

/**
 * Current blend of times and weathers, or null when it is plain day and clear.
 * @param {{ time, weather }} look  the scene's starting look
 * @param {object[]} events  set_time / set_weather world events of the scene (video times)
 */
export function gradeState(look, events, t) {
  if (!look) return null;
  const time = onehot(TIMES, look.time);
  const weather = onehot(WEATHERS, look.weather);
  for (const e of events || []) {
    if (e.videoT > t) break;
    const dur = e.params.dur ?? 0;
    const u = dur > 0 ? Math.min(1, (t - e.videoT) / dur) : 1;
    if (e.do === "set_time") blendTo(time, TIMES, e.params.time, u);
    else blendTo(weather, WEATHERS, e.params.weather, u);
  }
  if (time.day > 0.999 && weather.clear > 0.999) return null;
  return { time, weather };
}

function tint(ctx, W, H, op, color, alpha) {
  if (alpha <= 0.002) return;
  ctx.globalCompositeOperation = op;
  ctx.fillStyle = `rgba(${color},${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

/** Draw the grade and weather over the world (screen space), before UI overlays. */
export function drawGrade(ctx, g, { W, H, fxT, cam }) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const name of TIMES) for (const layer of TIME_GRADE[name]) tint(ctx, W, H, layer.op, layer.color, layer.alpha * g.time[name]);
  for (const [name, t] of Object.entries(WEATHER_TINT)) tint(ctx, W, H, "multiply", t.color, t.alpha * g.weather[name]);
  ctx.globalCompositeOperation = "source-over";
  const k = H / 1080;
  const drift = (cam?.x ?? 0) * 0.3;
  if (g.weather.rain > 0.01) {
    ctx.strokeStyle = `rgba(200, 215, 240, ${0.55 * g.weather.rain})`;
    ctx.lineWidth = Math.max(1, 2 * k);
    ctx.beginPath();
    for (const d of RAIN) {
      const y = ((d.y * H + fxT * 1500 * d.s * k) % (H + 80)) - 40;
      const x = ((((d.x * W - fxT * 260 * k - drift + y * 0.18) % W) + W) % W);
      ctx.moveTo(x, y);
      ctx.lineTo(x - 10 * k * d.s, y + 46 * k * d.s);
    }
    ctx.stroke();
  }
  if (g.weather.snow > 0.01) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * g.weather.snow})`;
    for (const f of SNOW) {
      const y = (((f.y * H + fxT * 80 * f.s * k) % H) + H) % H;
      const x = ((((f.x * W + Math.sin(fxT * 0.8 + f.ph) * 18 * k - drift * 0.5) % W) + W) % W);
      ctx.beginPath();
      ctx.arc(x, y, (1.5 + 3 * (f.s - 0.6)) * k + 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (g.weather.wind > 0.01) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * g.weather.wind})`;
    ctx.lineWidth = Math.max(1, 2 * k);
    ctx.beginPath();
    for (const w of WIND) {
      const x = ((((w.x * W - fxT * 900 * w.s * k) % (W + 300)) + W + 300) % (W + 300)) - 150;
      const y = w.y * H * 0.8 + Math.sin(fxT * 2 + w.ph) * 12 * k;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 60 * k, y - 8 * k, x + 140 * k * w.s, y);
    }
    ctx.stroke();
  }
  if (g.weather.fog > 0.01) {
    const fog = ctx.createLinearGradient(0, 0, 0, H);
    fog.addColorStop(0, `rgba(225, 228, 235, ${0.2 * g.weather.fog})`);
    fog.addColorStop(1, `rgba(235, 238, 242, ${0.4 * g.weather.fog})`);
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}
