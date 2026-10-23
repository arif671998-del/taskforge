/**
 * Player: one step per screen with big text, read-aloud, and an always-visible action bar.
 * A run is saved after every change so it resumes after the app closes.
 */
import { h } from './dom.js';
import { t, getSettings, announce } from '../state.js';
import { translate } from '../i18n.js';
import { getGuide, getProgress, getRun, saveRun, saveProgress, clearProgress } from '../platform/db.js';
import { loadVoices, speak, stopSpeaking, speechSupported } from '../platform/speech.js';
import { hashQuery, buildHash } from '../lib/route.js';
import { startRun, fitRun, addStepTime, addStuck, finishRun, totalTimeMs } from '../lib/run.js';
import { planReading } from '../lib/voice.js';
import { SPEECH_RATES } from '../lib/settings.js';
import { renderNotFound } from './notfound.js';
import { openStuckSheet } from './stuck.js';
import { renderDone } from './done.js';

const INTERACTIVE = new Set(['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'SUMMARY']);

/**
 * @param {{ id: string }} route
 * @returns {Promise<{ title: string, node: HTMLElement, cleanup: () => void }>}
 */
export async function renderPlayer(route) {
  const query = hashQuery(location.hash);
  const preview = query.has('preview');
  const guide = await getGuide(route.id).catch(() => null);
  if (!guide || guide.steps.length === 0) {
    const nf = renderNotFound();
    nf.node.querySelector('p').textContent = t('errNotFoundGuide');
    return nf;
  }
  const steps = guide.steps;
  const total = steps.length;
  const lang = guide.language;
  const helperName = guide.helperName.trim();

  // ---- Run state -------------------------------------------------------
  let index = 0;
  let run = startRun(guide.id, total);
  if (!preview && !query.has('restart')) {
    try {
      const progress = await getProgress(guide.id);
      const existing = progress && await getRun(progress.runId);
      if (existing && !existing.completed) {
        run = fitRun(existing, total);
        index = Math.min(Math.max(progress.stepIndex, 0), total - 1);
      }
    } catch { /* start fresh */ }
  }
  let finished = false;
  let enteredAt = Date.now(); // null while the app is in the background

  /** Save run and position. Storage problems must never stop the player. */
  const persist = () => {
    if (preview) return;
    saveRun(run).catch(() => {});
    if (!finished) saveProgress({ guideId: guide.id, runId: run.id, stepIndex: index }).catch(() => {});
  };
  /** Add the time since the step was last counted. */
  const flush = () => {
    if (enteredAt == null) return;
    const now = Date.now();
    run = addStepTime(run, index, now - enteredAt);
    enteredAt = now;
  };
  persist();

  // ---- Voices and audio ------------------------------------------------
  let voices = [];
  const voicesReady = loadVoices().then((v) => { voices = v; });
  let readingToken = 0;
  let audioEl = null;
  let audioUrl = null;
  let photoUrl = null;
  let setReadState = () => {};
  let setNoteState = () => {};

  function stopMedia() {
    readingToken++;
    stopSpeaking();
    if (audioEl) { audioEl.pause(); audioEl = null; }
    if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = null; }
    setReadState(false);
    setNoteState(false);
  }

  // ---- DOM -------------------------------------------------------------
  const root = h('div', { class: 'view player' });
  const stage = h('div', { class: 'player-stage' });
  const exit = h('a', {
    class: 'btn btn-secondary', href: preview ? buildHash('build', guide.id) : '#/',
    text: preview ? t('backToEditing') : t('exit'),
  });
  if (preview) root.append(h('p', { class: 'notice', role: 'note', text: t('previewBanner') }));
  root.append(
    h('div', { class: 'player-top' }, exit, h('h1', { class: 'player-title', lang, text: guide.title })),
    stage);

  function showStep() {
    stopMedia();
    if (photoUrl) { URL.revokeObjectURL(photoUrl); photoUrl = null; }
    const step = steps[index];
    const n = index + 1;
    const label = t('stepOfTotal', { n, total });
    const isLast = index === total - 1;

    const heading = h('h2', { id: 'view-heading', class: 'step-heading', tabindex: '-1', text: label });
    const progress = h('progress', { class: 'step-progress', max: total, value: n, 'aria-label': label });

    let photo = null;
    if (step.photo) {
      photoUrl = URL.createObjectURL(step.photo);
      photo = h('button', {
        type: 'button', class: 'photo-button', onclick: () => openPhoto(photoUrl, step.photoAlt || t('photoAltDefault', { n })),
      },
      h('img', { class: 'step-photo', src: photoUrl, alt: step.photoAlt || t('photoAltDefault', { n }) }),
      h('span', { class: 'photo-hint', text: t('enlargePhoto') }));
    }

    const caution = step.caution
      ? h('p', { class: 'caution', role: 'note' }, h('strong', { text: `${t('cautionLabel')}.` }))
      : null;
    const text = h('p', { class: 'step-text', lang, text: step.text });
    const notice = h('p', { class: 'notice', role: 'status', hidden: true });

    const readBtn = h('button', { type: 'button', class: 'btn btn-secondary', text: t('readAloud') });
    let noteBtn = null;
    setReadState = (on) => {
      if (on) readBtn.dataset.on = '1'; else delete readBtn.dataset.on;
      readBtn.textContent = on ? t('stopReading') : t('readAloud');
    };
    readBtn.addEventListener('click', () => (readBtn.dataset.on ? stopMedia() : readAloud()));

    if (step.audio) {
      const playLabel = helperName ? t('playVoice', { name: helperName }) : t('playVoiceNoName');
      noteBtn = h('button', { type: 'button', class: 'btn btn-secondary', text: playLabel });
      setNoteState = (on) => { if (on) noteBtn.dataset.on = '1'; else delete noteBtn.dataset.on; noteBtn.textContent = on ? t('stopVoice') : playLabel; };
      noteBtn.addEventListener('click', () => (noteBtn.dataset.on ? stopMedia() : playNote()));
    } else {
      setNoteState = () => {};
    }

    const show = (msg) => { notice.textContent = msg; notice.hidden = false; };

    function readAloud() {
      stopMedia();
      const plan = planReading(voices, lang, false);
      if (plan.missingHindi) show(t('noHindiVoice'));
      const spoken = `${step.caution ? `${translate(lang, 'cautionLabel')}. ` : ''}${step.text}`;
      const token = readingToken;
      const ok = speak(spoken, {
        lang: plan.lang, voice: plan.voice, rate: SPEECH_RATES[getSettings().speechSpeed],
        onend: () => { if (token === readingToken) setReadState(false); },
      });
      if (ok) setReadState(true); else show(t('noSpeech'));
    }

    function playNote() {
      stopMedia();
      audioUrl = URL.createObjectURL(step.audio);
      audioEl = new Audio(audioUrl);
      const mine = audioEl;
      mine.onended = () => { if (audioEl === mine) setNoteState(false); };
      mine.onerror = () => { show(t('voiceNoteFailed')); setNoteState(false); };
      mine.play().then(() => setNoteState(true)).catch(() => { show(t('voiceNoteFailed')); setNoteState(false); });
    }

    const back = h('button', { type: 'button', class: 'btn btn-secondary', disabled: index === 0, onclick: goBack, text: t('back') });
    const next = h('button', { type: 'button', class: 'btn btn-primary btn-next', onclick: goNext, text: isLast ? t('doneFinish') : t('doneNext') });
    const stuck = h('button', { type: 'button', class: 'btn btn-stuck', onclick: onStuck, text: t('imStuck') });

    stage.replaceChildren(...[
      heading, progress, photo, caution, text, notice,
      h('div', { class: 'btn-row read-row' }, readBtn, noteBtn),
      h('div', { class: 'action-bar', role: 'group', 'aria-label': t('playerActions') },
        next, h('div', { class: 'action-bar-row' }, back, stuck)),
    ].filter(Boolean));

    // Say plainly up front if Hindi cannot be read, without waiting for a tap.
    voicesReady.then(() => {
      if (steps[index] !== step) return;
      const plan = planReading(voices, lang, Boolean(step.audio));
      if (plan.missingHindi) show(t('noHindiVoice'));
      if (!speechSupported() && !step.audio) show(t('noSpeech'));
      if (!getSettings().autoRead || finished) return;
      if (plan.source === 'note') playNote(); else if (speechSupported()) readAloud();
    });
  }

  // ---- Actions ---------------------------------------------------------
  function goTo(i) {
    flush();
    index = i;
    persist();
    showStep();
    document.getElementById('view-heading')?.focus();
    announce(t('stepOfTotal', { n: index + 1, total }));
    window.scrollTo(0, 0);
  }
  function goNext() { if (index < total - 1) goTo(index + 1); else finish(); }
  function goBack() { if (index > 0) goTo(index - 1); }

  async function onStuck() {
    flush();
    run = addStuck(run, index);
    persist();
    await openStuckSheet({ guide, index });
  }

  function finish() {
    flush();
    stopMedia();
    finished = true;
    run = finishRun(run);
    if (!preview) {
      saveRun(run).catch(() => {});
      clearProgress(guide.id).catch(() => {});
    }
    root.replaceChildren(...renderDone({ guide, timeMs: totalTimeMs(run), preview }));
    document.getElementById('view-heading')?.focus();
    window.scrollTo(0, 0);
    const done = translate(getSettings().uiLang, 'doneTitle');
    if (getSettings().autoRead) speak(done, { lang: getSettings().uiLang === 'hi' ? 'hi-IN' : 'en-IN', rate: SPEECH_RATES[getSettings().speechSpeed] });
  }

  function openPhoto(url, alt) {
    const dialog = h('dialog', { class: 'dialog photo-dialog', 'aria-label': alt });
    const close = () => { dialog.close(); dialog.remove(); };
    const closeBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: close, text: t('closePhoto') });
    dialog.append(h('img', { class: 'photo-full', src: url, alt }), closeBtn);
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    document.body.append(dialog);
    dialog.showModal();
    closeBtn.focus();
  }

  // ---- Keyboard and lifecycle -----------------------------------------
  function onKey(e) {
    if (finished || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (document.querySelector('dialog[open]')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
    else if (e.key === 'Enter' && !INTERACTIVE.has(e.target.tagName)) { e.preventDefault(); goNext(); }
  }
  function onVisibility() {
    if (document.hidden) { flush(); enteredAt = null; stopMedia(); persist(); }
    else if (enteredAt == null) enteredAt = Date.now();
  }
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onVisibility);

  const cleanup = () => {
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onVisibility);
    if (!finished) { flush(); persist(); }
    stopMedia();
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  };

  showStep();
  return { title: guide.title, node: root, cleanup };
}
