/**
 * All user-facing strings live here. Do not hard-code UI text anywhere else.
 * Both languages must have exactly the same keys (checked by tests/i18n.test.js).
 *
 * Placeholders look like {name} and are filled by t(key, { name: 'x' }).
 */

export const strings = {
  en: {
    appName: 'Plain Steps',
    skipToContent: 'Skip to content',
    pageNotFoundTitle: 'Page not found',
    pageNotFoundBody: 'We could not find that page.',
    backToHome: 'Back to home',

    homeTitle: 'Your guides',
    homeEmptyTitle: 'No guides yet',
    homeEmptyBody: 'A guide is a set of simple steps for one task. Ask a family member to set one up for you. They can do it from this phone.',
    settings: 'Settings',
    helperSetup: 'Helper: set up guides',

    settingsTitle: 'Settings',
    settingsLanguage: 'Language',
    settingsLanguageEnglish: 'English',
    settingsLanguageHindi: 'हिन्दी',
    settingsTextSize: 'Text size',
    sizeNormal: 'Normal',
    sizeLarge: 'Large',
    sizeXLarge: 'Extra large',
    settingsAutoRead: 'Read each step aloud',
    settingsAutoReadHint: 'When this is on, the phone reads a step out loud when you reach it.',
    settingsSpeed: 'Speaking speed',
    speedSlow: 'Slow',
    speedNormal: 'Normal',
    settingsSample: 'This is how your text will look.',
    settingsSaved: 'Saved',
    settingsPrivacy: 'Everything stays on this phone. Nothing is sent anywhere.',
  },

  // Hindi strings below are written in simple, everyday Hindi.
  // TODO(native-speaker review): please check every Hindi string for tone and wording.
  hi: {
    appName: 'सीधे कदम',
    skipToContent: 'सीधे मुख्य भाग पर जाएँ',
    pageNotFoundTitle: 'पेज नहीं मिला',
    pageNotFoundBody: 'यह पेज हमें नहीं मिला।',
    backToHome: 'होम पर वापस जाएँ',

    homeTitle: 'आपकी गाइड',
    homeEmptyTitle: 'अभी कोई गाइड नहीं है',
    homeEmptyBody: 'गाइड यानी किसी एक काम के आसान कदम। घर के किसी सदस्य से कहिए कि वे आपके लिए एक गाइड बना दें। वे इसी फ़ोन से बना सकते हैं।',
    settings: 'सेटिंग',
    helperSetup: 'मददगार: गाइड बनाएँ',

    settingsTitle: 'सेटिंग',
    settingsLanguage: 'भाषा',
    settingsLanguageEnglish: 'English',
    settingsLanguageHindi: 'हिन्दी',
    settingsTextSize: 'अक्षरों का आकार',
    sizeNormal: 'सामान्य',
    sizeLarge: 'बड़ा',
    sizeXLarge: 'बहुत बड़ा',
    settingsAutoRead: 'हर कदम बोलकर सुनाएँ',
    settingsAutoReadHint: 'यह चालू हो तो हर कदम पर पहुँचते ही फ़ोन उसे बोलकर सुनाएगा।',
    settingsSpeed: 'बोलने की रफ़्तार',
    speedSlow: 'धीमी',
    speedNormal: 'सामान्य',
    settingsSample: 'आपका लिखा हुआ ऐसा दिखेगा।',
    settingsSaved: 'सेव हो गया',
    settingsPrivacy: 'सब कुछ इसी फ़ोन में रहता है। कहीं कुछ भेजा नहीं जाता।',
  },
};

/** @typedef {'en'|'hi'} Lang */

/**
 * Look up a string and fill in {placeholders}.
 * Falls back to English, then to the key itself, so a missing string is visible but never crashes.
 * @param {Lang} lang
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 * @returns {string}
 */
export function translate(lang, key, vars = {}) {
  const raw = strings[lang]?.[key] ?? strings.en[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}
