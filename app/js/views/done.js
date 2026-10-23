import { h } from './dom.js';
import { t, announce } from '../state.js';
import { waLink } from '../lib/whatsapp.js';
import { splitDuration } from '../lib/run.js';
import { buildHash } from '../lib/route.js';

/** "2 min 5 sec" in the UI language. */
export function formatDuration(ms) {
  const { m, s } = splitDuration(ms);
  if (m && s) return t('timeMinSec', { m, s });
  return m ? t('timeMin', { m }) : t('timeSec', { s });
}

/**
 * Done screen. Returns the nodes to place in the player view.
 * @param {{ guide: object, timeMs: number, preview: boolean }} opts
 * @returns {HTMLElement[]}
 */
export function renderDone({ guide, timeMs, preview }) {
  const name = guide.helperName.trim();
  const wa = waLink(guide.helperPhone, t(name ? 'waDone' : 'waDoneNoName', { name, title: guide.title }));
  queueMicrotask(() => announce(t('doneTitle')));
  return [
    h('h1', { id: 'view-heading', tabindex: '-1', class: 'done-title', text: t('doneTitle') }),
    h('p', { class: 'done-time', text: t('doneTime', { time: formatDuration(timeMs) }) }),
    h('div', { class: 'stack' },
      wa && h('a', {
        class: 'btn btn-primary btn-big', href: wa, target: '_blank', rel: 'noopener',
        text: name ? t('doneTell', { name }) : t('doneTellNoName'),
      }),
      preview
        ? h('a', { class: 'btn btn-secondary btn-big', href: buildHash('build', guide.id), text: t('backToEditing') })
        : h('a', { class: 'btn btn-secondary btn-big', href: '#/', text: t('backToHome') })),
  ];
}
