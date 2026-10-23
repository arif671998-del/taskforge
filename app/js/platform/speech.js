/**
 * Read-aloud with the browser's speechSynthesis. Never throws; callers get a boolean
 * saying whether speech is possible so they can tell the user plainly.
 */

const synth = () => globalThis.speechSynthesis ?? null;

/** True if the browser has speech at all. */
export const speechSupported = () => Boolean(synth() && globalThis.SpeechSynthesisUtterance);

/**
 * Voices can load late, so wait for `voiceschanged` (with a time limit).
 * @param {number} [timeoutMs]
 * @returns {Promise<SpeechSynthesisVoice[]>} possibly empty
 */
export function loadVoices(timeoutMs = 1500) {
  const s = synth();
  if (!s) return Promise.resolve([]);
  const now = s.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => {
      s.removeEventListener('voiceschanged', done);
      clearTimeout(timer);
      resolve(s.getVoices());
    };
    const timer = setTimeout(done, timeoutMs);
    s.addEventListener('voiceschanged', done);
  });
}

/**
 * Speak text. Stops anything already being spoken.
 * @param {string} text
 * @param {{ lang: string, voice?: SpeechSynthesisVoice|null, rate?: number, onend?: () => void }} opts
 * @returns {boolean} false if speech is unavailable
 */
export function speak(text, { lang, voice = null, rate = 1, onend }) {
  const s = synth();
  if (!speechSupported()) return false;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang || lang;
  if (voice) u.voice = voice;
  u.rate = rate;
  u.onend = () => onend?.();
  u.onerror = () => onend?.();
  s.speak(u);
  return true;
}

/** Stop speaking. */
export function stopSpeaking() {
  synth()?.cancel();
}
