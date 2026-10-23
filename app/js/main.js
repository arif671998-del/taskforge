/**
 * Boot + hash router. Each view returns { title, node }; the router swaps it into <main>,
 * updates the page title, and moves focus to the view's h1 so screen readers start there.
 */
import { parseHash } from './lib/route.js';
import { applySettings, getSettings, onSettingsChange, t } from './state.js';
import { renderHome } from './views/home.js';
import { renderSettings } from './views/settings.js';
import { renderHelper } from './views/helper.js';
import { renderBuilder } from './views/builder.js';
import { renderNotFound } from './views/notfound.js';
import { seedSampleOnFirstRun } from './platform/seed.js';

const main = document.getElementById('main');

/** Route name -> render function. Later milestones add play, build and activity. */
const views = {
  home: renderHome,
  settings: renderSettings,
  helper: renderHelper,
  build: renderBuilder,
};

/**
 * @param {{ keepFocus?: boolean }} [opts] keepFocus: re-render without stealing focus (language change)
 */
async function render({ keepFocus = false } = {}) {
  const route = parseHash(location.hash);
  const view = (views[route.name] ?? renderNotFound)(route);
  const { title, node } = await view;
  const focusedId = keepFocus ? document.activeElement?.id : null;
  main.replaceChildren(node);
  document.title = `${title} · ${t('appName')}`;
  if (keepFocus) {
    if (focusedId) document.getElementById(focusedId)?.focus({ preventScroll: true });
  } else {
    window.scrollTo(0, 0);
    document.getElementById('view-heading')?.focus({ preventScroll: true });
  }
}

applySettings();
await seedSampleOnFirstRun(getSettings().uiLang);
window.addEventListener('hashchange', () => render());
// Re-render in place when the language changes; focus stays on the control the user used.
onSettingsChange(() => render({ keepFocus: true }));
render();
