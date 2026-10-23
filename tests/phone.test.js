import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, formatPhone } from '../app/js/lib/phone.js';

test('empty is allowed', () => {
  assert.deepEqual(normalizePhone(''), { digits: '' });
  assert.deepEqual(normalizePhone('   '), { digits: '' });
});

test('Indian numbers get +91 by default', () => {
  for (const input of ['9876543210', '98765 43210', '098765-43210', '+91 98765 43210', '919876543210', '0091 98765 43210']) {
    assert.equal(normalizePhone(input).digits, '919876543210', input);
  }
});

test('other countries need a + or 00', () => {
  assert.equal(normalizePhone('+44 7911 123456').digits, '447911123456');
  assert.equal(normalizePhone('0044 7911 123456').digits, '447911123456');
  assert.equal(normalizePhone('7911123456').digits, '917911123456'); // no +, so it is read as Indian
});

test('rejects bad numbers', () => {
  for (const input of ['abc', '12345', '+91 12345 67890', '+91 98765', '98765432101234', '+0 123456789', '+1']) {
    assert.equal(normalizePhone(input).digits, null, input);
  }
});

test('formatPhone', () => {
  assert.equal(formatPhone('919876543210'), '+91 98765 43210');
  assert.equal(formatPhone('447911123456'), '+447911123456');
  assert.equal(formatPhone(''), '');
});
