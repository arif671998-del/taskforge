import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickVoice, planReading } from '../app/js/lib/voice.js';

const v = (lang, name = lang) => ({ lang, name });

test('pickVoice prefers exact region, then language', () => {
  const voices = [v('en-US'), v('en-IN'), v('hi_IN'), v('en-GB')];
  assert.equal(pickVoice(voices, 'en').lang, 'en-IN');
  assert.equal(pickVoice(voices, 'hi').lang, 'hi_IN');
  assert.equal(pickVoice([v('en-GB')], 'en').lang, 'en-GB');
  assert.equal(pickVoice([v('en-GB')], 'hi'), null);
});

test('hindi guide with Hindi voice reads normally', () => {
  const p = planReading([v('hi-IN'), v('en-US')], 'hi', false);
  assert.deepEqual([p.source, p.lang, p.missingHindi, p.voice.lang], ['speech', 'hi-IN', false, 'hi-IN']);
});

test('no Hindi voice: flagged, falls back to English voice', () => {
  const p = planReading([v('en-US'), v('en-IN')], 'hi', false);
  assert.deepEqual([p.source, p.missingHindi, p.voice.lang, p.lang], ['speech', true, 'en-IN', 'en-IN']);
});

test('voice note is preferred, and missing Hindi is still reported', () => {
  const p = planReading([v('en-US')], 'hi', true);
  assert.deepEqual([p.source, p.missingHindi], ['note', true]);
});

test('empty voice list is not reported as missing Hindi', () => {
  const p = planReading([], 'hi', false);
  assert.deepEqual([p.source, p.missingHindi, p.voice, p.lang], ['speech', false, null, 'hi-IN']);
});
