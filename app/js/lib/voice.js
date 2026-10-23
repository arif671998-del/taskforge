/**
 * Choosing a speech voice (pure, works on plain objects shaped like SpeechSynthesisVoice).
 */

/** BCP-47 tag used for read-aloud for each guide language. */
export const SPEECH_LANG = Object.freeze({ en: 'en-IN', hi: 'hi-IN' });

const base = (tag) => String(tag || '').toLowerCase().replace('_', '-').split('-')[0];

/**
 * Best voice for a guide language: exact region match first, then any voice of that language.
 * @param {Array<{ lang: string, localService?: boolean }>} voices
 * @param {'en'|'hi'} language
 * @returns {object|null}
 */
export function pickVoice(voices, language) {
  const want = SPEECH_LANG[language];
  const norm = (v) => String(v.lang).replace('_', '-').toLowerCase();
  return (
    voices.find((v) => norm(v) === want.toLowerCase()) ??
    voices.find((v) => base(v.lang) === language) ??
    null
  );
}

/**
 * Decide how to read a step.
 * @param {Array<object>} voices known voices (may be empty if the phone does not list any)
 * @param {'en'|'hi'} language guide language
 * @param {boolean} hasVoiceNote
 * @returns {{ source: 'note'|'speech', voice: object|null, lang: string, missingHindi: boolean }}
 *  source "note": prefer the helper's recording.
 *  missingHindi: the phone lists voices but none is Hindi, so tell the user plainly.
 */
export function planReading(voices, language, hasVoiceNote) {
  const own = pickVoice(voices, language);
  const missingHindi = language === 'hi' && voices.length > 0 && !own;
  if (hasVoiceNote) return { source: 'note', voice: own, lang: SPEECH_LANG[language], missingHindi };
  if (missingHindi) {
    const english = pickVoice(voices, 'en');
    return { source: 'speech', voice: english, lang: SPEECH_LANG.en, missingHindi };
  }
  return { source: 'speech', voice: own, lang: SPEECH_LANG[language], missingHindi };
}
