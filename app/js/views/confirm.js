import { h } from './dom.js';
import { t } from '../state.js';

/**
 * Ask the user to confirm using a native modal <dialog> (focus is trapped, Esc cancels,
 * and focus returns to the button that opened it). Cancel is focused first so a stray
 * Enter press never confirms a destructive action.
 * @param {{ title: string, body: string, confirmLabel: string, cancelLabel?: string, danger?: boolean }} opts
 * @returns {Promise<boolean>}
 */
export function confirmDialog({ title, body, confirmLabel, cancelLabel = t('cancel'), danger = false }) {
  return new Promise((resolve) => {
    const dialog = h('dialog', { class: 'dialog', 'aria-labelledby': 'dialog-title' });
    const finish = (answer) => {
      dialog.close();
      dialog.remove();
      resolve(answer);
    };
    const cancel = h('button', { type: 'button', class: 'btn btn-secondary', autofocus: true, onclick: () => finish(false), text: cancelLabel });
    const ok = h('button', { type: 'button', class: danger ? 'btn btn-stuck' : 'btn btn-primary', onclick: () => finish(true), text: confirmLabel });
    dialog.append(
      h('h2', { id: 'dialog-title', text: title }),
      h('p', { text: body }),
      h('div', { class: 'btn-row' }, cancel, ok));
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); finish(false); });
    document.body.append(dialog);
    dialog.showModal();
    cancel.focus();
  });
}
