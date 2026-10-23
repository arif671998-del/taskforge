import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strings, translate } from '../app/js/i18n.js';

test('every English key has a Hindi key and vice versa', () => {
  const en = Object.keys(strings.en).sort();
  const hi = Object.keys(strings.hi).sort();
  assert.deepEqual(hi.filter((k) => !en.includes(k)), [], 'keys only in Hindi');
  assert.deepEqual(en.filter((k) => !hi.includes(k)), [], 'keys only in English');
});

test('no string is empty', () => {
  for (const lang of ['en', 'hi']) {
    for (const [key, value] of Object.entries(strings[lang])) {
      assert.ok(value.trim().length > 0, `${lang}.${key} is empty`);
    }
  }
});

test('placeholders match between languages', () => {
  const names = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
  for (const key of Object.keys(strings.en)) {
    assert.equal(names(strings.hi[key]), names(strings.en[key]), `placeholders differ for ${key}`);
  }
});

test('translate fills placeholders and falls back to the key', () => {
  strings.en.__t = 'Hi {name}';
  assert.equal(translate('en', '__t', { name: 'Asha' }), 'Hi Asha');
  assert.equal(translate('hi', '__t', { name: 'Asha' }), 'Hi Asha'); // falls back to English
  assert.equal(translate('en', 'no.such.key'), 'no.such.key');
  delete strings.en.__t;
});
