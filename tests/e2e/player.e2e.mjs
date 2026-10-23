import { test } from 'node:test';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { launch } from './helpers.mjs';

/** Fake speech so tests can see what would be read, with a chosen list of voices. */
const mockSpeech = (voices) => `
  window.__spoken = [];
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => ${JSON.stringify(voices)},
    speak(u) { window.__spoken.push({ text: u.text, lang: u.lang }); setTimeout(() => u.onend && u.onend(), 5); },
    cancel() {}, addEventListener() {}, removeEventListener() {},
  } });`;

/** Wait for the step heading to read `label`, then assert it. */
const expectStep = async (page, label) => {
  await page.waitForFunction((l) => document.getElementById('view-heading')?.textContent === l, label);
};
const serious = (r) => r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));

test('play sample to the end, keyboard, stuck sheet, resume', async (t) => {
  const { page, url, problems, close } = await launch(8201);
  t.after(close);
  await page.addInitScript(mockSpeech([{ lang: 'en-IN', name: 'x' }]));
  await page.goto(url);
  await page.getByRole('link', { name: 'Start' }).click();

  await expectStep(page, 'Step 1 of 6');
  assert.doesNotMatch(await page.locator('main').innerText(), /\b(null|false|undefined)\b/);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'view-heading');
  assert.equal(await page.evaluate(() => document.querySelectorAll('h1').length), 1);
  assert.ok((await page.locator('.step-text').evaluate((e) => parseFloat(getComputedStyle(e).fontSize))) >= 28);
  await page.waitForFunction(() => window.__spoken.length >= 1);
  assert.match(await page.evaluate(() => window.__spoken[0].text), /Open the message/);
  assert.equal(await page.getByRole('button', { name: 'Back' }).isDisabled(), true);

  // Buttons and keyboard
  await page.getByRole('button', { name: 'Done, next' }).click();
  await expectStep(page, 'Step 2 of 6');
  await page.keyboard.press('ArrowRight');
  await expectStep(page, 'Step 3 of 6');
  assert.ok(await page.locator('.caution').isVisible());
  await page.waitForFunction(() => window.__spoken.at(-1).text.startsWith('Be careful.'));
  await page.keyboard.press('ArrowLeft');
  await expectStep(page, 'Step 2 of 6');
  await page.keyboard.press('Enter');
  await expectStep(page, 'Step 3 of 6');

  // Axe on the player
  assert.deepEqual(serious(await new AxeBuilder({ page }).analyze()).map((v) => v.id), []);

  // Stuck with no number: explains, no WhatsApp link
  await page.getByRole('button', { name: "I'm stuck" }).click();
  await page.getByText('No helper phone number has been added').waitFor();
  assert.equal(await page.getByRole('link', { name: /WhatsApp/ }).count(), 0);
  assert.deepEqual(serious(await new AxeBuilder({ page }).analyze()).map((v) => v.id), []);
  await page.keyboard.press('Escape');

  // Exit keeps progress; Home offers Continue
  await page.getByRole('link', { name: 'Exit' }).click();
  await page.getByRole('link', { name: 'Continue from step 3' }).waitFor();
  await page.reload();
  await page.getByRole('link', { name: 'Continue from step 3' }).click();
  await expectStep(page, 'Step 3 of 6');

  // Run to the end
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: /^Done, (next|finish)$/ }).click();
  await page.getByRole('heading', { level: 1, name: 'You did it!' }).waitFor();
  assert.ok(await page.getByText(/Time taken: \d+ (min|sec)/).isVisible());
  assert.deepEqual(serious(await new AxeBuilder({ page }).analyze()).map((v) => v.id), []);
  await page.getByRole('link', { name: 'Back to home' }).click();
  await page.getByRole('link', { name: 'Start', exact: true }).waitFor(); // progress cleared

  // The run was stored with a stuck event on step index 2
  const runs = await page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('plainsteps'); r.onsuccess = () => {
      const q = r.result.transaction('runs').objectStore('runs').getAll(); q.onsuccess = () => res(q.result);
    };
  }));
  assert.equal(runs.length, 1);
  assert.equal(runs[0].completed, true);
  assert.deepEqual(runs[0].stuck.map((s) => s.stepIndex), [2]);
  assert.ok(runs[0].stepTimesMs.length === 6 && runs[0].stepTimesMs.every((n) => n >= 0));
  assert.deepEqual(problems, []);
});

test('stuck sheet with a helper number builds the WhatsApp link; preview is not recorded', async (t) => {
  const { page, url, problems, close } = await launch(8202);
  t.after(close);
  await page.goto(url + '#/helper');
  await page.getByRole('link', { name: /Edit Sample/ }).click();
  await page.getByLabel('Helper name').fill('Asha');
  await page.getByLabel('Helper WhatsApp number').fill('98765 43210');
  await page.getByRole('button', { name: 'Preview' }).click();
  await page.getByText('Preview. Nothing you do here is saved.').waitFor();
  await page.getByRole('button', { name: "I'm stuck" }).click();
  const wa = await page.getByRole('link', { name: 'Send WhatsApp message to Asha' }).getAttribute('href');
  const u = new URL(wa);
  assert.equal(u.pathname, '/919876543210');
  assert.equal(u.searchParams.get('text'),
    'Hi Asha, I\'m stuck on step 1 of 6 in "Sample: Join a video call": Open the message from your family. Find the link to the call.');
  assert.equal(await page.getByRole('link', { name: 'Call Asha' }).getAttribute('href'), 'tel:+919876543210');
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Back to editing' }).click();
  await page.getByRole('heading', { level: 1, name: 'Edit guide' }).waitFor();
  const counts = await page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('plainsteps'); r.onsuccess = () => {
      const tx = r.result.transaction(['runs', 'progress']);
      const a = tx.objectStore('runs').count(); const b = tx.objectStore('progress').count();
      tx.oncomplete = () => res([a.result, b.result]);
    };
  }));
  assert.deepEqual(counts, [0, 0]);
  assert.deepEqual(problems, []);
});

test('Hindi guide without a Hindi voice says so plainly and still reads', async (t) => {
  const { page, url, problems, close } = await launch(8203);
  t.after(close);
  await page.addInitScript(mockSpeech([{ lang: 'en-IN', name: 'x' }]));
  await page.addInitScript(() => {
    if (!localStorage.getItem('plainsteps.settings')) localStorage.setItem('plainsteps.settings', JSON.stringify({ uiLang: 'hi' }));
  });
  await page.goto(url);
  await page.getByRole('link', { name: 'शुरू करें' }).click();
  await page.getByText('इस फ़ोन में हिन्दी आवाज़ नहीं है').waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'hi');
  assert.equal(await page.locator('.step-text').getAttribute('lang'), 'hi');
  await page.waitForFunction(() => window.__spoken.length >= 1);
  assert.equal(await page.evaluate(() => window.__spoken[0].lang), 'en-IN'); // fell back to the English voice
  assert.deepEqual(problems, []);
});

test('photo opens full screen with a visible close button', async (t) => {
  const { page, url, problems, close } = await launch(8204);
  t.after(close);
  await page.goto(url);
  await page.getByRole('heading', { level: 2 }).first().waitFor();
  await page.evaluate(() => new Promise((res) => {
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
    const r = indexedDB.open('plainsteps'); r.onsuccess = () => {
      const tx = r.result.transaction('guides', 'readwrite'); const s = tx.objectStore('guides');
      const q = s.getAll(); q.onsuccess = () => {
        const g = q.result[0]; g.steps[0].photo = new Blob([png], { type: 'image/png' }); g.steps[0].photoAlt = 'A phone screen'; s.put(g);
      };
      tx.oncomplete = res;
    };
  }));
  await page.reload();
  await page.getByRole('link', { name: 'Start' }).click();
  await page.getByRole('button', { name: /A phone screen/ }).click();
  await page.getByRole('button', { name: 'Close photo' }).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog[open]').count(), 0);
  assert.deepEqual(problems, []);
});
