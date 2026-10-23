import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGuide, createStep, moveStep, removeStep, validateGuide, newId, MAX_TEXT, MAX_STEPS } from '../app/js/lib/guide.js';
import { createSampleGuide } from '../app/js/lib/sample.js';

const withSteps = (...texts) => createGuide({ title: 'T', steps: texts.map((text) => createStep({ text })) });

test('ids are unique', () => {
  assert.equal(new Set(Array.from({ length: 200 }, newId)).size, 200);
});

test('moveStep moves and ignores out-of-range', () => {
  const steps = ['a', 'b', 'c'].map((text) => createStep({ text }));
  assert.deepEqual(moveStep(steps, 1, -1).map((s) => s.text), ['b', 'a', 'c']);
  assert.deepEqual(moveStep(steps, 1, 1).map((s) => s.text), ['a', 'c', 'b']);
  assert.equal(moveStep(steps, 0, -1), steps);
  assert.equal(moveStep(steps, 2, 1), steps);
  assert.deepEqual(steps.map((s) => s.text), ['a', 'b', 'c'], 'input is not mutated');
});

test('removeStep', () => {
  const steps = ['a', 'b', 'c'].map((text) => createStep({ text }));
  assert.deepEqual(removeStep(steps, 1).map((s) => s.text), ['a', 'c']);
});

test('valid guide has no errors', () => {
  assert.deepEqual(validateGuide(withSteps('Do this.'), '9876543210'), []);
  assert.deepEqual(validateGuide(withSteps('Do this.'), ''), []);
});

test('validation finds each problem', () => {
  const codes = (g, phone) => validateGuide(g, phone).map((e) => e.code);
  assert.deepEqual(codes(createGuide({ title: '  ' }), ''), ['titleRequired', 'stepTextRequired']);
  assert.ok(codes(withSteps('x'), '123').includes('phoneInvalid'));
  assert.ok(codes(createGuide({ title: 'T', steps: [] }), '').includes('needStep'));
  const long = validateGuide(withSteps('ok', 'x'.repeat(MAX_TEXT + 1)), '');
  assert.deepEqual(long, [{ code: 'stepTextTooLong', n: 2 }]);
  const many = withSteps(...Array(MAX_STEPS + 1).fill('x'));
  assert.ok(codes(many, '').includes('tooManySteps'));
});

test('sample guides are valid in both languages', () => {
  for (const lang of ['en', 'hi']) {
    const g = createSampleGuide(lang);
    assert.equal(g.isSample, true);
    assert.equal(g.language, lang);
    assert.ok(g.steps.length >= 5 && g.steps.length <= 6);
    assert.deepEqual(validateGuide(g), []);
  }
  assert.equal(createSampleGuide('xx').language, 'en');
});
