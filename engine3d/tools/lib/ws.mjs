// A minimal WebSocket server endpoint (RFC 6455) for receiving frames from the page: binary messages in,
// short text acks out. fetch() POSTs of raw frames ran at ~6 fps and grew Chromium's memory every frame;
// a socket carries the same 8 MB (1080p) or 33 MB (4K) messages at hundreds of MB/s.
// Each message is [u32 frame index, little-endian][RGBA bytes]. No extensions, no compression.

import { createHash } from "node:crypto";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

/** Unmask in place, 4 bytes at a time where aligned. */
function unmask(buf, mask) {
  const n = buf.length;
  let i = 0;
  if (buf.byteOffset % 4 === 0) {
    const m32 = mask.readUInt32LE(0);
    const words = new Uint32Array(buf.buffer, buf.byteOffset, n >>> 2);
    for (let k = 0; k < words.length; k++) words[k] ^= m32;
    i = words.length * 4;
  }
  for (; i < n; i++) buf[i] ^= mask[i & 3];
}

function textFrame(s) {
  const p = Buffer.from(s);
  return Buffer.concat([Buffer.from([0x81, p.length]), p]); // acks are < 126 bytes
}

/**
 * Accept an upgrade and call onMessage(buffer) for every complete binary message; reply(text) acks.
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:net").Socket} socket
 * @param {(msg:Buffer, reply:(s:string) => void) => void} onMessage
 */
export function acceptSocket(req, socket, onMessage) {
  const accept = createHash("sha1").update(req.headers["sec-websocket-key"] + GUID).digest("base64");
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  socket.setNoDelay(true);
  const reply = (s) => socket.write(textFrame(s));

  let head = Buffer.alloc(0); // bytes of an unfinished frame header
  let frame = null; // { payload, at, mask, fin, opcode }
  const parts = []; // fragments of the current message

  const finish = () => {
    unmask(frame.payload, frame.mask);
    if (frame.opcode === 0x8) return socket.end();
    if (frame.opcode === 0x9) return; // ping: the page never sends one
    parts.push(frame.payload);
    if (frame.fin) {
      const msg = parts.length === 1 ? parts[0] : Buffer.concat(parts);
      parts.length = 0;
      onMessage(msg, reply);
    }
    frame = null;
  };

  socket.on("data", (chunk) => {
    let c = chunk;
    while (c.length) {
      if (!frame) {
        head = head.length ? Buffer.concat([head, c]) : c;
        if (head.length < 2) return;
        let len = head[1] & 0x7f;
        let off = 2;
        if (len === 126) [len, off] = head.length >= 4 ? [head.readUInt16BE(2), 4] : [-1, 0];
        else if (len === 127) [len, off] = head.length >= 10 ? [Number(head.readBigUInt64BE(2)), 10] : [-1, 0];
        if (len < 0 || head.length < off + 4) return; // wait for the rest of the header
        // Payloads start 4-byte aligned so unmasking can go a word at a time.
        frame = { payload: Buffer.allocUnsafe(len), at: 0, mask: Buffer.from(head.subarray(off, off + 4)), fin: (head[0] & 0x80) !== 0, opcode: head[0] & 0x0f };
        c = head.subarray(off + 4);
        head = Buffer.alloc(0);
        if (len === 0) finish();
        continue;
      }
      const take = Math.min(c.length, frame.payload.length - frame.at);
      c.copy(frame.payload, frame.at, 0, take);
      frame.at += take;
      c = c.subarray(take);
      if (frame.at === frame.payload.length) finish();
    }
  });
}
