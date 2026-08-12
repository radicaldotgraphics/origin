/* Persistence.

   Control settings are small and go in localStorage. Background images do not —
   a couple of wallpapers blow past the ~5MB quota — so those live as Blobs in
   IndexedDB and are only ever referenced by id from the settings.

   The same files run as a web page and as the extension's options page, so
   settings go through chrome.storage.local when it exists. That makes reads
   async everywhere. IndexedDB needs no such split: an extension page is its own
   origin, and the popup shares it. Note this means the website and the
   extension keep separate settings — the extension only ever acts on its own. */

const DB_NAME = 'radical-shot';
const DB_VERSION = 2;
const BG_STORE = 'backgrounds';
const SHOT_STORE = 'shots';
const SETTINGS_KEY = 'radical-shot-settings';

let dbPromise = null;

function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            for (const name of [BG_STORE, SHOT_STORE]) {
                if (!db.objectStoreNames.contains(name)) {
                    db.createObjectStore(name, { keyPath: 'id' });
                }
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return dbPromise;
}

function tx(store, mode, fn) {
    return openDb().then((db) => new Promise((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
        if (req) req.onsuccess = () => resolve(req.result);
        else t.oncomplete = () => resolve();
    }));
}

export function listBackgrounds() {
    return tx(BG_STORE, 'readonly', (s) => s.getAll())
        .then((rows) => rows.sort((a, b) => a.added - b.added))
        .catch(() => []);
}

/**
 * Store `file` as *the* background image, discarding any previous one. There is
 * deliberately no library — one image, replaced in place.
 */
export function setBackground(file) {
    const record = {
        id: `bg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name || 'background',
        blob: file,
        added: Date.now(),
    };
    return tx(BG_STORE, 'readwrite', (s) => {
        s.clear();
        return s.put(record);
    }).then(() => record);
}

/** One record by id, for the popup — it needs the blob without listing them all. */
export function getBackground(id) {
    if (!id) return Promise.resolve(null);
    return tx(BG_STORE, 'readonly', (s) => s.get(id)).catch(() => null);
}

/* ── the last screenshot ───────────────────────────────────────────── */

/* The popup replaces the clipboard with its own output, so the original would
   otherwise be gone the moment it runs — and prettifying twice would stack a
   second background on the first. Keeping the source here means the editor can
   show what you actually captured, and a repeat run restyles rather than
   compounds. Written by the popup only; the editor just reads it. */

export function saveLastShot(record) {
    return tx(SHOT_STORE, 'readwrite', (s) => s.put({ ...record, id: 'last' }))
        .catch(() => {}); // a lost original is not worth failing the copy over
}

export function loadLastShot() {
    return tx(SHOT_STORE, 'readonly', (s) => s.get('last')).catch(() => null);
}

/* ── settings ──────────────────────────────────────────────────────── */

const extStorage = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

export function loadSettings() {
    if (extStorage) {
        return extStorage.get(SETTINGS_KEY)
            .then((r) => r[SETTINGS_KEY] || null)
            .catch(() => null);
    }
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        return Promise.resolve(raw ? JSON.parse(raw) : null);
    } catch {
        return Promise.resolve(null); // private mode, corrupted value — use defaults
    }
}

export function saveSettings(settings) {
    if (extStorage) {
        extStorage.set({ [SETTINGS_KEY]: settings }).catch(() => {});
        return;
    }
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch { /* not worth interrupting the user over */ }
}
