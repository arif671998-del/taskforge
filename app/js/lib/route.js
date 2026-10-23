/**
 * Hash routing helpers (pure, no DOM). Supported routes:
 *   #/  #/play/:id  #/build/:id  #/activity/:id  #/settings
 */

/**
 * @param {string} hash e.g. "#/play/abc"
 * @returns {{ name: 'home'|'play'|'build'|'activity'|'settings'|'notfound', id: string|null }}
 */
export function parseHash(hash) {
  const path = (hash || '').replace(/^#/, '').split('?')[0];
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home', id: null };
  const [first, id] = parts;
  if (first === 'settings' && parts.length === 1) return { name: 'settings', id: null };
  if (['play', 'build', 'activity'].includes(first) && id && parts.length === 2) {
    return { name: first, id: decodeURIComponent(id) };
  }
  return { name: 'notfound', id: null };
}

/**
 * @param {'home'|'play'|'build'|'activity'|'settings'} name
 * @param {string} [id]
 * @returns {string}
 */
export function buildHash(name, id) {
  if (name === 'home') return '#/';
  if (name === 'settings') return '#/settings';
  return `#/${name}/${encodeURIComponent(id)}`;
}
