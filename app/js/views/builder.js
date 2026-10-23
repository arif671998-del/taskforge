import { h } from './dom.js';
import { t, getSettings, announce } from '../state.js';
import { getGuide, saveGuide, deleteGuide } from '../platform/db.js';
import { buildHash } from '../lib/route.js';
import { createGuide, createStep, moveStep, removeStep, validateGuide, MAX_TEXT, MAX_TITLE, MAX_NAME, MAX_STEPS } from '../lib/guide.js';
import { normalizePhone, formatPhone } from '../lib/phone.js';
import { confirmDialog } from './confirm.js';
import { renderNotFound } from './notfound.js';

/** Error code -> message key; codes with a step number use {n}. */
const errorKey = (code) => `err${code[0].toUpperCase()}${code.slice(1)}`;

/** Which field each error belongs to, for aria-invalid and inline messages. */
const fieldOf = (e) => ({
  titleRequired: 'f-title', titleTooLong: 'f-title', nameTooLong: 'f-name', phoneInvalid: 'f-phone',
}[e.code] ?? (e.n ? `text-${e.n - 1}` : null));

/**
 * Builder (helper mode): guide details and a list of text steps.
 * @param {{ id: string }} route id is a guide id or "new"
 * @returns {Promise<{ title: string, node: HTMLElement }>}
 */
export async function renderBuilder(route) {
  let isNew = route.id === 'new';
  let draft;
  if (isNew) {
    draft = createGuide({ language: getSettings().uiLang });
  } else {
    const found = await getGuide(route.id).catch(() => null);
    if (!found) {
      const nf = renderNotFound();
      nf.node.querySelector('p').textContent = t('errNotFoundGuide');
      return nf;
    }
    draft = structuredClone(found);
  }
  let phoneText = draft.helperPhone ? formatPhone(draft.helperPhone) : '';
  let errors = [];

  const title = isNew ? t('builderNewTitle') : t('builderEditTitle');
  const root = h('div', { class: 'view' });

  /** Rebuild the form from `draft`, then focus the element with id `focusId`. */
  function rerender(focusId) {
    root.replaceChildren(...build().filter(Boolean));
    if (focusId) document.getElementById(focusId)?.focus();
  }

  /** A labelled text field with hint and inline error. */
  function field({ id, label, hint, control, error }) {
    const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');
    if (describedBy) control.setAttribute('aria-describedby', describedBy);
    if (error) control.setAttribute('aria-invalid', 'true');
    return h('div', { class: 'field' },
      h('label', { for: id, text: label }),
      hint && h('p', { id: `${id}-hint`, class: 'hint', text: hint }),
      error && h('p', { id: `${id}-error`, class: 'error-text', text: error }),
      control);
  }
  const errorFor = (id) => {
    const e = errors.find((x) => fieldOf(x) === id);
    return e ? t(errorKey(e.code), { n: e.n }) : null;
  };

  function stepItem(step, i) {
    const n = i + 1;
    const last = draft.steps.length - 1;
    const idText = `text-${i}`;
    const textarea = h('textarea', {
      id: idText, rows: 3, maxlength: MAX_TEXT, lang: draft.language,
      oninput: (e) => { step.text = e.target.value; },
    });
    textarea.value = step.text;
    const hidden = () => h('span', { class: 'visually-hidden', text: ` ${t('forStepN', { n })}` });
    const move = (dir, label) => {
      const btn = h('button', {
        type: 'button', class: 'btn btn-secondary', id: `step-${step.id}-${dir < 0 ? 'up' : 'down'}`,
        disabled: dir < 0 ? i === 0 : i === last,
        onclick: () => {
          draft.steps = moveStep(draft.steps, i, dir);
          errors = [];
          const to = i + dir;
          // If the step reached the end of the list its button is now disabled; focus the other one.
          const atEdge = dir < 0 ? to === 0 : to === last;
          rerender(`step-${step.id}-${atEdge ? (dir < 0 ? 'down' : 'up') : (dir < 0 ? 'up' : 'down')}`);
          announce(t('stepMoved', { n: to + 1 }));
        },
      }, label, hidden());
      return btn;
    };
    const remove = h('button', {
      type: 'button', class: 'btn btn-secondary', disabled: draft.steps.length === 1,
      onclick: async () => {
        const ok = await confirmDialog({
          title: t('deleteStepTitle'), body: t('deleteStepBody', { n }), confirmLabel: t('delete'), danger: true,
        });
        if (!ok) return;
        draft.steps = removeStep(draft.steps, i);
        errors = [];
        rerender(`text-${Math.min(i, draft.steps.length - 1)}`);
        announce(t('stepRemoved'));
      },
    }, t('deleteStep'), hidden());

    return h('li', { class: 'card step-card' },
      h('h3', { text: t('stepHeading', { n }) }),
      field({ id: idText, label: t('fieldStepText'), hint: t('fieldStepTextHint'), control: textarea, error: errorFor(idText) }),
      h('div', { class: 'btn-row' }, move(-1, t('moveUp')), move(1, t('moveDown')), remove));
  }

  async function save() {
    errors = validateGuide(draft, phoneText);
    if (errors.length) {
      rerender('error-summary');
      return false;
    }
    draft.title = draft.title.trim();
    draft.helperName = draft.helperName.trim();
    draft.helperPhone = normalizePhone(phoneText).digits;
    draft.steps.forEach((s) => { s.text = s.text.trim(); s.photoAlt = s.photoAlt.trim(); });
    await saveGuide(draft);
    if (isNew) {
      isNew = false;
      history.replaceState(null, '', buildHash('build', draft.id)); // no re-render
    }
    rerender();
    announce(t('guideSaved'));
    return true;
  }

  function build() {
    const summary = errors.length
      ? h('div', { id: 'error-summary', class: 'card error-card', tabindex: '-1', role: 'alert' },
        h('h2', { text: t('errorsHeading') }),
        h('ul', {}, ...errors.map((e) => h('li', { text: t(errorKey(e.code), { n: e.n }) }))))
      : null;

    const titleInput = h('input', { type: 'text', id: 'f-title', maxlength: MAX_TITLE, lang: draft.language, oninput: (e) => { draft.title = e.target.value; } });
    titleInput.value = draft.title;
    const nameInput = h('input', { type: 'text', id: 'f-name', maxlength: MAX_NAME, autocomplete: 'off', oninput: (e) => { draft.helperName = e.target.value; } });
    nameInput.value = draft.helperName;
    const phoneInput = h('input', { type: 'tel', id: 'f-phone', inputmode: 'tel', autocomplete: 'off', placeholder: '+91 98765 43210', oninput: (e) => { phoneText = e.target.value; } });
    phoneInput.value = phoneText;

    const langGroup = h('fieldset', { class: 'field' },
      h('legend', { text: t('fieldGuideLanguage') }),
      ...[['en', t('guideLangEnglish')], ['hi', t('guideLangHindi')]].map(([value, label]) =>
        h('div', { class: 'choice' },
          h('input', {
            type: 'radio', id: `lang-${value}`, name: 'guide-lang', value, checked: draft.language === value,
            onchange: () => { draft.language = value; rerender(`lang-${value}`); },
          }),
          h('label', { for: `lang-${value}`, lang: value, text: label }))));

    return [
      h('h1', { id: 'view-heading', tabindex: '-1', text: title }),
      summary,
      field({ id: 'f-title', label: t('fieldGuideTitle'), hint: t('fieldGuideTitleHint'), control: titleInput, error: errorFor('f-title') }),
      field({ id: 'f-name', label: t('fieldHelperName'), hint: t('fieldHelperNameHint'), control: nameInput, error: errorFor('f-name') }),
      field({ id: 'f-phone', label: t('fieldHelperPhone'), hint: t('fieldHelperPhoneHint'), control: phoneInput, error: errorFor('f-phone') }),
      langGroup,
      h('section', { 'aria-labelledby': 'steps-heading' },
        h('h2', { id: 'steps-heading', text: t('stepsHeading') }),
        h('ol', { class: 'plain-list' }, ...draft.steps.map(stepItem)),
        h('button', {
          type: 'button', class: 'btn btn-secondary', disabled: draft.steps.length >= MAX_STEPS,
          onclick: () => {
            draft.steps.push(createStep());
            errors = [];
            rerender(`text-${draft.steps.length - 1}`);
            announce(t('stepAdded'));
          },
        }, t('addStep'))),
      h('div', { class: 'stack footer-actions' },
        h('button', { type: 'button', class: 'btn btn-primary btn-big', onclick: save, text: t('saveGuide') }),
        h('button', {
          type: 'button', class: 'btn btn-secondary',
          onclick: async () => { if (await save()) location.hash = `${buildHash('play', draft.id)}?preview=1`; },
          text: t('previewGuide'),
        }),
        h('a', { class: 'btn btn-secondary', href: '#/helper', text: t('backToGuides') }),
        !isNew && h('button', {
          type: 'button', class: 'btn btn-secondary',
          onclick: async () => {
            const ok = await confirmDialog({
              title: t('deleteGuideTitle'), body: t('deleteGuideBody', { title: draft.title }),
              confirmLabel: t('delete'), danger: true,
            });
            if (ok) { await deleteGuide(draft.id); location.hash = '#/helper'; }
          },
          text: t('deleteGuide'),
        })),
    ];
  }

  rerender();
  return { title, node: root };
}
