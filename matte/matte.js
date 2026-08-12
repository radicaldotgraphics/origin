/* Matte — UI wiring.
   Compositing lives in render.js; persistence in store.js. */

import { computeLayout, drawScene, clampScale, flatten, RATIOS, DEFAULT_STATE } from './render.js';
import { listBackgrounds, setBackground, loadSettings, saveSettings, loadLastShot } from './store.js';

const DEFAULTS = DEFAULT_STATE;

const PRESETS = [
    { type: 'gradient', gradA: '#8E7CFF', gradB: '#FF9AA2', gradAngle: 135 },
    { type: 'gradient', gradA: '#5B8DEF', gradB: '#7CE7D1', gradAngle: 135 },
    { type: 'gradient', gradA: '#FFB86B', gradB: '#FF6B6B', gradAngle: 135 },
    { type: 'gradient', gradA: '#2B2D42', gradB: '#5C6478', gradAngle: 160 },
    { type: 'gradient', gradA: '#D9E4F5', gradB: '#F5E3E6', gradAngle: 120 },
    { type: 'solid', bgColor: '#FFFFFF' },
    { type: 'solid', bgColor: '#EAEAEA' },
    { type: 'solid', bgColor: '#0B0B0B' },
];

/* Populated from storage in init() before anything is wired up. Mutated in
   place rather than reassigned, so every closure below sees the same object. */
const state = { ...DEFAULTS };

const $ = (id) => document.getElementById(id);

const el = {
    stage: $('shotStage'),
    canvasWrap: $('shotCanvasWrap'),
    canvas: $('shotCanvas'),
    swapBg: $('shotSwapBg'),
    drop: $('shotDrop'),
    browse: $('shotBrowse'),
    file: $('shotFile'),
    meta: $('shotMeta'),
    bar: $('shotBar'),
    actions: $('shotActions'),
    presets: $('shotPresets'),
    gradFields: $('bgGradFields'),
    bgUpload: $('shotBgUpload'),
    reset: $('shotReset'),
    toast: $('shotToast'),
};

const ctx = el.canvas.getContext('2d');

let shot = null;      // the loaded screenshot, an HTMLImageElement
let shotUrl = null;   // its object URL, revoked when replaced

/* There is only ever one background image. Uploading replaces it, so the store
   holds either nothing or a single record. */
let bgRecord = null;  // the stored record, or null
let bgImage = null;   // its decoded image, ready to draw
let bgUrl = null;     // the object URL behind bgImage

/* ── screenshot ingest ─────────────────────────────────────────────── */

function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        toast('That file is not an image');
        return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
        if (shotUrl) URL.revokeObjectURL(shotUrl);
        shot = img;
        shotUrl = url;
        el.drop.hidden = true;
        el.canvasWrap.hidden = false;
        setActionsEnabled(true);
        renderPreview();
    };
    img.onerror = () => {
        URL.revokeObjectURL(url);
        toast('Could not read that image');
    };
    img.src = url;
}

/* A paste anywhere on the page counts. */
document.addEventListener('paste', (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
    if (!item) return;
    e.preventDefault();
    loadFile(item.getAsFile());
});

let dragDepth = 0;
window.addEventListener('dragenter', (e) => {
    if (![...(e.dataTransfer?.types || [])].includes('Files')) return;
    dragDepth++;
    document.body.classList.add('dragging');
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('dragleave', () => {
    // dragleave fires for every child boundary crossed, so count depth rather
    // than clearing on the first one.
    if (--dragDepth <= 0) {
        dragDepth = 0;
        document.body.classList.remove('dragging');
    }
});
window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    document.body.classList.remove('dragging');
    const file = e.dataTransfer?.files?.[0];
    if (file) loadFile(file);
});

el.browse.addEventListener('click', () => el.file.click());
el.file.addEventListener('change', () => {
    if (el.file.files[0]) loadFile(el.file.files[0]);
    el.file.value = '';
});

/* ── preview ───────────────────────────────────────────────────────── */

let frameQueued = false;

function renderPreview() {
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(() => {
        frameQueued = false;
        paint();
    });
}

function paint() {
    if (!shot) return;

    const L = computeLayout(state, shot.naturalWidth, shot.naturalHeight);
    const pad = 2 * parseFloat(getComputedStyle(el.stage).paddingLeft || 0);
    const availW = Math.max(80, el.stage.clientWidth - pad);
    const availH = Math.max(80, el.stage.clientHeight - pad);

    const fit = Math.min(availW / L.W, availH / L.H);
    const dpr = window.devicePixelRatio || 1;
    const cssW = L.W * fit;
    const cssH = L.H * fit;

    el.canvas.style.width = `${cssW}px`;
    el.canvas.style.height = `${cssH}px`;
    el.canvas.width = Math.max(1, Math.round(cssW * dpr));
    el.canvas.height = Math.max(1, Math.round(cssH * dpr));

    drawScene(ctx, {
        state,
        layout: L,
        s: el.canvas.width / L.W,
        img: shot,
        bgImg: bgImage,
        checker: true,
    });

    updateMeta(L);
}

function updateMeta(L) {
    const w = Math.round(L.W * state.scale);
    const h = Math.round(L.H * state.scale);
    el.meta.textContent =
        `${shot.naturalWidth} × ${shot.naturalHeight} in · ${w} × ${h} out`;
}

// The stage is a flex child of a viewport-locked column, so its box changes
// without the window necessarily resizing.
new ResizeObserver(() => renderPreview()).observe(el.stage);

/* ── export (standalone site only) ─────────────────────────────────── */

/* The extension hands its result straight back to the clipboard, so download
   buttons there would be a second, redundant way out. On the web they're the
   only way out. */
const IS_EXTENSION = location.protocol === 'chrome-extension:';

function setActionsEnabled(on) {
    for (const b of el.actions.querySelectorAll('.dlBtn')) b.disabled = !on;
}

function buildExportCanvas() {
    const L = computeLayout(state, shot.naturalWidth, shot.naturalHeight);
    const s = clampScale(L, state.scale);
    if (s < state.scale) {
        toast(`Scaled down to ${Math.round(L.W * s)}px — the full size is past the browser's canvas limit`);
    }

    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(L.W * s));
    c.height = Math.max(1, Math.round(L.H * s));
    drawScene(c.getContext('2d'), {
        state,
        layout: L,
        s: c.width / L.W,
        img: shot,
        bgImg: bgImage,
        checker: false,
    });
    return c;
}

function stamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function download(fmt) {
    const c = buildExportCanvas();
    // JPEG has no alpha channel, so a transparent background would come out black.
    // PNG keeps it — that's the one route where transparency survives intact.
    const needsFlattening = fmt === 'jpg' && state.bgType === 'transparent';
    toBlobAndSave(needsFlattening ? flatten(c) : c, fmt);
}

function toBlobAndSave(canvas, fmt) {
    canvas.toBlob((blob) => {
        if (!blob) { toast('Export failed'); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `matte-${stamp()}.${fmt}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, fmt === 'jpg' ? 'image/jpeg' : 'image/png', fmt === 'jpg' ? 0.92 : undefined);
}

function copyToClipboard() {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
        toast('This browser can\'t copy images — use PNG instead');
        return;
    }
    const c = buildExportCanvas();
    // Chrome's clipboard has no alpha channel — transparent pixels paste as
    // black — so the copy gets flattened. PNG still carries the real thing.
    const transparent = state.bgType === 'transparent';
    const src = transparent ? flatten(c) : c;

    // Hand ClipboardItem the promise rather than awaiting it first: some
    // browsers drop the user-gesture permission across an await.
    const blob = new Promise((resolve) => src.toBlob(resolve, 'image/png'));
    navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        .then(() => toast(transparent
            ? 'Copied — flattened to white, the clipboard can\'t carry transparency'
            : 'Copied to clipboard'))
        .catch(() => toast('Copy was blocked — use PNG instead'));
}

el.actions.addEventListener('click', (e) => {
    const btn = e.target.closest('.dlBtn');
    if (!btn || btn.disabled) return;
    if (btn.dataset.act === 'copy') copyToClipboard();
    else download(btn.dataset.act);
});

/* ── option groups ─────────────────────────────────────────────────── */

function wireOptions(containerId, key, coerce = (v) => v, after) {
    const row = $(containerId);
    row.addEventListener('click', (e) => {
        const btn = e.target.closest('.opt');
        if (!btn || btn.disabled) return;
        state[key] = coerce(btn.dataset.val);
        syncOptions(containerId, key);
        if (after) after();
        persist();
        renderPreview();
    });
    syncOptions(containerId, key);
}

function syncOptions(containerId, key) {
    for (const btn of $(containerId).querySelectorAll('.opt')) {
        btn.setAttribute('aria-checked', String(coerceEq(btn.dataset.val, state[key])));
    }
}

const coerceEq = (a, b) => String(a) === String(b);

/** The background modes the UI can actually express. */
const BG_TYPES = ['gradient', 'solid', 'image', 'transparent'];

/* ── sliders ───────────────────────────────────────────────────────── */

function wireSlider(inputId, outId, key, render) {
    const input = $(inputId);
    const out = $(outId);
    input.value = state[key];
    render(out, state[key]);
    input.addEventListener('input', () => {
        state[key] = Number(input.value);
        render(out, state[key]);
        syncPresets(); // the angle slider can walk the state off a gradient preset
        renderPreview();
        persistSoon();
    });
}

/* ── colours ───────────────────────────────────────────────────────── */

/** #abc / #aabbcc / aabbcc → #AABBCC, or null when it isn't a colour. */
function normalizeHex(raw) {
    let v = (raw || '').trim().replace(/^#/, '');
    if (v.length === 3) v = v.split('').map((c) => c + c).join('');
    if (!/^[0-9a-f]{6}$/i.test(v)) return null;
    return `#${v.toUpperCase()}`;
}

/**
 * Colour comes from the native picker only — it already offers hex entry, so a
 * separate field was two ways to say the same thing.
 * `mode` is the background type this swatch belongs to; touching it selects that mode.
 */
function wireColor(key, pickerId, chipId, mode) {
    const picker = $(pickerId);
    const chip = $(chipId);

    const apply = (value) => {
        const norm = normalizeHex(value);
        if (!norm) return;
        state[key] = norm;
        picker.value = norm;
        chip.style.background = norm;

        // Reaching for a swatch is a clear enough statement of intent.
        if (state.bgType !== mode) {
            state.bgType = mode;
            syncOptions('optBgType', 'bgType');
            syncBgFields();
            syncSwapBtn();
        }

        syncPresets();
        persist();
        renderPreview();
    };

    picker.value = state[key];
    chip.style.background = state[key];
    picker.addEventListener('input', () => apply(picker.value));
    return apply;
}

/* ── background presets ────────────────────────────────────────────── */

function presetCss(p) {
    return p.type === 'gradient'
        ? `linear-gradient(${p.gradAngle}deg, ${p.gradA}, ${p.gradB})`
        : p.bgColor;
}

function presetMatchesState(p) {
    if (p.type !== state.bgType) return false;
    return p.type === 'gradient'
        ? p.gradA === state.gradA && p.gradB === state.gradB && p.gradAngle === state.gradAngle
        : p.bgColor === state.bgColor;
}

function buildPresets() {
    el.presets.innerHTML = '';
    PRESETS.forEach((p, i) => {
        // A hairline wherever the kind of preset changes — gradients, then solids.
        if (i > 0 && PRESETS[i - 1].type !== p.type) {
            const rule = document.createElement('span');
            rule.className = 'presetDivider';
            rule.setAttribute('aria-hidden', 'true');
            el.presets.appendChild(rule);
        }

        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'preset';
        b.dataset.i = String(i);
        b.style.background = presetCss(p);
        b.setAttribute('role', 'option');
        b.setAttribute('aria-label', p.type === 'gradient'
            ? `Gradient ${p.gradA} to ${p.gradB}` : `Solid ${p.bgColor}`);
        el.presets.appendChild(b);
    });
    syncPresets();
}

function syncPresets() {
    for (const b of el.presets.querySelectorAll('.preset')) {
        b.setAttribute('aria-selected', String(presetMatchesState(PRESETS[+b.dataset.i])));
    }
}

el.presets.addEventListener('click', (e) => {
    const b = e.target.closest('.preset');
    if (!b) return;
    const p = PRESETS[+b.dataset.i];
    state.bgType = p.type;
    if (p.type === 'gradient') {
        state.gradA = p.gradA;
        state.gradB = p.gradB;
        state.gradAngle = p.gradAngle;
    } else {
        state.bgColor = p.bgColor;
    }
    syncBgFields();
    syncColorInputs();
    syncOptions('optBgType', 'bgType');
    syncPresets();
    persist();
    renderPreview();
});

/* ── the background image ──────────────────────────────────────────── */

/* One image, replaced rather than accumulated — so there is no library to
   manage, and no empty-state copy to explain one. */

function releaseBgImage() {
    if (bgUrl) URL.revokeObjectURL(bgUrl);
    bgUrl = null;
    bgImage = null;
}

/** Decode the stored record so it can be drawn. Cheap to call repeatedly. */
function loadBgImage() {
    if (!bgRecord) {
        releaseBgImage();
        afterBgImageChange();
        return;
    }
    if (bgImage) { afterBgImageChange(); return; } // already decoded

    releaseBgImage();
    bgUrl = URL.createObjectURL(bgRecord.blob);
    const img = new Image();
    img.onload = () => { bgImage = img; afterBgImageChange(); };
    img.onerror = () => { bgImage = null; afterBgImageChange(); };
    img.src = bgUrl;
}

function afterBgImageChange() {
    syncSwapBtn();
    renderPreview();
}

/** The swap control only belongs on screen when there's an image to swap. */
function syncSwapBtn() {
    el.swapBg.hidden = !(state.bgType === 'image' && bgImage);
}

function pickBackgroundImage() {
    el.bgUpload.click();
}

el.swapBg.addEventListener('click', pickBackgroundImage);

el.bgUpload.addEventListener('change', () => {
    const file = [...el.bgUpload.files].find((f) => f.type.startsWith('image/'));
    el.bgUpload.value = '';
    if (!file) return;

    setBackground(file)
        .then((record) => {
            releaseBgImage(); // the old object URL is dead the moment it's replaced
            bgRecord = record;
            state.bgImageId = record.id;
            state.bgType = 'image';
            syncOptions('optBgType', 'bgType');
            syncBgFields();
            syncPresets();
            persist();
            loadBgImage();
        })
        .catch(() => toast('Could not save that image — your browser may be out of storage'));
});

/* ── field visibility ──────────────────────────────────────────────── */

function syncBgFields() {
    el.gradFields.hidden = state.bgType !== 'gradient';
}

function syncColorInputs() {
    for (const [key, pickerId, chipId] of [
        ['bgColor', 'shotBgColor', 'shotBgChip'],
        ['gradA', 'shotGradA', 'shotGradAChip'],
        ['gradB', 'shotGradB', 'shotGradBChip'],
    ]) {
        $(pickerId).value = state[key];
        $(chipId).style.background = state[key];
    }
    $('shotGradAngle').value = state.gradAngle;
    showAngle($('shotGradAngleDial'), state.gradAngle);
}

/* ── reset ─────────────────────────────────────────────────────────── */

el.reset.addEventListener('click', () => {
    // The uploaded image is an asset, not a setting — resetting the style
    // shouldn't throw it away.
    const keepId = bgRecord ? bgRecord.id : null;
    Object.assign(state, DEFAULTS, { bgImageId: keepId });
    syncAll();
    syncSwapBtn();
    persist();
    renderPreview();
    toast('Reset to defaults');
});

/* ── persistence ───────────────────────────────────────────────────── */

function persist() { saveSettings(state); }

let persistTimer;
function persistSoon() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(persist, 400);
}

/* ── toast ─────────────────────────────────────────────────────────── */

let toastTimer;
function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2600);
}

/* ── logo animation ────────────────────────────────────────────────── */

/** True when a layer paints with the lavender accent rather than the ink colour. */
function isAccentLayer(layer) {
    let accent = false;
    (function walk(node) {
        if (accent || !node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(walk); return; }
        if (node.ty === 'fl' && node.c && Array.isArray(node.c.k)) {
            const [r, g, b] = node.c.k; // 0-1 floats
            // Ink is #222 (sums to ~0.4); the accent is a pale lavender (~2.0).
            if (r + g + b > 1.5) accent = true;
        }
        Object.values(node).forEach(walk);
    })(layer);
    return accent;
}

/**
 * The same Lottie the main site runs. Loaded dynamically and last, so its
 * weight never delays the tool; the inline SVG stays put until the animation is
 * actually on screen, so any failure just leaves the static mark.
 */
function initMarkAnimation() {
    const host = $('shotMarkAnim');
    const mark = $('shotMark');
    if (!host || !mark) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Both come from vendor/ rather than the site root: an extension can't load
    // anything outside its own directory, and this page is both. vendor/sync.sh
    // refreshes them from the canonical copies.
    Promise.all([
        import('./vendor/lottie-light.js'),
        fetch(new URL('./vendor/mark.json', import.meta.url)).then((r) => {
            if (!r.ok) throw new Error(`mark.json ${r.status}`);
            return r.json();
        }),
    ])
        .then(([{ default: lottie }, data]) => {
            // Drop the accent layer here rather than editing the source, which
            // the main site renders too — this page just wants the mono mark.
            data.layers = data.layers.filter((l) => !isAccentLayer(l));

            const anim = lottie.loadAnimation({
                container: host,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: data,
                rendererSettings: {
                    // Crop to the artwork's own bounds so the animated mark sits
                    // at the same scale as the static one.
                    viewBoxSize: '191 271 1607 452',
                    preserveAspectRatio: 'xMidYMid meet',
                },
            });
            anim.addEventListener('DOMLoaded', () => mark.classList.add('animated'));
        })
        .catch(() => { /* static mark stands in */ });
}

/* ── init ──────────────────────────────────────────────────────────── */

function syncAll() {
    syncOptions('optBgType', 'bgType');
    syncOptions('optRatio', 'ratio');
    syncOptions('optFrame', 'frame');
    syncOptions('optScale', 'scale');
    syncBgFields();
    syncColorInputs();
    syncPresets();
    for (const [inputId, outId, key, render] of SLIDERS) {
        $(inputId).value = state[key];
        render($(outId), state[key]);
    }
}

/** Most readouts are a number; the angle is a dial. */
const showNumber = (out, v) => { out.textContent = v; };
const showAngle = (out, v) => { out.style.setProperty('--angle', `${v}deg`); };

const SLIDERS = [
    ['shotPad', 'shotPadOut', 'pad', showNumber],
    ['shotRadius', 'shotRadiusOut', 'radius', showNumber],
    ['shotShadow', 'shotShadowOut', 'shadow', showNumber],
    ['shotShadowOpacity', 'shotShadowOpacityOut', 'shadowOpacity', showNumber],
    ['shotGradAngle', 'shotGradAngleDial', 'gradAngle', showAngle],
];

async function init() {
    el.bar.hidden = IS_EXTENSION;
    setActionsEnabled(false);

    Object.assign(state, (await loadSettings()) || {});
    // A saved value with no button left to represent it would select nothing.
    if (!(state.ratio in RATIOS)) state.ratio = DEFAULTS.ratio;
    if (!BG_TYPES.includes(state.bgType)) state.bgType = DEFAULTS.bgType;

    wireOptions('optBgType', 'bgType', (v) => v, () => {
        syncBgFields();
        syncPresets();
        syncSwapBtn();
        if (state.bgType !== 'image') return;
        // Asking for an image you don't have yet is a request to choose one.
        if (bgRecord) loadBgImage();
        else pickBackgroundImage();
    });
    wireOptions('optRatio', 'ratio');
    wireOptions('optFrame', 'frame');
    wireOptions('optScale', 'scale', Number, () => {
        if (shot) updateMeta(computeLayout(state, shot.naturalWidth, shot.naturalHeight));
    });

    for (const [inputId, outId, key, render] of SLIDERS) wireSlider(inputId, outId, key, render);

    wireColor('bgColor', 'shotBgColor', 'shotBgChip', 'solid');
    wireColor('gradA', 'shotGradA', 'shotGradAChip', 'gradient');
    wireColor('gradB', 'shotGradB', 'shotGradBChip', 'gradient');

    buildPresets();
    syncBgFields();

    bgRecord = (await listBackgrounds())[0] || null;
    state.bgImageId = bgRecord ? bgRecord.id : null;
    if (state.bgType === 'image') loadBgImage();
    syncSwapBtn();

    // The popup overwrites the clipboard with its own output, so pasting here
    // afterwards would stack a second background on the first. Open on the
    // original it saved instead — what you actually captured.
    if (!shot) {
        const last = await loadLastShot();
        if (last && last.blob) loadFile(last.blob);
    }

    // A screenshot dropped in during the (very short) load window would have
    // painted with defaults.
    renderPreview();
    initMarkAnimation();
}

init();
