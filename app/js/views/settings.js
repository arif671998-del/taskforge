import { h } from './dom.js';
import { t, getSettings, updateSettings, announce } from '../state.js';

/**
 * A group of native radio buttons.
 * @param {string} name settings key
 * @param {string} legend
 * @param {Array<[string, string, string?]>} options [value, label, lang?]
 */
function radioGroup(name, legend, options) {
  const current = getSettings()[name];
  return h('fieldset', { class: 'field' },
    h('legend', { text: legend }),
    ...options.map(([value, label, lang]) => {
      const id = `${name}-${value}`;
      return h('div', { class: 'choice' },
        h('input', {
          type: 'radio', id, name, value,
          checked: current === value,
          onchange: () => { updateSettings({ [name]: value }); announce(t('settingsSaved')); },
        }),
        h('label', { for: id, lang, text: label }));
    }));
}

/** @returns {{ title: string, node: HTMLElement }} */
export function renderSettings() {
  const s = getSettings();
  const title = t('settingsTitle');
  const node = h('div', { class: 'view' },
    h('h1', { id: 'view-heading', tabindex: '-1', text: title }),
    radioGroup('uiLang', t('settingsLanguage'), [
      ['en', t('settingsLanguageEnglish'), 'en'],
      ['hi', t('settingsLanguageHindi'), 'hi'],
    ]),
    radioGroup('textSize', t('settingsTextSize'), [
      ['normal', t('sizeNormal')],
      ['large', t('sizeLarge')],
      ['xlarge', t('sizeXLarge')],
    ]),
    h('p', { class: 'card', text: t('settingsSample') }),
    h('div', { class: 'field' },
      h('div', { class: 'choice' },
        h('input', {
          type: 'checkbox', id: 'autoRead', checked: s.autoRead,
          'aria-describedby': 'autoRead-hint',
          onchange: (e) => { updateSettings({ autoRead: e.target.checked }); announce(t('settingsSaved')); },
        }),
        h('label', { for: 'autoRead', text: t('settingsAutoRead') })),
      h('p', { id: 'autoRead-hint', class: 'hint', text: t('settingsAutoReadHint') })),
    radioGroup('speechSpeed', t('settingsSpeed'), [
      ['slow', t('speedSlow')],
      ['normal', t('speedNormal')],
    ]),
    h('p', { class: 'hint', text: t('settingsPrivacy') }),
    h('a', { class: 'btn btn-secondary', href: '#/', text: t('backToHome') }));
  return { title, node };
}
