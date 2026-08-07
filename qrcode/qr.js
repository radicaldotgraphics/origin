/* QR Code Generator — UI wiring.
   Encoding comes from vendor/qr-core.js (bundled from the `qrcode` package,
   see the plan for the regeneration command). Drawing lives in qr-render.js. */

import QR from './vendor/qr-core.js';
import { renderSvg, reserveSpan, contrastRatio, parseHex, relLuminance } from './qr-render.js';

const EXPORT_PX = 1024;

const state = {
    url: 'https://radical.graphics',
    dots: 'rounded',
    markerBorder: 'square',
    markerCenter: 'square',
    ecc: 'L',
    eccBeforeReserve: 'L',
    fg: '#000000',
    bg: '#FFFFFF',
    transparent: false,
    reserve: false,
};

const $ = (id) => document.getElementById(id);

const el = {
    stage: $('qrStage'),
    url: $('qrUrl'),
    urlNote: $('qrUrlNote'),
    eccNote: $('qrEccNote'),
    fg: $('qrFg'), fgHex: $('qrFgHex'), fgChip: $('qrFgChip'),
    bg: $('qrBg'), bgHex: $('qrBgHex'), bgChip: $('qrBgChip'), bgRow: $('qrBgRow'),
    transparent: $('qrTransparent'),
    contrast: $('qrContrast'),
    contrastNote: $('qrContrastNote'),
    reserve: $('qrReserve'),
    reserveNote: $('qrReserveNote'),
    downloads: $('qrDownloads'),
};

let currentSvg = null;

/* ── option groups ─────────────────────────────────────────────────── */

function wireOptions(containerId, key, onPick) {
    const row = $(containerId);
    row.addEventListener('click', (e) => {
        const btn = e.target.closest('.opt');
        if (!btn || btn.disabled) return;
        state[key] = btn.dataset.val;
        syncOptions(containerId, key);
        if (onPick) onPick();
        render();
    });
    syncOptions(containerId, key);
}

function syncOptions(containerId, key) {
    for (const btn of $(containerId).querySelectorAll('.opt')) {
        btn.setAttribute('aria-checked', String(btn.dataset.val === state[key]));
    }
}

/* ── url ───────────────────────────────────────────────────────────── */

/** Trim, and assume https when no scheme was typed. Returns null when empty. */
function normalizeUrl(raw) {
    const v = (raw || '').trim();
    if (!v) return null;
    return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
}

function fileBase() {
    try {
        const host = new URL(normalizeUrl(state.url)).hostname.replace(/^www\./, '');
        // `new URL` accepts plenty of things that aren't really hosts — free text
        // comes back percent-encoded. Only slugify something host-shaped.
        if (/^[a-z0-9.-]+$/i.test(host)) {
            const slug = host.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
            if (slug) return `${slug}-qr`;
        }
    } catch { /* not a parseable URL — fall through */ }
    return 'qr-code';
}

/* ── render ────────────────────────────────────────────────────────── */

function render() {
    const url = normalizeUrl(state.url);

    if (!url) {
        showMessage('Enter a link to generate a code');
        el.urlNote.textContent = '';
        el.urlNote.classList.remove('alert');
        return;
    }

    let matrix;
    try {
        matrix = QR.create(url, { errorCorrectionLevel: state.ecc }).modules;
    } catch (err) {
        showMessage('That link is too long to encode');
        el.urlNote.textContent = err && err.message ? err.message : 'Could not encode this link.';
        el.urlNote.classList.add('alert');
        return;
    }

    el.urlNote.classList.remove('alert');
    el.urlNote.textContent = url === state.url.trim() ? '' : `Encoding ${url}`;

    currentSvg = renderSvg(matrix, {
        dots: state.dots,
        markerBorder: state.markerBorder,
        markerCenter: state.markerCenter,
        fg: state.fg,
        bg: state.bg,
        transparent: state.transparent,
        reserve: state.reserve,
    });

    el.stage.innerHTML = currentSvg;
    setDownloadsEnabled(true);

    if (state.reserve) {
        const span = reserveSpan(matrix.size);
        el.reserveNote.textContent =
            `Cleared ${span}×${span} of ${matrix.size}×${matrix.size} modules. ` +
            `Accuracy is held at High so the code still reads with the center covered.`;
    }
}

function showMessage(text) {
    currentSvg = null;
    el.stage.innerHTML = `<div class="stageMsg">${text}</div>`;
    setDownloadsEnabled(false);
}

function setDownloadsEnabled(on) {
    for (const b of el.downloads.querySelectorAll('.dlBtn')) b.disabled = !on;
}

const debouncedRender = debounce(render, 200);

function debounce(fn, ms) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}

/* ── colour + contrast ─────────────────────────────────────────────── */

function updateContrast() {
    el.fgChip.style.background = state.fg;
    el.bgChip.style.background = state.transparent ? '#FFFFFF' : state.bg;
    el.bg.disabled = state.transparent;
    el.bgHex.disabled = state.transparent;
    // Dim swatch, hex field and label together so the row reads as inactive.
    el.bgRow.classList.toggle('disabled', state.transparent);

    // A transparent code lands on whatever is behind it; white is the fair assumption.
    const effectiveBg = state.transparent ? '#FFFFFF' : state.bg;
    const ratio = contrastRatio(state.fg, effectiveBg);
    const box = el.contrast;
    const text = box.querySelector('.contrastText');

    if (ratio === null) {
        box.className = 'contrast';
        text.textContent = 'Contrast unavailable';
        el.contrastNote.textContent = '';
        return;
    }

    const r = ratio.toFixed(1);
    if (ratio >= 7) {
        box.className = 'contrast good';
        text.textContent = `Contrast ${r}:1 — scans reliably`;
    } else if (ratio >= 3) {
        box.className = 'contrast warn';
        text.textContent = `Contrast ${r}:1 — may fail in low light or at distance`;
    } else {
        box.className = 'contrast bad';
        text.textContent = `Contrast ${r}:1 — likely unscannable`;
    }

    const notes = [];
    // Legal per spec, but plenty of scanners assume dark-on-light, so it earns
    // its own warning rather than being folded into the ratio.
    const fgRgb = parseHex(state.fg), bgRgb = parseHex(effectiveBg);
    if (fgRgb && bgRgb && relLuminance(fgRgb) > relLuminance(bgRgb)) {
        notes.push('Light dots on a dark background — some scanners won\'t read an inverted code.');
    }
    if (state.transparent) {
        notes.push('Contrast is measured against white. Check it against whatever you place it on.');
    }
    el.contrastNote.textContent = notes.join(' ');
}

function setColor(which, value) {
    const rgb = parseHex(value);
    const hexInput = which === 'fg' ? el.fgHex : el.bgHex;
    if (!rgb) {
        hexInput.classList.add('invalid');
        return;
    }
    hexInput.classList.remove('invalid');
    const hex = '#' + [rgb.r, rgb.g, rgb.b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    state[which] = hex;
    (which === 'fg' ? el.fg : el.bg).value = hex;
    updateContrast();
    render();
}

/* ── reserved centre ───────────────────────────────────────────────── */

function setReserve(on) {
    state.reserve = on;

    if (on) {
        // Clearing the centre destroys real modules, so the code only stays
        // readable at the highest error correction. Force it and say why.
        if (state.ecc !== 'H') state.eccBeforeReserve = state.ecc;
        state.ecc = 'H';
    } else {
        state.ecc = state.eccBeforeReserve;
        el.reserveNote.textContent = '';
    }

    lockEcc(on);
    render(); // fills in the reserve note, which needs the matrix size
}

function lockEcc(locked) {
    for (const btn of $('optEcc').querySelectorAll('.opt')) {
        btn.disabled = locked && btn.dataset.val !== 'H';
    }
    syncOptions('optEcc', 'ecc');
    el.eccNote.textContent = locked
        ? 'Held at High while space is reserved in the center.'
        : 'Higher = more easily detectable, but uses a more complex shape.';
}

/* ── logo animation ────────────────────────────────────────────────── */

/**
 * The same Lottie the main site runs (`/data.json`, one source of truth for the
 * mark). Loaded dynamically and last, so its ~165KB never delays the generator;
 * the inline SVG stays put until the animation is actually on screen, so any
 * failure just leaves the static mark.
 */
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

function initMarkAnimation() {
    const host = document.getElementById('qrMarkAnim');
    const mark = document.getElementById('qrMark');
    if (!host || !mark) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    Promise.all([
        import('./vendor/lottie-light.js'),
        fetch('/data.json').then((r) => {
            if (!r.ok) throw new Error(`data.json ${r.status}`);
            return r.json();
        }),
    ])
        .then(([{ default: lottie }, data]) => {
            // Drop the accent layer here rather than editing /data.json, which
            // the main site renders too — this page just wants the mono mark.
            data.layers = data.layers.filter((l) => !isAccentLayer(l));

            const anim = lottie.loadAnimation({
                container: host,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: data,
                rendererSettings: {
                    // The 1991x988 comp pads the wordmark, which would force a
                    // lot of dead space into the layout. The artwork's bounds
                    // are fixed across the whole timeline (nothing animates
                    // outside them), so cropping to them is safe and makes the
                    // animated mark sit at the same scale as the static one.
                    viewBoxSize: '191 271 1607 452',
                    preserveAspectRatio: 'xMidYMid meet',
                },
            });
            anim.addEventListener('DOMLoaded', () => mark.classList.add('animated'));
        })
        .catch(() => { /* static mark stands in */ });
}

/* ── export ────────────────────────────────────────────────────────── */

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportSvg() {
    if (!currentSvg) return;
    triggerDownload(new Blob([currentSvg], { type: 'image/svg+xml;charset=utf-8' }), `${fileBase()}.svg`);
}

function exportRaster(fmt) {
    if (!currentSvg) return;
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = EXPORT_PX;
        const ctx = canvas.getContext('2d');

        // JPEG has no alpha: without this fill an unpainted canvas comes out black.
        if (fmt === 'jpg') {
            ctx.fillStyle = state.transparent ? '#FFFFFF' : state.bg;
            ctx.fillRect(0, 0, EXPORT_PX, EXPORT_PX);
        }

        ctx.drawImage(img, 0, 0, EXPORT_PX, EXPORT_PX);
        const type = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
        canvas.toBlob((blob) => {
            if (blob) triggerDownload(blob, `${fileBase()}.${fmt}`);
        }, type, fmt === 'jpg' ? 0.92 : undefined);
    };
    img.onerror = () => {
        el.urlNote.classList.add('alert');
        el.urlNote.textContent = 'Could not rasterise the code — the SVG download still works.';
    };
    // Data URL rather than an object URL: keeps the canvas untainted so toBlob works.
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(currentSvg);
}

/* ── init ──────────────────────────────────────────────────────────── */

wireOptions('optDots', 'dots');
wireOptions('optMarkerBorder', 'markerBorder');
wireOptions('optMarkerCenter', 'markerCenter');
wireOptions('optEcc', 'ecc');

el.url.value = state.url;
el.url.addEventListener('input', () => {
    state.url = el.url.value;
    debouncedRender();
});

el.fg.addEventListener('input', () => {
    el.fgHex.value = el.fg.value.toUpperCase();
    setColor('fg', el.fg.value);
});
el.bg.addEventListener('input', () => {
    el.bgHex.value = el.bg.value.toUpperCase();
    setColor('bg', el.bg.value);
});
el.fgHex.addEventListener('input', () => setColor('fg', el.fgHex.value));
el.bgHex.addEventListener('input', () => setColor('bg', el.bgHex.value));

el.transparent.addEventListener('change', () => {
    state.transparent = el.transparent.checked;
    updateContrast();
    render();
});

el.reserve.addEventListener('change', () => setReserve(el.reserve.checked));

el.downloads.addEventListener('click', (e) => {
    const btn = e.target.closest('.dlBtn');
    if (!btn || btn.disabled) return;
    if (btn.dataset.fmt === 'svg') exportSvg();
    else exportRaster(btn.dataset.fmt);
});

updateContrast();
render();
initMarkAnimation();
