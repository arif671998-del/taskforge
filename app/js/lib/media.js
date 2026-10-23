/** Voice note helpers (pure). */

export const MAX_RECORD_SECONDS = 60;

/** Preferred recording formats, best first. Chrome and Firefox do webm; Safari does mp4. */
export const AUDIO_MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];

/**
 * First format the browser can record.
 * @param {(type: string) => boolean} isSupported e.g. MediaRecorder.isTypeSupported
 * @returns {string} '' means "let the browser choose"
 */
export function pickAudioMime(isSupported) {
  return AUDIO_MIME_CANDIDATES.find((type) => {
    try { return isSupported(type); } catch { return false; }
  }) ?? '';
}

/**
 * Which message to show for a microphone error.
 * @param {string} errorName DOMException name, e.g. "NotAllowedError"
 * @returns {'micDenied'|'micMissing'|'micUnavailable'}
 */
export function micErrorKey(errorName) {
  if (errorName === 'NotAllowedError' || errorName === 'SecurityError') return 'micDenied';
  if (errorName === 'NotFoundError' || errorName === 'OverconstrainedError') return 'micMissing';
  return 'micUnavailable';
}
