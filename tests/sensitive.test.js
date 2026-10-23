import { test } from 'node:test';
import assert from 'node:assert/strict';
import { looksSensitive } from '../app/js/lib/sensitive.js';

test('flags words that point to secrets', () => {
  for (const text of [
    'Type your password here', 'Enter the PIN', 'Enter your UPI PIN', 'Tell me the OTP', 'Write the CVV', 'enter passcode',
    'अपना पासवर्ड डालिए', 'पिन डालिए', 'ओटीपी बताइए',
  ]) assert.equal(looksSensitive(text), true, text);
});

test('flags long runs of digits', () => {
  for (const text of ['Code is 483920', 'Card 4111 1111 1111 1111', 'Number 1234-5678', 'आपका कोड 123456 है']) {
    assert.equal(looksSensitive(text), true, text);
  }
});

test('leaves ordinary instructions alone', () => {
  for (const text of ['', 'Tap the green button.', 'Step 2 of 5', 'Wait 30 seconds', 'Use the shipping label', 'Tap Allow', 'बड़ा बटन दबाइए']) {
    assert.equal(looksSensitive(text), false, text);
  }
});
