/**
 * Settings stored in localStorage. Every access is wrapped in try/catch because
 * storage can be blocked (private windows, cleared site data) and the app must still work.
 */

export const STORAGE_KEY = 'plainsteps.settings';

export const DEFAULTS = Object.freeze({
  uiLang: 'en',
  textSize: 'normal',
  autoRead: true,
  speechSpeed: 'slow',
});

const ALLOWED = {
  uiLang: ['en', 'hi'],
  textSize: ['normal', 'large', 'xlarge'],
  speechSpeed: ['slow', 'normal'],
};

/** Speech rate for each speed setting. */
export const SPEECH_RATES = Object.freeze({ slow: 0.85, normal: 1 });

/**
 * Keep only known keys with valid values; fill the rest with defaults.
 * @param {unknown} input
 * @returns {typeof DEFAULTS}
 */
export function sanitize(input) {
  const src = input && typeof input === 'object' ? input : {};
  const out = { ...DEFAULTS };
  for (const key of Object.keys(ALLOWED)) {
    if (ALLOWED[key].includes(src[key])) out[key] = src[key];
  }
  if (typeof src.autoRead === 'boolean') out.autoRead = src.autoRead;
  return out;
}

/**
 * @param {Pick<Storage,'getItem'>|null} [storage]
 * @returns {typeof DEFAULTS}
 */
export function loadSettings(storage = safeLocalStorage()) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return sanitize(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * @param {typeof DEFAULTS} settings
 * @param {Pick<Storage,'setItem'>|null} [storage]
 * @returns {boolean} true if saved
 */
export function saveSettings(settings, storage = safeLocalStorage()) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(sanitize(settings)));
    return Boolean(storage);
  } catch {
    return false;
  }
}

function safeLocalStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
