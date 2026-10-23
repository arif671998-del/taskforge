import { h } from './dom.js';
import { t } from '../state.js';

/** @returns {{ title: string, node: HTMLElement }} */
export function renderNotFound() {
  const title = t('pageNotFoundTitle');
  return {
    title,
    node: h('div', { class: 'view' },
      h('h1', { id: 'view-heading', tabindex: '-1', text: title }),
      h('p', { text: t('pageNotFoundBody') }),
      h('a', { class: 'btn btn-primary', href: '#/', text: t('backToHome') })),
  };
}
