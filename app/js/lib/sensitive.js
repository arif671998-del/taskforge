/**
 * Spot text that looks like it holds a secret, so the builder can warn the helper.
 * We only warn; we never block.
 */

const WORDS_LATIN = /\b(?:password|passcode|passwd|pwd|pin|otp|cvv|cvc)\b/i;
const WORDS_DEVANAGARI = ['पासवर्ड', 'पासकोड', 'पिन', 'ओटीपी', 'सीवीवी'];
// Six or more digits in a row, allowing single spaces or hyphens between them (card numbers, OTPs).
const LONG_DIGITS = /\d(?:[ -]?\d){5,}/;

/**
 * @param {string} text
 * @returns {boolean} true if the text may contain a password, PIN, OTP, CVV or long number
 */
export function looksSensitive(text) {
  if (!text) return false;
  return WORDS_LATIN.test(text) || WORDS_DEVANAGARI.some((w) => text.includes(w)) || LONG_DIGITS.test(text);
}
