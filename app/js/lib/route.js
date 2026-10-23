/**
 * Hash routing helpers (pure, no DOM). Supported routes:
 *   #/  #/helper (list of guides to edit)  #/play/:id  #/build/:id  #/activity/:id  #/settings
 */

/**
 * @param {string} hash e.g. "#/play/abc"
 * @returns {{ name: 'home'|'play'|'build'|'activity'|'settings'|'helper'|'notfound', id: string|null }}
 */
export function parseHash(hash) {
  const path = (hash || '').replace(/^#/, '').split('?')[0];
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home', id: null };
  const [first, id] = parts;
  if ((first === 'settings' || first === 'helper') && parts.length === 1) return { name: first, id: null };
  if (['play', 'build', 'activity'].includes(first) && id && parts.length === 2) {
    return { name: first, id: decodeURIComponent(id) };
  }
  return { name: 'notfound', id: null };
}

/**
 * @param {'home'|'helper'|'play'|'build'|'activity'|'settings'} name
 * @param {string} [id]
 * @returns {string}
 */
export function buildHash(name, id) {
  if (name === 'home') return '#/';
  if (name === 'settings' || name === 'helper') return `#/${name}`;
  return `#/${name}/${encodeURIComponent(id)}`;
}

/**
 * Query flags after "?" in the hash, e.g. "#/play/abc?restart=1&preview=1".
 * @param {string} hash
 * @returns {URLSearchParams}
 */
export function hashQuery(hash) {
  const i = (hash || '').indexOf('?');
  return new URLSearchParams(i === -1 ? '' : hash.slice(i + 1));
}
