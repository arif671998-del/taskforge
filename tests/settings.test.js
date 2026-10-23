import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, loadSettings, saveSettings, sanitize, STORAGE_KEY } from '../app/js/lib/settings.js';

const memory = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
};

test('defaults when storage is empty or missing', () => {
  assert.deepEqual(loadSettings(memory()), DEFAULTS);
  assert.deepEqual(loadSettings(null), DEFAULTS);
});

test('defaults when storage throws', () => {
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.deepEqual(loadSettings(broken), DEFAULTS);
  assert.equal(saveSettings(DEFAULTS, broken), false);
});

test('round-trips valid settings', () => {
  const store = memory();
  const s = { uiLang: 'hi', textSize: 'xlarge', autoRead: false, speechSpeed: 'normal' };
  assert.equal(saveSettings(s, store), true);
  assert.deepEqual(loadSettings(store), s);
});

test('ignores corrupt or invalid values', () => {
  const store = memory();
  store.setItem(STORAGE_KEY, '{not json');
  assert.deepEqual(loadSettings(store), DEFAULTS);
  assert.deepEqual(sanitize({ uiLang: 'fr', textSize: 'huge', autoRead: 'yes', speechSpeed: 9 }), DEFAULTS);
});
