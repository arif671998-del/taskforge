/**
 * "Press here" marker on a step photo (pure, no DOM).
 *
 * A marker is { x, y } in percent (0-100) of the photo's width and height, so it
 * lands on the same spot at any display size. null means no marker.
 */

/** How far one nudge button press moves the marker, in percent. */
export const MARKER_STEP = 2;

const round1 = (n) => Math.round(n * 10) / 10;
const clampPercent = (n) => Math.min(100, Math.max(0, n));

/**
 * Convert a tap position to a marker.
 * @param {number} clientX
 * @param {number} clientY
 * @param {{ left: number, top: number, width: number, height: number }} rect the photo's on-screen box
 * @returns {{ x: number, y: number } | null} null if the box has no size
 */
export function pointToMarker(clientX, clientY, rect) {
  if (!(rect.width > 0) || !(rect.height > 0)) return null;
  return {
    x: round1(clampPercent(((clientX - rect.left) / rect.width) * 100)),
    y: round1(clampPercent(((clientY - rect.top) / rect.height) * 100)),
  };
}

/**
 * Move a marker by a number of steps, staying inside the photo.
 * @param {{ x: number, y: number }} marker
 * @param {number} dx steps to the right (negative = left)
 * @param {number} dy steps down (negative = up)
 */
export function nudgeMarker(marker, dx, dy, step = MARKER_STEP) {
  return { x: round1(clampPercent(marker.x + dx * step)), y: round1(clampPercent(marker.y + dy * step)) };
}

/**
 * Clean untrusted marker data (for example from an imported file).
 * @param {unknown} raw
 * @returns {{ x: number, y: number } | null}
 */
export function sanitizeMarker(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { x, y } = /** @type {any} */ (raw);
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < 0 || x > 100 || y < 0 || y > 100) return null;
  return { x: round1(x), y: round1(y) };
}

/**
 * Alt text for a step photo. A marked photo says so, so people using a screen reader know.
 * @param {{ alt?: string, defaultAlt: string, hasMarker: boolean, suffix: string }} opts
 */
export function photoAltText({ alt = '', defaultAlt, hasMarker, suffix }) {
  const base = alt.trim() || defaultAlt;
  return hasMarker ? `${base}. ${suffix}` : base;
}
