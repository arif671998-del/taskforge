import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointToMarker, nudgeMarker, sanitizeMarker, photoAltText, MARKER_STEP } from '../app/js/lib/marker.js';

const box = (left, top, width, height) => ({ left, top, width, height });

test('a tap becomes percentages of the photo box', () => {
  assert.deepEqual(pointToMarker(150, 130, box(0, 30, 300, 200)), { x: 50, y: 50 });
  assert.deepEqual(pointToMarker(30, 40, box(10, 30, 200, 100)), { x: 10, y: 10 });
});

test('the stored marker is the same at any display size', () => {
  const small = pointToMarker(75, 40, box(0, 0, 300, 200));       // 25%, 20%
  const large = pointToMarker(300, 160, box(0, 0, 1200, 800));    // same spot, 4x bigger
  assert.deepEqual(small, large);
  assert.deepEqual(small, { x: 25, y: 20 });
});

test('taps outside the photo are clamped; empty boxes give null', () => {
  assert.deepEqual(pointToMarker(-50, 999, box(0, 0, 100, 100)), { x: 0, y: 100 });
  assert.equal(pointToMarker(5, 5, box(0, 0, 0, 100)), null);
});

test('percentages are rounded to one decimal', () => {
  assert.deepEqual(pointToMarker(1, 1, box(0, 0, 3, 3)), { x: 33.3, y: 33.3 });
});

test('nudge moves in steps and stays inside the photo', () => {
  assert.deepEqual(nudgeMarker({ x: 50, y: 50 }, 1, -1), { x: 50 + MARKER_STEP, y: 50 - MARKER_STEP });
  assert.deepEqual(nudgeMarker({ x: 1, y: 99 }, -1, 1), { x: 0, y: 100 });
});

test('sanitizeMarker accepts good data and rejects bad data', () => {
  assert.deepEqual(sanitizeMarker({ x: 12.34, y: 99 }), { x: 12.3, y: 99 });
  for (const bad of [null, undefined, 5, 'x', {}, { x: 1 }, { x: '1', y: 2 }, { x: -1, y: 5 }, { x: 5, y: 100.5 }, { x: NaN, y: 1 }, { x: Infinity, y: 1 }]) {
    assert.equal(sanitizeMarker(bad), null, JSON.stringify(bad));
  }
});

test('marker survives a JSON round trip (export and import)', () => {
  const m = pointToMarker(123, 77, box(0, 0, 400, 300));
  assert.deepEqual(sanitizeMarker(JSON.parse(JSON.stringify(m))), m);
});

test('alt text mentions the marker', () => {
  const o = { defaultAlt: 'Photo for step 2', suffix: 'Marked: press here' };
  assert.equal(photoAltText({ ...o, alt: '', hasMarker: false }), 'Photo for step 2');
  assert.equal(photoAltText({ ...o, alt: ' Login screen ', hasMarker: false }), 'Login screen');
  assert.equal(photoAltText({ ...o, alt: 'Login screen', hasMarker: true }), 'Login screen. Marked: press here');
  assert.equal(photoAltText({ ...o, hasMarker: true }), 'Photo for step 2. Marked: press here');
});
