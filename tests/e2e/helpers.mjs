import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

/** Start the dev server on a free-ish port and a fresh browser page with console error capture. */
export async function launch(port = 8123, { mic = false } = {}) {
  const server = spawn('node', ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 600));
  const browser = await chromium.launch(mic ? { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] } : {});
  const context = await browser.newContext({ viewport: { width: 390, height: 800 }, permissions: mic ? ['microphone'] : [] });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(String(e)));
  const url = `http://localhost:${port}/`;
  const close = async () => { await browser.close(); server.kill(); };
  return { page, url, problems, close };
}

import { deflateSync, crc32 } from 'node:zlib';

/** A plain RGB gradient PNG of the given size (no image libraries needed). */
export function makePng(width, height) {
  const row = Buffer.alloc(1 + width * 3);
  const raw = Buffer.alloc(row.length * height);
  for (let y = 0; y < height; y++) {
    const off = y * row.length;
    raw[off] = 0;
    for (let x = 0; x < width; x++) {
      raw[off + 1 + x * 3] = (x * 255 / width) | 0;
      raw[off + 2 + x * 3] = (y * 255 / height) | 0;
      raw[off + 3 + x * 3] = 128;
    }
  }
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), 8 + data.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** Read every guide from IndexedDB, with photo sizes and audio sizes instead of blobs. */
export const readGuides = (page) => page.evaluate(() => new Promise((resolve) => {
  const open = indexedDB.open('plainsteps');
  open.onsuccess = () => {
    const q = open.result.transaction('guides').objectStore('guides').getAll();
    q.onsuccess = async () => {
      resolve(await Promise.all(q.result.map(async (g) => ({
        ...g,
        steps: await Promise.all(g.steps.map(async (s) => {
          let photoInfo = null;
          if (s.photo) { const b = await createImageBitmap(s.photo); photoInfo = { type: s.photo.type, w: b.width, h: b.height }; }
          return { ...s, photo: photoInfo, audio: s.audio ? { type: s.audio.type, size: s.audio.size } : null };
        })),
      }))));
    };
  };
}));
