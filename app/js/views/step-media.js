/**
 * Builder controls for a step's photo (with the press-here marker) and voice note.
 * Each section redraws only itself, so typing and scroll position elsewhere are not disturbed.
 */
import { h } from './dom.js';
import { t, announce } from '../state.js';
import { downscaleImage } from '../platform/image.js';
import { recordingSupported, startRecording } from '../platform/recorder.js';
import { pointToMarker, nudgeMarker, photoAltText } from '../lib/marker.js';
import { MAX_ALT } from '../lib/guide.js';
import { micErrorKey } from '../lib/media.js';
import { confirmDialog } from './confirm.js';
import { photoWithMarker, markerRing } from './photo.js';

/**
 * @typedef {object} MediaContext
 * @property {() => void} markDirty call after any change
 * @property {(url: string) => void} trackUrl register an object URL so it is revoked on leave
 */

/** Which recording is in progress. It lives outside the DOM so a redraw cannot lose it. */
let activeRecording = null; // { stepId, stop, seconds, redraw }

/** Stop an unfinished recording when the builder is closed. */
export function stopActiveRecording() {
  activeRecording?.stop();
}

/**
 * Photo section: add or replace, description, press-here marker, remove.
 * @param {MediaContext} ctx
 * @param {object} step
 * @param {number} i step index
 * @param {string} lang guide language, for the alt-text field
 */
export function photoSection(ctx, step, i, lang) {
  const n = i + 1;
  const box = h('fieldset', { class: 'field media-field' });
  let url = null;
  let busy = false;
  let error = '';
  const id = (name) => `${name}-${step.id}`;

  const pickFile = (capture, focusName) => {
    const input = h('input', { type: 'file', accept: 'image/*', class: 'visually-hidden', tabindex: '-1', 'aria-hidden': 'true' });
    if (capture) input.setAttribute('capture', 'environment');
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      busy = true; error = ''; draw(focusName);
      announce(t('photoPreparing'));
      try {
        step.photo = await downscaleImage(file);
        step.marker = null; // an old marker would point at the wrong spot on a new photo
        ctx.markDirty();
        announce(t('photoAdded'));
      } catch {
        error = t('photoFailed');
      }
      busy = false;
      draw(focusName);
    });
    box.append(input);
    input.click();
    input.addEventListener('change', () => input.remove(), { once: true });
  };

  const setMarker = (marker, message) => {
    step.marker = marker;
    ctx.markDirty();
    draw('marker-tap');
    announce(message);
  };

  function draw(focusName) {
    if (url) { URL.revokeObjectURL(url); url = null; }
    const children = [h('legend', { text: t('fieldPhoto') })];

    const camera = h('button', { type: 'button', class: 'btn btn-secondary', id: id('photo-camera'), disabled: busy, onclick: () => pickFile(true, 'photo-camera'), text: t('takePhoto') });
    const gallery = h('button', { type: 'button', class: 'btn btn-secondary', id: id('photo-gallery'), disabled: busy, onclick: () => pickFile(false, 'photo-gallery'), text: t('choosePhoto') });
    children.push(h('div', { class: 'btn-row' }, camera, gallery));
    if (busy) children.push(h('p', { class: 'hint', role: 'status', text: t('photoPreparing') }));
    if (error) children.push(h('p', { class: 'error-text', role: 'alert', text: error }));

    if (step.photo) {
      url = URL.createObjectURL(step.photo);
      ctx.trackUrl(url);
      const alt = photoAltText({
        alt: step.photoAlt, defaultAlt: t('photoAltDefault', { n }), hasMarker: Boolean(step.marker), suffix: t('markerAltSuffix'),
      });
      const frame = photoWithMarker({ src: url, alt, marker: null, className: 'photo-edit' });
      const tap = h('button', { type: 'button', class: 'photo-tap', id: id('marker-tap'), 'aria-label': t('markerTap') });
      tap.addEventListener('click', (e) => {
        // A keyboard or screen-reader activation has no pointer position: use the middle.
        const rect = frame.querySelector('img').getBoundingClientRect();
        const marker = e.detail === 0 && e.clientX === 0 && e.clientY === 0
          ? { x: 50, y: 50 }
          : pointToMarker(e.clientX, e.clientY, rect);
        if (marker) setMarker(marker, step.marker ? t('markerMoved') : t('markerPlaced'));
      });
      tap.addEventListener('keydown', (e) => {
        const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (!move || !step.marker) return;
        e.preventDefault();
        step.marker = nudgeMarker(step.marker, move[0], move[1]);
        ctx.markDirty();
        frame.querySelector('.marker-ring')?.remove();
        frame.append(markerRing(step.marker));
      });
      frame.append(tap);
      if (step.marker) frame.append(markerRing(step.marker));
      children.push(frame, h('p', { class: 'hint', text: t('markerHint') }));

      if (step.marker) {
        const nudge = (label, dx, dy, name) => h('button', {
          type: 'button', class: 'btn btn-secondary', id: id(name), text: label,
          onclick: () => { step.marker = nudgeMarker(step.marker, dx, dy); ctx.markDirty(); draw(id(name)); },
        });
        children.push(
          h('div', { class: 'btn-row', role: 'group', 'aria-label': t('markerGroup') },
            nudge(t('markerLeft'), -1, 0, 'm-left'), nudge(t('markerRight'), 1, 0, 'm-right'),
            nudge(t('markerUp'), 0, -1, 'm-up'), nudge(t('markerDown'), 0, 1, 'm-down')),
          h('button', {
            type: 'button', class: 'btn btn-secondary', id: id('marker-remove'), text: t('markerRemove'),
            onclick: () => setMarker(null, t('markerRemoved')),
          }));
      }

      const altInput = h('input', {
        type: 'text', id: id('photo-alt'), maxlength: MAX_ALT, lang, 'aria-describedby': id('photo-alt-hint'),
        oninput: (e) => { step.photoAlt = e.target.value; ctx.markDirty(); },
      });
      altInput.value = step.photoAlt;
      children.push(
        h('div', { class: 'field' },
          h('label', { for: id('photo-alt'), text: t('fieldPhotoAlt') }),
          h('p', { id: id('photo-alt-hint'), class: 'hint', text: t('fieldPhotoAltHint') }),
          altInput),
        h('button', {
          type: 'button', class: 'btn btn-secondary', id: id('photo-remove'), text: t('removePhoto'),
          onclick: async () => {
            const ok = await confirmDialog({ title: t('removePhotoTitle'), body: t('removePhotoBody', { n }), confirmLabel: t('delete'), danger: true });
            if (!ok) return;
            step.photo = null; step.marker = null; step.photoAlt = '';
            ctx.markDirty();
            draw('photo-camera');
          },
        }));
    }
    box.replaceChildren(...children);
    if (focusName) document.getElementById(id(focusName))?.focus({ preventScroll: true });
  }

  // Revoke the preview URL when the section is replaced (the builder re-renders after saving).
  box.addEventListener('ps-dispose', () => { if (url) URL.revokeObjectURL(url); });
  draw();
  return box;
}

/**
 * Voice note section: record, stop, play, delete, with a clearly visible state.
 * @param {MediaContext} ctx
 * @param {object} step
 * @param {number} i step index
 */
export function voiceSection(ctx, step, i) {
  const n = i + 1;
  const box = h('fieldset', { class: 'field media-field' });
  let error = '';
  let player = null;
  let playerUrl = null;

  const stopPlayback = () => {
    player?.pause();
    player = null;
    if (playerUrl) { URL.revokeObjectURL(playerUrl); playerUrl = null; }
  };

  async function record() {
    error = '';
    if (!recordingSupported()) { error = t('micUnavailable'); draw(); return; }
    stopPlayback();
    try {
      const rec = await startRecording({ onTick: (s) => { if (activeRecording) { activeRecording.seconds = s; activeRecording.redraw?.(); } } });
      activeRecording = { stepId: step.id, stop: rec.stop, seconds: 0, redraw: drawTimer };
      announce(t('voiceStarted'));
      draw('voice-stop');
      rec.done.then((blob) => {
        activeRecording = null;
        step.audio = blob;
        ctx.markDirty();
        announce(t('voiceSaved'));
        if (box.isConnected) draw('voice-play');
      }).catch(() => {
        activeRecording = null;
        error = t('micUnavailable');
        if (box.isConnected) draw();
      });
    } catch (e) {
      error = t(micErrorKey(e?.name));
      draw('voice-record');
    }
  }

  function togglePlay() {
    if (player) { stopPlayback(); draw('voice-play'); return; }
    playerUrl = URL.createObjectURL(step.audio);
    player = new Audio(playerUrl);
    const mine = player;
    mine.onended = () => { if (player === mine) { stopPlayback(); if (box.isConnected) draw('voice-play'); } };
    mine.onerror = () => { stopPlayback(); error = t('voiceNoteFailed'); draw(); };
    mine.play().then(() => draw('voice-play')).catch(() => { stopPlayback(); error = t('voiceNoteFailed'); draw(); });
  }

  const timerText = () => t('voiceRecording', { s: activeRecording?.seconds ?? 0 });
  function drawTimer() {
    const el = document.getElementById(`voice-timer-${step.id}`);
    if (el) el.textContent = timerText();
  }

  function draw(focusName) {
    const id = (name) => `${name}-${step.id}`;
    const recordingHere = activeRecording?.stepId === step.id;
    const children = [h('legend', { text: t('fieldVoice') }), h('p', { class: 'hint', text: t('voiceHint') })];

    if (recordingHere) {
      // The timer text is not a live region on purpose: it would be read out every second.
      children.push(
        h('p', { id: id('voice-timer'), class: 'voice-status recording', text: timerText() }),
        h('button', { type: 'button', class: 'btn btn-stuck', id: id('voice-stop'), onclick: () => activeRecording?.stop(), text: t('voiceStop') }));
    } else if (step.audio) {
      children.push(
        h('p', { class: 'voice-status', text: t('voiceSaved') }),
        h('div', { class: 'btn-row' },
          h('button', { type: 'button', class: 'btn btn-secondary', id: id('voice-play'), onclick: togglePlay, text: player ? t('voiceStopPlay') : t('voicePlay') }),
          h('button', { type: 'button', class: 'btn btn-secondary', id: id('voice-record'), onclick: record, text: t('voiceRecord') }),
          h('button', {
            type: 'button', class: 'btn btn-secondary', id: id('voice-delete'), text: t('voiceDelete'),
            onclick: async () => {
              const ok = await confirmDialog({ title: t('voiceDeleteTitle'), body: t('voiceDeleteBody', { n }), confirmLabel: t('delete'), danger: true });
              if (!ok) return;
              stopPlayback(); step.audio = null; ctx.markDirty(); draw('voice-record');
            },
          })));
    } else {
      children.push(
        h('p', { class: 'voice-status', text: t('voiceNone') }),
        h('button', { type: 'button', class: 'btn btn-secondary', id: id('voice-record'), onclick: record, text: t('voiceRecord') }));
    }
    if (error) children.push(h('p', { class: 'error-text', role: 'alert', text: error }));
    box.replaceChildren(...children);
    if (activeRecording?.stepId === step.id) activeRecording.redraw = drawTimer;
    if (focusName) document.getElementById(id(focusName))?.focus({ preventScroll: true });
  }

  box.addEventListener('ps-dispose', stopPlayback);
  draw();
  return box;
}

