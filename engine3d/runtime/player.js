// Page entry (page.html): window.engine3d drives one canvas. Tools load a plan, then either draw single frames
// (frame) or stream a range of frames to the recorder (renderRange): each frame is drawn from the explicit
// clock t = i / fps, read back with readPixels and POSTed as raw RGBA (bottom row first) to the tool's server.
// No requestAnimationFrame anywhere: nothing here depends on wall time.

import { buildPlan } from "./plan.js";
import { loadAssets } from "./objects.js";
import { loadCaptionFont } from "./overlay.js";
import { createStage } from "./stage.js";

let stage = null;
let size = null;

/** The H.264 level for a frame size and rate (WebCodecs wants it in the codec string). */
function avcCodec(width, height, fps) {
  const mbps = Math.ceil(width / 16) * Math.ceil(height / 16) * fps; // macroblocks per second
  const level = mbps <= 245760 ? "28" : mbps <= 522240 ? "32" : mbps <= 983040 ? "33" : mbps <= 2073600 ? "34" : "3c";
  return `avc1.6400${level}`; // High profile
}

function openSocket(url) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    ws.onopen = () => res(ws);
    ws.onerror = () => rej(new Error(`cannot open ${url}`));
  });
}

window.engine3d = {
  /** @returns {Promise<{ duration:number, gpu:string }>} */
  async load({ script, sceneUrl, catalog, speech = {}, width, height, base = "/" }) {
    const plan = await buildPlan({ script, sceneUrl, catalog, speech });
    const assets = await loadAssets(plan, catalog, base);
    await loadCaptionFont(base + catalog.fonts.andika_bold.file);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    stage = createStage(canvas, plan, { catalog, assets, width, height });
    size = { width, height };
    const gl = stage.renderer.getContext();
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    return { duration: plan.duration, gpu: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unknown" };
  },

  /** Draw the frame at t (seconds). For screenshots and tests. */
  frame(t) {
    stage.drawAt(t);
  },

  /**
   * Draw frames [from, to) at fps and stream each to the recorder's WebSocket `url` as one binary message
   * [u32 index][RGBA]. Up to `inflight` frames are unacknowledged at once (send copies the bytes, so one
   * readback buffer is enough). Benchmarks: readback false reads one pixel (forcing the GPU to finish) and
   * sends nothing; url null reads the whole frame but sends nothing.
   */
  async renderRange({ from, to, fps, url, inflight = 4, readback = true }) {
    const gl = stage.renderer.getContext();
    const buf = new Uint8Array(4 + size.width * size.height * 4);
    const head = new DataView(buf.buffer, 0, 4);
    const ws = url ? await openSocket(url) : null;
    let sent = 0;
    let acked = 0;
    let wake = null;
    let failure = null;
    if (ws) {
      ws.onmessage = (e) => {
        if (String(e.data).startsWith("error")) failure = new Error(e.data);
        acked++;
        wake?.();
      };
      ws.onclose = () => {
        failure ??= new Error("the recorder closed the frame socket");
        wake?.();
      };
    }
    const until = async (cond) => {
      while (!cond() && !failure) await new Promise((r) => (wake = r));
      if (failure) throw failure;
    };
    for (let i = from; i < to; i++) {
      stage.drawAt(i / fps);
      if (!readback) {
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf, 4);
        continue;
      }
      gl.readPixels(0, 0, size.width, size.height, gl.RGBA, gl.UNSIGNED_BYTE, buf, 4);
      if (!ws) continue;
      await until(() => sent - acked < inflight);
      head.setUint32(0, i, true);
      ws.send(buf);
      sent++;
    }
    if (ws) {
      await until(() => acked === sent);
      ws.close();
    }
  },

  /**
   * Draw frames [from, to) and encode them in the page with WebCodecs (the GPU's H.264 encoder), streaming
   * each encoded chunk to `url` as [u32 index][Annex B bytes]. Only compressed video leaves the page, so no
   * frame is read back. Timestamps come from the frame index, never from a clock. The first frame and one
   * frame every `keyEvery` are keyframes, so chunks rendered by different pages concatenate.
   */
  async renderEncoded({ from, to, fps, url, bitrate, keyEvery = 2 * fps, queue = 6 }) {
    const ws = await openSocket(url);
    let sent = 0;
    let acked = 0;
    let failure = null;
    let wake = null;
    ws.onmessage = (e) => {
      if (String(e.data).startsWith("error")) failure = new Error(e.data);
      acked++;
      wake?.();
    };
    const encoder = new VideoEncoder({
      output: (chunk) => {
        const msg = new Uint8Array(4 + chunk.byteLength);
        new DataView(msg.buffer).setUint32(0, Math.round((chunk.timestamp * fps) / 1e6), true);
        chunk.copyTo(msg.subarray(4));
        ws.send(msg);
        sent++;
      },
      error: (e) => {
        failure = e;
        wake?.();
      },
    });
    const canvas = stage.renderer.domElement;
    encoder.configure({ codec: avcCodec(size.width, size.height, fps), width: size.width, height: size.height, framerate: fps, bitrate,
      bitrateMode: "variable", hardwareAcceleration: "prefer-hardware", latencyMode: "quality", avc: { format: "annexb" } });
    encoder.ondequeue = () => wake?.();
    const until = async (cond) => {
      while (!cond() && !failure) await new Promise((r) => (wake = r));
      if (failure) throw failure;
    };
    for (let i = from; i < to; i++) {
      stage.drawAt(i / fps);
      const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
      encoder.encode(frame, { keyFrame: i === from || (i - from) % keyEvery === 0 });
      frame.close();
      await until(() => encoder.encodeQueueSize < queue && sent - acked < 16);
    }
    await encoder.flush();
    encoder.close();
    await until(() => acked === sent);
    ws.close();
    return { chunks: sent };
  },
};
