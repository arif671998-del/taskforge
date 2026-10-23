import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickAudioMime, micErrorKey } from '../app/js/lib/media.js';
import { fitWithin } from '../app/js/lib/image.js';

test('pickAudioMime picks the first supported type', () => {
  assert.equal(pickAudioMime(() => true), 'audio/webm;codecs=opus');
  assert.equal(pickAudioMime((t) => t === 'audio/mp4'), 'audio/mp4'); // Safari
  assert.equal(pickAudioMime(() => false), '');
  assert.equal(pickAudioMime(() => { throw new Error('nope'); }), '');
});

test('micErrorKey maps error names', () => {
  assert.equal(micErrorKey('NotAllowedError'), 'micDenied');
  assert.equal(micErrorKey('NotFoundError'), 'micMissing');
  assert.equal(micErrorKey('AbortError'), 'micUnavailable');
});

test('fitWithin scales down to 1280 on the longest side and never enlarges', () => {
  assert.deepEqual(fitWithin(4000, 3000), { width: 1280, height: 960 });
  assert.deepEqual(fitWithin(3000, 4000), { width: 960, height: 1280 });
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
  assert.deepEqual(fitWithin(1280, 1280), { width: 1280, height: 1280 });
  assert.deepEqual(fitWithin(10000, 1), { width: 1280, height: 1 });
});
