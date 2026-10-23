import { MAX_RECORD_SECONDS, pickAudioMime } from '../lib/media.js';

/** True if this browser can record sound at all. */
export const recordingSupported = () =>
  Boolean(globalThis.navigator?.mediaDevices?.getUserMedia && globalThis.MediaRecorder);

/**
 * Start recording from the microphone. Stops by itself after the time limit.
 * @param {{ maxSeconds?: number, onTick?: (seconds: number) => void }} [opts]
 * @returns {Promise<{ stop: () => void, done: Promise<Blob> }>}
 *   `done` resolves with the recording once it has stopped.
 * @throws DOMException when the microphone is blocked, missing or busy
 */
export async function startRecording({ maxSeconds = MAX_RECORD_SECONDS, onTick } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickAudioMime((type) => MediaRecorder.isTypeSupported(type));
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

  const startedAt = Date.now();
  const stop = () => { if (recorder.state !== 'inactive') recorder.stop(); };
  const timer = setInterval(() => {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    onTick?.(Math.min(seconds, maxSeconds));
    if (seconds >= maxSeconds) stop();
  }, 250);

  const done = new Promise((resolve, reject) => {
    recorder.onstop = () => {
      clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
      resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }));
    };
    recorder.onerror = (e) => {
      clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
      reject(e.error ?? new Error('Recording failed'));
    };
  });
  recorder.start();
  return { stop, done };
}
