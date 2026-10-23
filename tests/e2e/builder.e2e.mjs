import { test } from 'node:test';
import assert from 'node:assert/strict';
import { launch } from './helpers.mjs';

test('home, helper hub, builder basics', async (t) => {
  const { page, url, problems, close } = await launch();
  t.after(close);

  await page.goto(url);
  // Sample guide seeded on first run
  await page.getByRole('heading', { level: 2, name: 'Sample: Join a video call' }).waitFor();
  assert.ok(await page.getByText('6 steps · Sample').isVisible());

  // Helper confirm dialog: cancel keeps us home, continue goes to helper hub
  await page.getByRole('button', { name: 'Helper: set up guides' }).click();
  await page.getByRole('button', { name: 'Cancel' }).waitFor();
  await page.getByRole('button', { name: 'Cancel' }).click();
  assert.equal(new URL(page.url()).hash, '');
  await page.getByRole('button', { name: 'Helper: set up guides' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { level: 1, name: 'Set up guides' }).waitFor();

  // New guide: validation first
  await page.getByRole('link', { name: 'New guide' }).click();
  await page.getByRole('button', { name: 'Save guide' }).click();
  await page.getByText('Write a title for the guide.').first().waitFor();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'error-summary');

  await page.getByLabel('Guide title').fill('Pay the bill');
  await page.getByLabel('Helper name').fill('Asha');
  await page.getByLabel('Helper WhatsApp number').fill('12345');
  await page.getByLabel('What should the person do?').fill('Open the app.');
  await page.getByRole('button', { name: 'Save guide' }).click();
  await page.getByText('This number does not look right').first().waitFor();
  await page.getByLabel('Helper WhatsApp number').fill('98765 43210');

  // Add, reorder, delete steps
  await page.getByRole('button', { name: 'Add a step' }).click();
  await page.getByLabel('What should the person do?').nth(1).fill('Tap Pay.');
  await page.getByRole('button', { name: 'Move up (step 2)' }).click();
  assert.equal(await page.getByLabel('What should the person do?').first().inputValue(), 'Tap Pay.');
  await page.getByRole('button', { name: 'Delete step (step 1)' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  assert.equal(await page.getByLabel('What should the person do?').count(), 2);
  await page.getByRole('button', { name: 'Delete step (step 1)' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  assert.equal(await page.getByLabel('What should the person do?').count(), 1);
  await page.getByRole('button', { name: 'Add a step' }).click();
  await page.getByLabel('What should the person do?').nth(1).fill('Check the receipt.');

  await page.getByRole('button', { name: 'Save guide' }).click();
  await page.waitForFunction(() => location.hash.startsWith('#/build/') && location.hash !== '#/build/new');

  // Persisted: reload, guide on Home with 2 steps and +91 number saved as digits
  await page.goto(url);
  await page.getByRole('heading', { level: 2, name: 'Pay the bill' }).waitFor();
  assert.ok(await page.getByText('2 steps').isVisible());
  await page.goto(url + '#/helper');
  await page.getByRole('link', { name: 'Edit Pay the bill' }).click();
  assert.equal(await page.getByLabel('Helper WhatsApp number').inputValue(), '+91 98765 43210');
  assert.equal(await page.getByLabel('What should the person do?').first().inputValue(), 'Open the app.');

  // Delete the guide with confirmation
  await page.getByRole('button', { name: 'Delete guide' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'Set up guides' }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'Edit Pay the bill' }).count(), 0);

  // Deleted sample does not come back on reload; Restore brings it back
  await page.getByRole('link', { name: /Edit Sample/ }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Restore sample guide' }).count(), 0);

  assert.deepEqual(problems, []);
});

test('sample deletion sticks and restore works; Hindi UI', async (t) => {
  const { page, url, problems, close } = await launch(8124);
  t.after(close);
  await page.goto(url + '#/helper');
  await page.getByRole('link', { name: /Edit Sample/ }).click();
  await page.getByRole('button', { name: 'Delete guide' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'Set up guides' }).waitFor();
  await page.reload();
  assert.equal(await page.getByRole('link', { name: /Edit/ }).count(), 0);
  await page.getByRole('button', { name: 'Restore sample guide' }).click();
  await page.getByRole('link', { name: /Edit Sample/ }).waitFor();

  await page.goto(url + '#/settings');
  await page.getByLabel('हिन्दी').check();
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'hi');
  await page.getByRole('heading', { level: 1, name: 'सेटिंग' }).waitFor();
  await page.getByLabel('Extra large').or(page.getByLabel('बहुत बड़ा')).check();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.textSize), 'xlarge');
  assert.deepEqual(problems, []);
});
