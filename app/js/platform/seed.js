import { getMeta, listGuides, saveGuide, setMeta } from './db.js';
import { createSampleGuide } from '../lib/sample.js';

/**
 * On the very first run, add the sample guide so there is something to try.
 * A flag in the database makes sure it is never added again after the user deletes it.
 * Failures are ignored: the app still works without a sample.
 * @param {'en'|'hi'} language UI language, used for the sample text
 */
export async function seedSampleOnFirstRun(language) {
  try {
    if (await getMeta('seeded')) return;
    if ((await listGuides()).length === 0) await saveGuide(createSampleGuide(language));
    await setMeta('seeded', true);
  } catch {
    /* storage unavailable; Home shows its own message */
  }
}
