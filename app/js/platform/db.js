/**
 * IndexedDB layer. Stores: guides, progress, runs, meta.
 *
 * Guide    { id, title, helperName, helperPhone, language, steps, isSample, createdAt, updatedAt }
 * Progress { guideId, runId, stepIndex, updatedAt }
 * Run      { id, guideId, startedAt, endedAt, completed, stepTimesMs, stuck }
 * Meta     { key, value }
 */

const DB_NAME = 'plainsteps';
const DB_VERSION = 1;

let dbPromise = null;

/** Open (and create on first use) the database. Rejects if storage is unavailable. */
export function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore('guides', { keyPath: 'id' });
      db.createObjectStore('progress', { keyPath: 'guideId' });
      db.createObjectStore('runs', { keyPath: 'id' }).createIndex('guideId', 'guideId');
      db.createObjectStore('meta', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Database is blocked by another tab'));
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

/** Forget the cached connection (used by tests). */
export async function closeDb() {
  if (!dbPromise) return;
  const db = await dbPromise.catch(() => null);
  db?.close();
  dbPromise = null;
}

/**
 * Run work inside one transaction and resolve when it has committed.
 * @template T
 * @param {string[]} stores
 * @param {'readonly'|'readwrite'} mode
 * @param {(tx: IDBTransaction) => IDBRequest|Promise<T>|void} work
 */
async function withTx(stores, mode, work) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result;
    const out = work(tx);
    if (out && 'onsuccess' in out) out.onsuccess = () => { result = out.result; };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });
}

const get = (store, key) => withTx([store], 'readonly', (tx) => tx.objectStore(store).get(key));
const getAll = (store) => withTx([store], 'readonly', (tx) => tx.objectStore(store).getAll());
const put = (store, value) => withTx([store], 'readwrite', (tx) => { tx.objectStore(store).put(value); });

// Guides

/** All guides, oldest first so the order on Home is stable. */
export async function listGuides() {
  const guides = await getAll('guides');
  return guides.sort((a, b) => a.createdAt - b.createdAt);
}
export const getGuide = (id) => get('guides', id);
export const saveGuide = (guide) => put('guides', { ...guide, updatedAt: Date.now() });

/** Delete a guide together with its progress and runs. */
export function deleteGuide(id) {
  return withTx(['guides', 'progress', 'runs'], 'readwrite', (tx) => {
    tx.objectStore('guides').delete(id);
    tx.objectStore('progress').delete(id);
    const runs = tx.objectStore('runs');
    const cursor = runs.index('guideId').openKeyCursor(IDBKeyRange.only(id));
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) { runs.delete(c.primaryKey); c.continue(); }
    };
  });
}

// Progress

export const getProgress = (guideId) => get('progress', guideId);
export const saveProgress = (progress) => put('progress', { ...progress, updatedAt: Date.now() });
export const clearProgress = (guideId) =>
  withTx(['progress'], 'readwrite', (tx) => { tx.objectStore('progress').delete(guideId); });
/** @returns {Promise<Array>} */
export const listProgress = () => getAll('progress');

// Runs

export const saveRun = (run) => put('runs', run);
export const getRun = (id) => get('runs', id);
export const listRuns = (guideId) =>
  withTx(['runs'], 'readonly', (tx) => tx.objectStore('runs').index('guideId').getAll(IDBKeyRange.only(guideId)));
export function clearRuns(guideId) {
  return withTx(['runs'], 'readwrite', (tx) => {
    const runs = tx.objectStore('runs');
    const cursor = runs.index('guideId').openKeyCursor(IDBKeyRange.only(guideId));
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) { runs.delete(c.primaryKey); c.continue(); }
    };
  });
}

// Meta

export async function getMeta(key) {
  return (await get('meta', key))?.value;
}
export const setMeta = (key, value) => put('meta', { key, value });
