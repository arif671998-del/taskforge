import { h } from './dom.js';
import { t } from '../state.js';
import { listGuides, listProgress } from '../platform/db.js';
import { buildHash } from '../lib/route.js';
import { confirmDialog } from './confirm.js';

/** "1 step" / "5 steps" */
export const stepsLabel = (n) => (n === 1 ? t('stepCountOne') : t('stepCountOther', { n }));

function guideCard(guide, progress) {
  const resume = progress && progress.stepIndex > 0 && progress.stepIndex < guide.steps.length;
  const headingId = `guide-${guide.id}`;
  return h('section', { class: 'card guide-card', 'aria-labelledby': headingId },
    h('h2', { id: headingId, lang: guide.language, text: guide.title }),
    h('p', { class: 'hint' },
      stepsLabel(guide.steps.length),
      guide.isSample ? ` · ${t('sampleBadge')}` : ''),
    h('a', {
      class: 'btn btn-primary btn-big',
      href: buildHash('play', guide.id),
      text: resume ? t('continueFromStep', { n: progress.stepIndex + 1 }) : t('startGuide'),
    }));
}

/**
 * Home: person-first. One big card per guide.
 * @returns {Promise<{ title: string, node: HTMLElement }>}
 */
export async function renderHome() {
  const title = t('homeTitle');
  let body;
  try {
    const [guides, progressList] = await Promise.all([listGuides(), listProgress()]);
    const progressById = new Map(progressList.map((p) => [p.guideId, p]));
    body = guides.length === 0
      ? h('section', { class: 'card', 'aria-labelledby': 'empty-title' },
        h('h2', { id: 'empty-title', text: t('homeEmptyTitle') }),
        h('p', { text: t('homeEmptyBody') }))
      : h('div', { class: 'stack' }, ...guides.map((g) => guideCard(g, progressById.get(g.id))));
  } catch {
    body = h('p', { class: 'card', role: 'alert', text: t('storageError') });
  }

  const helperButton = h('button', {
    type: 'button',
    class: 'btn btn-secondary',
    onclick: async () => {
      const ok = await confirmDialog({
        title: t('helperConfirmTitle'),
        body: t('helperConfirmBody'),
        confirmLabel: t('continue'),
      });
      if (ok) location.hash = '#/helper';
    },
    text: t('helperSetup'),
  });

  const node = h('div', { class: 'view' },
    h('h1', { id: 'view-heading', tabindex: '-1', text: title }),
    body,
    h('div', { class: 'stack footer-actions' },
      helperButton,
      h('a', { class: 'btn btn-secondary', href: '#/settings', text: t('settings') })));
  return { title, node };
}
