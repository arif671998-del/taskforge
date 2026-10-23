import { h } from './dom.js';
import { t, getSettings, announce } from '../state.js';
import { listGuides, saveGuide } from '../platform/db.js';
import { buildHash } from '../lib/route.js';
import { createSampleGuide } from '../lib/sample.js';
import { stepsLabel } from './home.js';

/**
 * Helper hub: list of guides to edit, new guide, restore sample.
 * @returns {Promise<{ title: string, node: HTMLElement }>}
 */
export async function renderHelper() {
  const title = t('helperTitle');
  const node = h('div', { class: 'view' });
  let guides = [];
  let failed = false;
  try { guides = await listGuides(); } catch { failed = true; }

  const restore = async () => {
    await saveGuide(createSampleGuide(getSettings().uiLang));
    announce(t('sampleRestored'));
    const fresh = await renderHelper();
    node.replaceWith(fresh.node);
    document.getElementById('view-heading')?.focus();
  };

  node.append(
    h('h1', { id: 'view-heading', tabindex: '-1', text: title }),
    h('p', { text: t('helperIntro') }),
    h('a', { class: 'btn btn-primary btn-big', href: buildHash('build', 'new'), text: t('newGuide') }));

  if (failed) {
    node.append(h('p', { class: 'card', role: 'alert', text: t('storageError') }));
  } else if (guides.length === 0) {
    node.append(h('p', { class: 'card', text: t('helperNoGuides') }));
  } else {
    node.append(h('ul', { class: 'plain-list' }, ...guides.map((g) =>
      h('li', { class: 'card' },
        h('h2', { lang: g.language, text: g.title }),
        h('p', { class: 'hint' }, stepsLabel(g.steps.length), g.isSample ? ` · ${t('sampleBadge')}` : ''),
        h('a', {
          class: 'btn btn-secondary',
          href: buildHash('build', g.id),
          'aria-label': t('editGuideNamed', { title: g.title }),
          text: t('editGuide'),
        })))));
  }

  const actions = h('div', { class: 'stack footer-actions' });
  if (!failed && !guides.some((g) => g.isSample)) {
    actions.append(h('button', { type: 'button', class: 'btn btn-secondary', onclick: restore, text: t('restoreSample') }));
  }
  actions.append(h('a', { class: 'btn btn-secondary', href: '#/', text: t('backToHome') }));
  node.append(actions);
  return { title, node };
}
