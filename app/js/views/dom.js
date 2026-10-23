/**
 * Tiny DOM helper. Text is always set with textContent / createTextNode,
 * never innerHTML, because guide content can come from an imported file.
 */

/**
 * @param {string} tag
 * @param {Record<string, any>} [attrs] class, text, on* handlers, or plain attributes
 * @param {...(Node|string|null|undefined|false)} children
 * @returns {HTMLElement}
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  for (const child of children) {
    if (child == null || child === false) continue;
    el.append(child);
  }
  return el;
}
