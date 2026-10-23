import 'fake-indexeddb/auto';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as db from '../app/js/platform/db.js';
import { createGuide, createStep } from '../app/js/lib/guide.js';

beforeEach(async () => {
  await db.closeDb();
  indexedDB.deleteDatabase('plainsteps');
});

test('save, list, get and delete guides', async () => {
  const a = createGuide({ title: 'A', createdAt: 1, steps: [createStep({ text: 'one' })] });
  const b = createGuide({ title: 'B', createdAt: 2 });
  await db.saveGuide(b);
  await db.saveGuide(a);
  assert.deepEqual((await db.listGuides()).map((g) => g.title), ['A', 'B'], 'oldest first');
  assert.equal((await db.getGuide(a.id)).steps[0].text, 'one');
  assert.ok((await db.getGuide(a.id)).updatedAt >= a.updatedAt);
  await db.deleteGuide(a.id);
  assert.equal(await db.getGuide(a.id), undefined);
  assert.equal((await db.listGuides()).length, 1);
});

test('blobs survive a round trip', async () => {
  const g = createGuide({ title: 'Blob', steps: [createStep({ text: 'x', audio: new Blob(['abc'], { type: 'audio/webm' }) })] });
  await db.saveGuide(g);
  const back = await db.getGuide(g.id);
  assert.equal(back.steps[0].audio.size, 3);
  assert.equal(back.steps[0].audio.type, 'audio/webm');
});

test('progress save, get, clear', async () => {
  assert.equal(await db.getProgress('g1'), undefined);
  await db.saveProgress({ guideId: 'g1', runId: 'r1', stepIndex: 2 });
  assert.equal((await db.getProgress('g1')).stepIndex, 2);
  assert.equal((await db.listProgress()).length, 1);
  await db.clearProgress('g1');
  assert.equal(await db.getProgress('g1'), undefined);
});

test('deleting a guide removes its progress and runs only', async () => {
  const g = createGuide({ title: 'G' });
  await db.saveGuide(g);
  await db.saveProgress({ guideId: g.id, runId: 'r1', stepIndex: 0 });
  await db.saveRun({ id: 'r1', guideId: g.id, startedAt: 1 });
  await db.saveRun({ id: 'r2', guideId: 'other', startedAt: 1 });
  await db.deleteGuide(g.id);
  assert.equal(await db.getProgress(g.id), undefined);
  assert.deepEqual(await db.listRuns(g.id), []);
  assert.equal((await db.listRuns('other')).length, 1);
});

test('clearRuns and meta', async () => {
  await db.saveRun({ id: 'r1', guideId: 'g', startedAt: 1 });
  await db.saveRun({ id: 'r2', guideId: 'g', startedAt: 2 });
  await db.clearRuns('g');
  assert.deepEqual(await db.listRuns('g'), []);
  assert.equal(await db.getMeta('seeded'), undefined);
  await db.setMeta('seeded', true);
  assert.equal(await db.getMeta('seeded'), true);
});
