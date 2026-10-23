/**
 * Phone number helpers. We store digits only, including the country code
 * (for example "919876543210"), which is what wa.me links need.
 */

export const DEFAULT_COUNTRY_CODE = '91';

/**
 * Turn what the helper typed into digits with a country code.
 * Rules:
 *  - empty input is fine (returns { digits: '' });
 *  - "+" or "00" at the start means the country code is included;
 *  - otherwise a 10-digit number (an optional leading 0 is dropped) gets the default code;
 *  - Indian numbers (+91) must have 10 digits after the code and start with 6-9.
 * @param {string} input
 * @param {string} [defaultCc]
 * @returns {{ digits: string } | { digits: null, error: 'invalid' }}
 */
export function normalizePhone(input, defaultCc = DEFAULT_COUNTRY_CODE) {
  const raw = String(input ?? '').trim();
  if (!raw) return { digits: '' };

  let digits = raw.replace(/\D/g, '');
  let international = raw.startsWith('+');
  if (!international && raw.startsWith('00')) {
    international = true;
    digits = digits.slice(2);
  }

  if (!international) {
    digits = digits.replace(/^0+/, '');
    if (digits.length === 10) digits = defaultCc + digits;
    else if (!(digits.length === defaultCc.length + 10 && digits.startsWith(defaultCc))) {
      return { digits: null, error: 'invalid' };
    }
  }

  if (digits.length < 8 || digits.length > 15 || digits.startsWith('0')) {
    return { digits: null, error: 'invalid' };
  }
  if (digits.startsWith('91') && !/^91[6-9]\d{9}$/.test(digits)) {
    return { digits: null, error: 'invalid' };
  }
  return { digits };
}

/**
 * Friendly display of stored digits, e.g. "+91 98765 43210".
 * @param {string} digits
 * @returns {string}
 */
export function formatPhone(digits) {
  if (!digits) return '';
  const m = /^91(\d{5})(\d{5})$/.exec(digits);
  return m ? `+91 ${m[1]} ${m[2]}` : `+${digits}`;
}
