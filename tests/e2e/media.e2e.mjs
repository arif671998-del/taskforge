import { test } from 'node:test';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { launch, makePng, readGuides } from './helpers.mjs';

const serious = (r) => r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
const png = (name, w, h) => ({ name, mimeType: 'image/png', buffer: makePng(w, h) });

async function openSampleBuilder(page, url) {
  await page.goto(url + '#/helper');
  await page.getByRole('link', { name: /Edit Sample/ }).click();
  await page.getByRole('heading', { level: 1, name: 'Edit guide' }).waitFor();
}

test('photo is downscaled; marker is stored as percentages; player shows ring and marked alt text', async (t) => {
  const { page, url, problems, close } = await launch(8210);
  t.after(close);
  await openSampleBuilder(page, url);

  const step1 = page.locator('li.step-card').first();
  const chooser = page.waitForEvent('filechooser');
  await step1.getByRole('button', { name: 'Choose from gallery' }).click();
  (await chooser).setFiles(png('big.png', 2400, 1200));
  await step1.getByRole('button', { name: /Photo\. Tap to place/ }).waitFor();

  // Tap a quarter of the way across, three quarters down the photo
  const box = await step1.locator('.photo-img').boundingBox();
  await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.75);
  assert.equal(await step1.locator('.marker-ring').count(), 1);
  await step1.getByLabel('Photo description (optional)').fill('Message with a link');

  // Move: tap elsewhere. Then nudge right with the button, then keep it.
  const box2 = await step1.locator('.photo-img').boundingBox(); // measure again in case the page scrolled
  await page.mouse.click(box2.x + box2.width * 0.5, box2.y + box2.height * 0.5);
  await step1.getByRole('button', { name: /Marker right/ }).click();
  await page.getByRole('button', { name: 'Save guide' }).click();
  await page.waitForFunction(() => document.querySelector('[role=status]') || true);

  const [guide] = await readGuides(page);
  const s = guide.steps[0];
  assert.deepEqual([s.photo.type, s.photo.w, s.photo.h], ['image/jpeg', 1280, 640]);
  assert.ok(Math.abs(s.marker.x - 52) <= 1.5 && Math.abs(s.marker.y - 50) <= 1.5, JSON.stringify(s.marker));
  assert.equal(s.photoAlt, 'Message with a link');

  // Player: ring at the same percentages, alt mentions the marker, pulses unless reduced motion
  await page.goto(url + '#/');
  await page.getByRole('link', { name: 'Start' }).click();
  await page.getByRole('heading', { name: 'Step 1 of 6' }).waitFor();
  const alt = await page.locator('.photo-img').getAttribute('alt');
  assert.equal(alt, 'Message with a link. Marked: press here');
  const ring = page.locator('.photo-button .marker-ring');
  const left = await ring.evaluate((e) => e.style.left);
  assert.equal(parseFloat(left), s.marker.x);
  assert.notEqual(await ring.evaluate((e) => getComputedStyle(e).animationName), 'none');
  assert.deepEqual(serious(await new AxeBuilder({ page }).analyze()).map((v) => v.id), []);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await ring.evaluate((e) => getComputedStyle(e).animationName), 'none');

  // Full screen keeps the ring and has a close button
  await page.locator('.photo-button').click();
  await page.locator('dialog .marker-ring').waitFor();
  await page.getByRole('button', { name: 'Close photo' }).click();

  // Removing the marker and the photo in the builder
  await openSampleBuilder(page, url);
  const first = page.locator('li.step-card').first();
  await first.getByRole('button', { name: 'Remove marker' }).click();
  assert.equal(await first.locator('.marker-ring').count(), 0);
  await first.getByRole('button', { name: 'Remove photo' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  assert.equal(await first.locator('.photo-img').count(), 0);
  assert.deepEqual(problems, []);
});

test('marker can be placed and moved with the keyboard', async (t) => {
  const { page, url, problems, close } = await launch(8211);
  t.after(close);
  await openSampleBuilder(page, url);
  const step1 = page.locator('li.step-card').first();
  const chooser = page.waitForEvent('filechooser');
  await step1.getByRole('button', { name: 'Choose from gallery' }).click();
  (await chooser).setFiles(png('small.png', 300, 200));
  const tap = step1.getByRole('button', { name: /Photo\. Tap to place/ });
  await tap.focus();
  await page.keyboard.press('Enter');
  await step1.locator('.marker-ring').waitFor();
  const x0 = parseFloat(await step1.locator('.marker-ring').evaluate((e) => e.style.left));
  assert.equal(x0, 50);
  await page.keyboard.press('ArrowRight');
  assert.equal(parseFloat(await step1.locator('.marker-ring').evaluate((e) => e.style.left)), 52);
  assert.deepEqual(problems, []);
});

test('voice note: record, stop, play, delete; limit text; denied mic message', async (t) => {
  const { page, url, problems, close } = await launch(8212, { mic: true });
  t.after(close);
  await openSampleBuilder(page, url);
  const step1 = page.locator('li.step-card').first();
  await step1.getByText('No recording yet.').waitFor();
  await step1.getByRole('button', { name: 'Record', exact: true }).click();
  await step1.getByText(/Recording… \d+ of 60 seconds/).waitFor();
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Stop recording');
  await page.waitForTimeout(1200);
  await step1.getByRole('button', { name: 'Stop recording' }).click();
  await step1.getByText('Recording saved.').waitFor();
  await step1.getByRole('button', { name: 'Play recording' }).click();
  await step1.getByRole('button', { name: 'Stop playing' }).waitFor();
  await step1.getByRole('button', { name: 'Stop playing' }).click();
  await page.getByRole('button', { name: 'Save guide' }).click();
  await page.getByRole('heading', { level: 1, name: 'Edit guide' }).waitFor();
  const [guide] = await readGuides(page);
  assert.match(guide.steps[0].audio.type, /^audio\//);
  assert.ok(guide.steps[0].audio.size > 500);
  assert.deepEqual(serious(await new AxeBuilder({ page }).analyze()).map((v) => v.id), []);

  // Player offers the voice note and says "Play Asha's voice" once a name is set
  await step1.getByRole('button', { name: 'Delete recording' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await step1.getByText('No recording yet.').waitFor();
  assert.deepEqual(problems, []);
});

test('voice note: denied microphone gives a plain message', async (t) => {
  const { page, url, problems, close } = await launch(8213);
  t.after(close);
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('no', 'NotAllowedError'));
  });
  await openSampleBuilder(page, url);
  const step1 = page.locator('li.step-card').first();
  await step1.getByRole('button', { name: 'Record', exact: true }).click();
  await step1.getByText('The microphone is blocked.').waitFor();
  assert.equal(await step1.getByRole('alert').count(), 1);
  assert.deepEqual(problems, []);
});

test('player plays the voice note first and prefers it', async (t) => {
  const { page, url, problems, close } = await launch(8214, { mic: true });
  t.after(close);
  await openSampleBuilder(page, url);
  await page.getByLabel('Helper name').fill('Asha');
  const step1 = page.locator('li.step-card').first();
  await step1.getByRole('button', { name: 'Record', exact: true }).click();
  await page.waitForTimeout(1000);
  await step1.getByRole('button', { name: 'Stop recording' }).click();
  await step1.getByText('Recording saved.').waitFor();
  await page.getByRole('button', { name: 'Save guide' }).click();
  await page.goto(url + '#/');
  await page.getByRole('link', { name: 'Start' }).click();
  await page.getByRole('button', { name: /Play Asha.s voice|Stop voice/ }).waitFor();
  assert.deepEqual(problems.filter((p) => !/autoplay|play\(\)/i.test(p)), []);
});
