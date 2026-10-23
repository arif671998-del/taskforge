/** Image size maths (pure). */

export const MAX_SIDE = 1280;
export const JPEG_QUALITY = 0.8;

/**
 * Size that fits inside max x max, keeping the shape. Never enlarges.
 * @param {number} width
 * @param {number} height
 * @param {number} [max]
 * @returns {{ width: number, height: number }}
 */
export function fitWithin(width, height, max = MAX_SIDE) {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
