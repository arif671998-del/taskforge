/**
 * Guide data helpers (pure, no DOM, no storage).
 *
 * Guide { id, title, helperName, helperPhone, language, steps, isSample, createdAt, updatedAt }
 * Step  { id, text, photo, photoAlt, marker, audio, caution, expected }
 *   marker   { x, y } in percent of the photo, or null (see marker.js)
 *   expected optional "what you should see now" text, '' when not set
 */
import { normalizePhone } from './phone.js';

export const MAX_TITLE = 100;
export const MAX_NAME = 60;
export const MAX_TEXT = 1000;
export const MAX_STEPS = 50;
export const MAX_ALT = 300;

/** Random id that also works on plain http (crypto.randomUUID needs a secure context). */
export function newId() {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** @returns {object} a blank step */
export function createStep(overrides = {}) {
  return {
    id: newId(), text: '', photo: null, photoAlt: '', marker: null, audio: null, caution: false, expected: '',
    ...overrides,
  };
}

/**
 * @param {Partial<object>} [overrides]
 * @returns {object} a blank guide with one empty step
 */
export function createGuide(overrides = {}) {
  const now = Date.now();
  return {
    id: newId(),
    title: '',
    helperName: '',
    helperPhone: '',
    language: 'en',
    steps: [createStep()],
    isSample: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Fill in fields that older saved guides do not have yet.
 * @param {object} guide
 * @returns {object}
 */
export function normalizeGuide(guide) {
  return { ...guide, steps: guide.steps.map((s) => ({ marker: null, expected: '', ...s })) };
}

/**
 * Return a new array with the step at `index` moved up (-1) or down (+1).
 * Out-of-range moves return the array unchanged.
 */
export function moveStep(steps, index, direction) {
  const to = index + direction;
  if (index < 0 || index >= steps.length || to < 0 || to >= steps.length) return steps;
  const next = steps.slice();
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** Return a new array without the step at `index`. */
export function removeStep(steps, index) {
  return steps.filter((_, i) => i !== index);
}

/**
 * Check a guide before saving. Returns a list of problems; empty means OK.
 * `phoneInput` is what the helper typed (the guide stores digits only).
 * @param {object} guide
 * @param {string} [phoneInput]
 * @returns {Array<{ code: string, n?: number }>} n is the 1-based step number
 */
export function validateGuide(guide, phoneInput = guide.helperPhone) {
  const errors = [];
  const title = guide.title.trim();
  if (!title) errors.push({ code: 'titleRequired' });
  else if (title.length > MAX_TITLE) errors.push({ code: 'titleTooLong' });
  if (guide.helperName.trim().length > MAX_NAME) errors.push({ code: 'nameTooLong' });
  if (normalizePhone(phoneInput).digits === null) errors.push({ code: 'phoneInvalid' });
  if (guide.steps.length === 0) errors.push({ code: 'needStep' });
  if (guide.steps.length > MAX_STEPS) errors.push({ code: 'tooManySteps' });
  guide.steps.forEach((step, i) => {
    const text = step.text.trim();
    if (!text) errors.push({ code: 'stepTextRequired', n: i + 1 });
    else if (text.length > MAX_TEXT) errors.push({ code: 'stepTextTooLong', n: i + 1 });
    if (step.expected && step.expected.trim().length > MAX_TEXT) errors.push({ code: 'expectedTooLong', n: i + 1 });
    if (step.photoAlt && step.photoAlt.trim().length > MAX_ALT) errors.push({ code: 'altTooLong', n: i + 1 });
  });
  return errors;
}
