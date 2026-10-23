import { h } from './dom.js';

/**
 * A photo with an optional "press here" ring on top. The ring is placed with percentages,
 * so it stays on the same spot at any size.
 * @param {{ src: string, alt: string, marker: {x:number,y:number}|null, className?: string }} opts
 * @returns {HTMLElement} wrapper that is exactly as big as the photo
 */
export function photoWithMarker({ src, alt, marker, className = '' }) {
  const frame = h('div', { class: `photo-frame ${className}`.trim() }, h('img', { class: 'photo-img', src, alt }));
  if (marker) frame.append(markerRing(marker));
  return frame;
}

/** The ring itself: decorative, because the photo's alt text already says it is marked. */
export function markerRing(marker) {
  const ring = h('span', { class: 'marker-ring', 'aria-hidden': 'true' });
  // Set through the style API (not a style attribute) so the strict CSP stays intact.
  ring.style.left = `${marker.x}%`;
  ring.style.top = `${marker.y}%`;
  return ring;
}
