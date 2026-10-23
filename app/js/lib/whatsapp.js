/**
 * WhatsApp and phone link builders (pure). Numbers are digits with country code.
 */

const DIGITS = /^\d{8,15}$/;

/** True if `digits` can be used in a wa.me or tel link. */
export const hasValidNumber = (digits) => typeof digits === 'string' && DIGITS.test(digits);

/**
 * @param {string} digits e.g. "919876543210"
 * @param {string} text message, encoded here
 * @returns {string|null} link, or null when there is no usable number
 */
export function waLink(digits, text) {
  if (!hasValidNumber(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** @returns {string|null} */
export function telLink(digits) {
  return hasValidNumber(digits) ? `tel:+${digits}` : null;
}

/**
 * Shorten long text for a message, on a character boundary that is not mid-surrogate-pair.
 * @param {string} text
 * @param {number} [max]
 */
export function truncate(text, max = 300) {
  const chars = Array.from(text.trim().replace(/\s+/g, ' '));
  return chars.length <= max ? chars.join('') : `${chars.slice(0, max - 1).join('')}…`;
}
