/* Binary Clock — UI wiring and the clock itself.
   Each bit is an orb (see clock.css). Colors come from the site sketch's
   palettes (/palettes.json); the darkest swatch becomes the night behind them. */

const STORE_KEY = 'bc-settings';
const MAX_D = 132; // largest orb diameter, px

const defaults = {
    hours: guessHourCycle(),
    layout: 'bcd',
    seconds: true,
    digits: false,
    mix: 'blend',
    auto: 'off',
    glow: 50,
    swirl: 50,
    sparkle: true,
    ghost: true,
    palette: null,
};

const state = { ...defaults, ...loadSettings() };

const $ = (id) => document.getElementById(id);

const el = {
    stage: $('bcStage'),
    clock: $('bcClock'),
    readout: $('bcReadout'),
    palette: $('bcPalette'),
    layoutNote: $('bcLayoutNote'),
    seconds: $('bcSeconds'),
    digits: $('bcDigits'),
    glow: $('bcGlow'), glowVal: $('bcGlowVal'),
    swirl: $('bcSwirl'), swirlVal: $('bcSwirlVal'),
    sparkle: $('bcSparkle'),
    ghost: $('bcGhost'),
    shuffle: $('bcShuffle'),
    full: $('bcFull'),
    exit: $('bcExit'),
};

let palettes = [
    // Stand-in until /palettes.json arrives, and the fallback if it doesn't.
    { name: 'fallback', colors: ['#051f39', '#4a2480', '#c53a9d', '#ff8e80'] },
];

/** Every orb on screen, with the unit it reads and the bit it shows. */
let orbs = [];
let digitEls = [];
let last = { h: -1, m: -1, s: -1 };

/* ── settings ──────────────────────────────────────────────────────── */

function guessHourCycle() {
    try {
        const hc = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle;
        return hc === 'h11' || hc === 'h12' ? '12' : '24';
    } catch { return '24'; }
}

function loadSettings() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}

function saveSettings() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* private mode */ }
}

/* ── color ─────────────────────────────────────────────────────────── */

function hexToRgb(hex) {
    const v = hex.replace('#', '');
    const n = parseInt(v.length === 3 ? v.replace(/./g, '$&$&') : v, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]) {
    return '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
}

function luminance(hex) {
    const [r, g, b] = hexToRgb(hex).map((c) => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function saturation(hex) {
    const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    return max === 0 ? 0 : (max - min) / max;
}

function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(A.map((c, i) => c + (B[i] - c) * t));
}

/**
 * Split a palette into a background and the colors the orbs glow in.
 * The darkest swatch is pushed most of the way to black so the glow reads;
 * swatches too dark to glow against it are left out of the orbs.
 */
function preparePalette(colors) {
    const sorted = [...colors].sort((a, b) => luminance(a) - luminance(b));
    const bg = mix(sorted[0], '#000000', 0.7);
    let lights = sorted.slice(1).filter((c) => luminance(c) > 0.035);
    if (!lights.length) lights = [mix(sorted[sorted.length - 1], '#ffffff', 0.5)];
    // Brightest-and-most-saturated first, so "mono" and group leads are lively.
    lights.sort((a, b) => saturation(b) + luminance(b) - (saturation(a) + luminance(a)));
    return { bg, lights };
}

let colorSet = preparePalette(palettes[0].colors);

/** The five blob colors for one orb. */
function orbColors(orb, i) {
    const L = colorSet.lights;
    const n = L.length;
    if (state.mix === 'mono') return [L[0], L[0], mix(L[0], '#ffffff', 0.25), L[0], mix(L[0], '#000000', 0.2)];
    if (state.mix === 'column') {
        const lead = L[orb.group % n];
        const next = L[(orb.group + 1) % n];
        return [lead, next, lead, mix(lead, '#ffffff', 0.2), next];
    }
    // blend: every orb carries the whole palette, each starting somewhere else.
    return [0, 1, 2, 3, 4].map((k) => L[(i * 2 + k) % n]);
}

function applyColors() {
    el.stage.style.setProperty('--bg', colorSet.bg);
    orbs.forEach((orb, i) => {
        orbColors(orb, i).forEach((c, k) => orb.node.style.setProperty(`--c${k + 1}`, c));
    });
}

function renderPaletteChips() {
    const pal = palettes[state.palette] || palettes[0];
    el.palette.replaceChildren(...pal.colors.map((c) => {
        const s = document.createElement('span');
        s.style.background = c;
        s.title = c.toUpperCase();
        return s;
    }));
}

function shuffle() {
    if (palettes.length > 1) {
        let next;
        do { next = Math.floor(Math.random() * palettes.length); } while (next === state.palette);
        state.palette = next;
    } else {
        state.palette = 0;
    }
    usePalette();
    saveSettings();
}

function usePalette() {
    const pal = palettes[state.palette] || palettes[0];
    colorSet = preparePalette(pal.colors);
    renderPaletteChips();
    applyColors();
}

/* ── building the clock ────────────────────────────────────────────── */

const SPARKLE = 'M40 4C44.5 28.5 51.5 35.5 76 40C51.5 44.5 44.5 51.5 40 76C35.5 51.5 28.5 44.5 4 40C28.5 35.5 35.5 28.5 40 4Z';

function makeOrb() {
    const node = document.createElement('div');
    node.className = 'orb';
    const blobs = '<span class="orb__blob blobA"></span><span class="orb__blob blobB"></span>'
        + '<span class="orb__blob blobC"></span><span class="orb__blob blobD"></span>'
        + '<span class="orb__blob blobE"></span>';
    node.innerHTML =
        `<div class="orb__glow orb__glow--background">${blobs}</div>`
        + `<div class="orb__glow orb__glow--foreground">${blobs}</div>`
        + '<div class="orb__face">'
        + `<svg class="orb__sparkle" viewBox="0 0 80 80"><path d="${SPARKLE}" fill="currentColor"/></svg>`
        + `<svg class="orb__sparkle orb__sparkle--small" viewBox="0 0 80 80"><path d="${SPARKLE}" fill="currentColor"/></svg>`
        + '</div>';
    // Desync the swirls and twinkles so the orbs don't move in lockstep.
    const [bgGlow, fgGlow] = node.querySelectorAll('.orb__glow');
    bgGlow.style.animationDelay = `${-Math.random() * 20}s`;
    fgGlow.style.animationDelay = `${-Math.random() * 20}s`;
    bgGlow.style.rotate = fgGlow.style.rotate = `${Math.random() * 360}deg`;
    node.style.setProperty('--tw', `${-Math.random() * 5}s`);
    return node;
}

function makeDigit() {
    const d = document.createElement('span');
    d.className = 'digit';
    return d;
}

/** Units on screen: hours, minutes, and (optionally) seconds. */
function units() {
    return state.seconds ? ['h', 'm', 's'] : ['h', 'm'];
}

function build() {
    orbs = [];
    digitEls = [];
    last = { h: -1, m: -1, s: -1 };
    el.clock.replaceChildren();
    el.clock.className = state.layout === 'rows' ? 'rows' : '';

    units().forEach((u, ui) => {
        const unit = document.createElement('div');
        unit.className = 'unit';

        if (state.layout === 'rows') {
            // One row per unit, 32 down to 1.
            for (let bit = 5; bit >= 0; bit--) {
                const node = makeOrb();
                unit.append(node);
                orbs.push({ node, unit: u, place: 'all', bit, group: ui });
            }
            const d = makeDigit();
            unit.append(d);
            digitEls.push({ node: d, unit: u, place: 'all' });
        } else {
            // One column per digit; tens of hours needs 1 bit (12h) or 2 (24h).
            const heights = { h: [state.hours === '12' ? 1 : 2, 4], m: [3, 4], s: [3, 4] }[u];
            ['tens', 'ones'].forEach((place, pi) => {
                const col = document.createElement('div');
                col.className = 'col';
                const d = makeDigit();
                col.append(d); // column-reverse: first child sits at the bottom
                digitEls.push({ node: d, unit: u, place });
                for (let bit = 0; bit < heights[pi]; bit++) {
                    const node = makeOrb();
                    col.append(node);
                    orbs.push({ node, unit: u, place, bit, group: ui * 2 + pi });
                }
                unit.append(col);
            });
        }
        el.clock.append(unit);
    });

    applyLook();
    applyColors();
    fit();
    tick();
}

/* ── look ──────────────────────────────────────────────────────────── */

function applyLook() {
    const c = el.clock;
    c.classList.toggle('digits', state.digits);
    c.classList.toggle('noSparkle', !state.sparkle);
    c.classList.toggle('noGhost', !state.ghost);
    c.style.setProperty('--glow', String(state.glow / 100));

    const speed = state.swirl / 50; // 1× at the midpoint
    if (speed <= 0) {
        c.style.setProperty('--play', 'paused');
    } else {
        c.style.setProperty('--play', 'running');
        c.style.setProperty('--spinA', `${(16 / speed).toFixed(2)}s`);
        c.style.setProperty('--spinB', `${(11 / speed).toFixed(2)}s`);
    }

    el.glowVal.textContent = `${state.glow}%`;
    el.swirlVal.textContent = speed <= 0 ? 'Still' : `${speed.toFixed(1)}×`;

    el.layoutNote.textContent = state.layout === 'rows'
        ? 'Each row is a whole number. Left to right: 32 16 8 4 2 1.'
        : 'Each column is one digit. Bottom to top: 1 2 4 8.';
}

/** Size the orbs to the stage, leaving room for the glow to spill. */
function fit() {
    const W = el.stage.clientWidth;
    const H = el.stage.clientHeight;
    if (!W || !H) return;
    const g = 0.55;
    const n = units().length;
    let wc, hc;
    if (state.layout === 'rows') {
        wc = 6 + 5 * g + (state.digits ? 1.6 : 0) + 2;
        hc = n + (n - 1) * g + 2;
    } else {
        const cols = n * 2;
        wc = cols + n * g + (n - 1) * g * 2.2 + 2;
        hc = 4 + 3 * g + (state.digits ? 0.9 : 0) + 2.2;
    }
    const d = Math.max(10, Math.min(MAX_D, W / wc, H / hc));
    el.clock.style.setProperty('--d', `${d.toFixed(1)}px`);
}

/* ── time ──────────────────────────────────────────────────────────── */

function readTime() {
    const now = new Date();
    let h = now.getHours();
    const pm = h >= 12;
    if (state.hours === '12') h = h % 12 || 12;
    return { h, m: now.getMinutes(), s: now.getSeconds(), pm };
}

function valueFor(t, unit, place) {
    const v = t[unit];
    if (place === 'tens') return Math.floor(v / 10);
    if (place === 'ones') return v % 10;
    return v;
}

function tick() {
    const t = readTime();

    for (const orb of orbs) {
        const on = ((valueFor(t, orb.unit, orb.place) >> orb.bit) & 1) === 1;
        if (orb.node.classList.contains('on') !== on) orb.node.classList.toggle('on', on);
    }

    for (const d of digitEls) {
        const v = valueFor(t, d.unit, d.place);
        d.node.textContent = d.place === 'all' ? String(v).padStart(2, '0') : String(v);
    }

    el.readout.textContent = state.hours === '12' ? (t.pm ? 'PM' : 'AM') : '';

    if (last.m !== -1) {
        if (state.auto === 'minute' && t.m !== last.m) shuffle();
        if (state.auto === 'hour' && t.h !== last.h) shuffle();
    }

    if (t.m !== last.m || t.h !== last.h) {
        const label = `${t.h}:${String(t.m).padStart(2, '0')}${state.hours === '12' ? (t.pm ? ' PM' : ' AM') : ''}`;
        el.stage.setAttribute('aria-label', `Binary clock showing ${label}`);
    }

    last = { h: t.h, m: t.m, s: t.s };
}

/** Tick on the second boundary rather than drifting with setInterval. */
function schedule() {
    tick();
    setTimeout(() => requestAnimationFrame(schedule), 1000 - (Date.now() % 1000) + 5);
}

/* ── fullscreen ────────────────────────────────────────────────────── */

const canFullscreen = !!(el.stage.requestFullscreen || el.stage.webkitRequestFullscreen);
let wakeLock = null;
let idleTimer = 0;

function isFull() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement)
        || el.stage.classList.contains('pseudo');
}

function toggleFullscreen() {
    if (isFull()) {
        if (el.stage.classList.contains('pseudo')) {
            el.stage.classList.remove('pseudo');
            onFullChange();
        } else {
            (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        }
        return;
    }
    if (canFullscreen) {
        const req = el.stage.requestFullscreen || el.stage.webkitRequestFullscreen;
        Promise.resolve(req.call(el.stage)).catch(() => {
            el.stage.classList.add('pseudo');
            onFullChange();
        });
    } else {
        el.stage.classList.add('pseudo');
        onFullChange();
    }
}

async function onFullChange() {
    const full = isFull();
    el.stage.classList.toggle('full', full);
    el.full.textContent = full ? 'Exit fullscreen' : 'Fullscreen';
    poke();
    requestAnimationFrame(fit);

    // A clock on the wall shouldn't let the screen go to sleep.
    try {
        if (full && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
        else if (wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch { /* not allowed here; the clock still runs */ }
}

/** Any movement brings the cursor and exit control back for a moment. */
function poke() {
    el.stage.classList.remove('idle');
    clearTimeout(idleTimer);
    if (isFull()) idleTimer = setTimeout(() => el.stage.classList.add('idle'), 2500);
}

document.addEventListener('fullscreenchange', onFullChange);
document.addEventListener('webkitfullscreenchange', onFullChange);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isFull() && !wakeLock) onFullChange();
});
el.stage.addEventListener('pointermove', poke);
el.stage.addEventListener('dblclick', toggleFullscreen);
el.full.addEventListener('click', toggleFullscreen);
el.exit.addEventListener('click', toggleFullscreen);

/* ── controls ──────────────────────────────────────────────────────── */

function wireOptions(containerId, key, after) {
    const row = $(containerId);
    const sync = () => {
        for (const btn of row.querySelectorAll('.opt')) {
            btn.setAttribute('aria-checked', String(btn.dataset.val === state[key]));
        }
    };
    row.addEventListener('click', (e) => {
        const btn = e.target.closest('.opt');
        if (!btn) return;
        state[key] = btn.dataset.val;
        sync();
        saveSettings();
        after();
    });
    sync();
}

function wireCheck(input, key, after) {
    input.checked = state[key];
    input.addEventListener('change', () => {
        state[key] = input.checked;
        saveSettings();
        after();
    });
}

function wireRange(input, key) {
    input.value = state[key];
    input.addEventListener('input', () => {
        state[key] = Number(input.value);
        applyLook();
    });
    input.addEventListener('change', saveSettings);
}

wireOptions('optHours', 'hours', build);
wireOptions('optLayout', 'layout', build);
wireOptions('optMix', 'mix', applyColors);
wireOptions('optAuto', 'auto', () => {});
wireCheck(el.seconds, 'seconds', build);
wireCheck(el.digits, 'digits', () => { applyLook(); fit(); });
wireCheck(el.sparkle, 'sparkle', applyLook);
wireCheck(el.ghost, 'ghost', applyLook);
wireRange(el.glow, 'glow');
wireRange(el.swirl, 'swirl');

el.shuffle.addEventListener('click', shuffle);

window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.code === 'Space' && tag !== 'BUTTON') {
        e.preventDefault();
        shuffle();
    } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
    } else if (e.key === 'Escape' && el.stage.classList.contains('pseudo')) {
        toggleFullscreen();
    }
});

new ResizeObserver(fit).observe(el.stage);

/* ── logo animation ────────────────────────────────────────────────── */

/** True when a layer paints with the lavender accent rather than the ink colour. */
function isAccentLayer(layer) {
    let accent = false;
    (function walk(node) {
        if (accent || !node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(walk); return; }
        if (node.ty === 'fl' && node.c && Array.isArray(node.c.k)) {
            const [r, g, b] = node.c.k;
            if (r + g + b > 1.5) accent = true;
        }
        Object.values(node).forEach(walk);
    })(layer);
    return accent;
}

/** The site's animated mark, loaded last; the inline SVG covers any failure. */
function initMarkAnimation() {
    const host = $('bcMarkAnim');
    const mark = $('bcMark');
    if (!host || !mark) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    Promise.all([
        import('/qrcode/vendor/lottie-light.js'),
        fetch('/data.json').then((r) => {
            if (!r.ok) throw new Error(`data.json ${r.status}`);
            return r.json();
        }),
    ])
        .then(([{ default: lottie }, data]) => {
            data.layers = data.layers.filter((l) => !isAccentLayer(l));
            const anim = lottie.loadAnimation({
                container: host,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: data,
                rendererSettings: {
                    viewBoxSize: '191 271 1607 452',
                    preserveAspectRatio: 'xMidYMid meet',
                },
            });
            anim.addEventListener('DOMLoaded', () => mark.classList.add('animated'));
        })
        .catch(() => { /* static mark stands in */ });
}

/* ── start ─────────────────────────────────────────────────────────── */

build();
schedule();

fetch('/palettes.json')
    .then((r) => {
        if (!r.ok) throw new Error(`palettes.json ${r.status}`);
        return r.json();
    })
    .then((list) => {
        const valid = list.filter((p) => Array.isArray(p.colors) && p.colors.length >= 2);
        if (!valid.length) return;
        palettes = valid;
        if (!(state.palette >= 0 && state.palette < palettes.length)) {
            state.palette = Math.floor(Math.random() * palettes.length);
        }
        usePalette();
    })
    .catch(() => { state.palette = 0; usePalette(); });

initMarkAnimation();
