/* Screenshot prettifier — the compositor.
   Preview and export share this one draw path, so what you see on the stage is
   exactly what lands in the file.

   Every dimension is computed in "base units" (the screenshot's own pixels) and
   multiplied by an explicit `s` at draw time rather than going through
   ctx.scale(). Canvas shadowBlur is not reliably transformed by the CTM across
   browsers — scaling by hand is the only way preview and export agree. */

/* The full control state, and the only definition of it — the editor and the
   extension popup both start from this. */
export const DEFAULT_STATE = {
    pad: 28,
    radius: 22,
    shadow: 45,
    shadowOpacity: 35,
    ratio: 'auto',
    bgType: 'gradient',
    bgColor: '#EAEAEA',
    gradA: '#8E7CFF',
    gradB: '#FF9AA2',
    gradAngle: 135,
    bgImageId: null,
    frame: 'none',
    scale: 1,
};

/* Chrome will hand back a canvas it can't actually allocate, which exports as
   blank rather than failing — so cap the pixel count ourselves. */
export const MAX_EXPORT_PIXELS = 32e6;

/**
 * A copy of `source` composited onto an opaque colour.
 *
 * Needed wherever alpha can't survive the trip out: JPEG has no alpha channel
 * at all, and Chrome's clipboard silently drops it — transparent pixels arrive
 * black in whatever you paste into. Flattening to white is the difference
 * between "looks deliberate" and "looks broken".
 */
export function flatten(source, color = '#FFFFFF') {
    const out = document.createElement('canvas');
    out.width = source.width;
    out.height = source.height;
    const ctx = out.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(source, 0, 0);
    return out;
}

/**
 * The largest scale at or below `scale` that stays inside the canvas ceiling.
 * Returns the requested scale untouched in the normal case.
 */
export function clampScale(L, scale) {
    const pixels = L.W * scale * L.H * scale;
    return pixels > MAX_EXPORT_PIXELS
        ? scale * Math.sqrt(MAX_EXPORT_PIXELS / pixels)
        : scale;
}

/* width / height. `auto` lets the padded screenshot set its own shape. */
export const RATIOS = {
    auto: null,
    '16:9': 16 / 9,
    '4:3': 4 / 3,
    '1:1': 1,
    '4:5': 4 / 5,
};

/* Sliders all run 0–100; these turn that into a fraction of the screenshot's
   own size, so a 700px shot and a 3000px retina shot look the same at the same
   setting. */
const PAD_MAX = 0.30;   // of the longer edge, per side
const RADIUS_MAX = 0.09; // of the shorter edge
const BLUR_MAX = 0.14;  // of the longer edge
const FRAME_RATIO = 0.032; // title bar height, of the screenshot width

export function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}

/**
 * Work out the output box and where the screenshot sits inside it, in base units.
 * The card is the screenshot plus any window frame — it is what gets the corner
 * radius and the shadow, so the frame and the image round together.
 */
export function computeLayout(state, imgW, imgH) {
    const longEdge = Math.max(imgW, imgH);
    const shortEdge = Math.min(imgW, imgH);

    const pad = (state.pad / 100) * PAD_MAX * longEdge;
    const frameH = state.frame === 'none' ? 0 : imgW * FRAME_RATIO;

    const cardW = imgW;
    const cardH = imgH + frameH;

    let W = cardW + pad * 2;
    let H = cardH + pad * 2;

    // A locked ratio only ever grows the deficient axis — the screenshot is
    // never cropped or squashed to fit.
    const target = RATIOS[state.ratio];
    if (target) {
        if (W / H < target) W = H * target;
        else H = W / target;
    }

    const cardX = (W - cardW) / 2;
    const cardY = (H - cardH) / 2;

    return {
        W, H,
        cardX, cardY, cardW, cardH,
        imgX: cardX,
        imgY: cardY + frameH,
        imgW, imgH,
        frameH,
        radius: (state.radius / 100) * RADIUS_MAX * shortEdge,
        blur: (state.shadow / 100) * BLUR_MAX * longEdge,
    };
}

/** Endpoints for a CSS-style gradient angle (0° = up, sweeping clockwise). */
function gradientLine(ctx, angleDeg, w, h) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    const cx = w / 2, cy = h / 2;
    // Project the box onto the gradient axis so the stops always reach the corners.
    const len = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
    const dx = (Math.cos(rad) * len) / 2;
    const dy = (Math.sin(rad) * len) / 2;
    return ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
}

function drawCheckerboard(ctx, W, H, cell) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e6e6e6';
    for (let y = 0; y < H; y += cell) {
        for (let x = 0; x < W; x += cell) {
            if (((x / cell) | 0) % 2 === ((y / cell) | 0) % 2) continue;
            ctx.fillRect(x, y, cell, cell);
        }
    }
}

function drawBackground(ctx, state, L, s, bgImg, checker) {
    const W = L.W * s, H = L.H * s;

    if (state.bgType === 'transparent') {
        if (checker) drawCheckerboard(ctx, W, H, Math.max(8, Math.round(10 * s)));
        return;
    }

    if (state.bgType === 'image' && bgImg) {
        // Cover: fill the box, centre-crop the overflow.
        const scale = Math.max(W / bgImg.width, H / bgImg.height);
        const dw = bgImg.width * scale, dh = bgImg.height * scale;
        ctx.drawImage(bgImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
        return;
    }

    if (state.bgType === 'gradient') {
        const g = gradientLine(ctx, state.gradAngle, W, H);
        g.addColorStop(0, state.gradA);
        g.addColorStop(1, state.gradB);
        ctx.fillStyle = g;
    } else {
        ctx.fillStyle = state.bgColor;
    }
    ctx.fillRect(0, 0, W, H);
}

const LIGHT_BAR = '#f0f0f0';
const DARK_BAR = '#2c2c2e';
const LIGHT_RULE = 'rgba(0,0,0,0.10)';
const DARK_RULE = 'rgba(255,255,255,0.10)';
const TRAFFIC = ['#ff5f57', '#febc2e', '#28c840'];

function drawFrame(ctx, state, L, s) {
    if (!L.frameH) return;
    const dark = state.frame === 'dark';
    const x = L.cardX * s, y = L.cardY * s;
    const w = L.cardW * s, h = L.frameH * s;

    ctx.fillStyle = dark ? DARK_BAR : LIGHT_BAR;
    ctx.fillRect(x, y, w, h);

    // Hairline between chrome and screenshot, so a white page doesn't merge
    // into a light title bar.
    ctx.fillStyle = dark ? DARK_RULE : LIGHT_RULE;
    ctx.fillRect(x, y + h - Math.max(1, s), w, Math.max(1, s));

    const r = h * 0.16;
    const gap = h * 0.5;
    let cx = x + h * 0.62;
    for (const color of TRAFFIC) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, y + h / 2, r, 0, Math.PI * 2);
        ctx.fill();
        cx += gap;
    }
}

/**
 * Paint one full scene.
 * @param {CanvasRenderingContext2D} ctx target, already sized to L.W*s × L.H*s
 * @param {object}   o.state    control state
 * @param {object}   o.layout   from computeLayout
 * @param {number}   o.s        base-unit multiplier
 * @param {*}        o.img      the screenshot (Image/ImageBitmap/Canvas)
 * @param {*}       [o.bgImg]   background image, when bgType is 'image'
 * @param {boolean} [o.checker] draw a checkerboard behind a transparent
 *                              background — preview only, never in an export
 */
export function drawScene(ctx, { state, layout: L, s, img, bgImg, checker = false }) {
    ctx.clearRect(0, 0, L.W * s, L.H * s);
    drawBackground(ctx, state, L, s, bgImg, checker);

    const x = L.cardX * s, y = L.cardY * s;
    const w = L.cardW * s, h = L.cardH * s;
    const r = L.radius * s;
    const blur = L.blur * s;

    if (blur > 0 && state.shadowOpacity > 0) {
        ctx.save();
        ctx.shadowColor = `rgba(0,0,0,${state.shadowOpacity / 100})`;
        ctx.shadowBlur = blur;
        ctx.shadowOffsetY = blur * 0.35;
        // Canvas can only throw a shadow from something it draws, so this fills
        // the card silhouette purely to cast one.
        ctx.fillStyle = '#000';
        const spread = blur * 0.06;
        roundRectPath(ctx, x + spread, y + spread, w - spread * 2, h - spread * 2, Math.max(0, r - spread));
        ctx.fill();
        ctx.restore();

        // That caster is opaque black, and a screenshot with transparency of its
        // own would show it through — black gaps where the source was clear.
        // Wipe it and reinstate whatever belongs inside the card: the background
        // for a solid/gradient/image matte, nothing at all for a transparent one
        // (drawBackground no-ops there, leaving real alpha), or the checkerboard
        // when this is the on-screen preview.
        ctx.save();
        roundRectPath(ctx, x, y, w, h, r);
        ctx.clip();
        ctx.clearRect(x, y, w, h);
        drawBackground(ctx, state, L, s, bgImg, checker);
        ctx.restore();
    }

    ctx.save();
    roundRectPath(ctx, x, y, w, h, r);
    ctx.clip();
    drawFrame(ctx, state, L, s);
    ctx.drawImage(img, L.imgX * s, L.imgY * s, L.imgW * s, L.imgH * s);
    ctx.restore();
}
