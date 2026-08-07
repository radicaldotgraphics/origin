/* Matrix -> styled SVG. Pure string building, no DOM, so it can be exercised
   standalone (see the checks in the project plan). */

// Quiet zone. Four modules is the spec minimum; not user-adjustable, because
// shrinking it is the single most common reason a pretty QR code won't scan.
export const MARGIN = 4;

/* ── geometry helpers ──────────────────────────────────────────────── */

const n = (v) => {
    const r = Math.round(v * 1000) / 1000;
    return Object.is(r, -0) ? 0 : r;
};

/** Circle as two half arcs — works inside a combined path. */
function circlePath(cx, cy, r) {
    return `M${n(cx - r)},${n(cy)}` +
           `a${n(r)},${n(r)} 0 1,0 ${n(r * 2)},0` +
           `a${n(r)},${n(r)} 0 1,0 ${n(-r * 2)},0z`;
}

function rectPath(x, y, w, h) {
    return `M${n(x)},${n(y)}h${n(w)}v${n(h)}h${n(-w)}z`;
}

/** N-pointed star centred on (cx, cy). */
function starPath(cx, cy, outer, inner, points = 5) {
    const step = Math.PI / points;
    let a = -Math.PI / 2;
    const pts = [];
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        pts.push(`${n(cx + Math.cos(a) * r)},${n(cy + Math.sin(a) * r)}`);
        a += step;
    }
    return `M${pts.join('L')}z`;
}

/** Heart centred on (cx, cy), drawn from a unit-box outline scaled by s. */
function heartPath(cx, cy, s) {
    const X = (u) => n(cx + (u - 0.5) * s);
    const Y = (v) => n(cy + (v - 0.5) * s);
    return `M${X(0.5)},${Y(0.94)}` +
           `C${X(0.5)},${Y(0.94)} ${X(0.04)},${Y(0.60)} ${X(0.04)},${Y(0.31)}` +
           `C${X(0.04)},${Y(0.12)} ${X(0.20)},${Y(0.04)} ${X(0.32)},${Y(0.04)}` +
           `C${X(0.42)},${Y(0.04)} ${X(0.50)},${Y(0.13)} ${X(0.50)},${Y(0.13)}` +
           `C${X(0.50)},${Y(0.13)} ${X(0.58)},${Y(0.04)} ${X(0.68)},${Y(0.04)}` +
           `C${X(0.80)},${Y(0.04)} ${X(0.96)},${Y(0.12)} ${X(0.96)},${Y(0.31)}` +
           `C${X(0.96)},${Y(0.60)} ${X(0.50)},${Y(0.94)} ${X(0.50)},${Y(0.94)}z`;
}

function roundedRectPath(x, y, w, h, r) {
    if (r <= 0) return rectPath(x, y, w, h);
    r = Math.min(r, w / 2, h / 2);
    return `M${n(x + r)},${n(y)}` +
           `h${n(w - r * 2)}a${n(r)},${n(r)} 0 0,1 ${n(r)},${n(r)}` +
           `v${n(h - r * 2)}a${n(r)},${n(r)} 0 0,1 ${n(-r)},${n(r)}` +
           `h${n(-(w - r * 2))}a${n(r)},${n(r)} 0 0,1 ${n(-r)},${n(-r)}` +
           `v${n(-(h - r * 2))}a${n(r)},${n(r)} 0 0,1 ${n(r)},${n(-r)}z`;
}

/* ── matrix helpers ────────────────────────────────────────────────── */

/** The three 7x7 finder patterns: top-left, top-right, bottom-left. */
export function finderOrigins(size) {
    return [[0, 0], [size - 7, 0], [0, size - 7]]; // [col, row]
}

/** True when (row, col) falls inside a finder pattern, which the dot loop skips. */
export function isFinderModule(row, col, size) {
    return (row < 7 && col < 7) ||
           (row < 7 && col >= size - 7) ||
           (row >= size - 7 && col < 7);
}

function isDark(matrix, row, col) {
    const s = matrix.size;
    if (row < 0 || col < 0 || row >= s || col >= s) return false;
    return !!matrix.get(row, col);
}

/* ── reserved centre ───────────────────────────────────────────────── */

/* How much of the code's width the cleared centre spans.
   Tuned by decoding the rendered output across QR versions 3-12, all three dot
   styles, down to 300px with blur to stand in for a camera read. Everything up
   to 0.42 decoded; 0.44 started failing on the smaller symbols. Held at 0.36 so
   there is margin for a real lens on printed material, which no synthetic test
   here reproduces. Only meaningful at error correction H, which is why the
   toggle forces it. */
export const RESERVE_FRACTION = 0.36;

/**
 * Side of the cleared centre square, in modules.
 * Kept odd so it centres exactly on a module boundary (QR sizes are odd).
 */
export function reserveSpan(size, fraction = RESERVE_FRACTION) {
    let span = Math.round(size * fraction);
    if (span % 2 === 0) span -= 1;
    return Math.max(0, span);
}

function makeReserve(size, fraction) {
    const span = reserveSpan(size, fraction);
    if (span <= 0) return null;
    const start = (size - span) / 2;
    return { start, end: start + span, span };
}

/* ── dot styles ────────────────────────────────────────────────────── */

const DOT_RADIUS = 0.42; // leaves a visible gap between neighbours
const ROUND_R = 0.5;

/* Hearts and stars cover less of their module than a square does, so they run
   slightly oversized to keep enough ink for a reader to threshold against.
   Both still centre solidly on the module, which is where decoders sample. */
const HEART_SCALE = 1.08;
const STAR_OUTER = 0.60;
const STAR_INNER = 0.25;

/** Rounded module whose corners square off against orthogonal neighbours,
    so runs of dark modules read as one continuous stroke. */
function roundedModulePath(matrix, row, col, painted) {
    const up = painted(row - 1, col);
    const down = painted(row + 1, col);
    const left = painted(row, col - 1);
    const right = painted(row, col + 1);

    const tl = (!up && !left) ? ROUND_R : 0;
    const tr = (!up && !right) ? ROUND_R : 0;
    const br = (!down && !right) ? ROUND_R : 0;
    const bl = (!down && !left) ? ROUND_R : 0;

    if (!tl && !tr && !br && !bl) return rectPath(col, row, 1, 1);

    const x = col, y = row;
    const seg = (r, dx, dy) => r > 0
        ? `a${n(r)},${n(r)} 0 0,1 ${n(dx)},${n(dy)}`
        : `l${n(dx)},${n(dy)}`;

    return `M${n(x + tl)},${n(y)}` +
           `h${n(1 - tl - tr)}` + seg(tr, tr, tr) +
           `v${n(1 - tr - br)}` + seg(br, -br, br) +
           `h${n(-(1 - br - bl))}` + seg(bl, -bl, -bl) +
           `v${n(-(1 - bl - tl))}` + seg(tl, tl, -tl) +
           `z`;
}

function modulePath(matrix, row, col, style, painted) {
    if (style === 'dots') return circlePath(col + 0.5, row + 0.5, DOT_RADIUS);
    if (style === 'hearts') return heartPath(col + 0.5, row + 0.5, HEART_SCALE);
    if (style === 'stars') return starPath(col + 0.5, row + 0.5, STAR_OUTER, STAR_INNER);
    if (style === 'rounded') return roundedModulePath(matrix, row, col, painted);
    return rectPath(col, row, 1, 1);
}

/* ── finder pattern styles ─────────────────────────────────────────── */

/** 7x7 ring, one module thick, drawn as outer shape + inner hole (even-odd). */
function markerBorderPath(x, y, style) {
    if (style === 'circle') {
        return circlePath(x + 3.5, y + 3.5, 3.5) + circlePath(x + 3.5, y + 3.5, 2.5);
    }
    if (style === 'rounded') {
        // inner radius trails the outer by the ring thickness, keeping it even
        return roundedRectPath(x, y, 7, 7, 2) + roundedRectPath(x + 1, y + 1, 5, 5, 1);
    }
    return rectPath(x, y, 7, 7) + rectPath(x + 1, y + 1, 5, 5);
}

/** 3x3 core, inset two modules from the ring. */
function markerCenterPath(x, y, style) {
    if (style === 'dot') return circlePath(x + 3.5, y + 3.5, 1.5);
    return rectPath(x + 2, y + 2, 3, 3);
}

/* ── main renderer ─────────────────────────────────────────────────── */

/**
 * @param {{size:number, get:(r:number,c:number)=>number}} matrix
 * @param {object} opts dots, markerBorder, markerCenter, fg, bg, transparent,
 *                      reserve (clear a centre square for a logo),
 *                      reserveFraction (override, for tuning)
 * @returns {string} standalone SVG markup
 */
export function renderSvg(matrix, opts) {
    const {
        dots = 'rounded',
        markerBorder = 'square',
        markerCenter = 'square',
        fg = '#000000',
        bg = '#FFFFFF',
        transparent = false,
        reserve = false,
        reserveFraction = RESERVE_FRACTION,
    } = opts || {};

    const size = matrix.size;
    const dim = size + MARGIN * 2;
    const px = dim * 10;

    const zone = reserve ? makeReserve(size, reserveFraction) : null;
    const inReserve = (row, col) =>
        !!zone && row >= zone.start && row < zone.end && col >= zone.start && col < zone.end;

    // What actually ends up painted, which is what the rounded style needs to
    // know about so its corners close off against the cleared area too.
    const painted = (row, col) =>
        !inReserve(row, col) && !isFinderModule(row, col, size) && isDark(matrix, row, col);

    const d = [];
    const markers = [];

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (isFinderModule(row, col, size)) continue;
            if (inReserve(row, col)) continue;
            if (!matrix.get(row, col)) continue;
            d.push(modulePath(matrix, row, col, dots, painted));
        }
    }

    for (const [x, y] of finderOrigins(size)) {
        markers.push(markerBorderPath(x, y, markerBorder));
        markers.push(markerCenterPath(x, y, markerCenter));
    }

    const out = [];
    out.push(
        `<svg xmlns="http://www.w3.org/2000/svg" ` +
        `viewBox="0 0 ${dim} ${dim}" width="${px}" height="${px}" shape-rendering="geometricPrecision">`
    );

    if (!transparent) {
        out.push(`<rect width="${dim}" height="${dim}" fill="${esc(bg)}"/>`);
    }

    // Two paths, because the fill rules differ. Modules use non-zero: the
    // oversized heart and star shapes overlap their neighbours, and even-odd
    // would punch holes through every overlap. Markers use even-odd, which is
    // what cuts the holes out of the finder rings.
    const shift = `translate(${MARGIN},${MARGIN})`;
    if (d.length) {
        out.push(`<path fill="${esc(fg)}" transform="${shift}" d="${d.join('')}"/>`);
    }
    out.push(
        `<path fill="${esc(fg)}" fill-rule="evenodd" transform="${shift}" d="${markers.join('')}"/>`
    );

    out.push('</svg>');
    return out.join('');
}

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── contrast ──────────────────────────────────────────────────────── */

/** #rgb or #rrggbb -> {r,g,b} 0-255, or null. */
export function parseHex(hex) {
    if (typeof hex !== 'string') return null;
    let h = hex.trim().replace(/^#/, '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
}

/** WCAG relative luminance. */
export function relLuminance(rgb) {
    const f = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(rgb.r) + 0.7152 * f(rgb.g) + 0.0722 * f(rgb.b);
}

/** WCAG contrast ratio, 1–21. Returns null on unparseable input. */
export function contrastRatio(hexA, hexB) {
    const a = parseHex(hexA), b = parseHex(hexB);
    if (!a || !b) return null;
    const la = relLuminance(a), lb = relLuminance(b);
    const hi = Math.max(la, lb), lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
}
