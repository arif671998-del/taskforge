import { test } from 'node:test';
import assert from 'node:assert/strict';
import { launch, readGuides } from './helpers.mjs';

async function openSampleBuilder(page, url) {
  await page.goto(url + '#/helper');
  await page.getByRole('link', { name: /Edit Sample/ }).click();
  await page.getByRole('heading', { level: 1, name: 'Edit guide' }).waitFor();
}

test('sensitive warning, caution flag and expected text', async (t) => {
  const { page, url, problems, close } = await launch(8220);
  t.after(close);
  await openSampleBuilder(page, url);
  const step1 = page.locator('li.step-card').first();
  const warning = step1.getByText('Please do not write passwords, PINs or OTPs');
  assert.equal(await warning.first().isHidden(), true);
  const text = step1.getByLabel('What should the person do?');
  await text.fill('Enter your UPI PIN');
  assert.equal(await warning.first().isVisible(), true);
  await text.fill('Enter the code 483920');
  assert.equal(await warning.first().isVisible(), true);
  await text.fill('Tap the green button.');
  assert.equal(await warning.first().isHidden(), true);
  // Warns only: saving still works with a sensitive word
  await text.fill('Never share your OTP. Tap the green button.');
  await step1.getByLabel('What you should see now (optional)').fill('A green screen.');
  await step1.getByLabel('This step needs extra care').check();
  await page.getByRole('button', { name: 'Save guide' }).click();
  await page.getByText('Guide saved').waitFor({ state: 'attached' }).catch(() => {});
  const [g] = await readGuides(page);
  assert.equal(g.steps[0].text, 'Never share your OTP. Tap the green button.');
  assert.equal(g.steps[0].expected, 'A green screen.');
  assert.equal(g.steps[0].caution, true);
  assert.deepEqual(problems, []);
});

test('unsaved-changes guard: link, browser Back, beforeunload', async (t) => {
  const { page, url, problems, close } = await launch(8221);
  t.after(close);
  await page.goto(url + '#/helper');
  await page.getByRole('link', { name: /Edit Sample/ }).click();
  await page.getByRole('heading', { level: 1, name: 'Edit guide' }).waitFor();
  const builderHash = new URL(page.url()).hash;

  // Nothing changed: leaving is silent
  await page.getByRole('link', { name: 'Back to guides' }).click();
  await page.getByRole('heading', { level: 1, name: 'Set up guides' }).waitFor();
  await page.getByRole('link', { name: /Edit Sample/ }).click();
  await page.getByLabel('Guide title').fill('Changed title');

  // In-app link: stay, then leave
  await page.getByRole('link', { name: 'Back to guides' }).click();
  await page.getByRole('heading', { name: 'Leave without saving?' }).waitFor();
  await page.getByRole('button', { name: 'Stay and keep editing' }).click();
  assert.equal(new URL(page.url()).hash, builderHash);
  assert.equal(await page.getByLabel('Guide title').inputValue(), 'Changed title');

  // Browser Back: stay
  await page.goBack();
  await page.getByRole('heading', { name: 'Leave without saving?' }).waitFor();
  await page.getByRole('button', { name: 'Stay and keep editing' }).click();
  assert.equal(new URL(page.url()).hash, builderHash);
  assert.equal(await page.getByLabel('Guide title').inputValue(), 'Changed title');

  // beforeunload warns while there are changes
  const dialog = page.waitForEvent('dialog');
  await page.close({ runBeforeUnload: true });
  const d = await dialog;
  assert.equal(d.type(), 'beforeunload');
  await d.dismiss();
});

test('guard: browser Back then Leave goes to the previous page; saving clears the guard', async (t) => {
  const { page, url, problems, close } = await launch(8222);
  t.after(close);
  await page.goto(url + '#/helper');
  await page.getByRole('link', { name: /Edit Sample/ }).click();
  await page.getByLabel('Guide title').fill('Changed title');
  await page.goBack();
  await page.getByRole('button', { name: 'Leave without saving' }).click();
  await page.getByRole('heading', { level: 1, name: 'Set up guides' }).waitFor();
  assert.equal(await page.getByText('Changed title').count(), 0);

  // Saved edits are not "unsaved": Back goes straight through (two quick steps back is fine)
  await page.getByRole('link', { name: /Edit Sample/ }).click();
  await page.getByLabel('Guide title').fill('Saved title');
  await page.getByRole('button', { name: 'Save guide' }).click();
  await page.getByRole('link', { name: 'Back to guides' }).click();
  await page.getByRole('heading', { level: 1, name: 'Set up guides' }).waitFor();
  await page.getByText('Saved title').waitFor();
  assert.deepEqual(problems, []);
});

test('skip link does not break the router', async (t) => {
  const { page, url, problems, close } = await launch(8223);
  t.after(close);
  await page.goto(url);
  await page.locator('#skip-link').focus();
  await page.keyboard.press('Enter');
  assert.equal(new URL(page.url()).hash, '');
  await page.getByRole('heading', { level: 1, name: 'Your guides' }).waitFor();
  assert.deepEqual(problems, []);
});
