import { h } from './dom.js';
import { t } from '../state.js';
import { waLink, telLink, truncate } from '../lib/whatsapp.js';

/**
 * The "I'm stuck" sheet: a modal with a WhatsApp message that names the exact step,
 * and a call button. Without a helper number it says so and offers nothing that cannot work.
 * @param {{ guide: object, index: number }} opts
 * @returns {Promise<void>} resolves when the sheet is closed
 */
export function openStuckSheet({ guide, index }) {
  return new Promise((resolve) => {
    const total = guide.steps.length;
    const name = guide.helperName.trim();
    const text = truncate(guide.steps[index].text);
    const message = t(name ? 'waStuck' : 'waStuckNoName', { name, n: index + 1, total, title: guide.title, text });
    const wa = waLink(guide.helperPhone, message);
    const tel = telLink(guide.helperPhone);

    const dialog = h('dialog', { class: 'dialog', 'aria-labelledby': 'stuck-title' });
    const close = () => { dialog.close(); dialog.remove(); resolve(); };
    const closeBtn = h('button', { type: 'button', class: 'btn btn-secondary', onclick: close, text: t('stuckClose') });

    dialog.append(
      h('h2', { id: 'stuck-title', text: t('stuckTitle') }),
      h('p', { text: t('stuckPosition', { n: index + 1, total }) }));

    const actions = h('div', { class: 'stack' });
    if (wa) {
      actions.append(
        h('a', {
          class: 'btn btn-primary btn-big', href: wa, target: '_blank', rel: 'noopener',
          text: name ? t('stuckSend', { name }) : t('stuckSendNoName'),
        }),
        h('a', {
          class: 'btn btn-secondary btn-big', href: tel,
          text: name ? t('stuckCall', { name }) : t('stuckCallNoName'),
        }));
    } else {
      dialog.append(h('p', { class: 'notice', text: t('stuckNoNumber') }));
    }
    actions.append(closeBtn);
    dialog.append(actions);
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    document.body.append(dialog);
    dialog.showModal();
    (dialog.querySelector('a') ?? closeBtn).focus();
  });
}
