/* Toolbar popup: read the clipboard, composite with the saved style, put the
   result back on the clipboard, close.

   Why a popup and not the service worker or an offscreen document: MV3 service
   workers have no DOM and no navigator.clipboard at all, and an offscreen
   document is never focused, so clipboard.read() rejects there. A popup opened
   from the toolbar is a focused document with a fresh user activation, which is
   what both read() and write() want. */

import { computeLayout, drawScene, clampScale, flatten, DEFAULT_STATE } from './render.js';
import { loadSettings, getBackground, saveLastShot, loadLastShot } from './store.js';

const CLOSE_DELAY = 1500;

const el = {
    thumb: document.getElementById('popThumb'),
    spinner: document.getElementById('popSpinner'),
    status: document.getElementById('popStatus'),
    detail: document.getElementById('popDetail'),
    save: document.getElementById('popSave'),
    options: document.getElementById('popOptions'),
};

let resultBlob = null;
let closeTimer = null;

el.options.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
});

el.save.addEventListener('click', () => {
    if (!resultBlob) return;
    cancelClose();
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matte-${Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
});

/* Anything the user does in here means they want to look at it. */
for (const evt of ['pointerdown', 'pointerenter', 'keydown']) {
    document.addEventListener(evt, cancelClose);
}

function cancelClose() {
    clearTimeout(closeTimer);
    closeTimer = null;
}

function setStatus(text, tone = '') {
    el.status.textContent = text;
    el.status.className = `status ${tone}`.trim();
}

function setDetail(html) {
    el.detail.innerHTML = html;
}

/* ── clipboard ─────────────────────────────────────────────────────── */

/* Chrome rejects navigator.clipboard.read() with NotAllowedError in a toolbar
   popup: the popup document has no transient user activation of its own (the
   click landed on the toolbar, not in here), and it can load unfocused for a
   frame. So there are two routes, tried in order. */

/** The popup can be a frame late getting focus; read() rejects until it has it. */
function ensureFocus(timeout = 400) {
    window.focus();
    if (document.hasFocus()) return Promise.resolve();
    return new Promise((resolve) => {
        const done = () => {
            window.removeEventListener('focus', done);
            clearTimeout(timer);
            resolve();
        };
        const timer = setTimeout(done, timeout);
        window.addEventListener('focus', done);
    });
}

/**
 * The legacy path, and the one the `clipboardRead` permission actually unlocks.
 * It needs no user activation — only a focused editable element — and it fires
 * a genuine paste event, so the payload arrives exactly as a manual ⌘V would.
 */
function readViaPasteCommand() {
    return new Promise((resolve) => {
        const host = document.createElement('div');
        host.contentEditable = 'true';
        // Off-screen rather than display:none — an unrendered element can't take focus.
        host.style.cssText = 'position:fixed;top:0;left:-9999px;width:10px;height:10px;opacity:0';
        document.body.appendChild(host);

        const cleanup = () => {
            clearTimeout(bail);
            host.removeEventListener('paste', onPaste);
            host.remove();
        };

        const finish = (value) => {
            cleanup();
            resolve(value); // a second call is a no-op, so races are harmless
        };

        const onPaste = (e) => {
            e.preventDefault(); // keep the image out of the contenteditable
            const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
            finish(item ? item.getAsFile() : null);
        };

        // execCommand can report success without ever firing the event; without
        // this the popup would sit on "Reading the clipboard…" forever.
        const bail = setTimeout(() => finish(null), 500);

        host.addEventListener('paste', onPaste);
        host.focus();

        let fired = false;
        try {
            fired = document.execCommand('paste');
        } catch { /* handled by the !fired branch */ }

        // On success the paste event ran synchronously and has already resolved;
        // this only catches the command being refused outright.
        if (!fired) finish(null);
    });
}

function pickImage(items) {
    for (const item of items) {
        const type = item.types.find((t) => t.startsWith('image/'));
        if (type) return item.getType(type);
    }
    return null;
}

/**
 * @returns {Promise<Blob|null>} the clipboard image, or null when there isn't one
 * @throws the last clipboard error when every route was refused
 */
async function readClipboardImage() {
    await ensureFocus();

    let blocked = null;
    try {
        const image = await pickImage(await navigator.clipboard.read());
        // A successful read with no image is a real answer — don't second-guess
        // it with the legacy path.
        return image;
    } catch (err) {
        blocked = err;
    }

    const viaCommand = await readViaPasteCommand();
    if (viaCommand) return viaCommand;

    throw blocked;
}

/* ── compositing ───────────────────────────────────────────────────── */

async function loadBackground(state) {
    if (state.bgType !== 'image' || !state.bgImageId) return null;
    const record = await getBackground(state.bgImageId);
    if (!record) return null;
    return createImageBitmap(record.blob);
}

/* ── recognising our own output ────────────────────────────────────── */

/* An 8×8 greyscale reduction. Survives the clipboard's re-encode (which changes
   the bytes, so a hash of the file won't do) while still being specific enough
   that two different screenshots won't collide. */
function fingerprint(img) {
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 8;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0, 8, 8);
    const { data } = cx.getImageData(0, 0, 8, 8);
    const out = [];
    for (let i = 0; i < data.length; i += 4) {
        out.push(Math.round((data[i] * 3 + data[i + 1] * 6 + data[i + 2]) / 10));
    }
    return out;
}

function printsMatch(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    let total = 0;
    for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]);
    return total / a.length < 8; // generous: re-encoding shifts values slightly
}

/**
 * True when the clipboard is holding something this extension produced, which
 * means the user wants it restyled — not a second background stacked on the first.
 */
function isOwnOutput(img, last) {
    return !!last
        && img.width === last.outWidth
        && img.height === last.outHeight
        && printsMatch(fingerprint(img), last.outPrint);
}

/* ── compositing ───────────────────────────────────────────────────── */

async function composite(img, state) {
    const bgImg = await loadBackground(state);

    // The chosen background image is gone (deleted from the editor) — a solid
    // fill is a better answer than a transparent hole.
    const effective = state.bgType === 'image' && !bgImg
        ? { ...state, bgType: 'solid' }
        : state;

    const L = computeLayout(effective, img.width, img.height);
    const s = clampScale(L, effective.scale);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(L.W * s));
    canvas.height = Math.max(1, Math.round(L.H * s));
    drawScene(canvas.getContext('2d'), {
        state: effective,
        layout: L,
        s: canvas.width / L.W,
        img,
        bgImg,
        checker: false,
    });

    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    return {
        blob,
        canvas,
        width: canvas.width,
        height: canvas.height,
        transparent: effective.bgType === 'transparent',
        downscaled: s < effective.scale,
    };
}

function showResult({ width, height, downscaled, transparent }, img, restyled) {
    el.spinner.hidden = true;
    el.thumb.hidden = false;
    setStatus('Copied to the clipboard', 'ok');

    // Both sizes, because "why is my export twice the size I captured?" is
    // almost always a Retina source, and that is invisible without the input.
    const sizes = `${img.width} × ${img.height} in · ${width} × ${height} out`;

    if (transparent) {
        setDetail(`${sizes}<br><span class="why">The clipboard can't carry transparency, so this `
            + `copy is flattened to white. <b>Save PNG</b> keeps it.</span>`);
        return;
    }

    setDetail(downscaled
        ? `${sizes} — scaled down to stay inside the browser's canvas limit`
        : restyled ? `${sizes} — restyled from the original` : sizes);
}

/* ── failure paths ─────────────────────────────────────────────────── */

/**
 * Clipboard read is the one step that can be refused; ⌘V always works.
 * `technical` is the underlying DOMException — shown small, because a bare
 * "blocked" leaves nothing to act on if this ever comes back.
 */
function offerPaste(reason, technical) {
    el.spinner.hidden = true;
    setStatus(reason);
    setDetail('Press <kbd>⌘</kbd><kbd>V</kbd> here to bring it in.'
        + (technical ? `<br><span class="why">${technical}</span>` : ''));
    el.save.hidden = true;
    if (technical) console.warn('[prettifier] clipboard read failed:', technical);
}

function fail(message, detail = '') {
    el.spinner.hidden = true;
    setStatus(message, 'bad');
    setDetail(detail);
}

/* ── run ───────────────────────────────────────────────────────────── */

async function handleImage(imageBlob, state) {
    setStatus('Prettifying…');
    el.spinner.hidden = false;

    let source = imageBlob;
    let img = await createImageBitmap(imageBlob);

    // Running twice on the same clipboard used to stack a second background on
    // the first. Go back to the original instead.
    const last = await loadLastShot();
    const restyled = isOwnOutput(img, last);
    if (restyled) {
        source = last.blob;
        img = await createImageBitmap(last.blob);
    }

    const result = await composite(img, state);

    // Save PNG keeps the real alpha; only the clipboard copy gets flattened,
    // because Chrome would hand the transparent pixels over as black.
    resultBlob = result.blob;
    el.thumb.src = URL.createObjectURL(result.blob);

    const clipCanvas = result.transparent ? flatten(result.canvas) : result.canvas;
    const clipBlob = result.transparent
        ? await new Promise((r) => clipCanvas.toBlob(r, 'image/png'))
        : result.blob;

    // Fingerprint what actually lands on the clipboard — that's what comes back
    // if the user runs it a second time.
    await saveLastShot({
        blob: source,
        width: img.width,
        height: img.height,
        outWidth: result.width,
        outHeight: result.height,
        outPrint: fingerprint(clipCanvas),
    });

    try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': clipBlob })]);
    } catch {
        // The image is fine, only the hand-back failed — keep it reachable.
        el.spinner.hidden = true;
        el.thumb.hidden = false;
        el.save.hidden = false;
        fail('Could not write to the clipboard', 'Save it instead — the image itself is ready.');
        return;
    }

    showResult(result, img, restyled);
    el.save.hidden = false;
    // A flattened copy is a compromise worth reading about before it vanishes.
    if (!result.transparent) closeTimer = setTimeout(() => window.close(), CLOSE_DELAY);
}

async function run() {
    // Both start now: the clipboard read is the focus-sensitive step, so it must
    // not wait behind a storage round trip.
    const clipboard = readClipboardImage().catch((err) => err);
    const settings = loadSettings().catch(() => null);

    const state = { ...DEFAULT_STATE, ...((await settings) || {}) };
    const image = await clipboard;

    if (image instanceof Error) {
        offerPaste('Clipboard access was blocked', `${image.name}: ${image.message}`);
        armPasteFallback(state);
        return;
    }

    if (!image) {
        offerPaste('No image on the clipboard');
        armPasteFallback(state);
        return;
    }

    await handleImage(image, state);
}

function armPasteFallback(state) {
    document.addEventListener('paste', (e) => {
        const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
        if (!item) return;
        e.preventDefault();
        cancelClose();
        handleImage(item.getAsFile(), state).catch((err) => fail('Something went wrong', String(err)));
    });
}

run().catch((err) => fail('Something went wrong', String(err)));
