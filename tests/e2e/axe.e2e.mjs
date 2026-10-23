import { test } from 'node:test';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { launch } from './helpers.mjs';

const serious = (r) => r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));

for (const [name, hash, scheme] of [
  ['home', '#/', 'light'], ['home dark', '#/', 'dark'], ['helper', '#/helper', 'light'],
  ['builder new', '#/build/new', 'light'], ['builder new dark', '#/build/new', 'dark'], ['settings', '#/settings', 'light'],
]) {
  test(`axe: ${name}`, async (t) => {
    const { page, url, close } = await launch(8130 + Math.floor(Math.random() * 500));
    t.after(close);
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(url + hash);
    await page.locator('h1').waitFor();
    const result = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(serious(result).map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`), []);
  });
}
