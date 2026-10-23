/**
 * Run bookkeeping (pure). A Run is one attempt at a guide:
 * { id, guideId, startedAt, endedAt, completed, stepTimesMs, stuck: [{ stepIndex, at }] }
 *
 * Step times count only the time the step was on screen and the app was in the foreground.
 */
import { newId } from './guide.js';

/** @returns {object} */
export function startRun(guideId, stepCount, now = Date.now()) {
  return {
    id: newId(), guideId, startedAt: now, endedAt: null, completed: false,
    stepTimesMs: new Array(stepCount).fill(0), stuck: [],
  };
}

/** Make an old run fit a guide that has since gained or lost steps. */
export function fitRun(run, stepCount) {
  const times = run.stepTimesMs.slice(0, stepCount);
  while (times.length < stepCount) times.push(0);
  return { ...run, stepTimesMs: times };
}

/** @returns {object} a new run with `ms` added to step `index` */
export function addStepTime(run, index, ms) {
  if (!(ms > 0) || index < 0 || index >= run.stepTimesMs.length) return run;
  const times = run.stepTimesMs.slice();
  times[index] += Math.round(ms);
  return { ...run, stepTimesMs: times };
}

/** @returns {object} a new run with a stuck event recorded */
export function addStuck(run, stepIndex, now = Date.now()) {
  return { ...run, stuck: [...run.stuck, { stepIndex, at: now }] };
}

/** @returns {object} a completed run */
export function finishRun(run, now = Date.now()) {
  return { ...run, endedAt: now, completed: true };
}

/** Total active time in ms. */
export const totalTimeMs = (run) => run.stepTimesMs.reduce((a, b) => a + b, 0);

/**
 * Split a duration for display. Rounds to whole seconds, minimum 1 second when > 0.
 * @param {number} ms
 * @returns {{ m: number, s: number }}
 */
export function splitDuration(ms) {
  const total = ms > 0 ? Math.max(1, Math.round(ms / 1000)) : 0;
  return { m: Math.floor(total / 60), s: total % 60 };
}
