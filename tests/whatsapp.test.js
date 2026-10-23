import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waLink, telLink, truncate, hasValidNumber } from '../app/js/lib/whatsapp.js';

test('waLink builds an encoded wa.me link', () => {
  const link = waLink('919876543210', 'Hi Asha, I\'m stuck on step 2 of 5 in "Pay bill": Tap & wait?');
  const url = new URL(link);
  assert.equal(url.origin + url.pathname, 'https://wa.me/919876543210');
  assert.equal(url.searchParams.get('text'), 'Hi Asha, I\'m stuck on step 2 of 5 in "Pay bill": Tap & wait?');
  assert.ok(!link.includes(' ') && !link.includes('&wait'));
});

test('waLink round-trips Hindi text', () => {
  const text = 'नमस्ते आशा, मुझे "बिल" के कदम 2 पर दिक्कत आ रही है';
  assert.equal(new URL(waLink('919876543210', text)).searchParams.get('text'), text);
});

test('no usable number gives null', () => {
  for (const bad of ['', null, undefined, 'abc', '123', '+919876543210', '9'.repeat(16)]) {
    assert.equal(waLink(bad, 'x'), null, String(bad));
    assert.equal(telLink(bad), null, String(bad));
    assert.equal(hasValidNumber(bad), false);
  }
});

test('telLink', () => assert.equal(telLink('919876543210'), 'tel:+919876543210'));

test('truncate', () => {
  assert.equal(truncate('  a   b\n c '), 'a b c');
  assert.equal(truncate('x'.repeat(10), 5), 'xxxx…');
  assert.equal(truncate('😀'.repeat(6), 4), '😀😀😀…');
});
