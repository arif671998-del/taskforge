/**
 * Shared app state: current settings, translation helper, and screen-reader announcements.
 */
import { translate } from './i18n.js';
import { loadSettings, saveSettings } from './lib/settings.js';

let settings = loadSettings();
const listeners = new Set();

/** @returns {ReturnType<typeof loadSettings>} */
export const getSettings = () => settings;

/** Translate using the current UI language. */
export const t = (key, vars) => translate(settings.uiLang, key, vars);

/**
 * Change settings, persist them and re-apply them to the page.
 * @param {Partial<ReturnType<typeof loadSettings>>} patch
 */
export function updateSettings(patch) {
  settings = { ...settings, ...patch };
  saveSettings(settings);
  applySettings();
  listeners.forEach((fn) => fn(settings));
}

/** Call fn whenever settings change. */
export const onSettingsChange = (fn) => listeners.add(fn);

/** Reflect settings on <html>: language, text size. */
export function applySettings() {
  const root = document.documentElement;
  root.lang = settings.uiLang;
  root.dataset.textSize = settings.textSize;
  const skip = document.getElementById('skip-link');
  if (skip) skip.textContent = t('skipToContent');
}

/**
 * Announce a message to screen readers via the polite live region.
 * @param {string} message
 */
export function announce(message) {
  const live = document.getElementById('live');
  if (!live) return;
  live.textContent = '';
  // Clearing first makes repeated identical messages be read again.
  setTimeout(() => { live.textContent = message; }, 50);
}
