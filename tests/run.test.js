import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startRun, fitRun, addStepTime, addStuck, finishRun, totalTimeMs, splitDuration } from '../app/js/lib/run.js';

test('startRun', () => {
  const r = startRun('g', 3, 1000);
  assert.deepEqual([r.guideId, r.startedAt, r.endedAt, r.completed, r.stepTimesMs, r.stuck], ['g', 1000, null, false, [0, 0, 0], []]);
});

test('addStepTime accumulates without mutating', () => {
  const r = startRun('g', 2, 0);
  const r2 = addStepTime(addStepTime(r, 1, 1500.4), 1, 500);
  assert.deepEqual(r2.stepTimesMs, [0, 2000]);
  assert.deepEqual(r.stepTimesMs, [0, 0]);
  assert.equal(addStepTime(r, 5, 100), r);
  assert.equal(addStepTime(r, 0, -5), r);
  assert.equal(totalTimeMs(r2), 2000);
});

test('stuck and finish', () => {
  const r = finishRun(addStuck(startRun('g', 2, 0), 1, 50), 99);
  assert.deepEqual(r.stuck, [{ stepIndex: 1, at: 50 }]);
  assert.equal(r.completed, true);
  assert.equal(r.endedAt, 99);
});

test('fitRun pads and trims', () => {
  const r = addStepTime(startRun('g', 2, 0), 1, 10);
  assert.deepEqual(fitRun(r, 4).stepTimesMs, [0, 10, 0, 0]);
  assert.deepEqual(fitRun(r, 1).stepTimesMs, [0]);
});

test('splitDuration', () => {
  assert.deepEqual(splitDuration(0), { m: 0, s: 0 });
  assert.deepEqual(splitDuration(200), { m: 0, s: 1 });
  assert.deepEqual(splitDuration(125000), { m: 2, s: 5 });
  assert.deepEqual(splitDuration(60000), { m: 1, s: 0 });
});

test('a "No, I do not see it" answer is a stuck event with a reason', () => {
  const r = addStuck(addStuck(startRun('g', 2, 0), 0, 5), 1, 9, 'mismatch');
  assert.deepEqual(r.stuck, [{ stepIndex: 0, at: 5 }, { stepIndex: 1, at: 9, reason: 'mismatch' }]);
});
