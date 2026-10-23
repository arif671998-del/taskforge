import { h } from './dom.js';
import { t } from '../state.js';

/**
 * Home: person-first. Guides come in Milestone 2; for now only the empty state.
 * @returns {{ title: string, node: HTMLElement }}
 */
export function renderHome() {
  const title = t('homeTitle');
  const node = h('div', { class: 'view' },
    h('h1', { id: 'view-heading', tabindex: '-1', text: title }),
    h('section', { class: 'card', 'aria-labelledby': 'empty-title' },
      h('h2', { id: 'empty-title', text: t('homeEmptyTitle') }),
      h('p', { text: t('homeEmptyBody') })),
    h('div', { class: 'stack footer-actions' },
      h('a', { class: 'btn btn-secondary', href: '#/settings', text: t('settings') })));
  return { title, node };
}
