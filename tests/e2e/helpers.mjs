import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

/** Start the dev server on a free-ish port and a fresh browser page with console error capture. */
export async function launch(port = 8123) {
  const server = spawn('node', ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 600));
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(String(e)));
  const url = `http://localhost:${port}/`;
  const close = async () => { await browser.close(); server.kill(); };
  return { page, url, problems, close };
}
