/* Undertone — reads an image left-to-right as a two-bar loop.
   Vertical edges become drum hits, dark roundish blobs become notes. */

(() => {
    'use strict';

    const STEPS = 32;            // 2 bars of 16ths
    const ANALYSIS_MAX = 360;    // longest side of the analysis raster
    const MAX_NOTES = 96;
    const MAX_BEATS = 32;
    const MIN_BEATS = 3;        // silence reads as broken, not as restraint
    const NOTES_PER_STEP = 3;   // a step is a chord, not a pile-up
    const MIN_NOTES = 6;        // every image sings, even a soft one
    const BUSY_NOTES = 60;      // ...and a busy one sings a lot
    const BUSY_DETAIL = 0.25;   // edge density that counts as "busy"
    const POP_MS = 420;         // how long a dot takes to grow to size on arrival
    const OVERLAY = 0.82;       // analysis layers ride over the photo, not instead of it
    const GHOST = 0.4;          // how much photo stays under the finished score

    const SCALES = {
        minorPent: [0, 3, 5, 7, 10],
        majorPent: [0, 2, 4, 7, 9],
        insen:     [0, 1, 5, 7, 10],
    };
    const BASE_FREQ = 110; // A2
    const OCTAVES = 2;

    // ---------- state ----------

    const state = {
        img: null,          // source ImageBitmap/canvas at analysis size
        gray: null,         // Float32Array luminance
        edgeC: null,        // Sobel view, drawn during the intro reveal
        quantC: null,       // Otsu two-tone view, ditto
        W: 0, H: 0,
        beats: [],          // { x, strength (0..1), step }
        notes: [],          // { x, y, r, strength (0..1), step, flashAt, popAt }
        playing: false,
        bpm: 96,
        scale: 'minorPent',
        root: 0,            // semitones from A, chosen by the image's dominant hue
        light: 0.5,         // mean lightness 0..1, the reading behind the register
        lineSens: 0.5,
        dotSens: 0.5,
    };

    // ---------- dom ----------

    const $ = (id) => document.getElementById(id);
    const canvas = $('utCanvas');
    const cx = canvas.getContext('2d');
    const els = {
        wrap: $('utCanvasWrap'), drop: $('utDrop'), play: $('utPlay'),
        playIcon: $('utPlayIcon'), stopIcon: $('utStopIcon'), playLabel: $('utPlayLabel'),
        stats: $('utStats'), tempo: $('utTempo'), tempoVal: $('utTempoVal'),
        scale: $('utScale'), lineSens: $('utLineSens'), dotSens: $('utDotSens'),
        file: $('utFile'), browse: $('utBrowse'), sample: $('utSample'), newBtn: $('utNew'),
        dropInner: $('utDropInner'), picker: $('utPicker'), pickerGrid: $('utPickerGrid'),
        pickerBack: $('utPickerBack'),
        library: $('utLibrary'), libraryCtl: $('utLibraryCtl'),
    };

    // ---------- image library ----------

    // Samples ship with their own small thumbnails so the strip and the picker
    // cost a few KB instead of pulling every full-size sample on page load.
    const SAMPLES = [
        { file: 'sample-tree.webp',  thumb: 'sample-tree-thumb.webp',  name: 'Tree' },
        { file: 'sample-ocean.webp', thumb: 'sample-ocean-thumb.webp', name: 'Ocean' },
        { file: 'sample-shape.webp', thumb: 'sample-shape-thumb.webp', name: 'Shape' },
        { file: 'sample-cover.webp', thumb: 'sample-cover-thumb.webp', name: 'Cover' },
        { file: 'sample-mark.webp',  thumb: 'sample-mark-thumb.webp',  name: 'Mark' },
    ];

    const library = SAMPLES.map(s => ({
        key: `s:${s.file}`, src: s.file, thumb: s.thumb, name: s.name, sample: true,
    }));
    let currentKey = null;
    let setScaleButton = null;   // assigned when the control panel is wired up
    let setLineSensButton = null;
    let setDotSensButton = null;

    function makeThumb(img) {
        const S = 92;
        const c = document.createElement('canvas');
        c.width = S; c.height = S;
        const g = c.getContext('2d');
        const sw = img.naturalWidth || img.width, sh = img.naturalHeight || img.height;
        const k = Math.max(S / sw, S / sh); // cover
        g.drawImage(img, (S - sw * k) / 2, (S - sh * k) / 2, sw * k, sh * k);
        return c.toDataURL('image/jpeg', 0.72);
    }

    function libraryAdd(entry) {
        library.push(entry);
        renderLibrary();
    }

    function libraryRemove(key) {
        const i = library.findIndex(e => e.key === key);
        if (i < 0) return;
        const [gone] = library.splice(i, 1);
        if (gone.owned) URL.revokeObjectURL(gone.src);
        // the picture on the canvas stays; only the way back to it is gone
        if (currentKey === key) currentKey = null;
        renderLibrary();
    }

    function renderLibrary() {
        els.library.textContent = '';
        for (const e of library) {
            const item = document.createElement('div');
            item.className = 'libItem' + (e.key === currentKey ? ' current' : '');

            const pick = document.createElement('button');
            pick.type = 'button';
            pick.className = 'pick';
            pick.title = e.name;
            pick.setAttribute('aria-label', `Play ${e.name}`);
            pick.style.backgroundImage = `url("${e.thumb}")`;
            pick.addEventListener('click', () => openEntry(e));

            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'del';
            del.textContent = '×';
            del.title = `Remove ${e.name}`;
            del.setAttribute('aria-label', `Remove ${e.name}`);
            del.addEventListener('click', (ev) => { ev.stopPropagation(); libraryRemove(e.key); });

            item.append(pick, del);
            els.library.append(item);
        }

        // trailing tile: the same door as "New image" in the header, kept here
        // so the row is never a dead end once everything has been deleted
        const add = document.createElement('div');
        add.className = 'libItem';
        const plus = document.createElement('button');
        plus.type = 'button';
        plus.className = 'addBtn';
        plus.textContent = '+';
        plus.title = 'Add an image';
        plus.setAttribute('aria-label', 'Add an image');
        plus.addEventListener('click', () => els.file.click());
        add.append(plus);
        els.library.append(add);
    }

    function openEntry(e) {
        unlockAudio();
        loadImage(e.src, (img) => show(e.key, img), e.sample ? makeSample : null);
    }

    function show(key, img) {
        currentKey = key;
        renderLibrary();
        acceptImage(img);
    }

    // ---------- sample picker ----------

    // Driven by SAMPLES rather than by the library: deleting a sample from the
    // strip clears it from the history, but "try a sample" must still offer it,
    // or the row's delete button could empty the picker for good.
    function sampleEntry(s) {
        const key = `s:${s.file}`;
        return library.find(e => e.key === key)
            || { key, src: s.file, thumb: s.thumb, name: s.name, sample: true };
    }

    function renderPicker() {
        els.pickerGrid.textContent = '';
        for (const s of SAMPLES) {
            const e = sampleEntry(s);
            const b = document.createElement('button');
            b.type = 'button';
            b.title = e.name;
            b.setAttribute('aria-label', e.name);
            const im = document.createElement('img');
            im.src = e.thumb;
            im.alt = e.name;
            b.append(im);
            b.addEventListener('click', () => {
                hidePicker();
                if (!library.some(x => x.key === e.key)) libraryAdd(e); // back into the history
                openEntry(e);
            });
            els.pickerGrid.append(b);
        }
    }

    function showPicker() {
        renderPicker();
        els.dropInner.hidden = true;
        els.picker.hidden = false;
    }

    function hidePicker() {
        els.picker.hidden = true;
        els.dropInner.hidden = false;
    }

    // ---------- colour ----------

    // Hue is an angle, and it is meaningless on a pixel with no colour in it:
    // sensor noise swings a near-grey pixel right round the wheel. So this is a
    // saturation-weighted histogram, not an average — an average would read
    // that noise as signal, and averaging 350° with 10° would land on cyan,
    // the opposite of both. Near-black and near-white are skipped for the same
    // reason: their hue is not trustworthy either.
    function readColour(data, n) {
        const BINS = 36;
        const hues = new Float64Array(BINS);
        const satHist = new Uint32Array(101);
        let weight = 0, used = 0;

        let lightSum = 0;

        for (let i = 0; i < n; i++) {
            const r = data[i * 4] / 255, g = data[i * 4 + 1] / 255, b = data[i * 4 + 2] / 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            const l = (max + min) / 2;
            lightSum += l;                  // every pixel counts towards register
            if (l < 0.12 || l > 0.94) continue;
            used++;

            const d = max - min;
            const s = max > 0 ? d / max : 0;
            satHist[Math.round(s * 100)]++;
            if (d <= 0) continue;

            let h;
            if (max === r) h = ((g - b) / d) % 6;
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h = (h * 60 + 360) % 360;

            const w = s * s;                 // vivid pixels get the loudest vote
            hues[Math.floor(h / (360 / BINS)) % BINS] += w;
            weight += w;
        }

        // "how vivid is this picture where it has any colour at all"
        let cum = 0, sat = 0;
        const target = used * 0.75;
        for (let i = 0; i <= 100; i++) { cum += satHist[i]; if (cum >= target) { sat = i / 100; break; } }

        // dominant hue: the tallest bin, nudged towards whichever neighbour is
        // heavier so the reading is finer than the 10° buckets
        let p = 0;
        for (let i = 1; i < BINS; i++) if (hues[i] > hues[p]) p = i;
        const a = hues[(p + BINS - 1) % BINS], c = hues[p], e = hues[(p + 1) % BINS];
        const nudge = (e - a) / (a + c + e || 1);
        const hue = ((p + 0.5 + nudge) * (360 / BINS) + 360) % 360;

        return { hue, sat, colourfulness: used ? weight / used : 0, light: lightSum / n };
    }

    // Colour picks the key and the flavour; height still picks the note, so the
    // score stays readable. Measured across the samples: greyscale sits at 0
    // colourfulness, a muted photograph around 0.04, vivid artwork above 0.2.
    const ACHROMATIC = 0.008;

    function paletteFor(colour) {
        // Hue walks the twelve keys, red sitting on the A the tool already used.
        // Below the floor there is no real hue to read, so the key stays put.
        let root = 0;
        if (colour.colourfulness >= ACHROMATIC) {
            root = Math.round(colour.hue / 30) % 12;
            if (root > 5) root -= 12;        // keep the register near A2
        }

        // Saturation is a real reading even at zero — a picture with no colour
        // in it is austere, and should sound that way. But in-sen is a strong
        // flavour, reserved for the truly drained image; anything with ordinary
        // colour in it lands minor or major.
        const scale = colour.sat < 0.10 ? 'insen'
                    : colour.sat < 0.65 ? 'minorPent'
                    : 'majorPent';

        // Lightness moves the register rather than the key, so two pictures of
        // the same colour still separate — a dark one plays an octave below a
        // pale one — while "red is A" stays true, since an octave does not
        // change the note's name.
        const octave = colour.light < 0.40 ? -1 : colour.light > 0.62 ? 1 : 0;

        return { root: root + octave * 12, scale };
    }

    const NOTE_NAMES = ['A', 'A\u266F', 'B', 'C', 'C\u266F', 'D', 'D\u266F', 'E', 'F', 'F\u266F', 'G', 'G\u266F'];
    const SCALE_NAMES = { minorPent: 'minor', majorPent: 'major', insen: 'in-sen' };

    function keyName() {
        return `${NOTE_NAMES[((state.root % 12) + 12) % 12]} ${SCALE_NAMES[state.scale]}`;
    }

    // ---------- image intake ----------

    // Playback starts at the end of the reveal, seconds after the gesture that
    // brought the image in — so unlock the context while the gesture is live.
    function unlockAudio() {
        audioInit();
        if (ac.state === 'suspended') ac.resume();
    }

    function loadImage(src, ok, fail) {
        const img = new Image();
        img.onload = () => ok(img);
        img.onerror = () => fail && fail();
        img.src = src;
    }

    // iPhone photos arrive as HEIC. Safari decodes it like any other image;
    // Chrome and Firefox decode it by no route at all — not <img>, not
    // createImageBitmap, not ImageDecoder — so they need the fallback below.
    // The type is often empty when the file comes off a drag or a share sheet,
    // hence the extension check.
    function isHeic(file) {
        return /^image\/hei[cf]/i.test(file.type || '') || /\.hei[cf]$/i.test(file.name || '');
    }

    function acceptFile(file) {
        if (!file) return;
        if (!(file.type || '').startsWith('image/') && !isHeic(file)) return;
        unlockAudio();

        // the same file dropped twice is the same entry, not a second one
        const key = `f:${file.name}:${file.size}:${file.lastModified}`;
        const known = library.find(e => e.key === key);
        if (known) { openEntry(known); return; }

        intake(file, URL.createObjectURL(file), key, false);
    }

    // The object URL outlives this load: the library keeps it so the image can
    // be recalled later, and releases it when the entry is deleted.
    function intake(file, url, key, converted) {
        loadImage(url, (img) => {
            libraryAdd({ key, src: url, name: file.name || 'Image', thumb: makeThumb(img), owned: true });
            show(key, img);
        }, () => {
            URL.revokeObjectURL(url);
            // Native decode failed. Try the HEIC decoder before giving up — but
            // only once, or a file that also fails to load after conversion
            // would bounce between these two branches forever.
            if (converted || !isHeic(file)) { intakeFailed(file); return; }
            heicToBlob(file)
                .then((blob) => intake(file, URL.createObjectURL(blob), key, true))
                .catch(() => intakeFailed(file));
        });
    }

    function intakeFailed(file) {
        const what = isHeic(file) ? 'that HEIC' : `“${file.name || 'that file'}”`;
        note(`Couldn't read ${what}.`);
    }

    // Only fetched when a file actually needs it, so the weight never lands on
    // anyone who doesn't drop a HEIC — and never on Safari, which decodes them
    // natively and so never reaches this path.
    let heifReady = null;

    async function heicToBlob(file) {
        note('Reading HEIC…');
        if (!heifReady) heifReady = import('./vendor/libheif.js').then((m) => m.default());
        const libheif = await heifReady;

        const images = new libheif.HeifDecoder().decode(new Uint8Array(await file.arrayBuffer()));
        if (!images || !images.length) throw new Error('no image in container');

        const image = images[0];
        const w = image.get_width(), h = image.get_height();
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        const data = ctx.createImageData(w, h);
        await new Promise((res, rej) => {
            image.display(data, (out) => (out ? res(out) : rej(new Error('decode failed'))));
        });
        ctx.putImageData(data, 0, 0);
        note('');

        return new Promise((res, rej) => {
            c.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', 0.92);
        });
    }

    function acceptImage(source) {
        const sw = source.naturalWidth || source.width;
        const sh = source.naturalHeight || source.height;
        const k = Math.min(1, ANALYSIS_MAX / Math.max(sw, sh));
        const W = Math.max(32, Math.round(sw * k));
        const H = Math.max(32, Math.round(sh * k));

        const off = document.createElement('canvas');
        off.width = W; off.height = H;
        off.getContext('2d').drawImage(source, 0, 0, W, H);

        const data = off.getContext('2d').getImageData(0, 0, W, H).data;
        const gray = new Float32Array(W * H);
        for (let i = 0; i < W * H; i++) {
            gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
        }

        // the last look at the colour before everything downstream goes grey
        const colour = readColour(data, W * H);
        const palette = paletteFor(colour);
        state.root = palette.root;
        state.scale = palette.scale;
        state.light = colour.light;
        if (setScaleButton) setScaleButton(palette.scale, false);

        state.img = off;
        state.gray = gray;
        state.W = W; state.H = H;

        hidePicker();
        els.drop.hidden = true;
        els.wrap.hidden = false;
        els.newBtn.hidden = false;
        els.play.disabled = false;

        if (state.playing) togglePlay(); // a new image restarts the loop
        buildRasters();
        autoTuneSensitivity();
        startIntro(); // watch it become a score, then hear it
    }

    // Like the key, density is the image's call. Medium is only a first
    // guess: the image is read at it, and if the score comes back far off
    // the ideal complexity — around 20 beats, around 30 notes — the
    // sensitivity steps once toward it and the image is read again. One
    // step only, no feedback loop; the floors in the analyzers catch the
    // rest. Runs per intake, so it never fights a manual nudge mid-image.
    const IDEAL_BEATS = 20;
    const IDEAL_NOTES = 30;

    function autoTuneSensitivity() {
        state.lineSens = 0.5;
        state.dotSens = 0.5;
        analyze();
        const line = state.beats.length > IDEAL_BEATS * 1.6 ? 0
                   : state.beats.length < IDEAL_BEATS * 0.5 ? 1 : 0.5;
        const dot  = state.notes.length > IDEAL_NOTES * 1.6 ? 0
                   : state.notes.length < IDEAL_NOTES * 0.5 ? 1 : 0.5;
        if (line !== state.lineSens || dot !== state.dotSens) {
            state.lineSens = line;
            state.dotSens = dot;
            analyze();
        }
        if (setLineSensButton) setLineSensButton(String(line * 100), false);
        if (setDotSensButton) setDotSensButton(String(dot * 100), false);
    }

    // ---------- analysis ----------

    function analyze() {
        const { gray, W, H } = state;
        if (!gray) return;
        findBeats(gray, W, H);
        findNotes(gray, W, H);
        buildStepMaps();
        if (!intro) updateStats();
        render();
    }

    function updateStats() {
        els.stats.textContent =
            `${state.beats.length} beats · ${state.notes.length} notes · ${keyName()}`;
    }

    // A transient line in the panel for the things the reveal's own labels
    // don't cover — decoding progress, a file that couldn't be read.
    function note(msg) {
        if (msg) { els.stats.textContent = msg; return; }
        els.stats.innerHTML = '&nbsp;';
        if (state.img && !intro) updateStats();
    }

    // Sobel at one pixel. Returns the pair so callers can ask about direction.
    function sobelAt(gray, W, i) {
        const gx = -gray[i - W - 1] - 2 * gray[i - 1] - gray[i + W - 1]
                  + gray[i - W + 1] + 2 * gray[i + 1] + gray[i + W + 1];
        const gy = -gray[i - W - 1] - 2 * gray[i - W] - gray[i - W + 1]
                  + gray[i + W - 1] + 2 * gray[i + W] + gray[i + W + 1];
        return [gx, gy];
    }

    function otsuThreshold(gray) {
        const hist = new Float32Array(256);
        for (let i = 0; i < gray.length; i++) hist[gray[i] | 0]++;
        const total = gray.length;

        let sum = 0;
        for (let t = 0; t < 256; t++) sum += t * hist[t];
        let sumB = 0, wB = 0, best = 0, otsu = 127;
        for (let t = 0; t < 256; t++) {
            wB += hist[t];
            if (wB === 0) continue;
            const wF = total - wB;
            if (wF === 0) break;
            sumB += t * hist[t];
            const mB = sumB / wB, mF = (sum - sumB) / wF;
            const between = wB * wF * (mB - mF) * (mB - mF);
            if (between > best) { best = between; otsu = t; }
        }
        return otsu;
    }

    // The minority side of the split is "figure".
    function figureIsDark(gray, otsu) {
        let dark = 0;
        for (let i = 0; i < gray.length; i++) if (gray[i] <= otsu) dark++;
        return dark <= gray.length - dark;
    }

    // Cached pictures of what the analyzer sees at each stage, so the intro can
    // walk the viewer from photograph to score. Depends only on the image, so
    // it is built once per drop rather than on every sensitivity nudge.
    function buildRasters() {
        const { gray, W, H } = state;

        const edge = document.createElement('canvas');
        edge.width = W; edge.height = H;
        const ecx = edge.getContext('2d');
        const eimg = ecx.createImageData(W, H);
        const ed = eimg.data;
        const mag = new Float32Array(W * H);
        let busy = 0;

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const i = y * W + x;
                let v = 0, vertical = false;
                if (y > 0 && y < H - 1 && x > 0 && x < W - 1) {
                    const [gx, gy] = sobelAt(gray, W, i);
                    const ax = Math.abs(gx), ay = Math.abs(gy);
                    const m = Math.hypot(gx, gy);
                    mag[i] = m;
                    if (m > 60) busy++;
                    vertical = ax > 40 && ax > ay * 1.4;
                    v = Math.min(1, m / 420);
                }
                // vertical edges are the ones that become drums, so they burn in
                const k = vertical ? v : v * 0.5;
                const cr = vertical ? 198 : 17;
                const cg = vertical ? 34 : 17;
                const cb = vertical ? 34 : 17;
                ed[i * 4]     = 255 + (cr - 255) * k;
                ed[i * 4 + 1] = 255 + (cg - 255) * k;
                ed[i * 4 + 2] = 255 + (cb - 255) * k;
                ed[i * 4 + 3] = 255;
            }
        }
        ecx.putImageData(eimg, 0, 0);

        const otsu = otsuThreshold(gray);
        const dark = figureIsDark(gray, otsu);
        const quant = document.createElement('canvas');
        quant.width = W; quant.height = H;
        const qcx = quant.getContext('2d');
        const qimg = qcx.createImageData(W, H);
        const qd = qimg.data;
        for (let i = 0; i < W * H; i++) {
            const c = (gray[i] <= otsu) === dark ? 17 : 255;
            qd[i * 4] = qd[i * 4 + 1] = qd[i * 4 + 2] = c;
            qd[i * 4 + 3] = 255;
        }
        qcx.putImageData(qimg, 0, 0);

        state.edgeC = edge;
        state.quantC = quant;
        state.mag = mag;
        state.detail = busy / (W * H); // how much there is to say about this image
    }

    // Sobel Gx per pixel; columns where vertical edges dominate become drum hits.
    function findBeats(gray, W, H) {
        const colScore = new Float32Array(W);
        for (let y = 1; y < H - 1; y++) {
            for (let x = 1; x < W - 1; x++) {
                const i = y * W + x;
                const [gx, gy] = sobelAt(gray, W, i);
                const ax = Math.abs(gx), ay = Math.abs(gy);
                if (ax > 40 && ax > ay * 1.4) colScore[x] += ax;
            }
        }

        // light smoothing so a 2px-wide line reads as one peak
        const sm = new Float32Array(W);
        for (let x = 1; x < W - 1; x++) sm[x] = (colScore[x - 1] + 2 * colScore[x] + colScore[x + 1]) / 4;

        let mean = 0, max = 0;
        for (let x = 0; x < W; x++) { mean += sm[x]; if (sm[x] > max) max = sm[x]; }
        mean /= W;
        if (max <= 0) { state.beats = pulseBeats(W); return; }

        // sensitivity 0..1 slides the bar between "only bold lines" and "any hint"
        const thresh = Math.max(mean * (2.2 - 1.8 * state.lineSens), max * (0.5 - 0.42 * state.lineSens));
        // one line per step-width: both edges of a drawn bar merge into one hit
        const minGap = Math.max(2, Math.round(W / STEPS));

        // Collect every local maximum, not just the ones over the bar, so the
        // sparse setting has something to fall back on.
        const peaks = [];
        for (let x = 1; x < W - 1; x++) {
            if (sm[x] > 0 && sm[x] >= sm[x - 1] && sm[x] >= sm[x + 1]) {
                const last = peaks[peaks.length - 1];
                if (last && x - last.x < minGap) {
                    if (sm[x] > last.v) { last.x = x; last.v = sm[x]; }
                } else {
                    peaks.push({ x, v: sm[x] });
                }
            }
        }
        peaks.sort((a, b) => b.v - a.v);

        // A setting that finds nothing leaves the loop with no pulse at all,
        // which reads as broken rather than as restraint. Below the floor, take
        // the strongest lines the picture has whether or not they clear the bar.
        let kept = peaks.filter(p => p.v >= thresh).slice(0, MAX_BEATS);
        if (kept.length < MIN_BEATS) kept = peaks.slice(0, MIN_BEATS);

        state.beats = kept.map(p => ({
            x: p.x,
            strength: p.v / max,
            step: Math.min(STEPS - 1, Math.floor(p.x / W * STEPS)),
            flashAt: 0,
        })).sort((a, b) => a.x - b.x);

        if (!state.beats.length) state.beats = pulseBeats(W);
    }

    // Nothing vertical anywhere — a flat fill, a soft gradient. Lay down a plain
    // pulse so the loop still has a floor to stand on.
    function pulseBeats(W) {
        const out = [];
        for (let i = 0; i < MIN_BEATS; i++) {
            const step = Math.round(i * STEPS / MIN_BEATS);
            out.push({
                x: (step + 0.5) / STEPS * W,
                strength: i === 0 ? 0.75 : 0.45,  // a kick, then lighter ticks
                step,
                flashAt: 0,
            });
        }
        return out;
    }

    // Otsu split; the minority side is "figure". Connected components that are
    // reasonably round and reasonably sized become notes.
    function findNotes(gray, W, H) {
        const total = gray.length;
        const otsu = otsuThreshold(gray);
        const figDark = figureIsDark(gray, otsu);

        const mask = new Uint8Array(total);
        for (let i = 0; i < total; i++) {
            mask[i] = (gray[i] <= otsu) === figDark ? 1 : 0;
        }

        // lines already own their columns: a column that is mostly figure is a
        // line, not a dot source. Clear those (plus a margin around each beat)
        // so a dot sitting on a line doesn't get absorbed into it.
        const colFill = new Float32Array(W);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) colFill[x] += mask[y * W + x];
        for (let x = 0; x < W; x++) {
            if (colFill[x] / H > 0.5) for (let y = 0; y < H; y++) mask[y * W + x] = 0;
        }
        for (const b of state.beats) {
            for (let dx = -2; dx <= 2; dx++) {
                const xx = b.x + dx;
                if (xx < 0 || xx >= W) continue;
                for (let y = 0; y < H; y++) mask[y * W + xx] = 0;
            }
        }

        // sensitivity relaxes the size floor and the roundness requirement
        const minArea = Math.max(5, Math.round(total * (0.00055 - 0.00045 * state.dotSens)));
        const maxArea = total * 0.06;
        const minFill = 0.5 - 0.22 * state.dotSens;

        const seen = new Uint8Array(total);
        const stack = new Int32Array(total);
        const blobs = [];

        for (let start = 0; start < total; start++) {
            if (!mask[start] || seen[start]) continue;
            let sp = 0;
            stack[sp++] = start;
            seen[start] = 1;
            let area = 0, sx = 0, sy = 0;
            let minX = W, maxX = 0, minY = H, maxY = 0;

            while (sp > 0) {
                const i = stack[--sp];
                const x = i % W, y = (i / W) | 0;
                area++; sx += x; sy += y;
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
                if (x > 0 && mask[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; stack[sp++] = i - 1; }
                if (x < W - 1 && mask[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; stack[sp++] = i + 1; }
                if (y > 0 && mask[i - W] && !seen[i - W]) { seen[i - W] = 1; stack[sp++] = i - W; }
                if (y < H - 1 && mask[i + W] && !seen[i + W]) { seen[i + W] = 1; stack[sp++] = i + W; }
            }

            if (area < 4 || area > maxArea) continue;
            blobs.push({ x: sx / area, y: sy / area, area, minX, maxX, minY, maxY });
        }

        // noisy photos can shed thousands of specks; the merge pass is O(n²)
        if (blobs.length > 600) {
            blobs.sort((a, b) => b.area - a.area);
            blobs.length = 600;
        }

        // re-join the halves of a dot that a cleared line column split: merge
        // components whose boxes nearly touch across a line-sized gap
        for (let i = 0; i < blobs.length; i++) {
            for (let j = i + 1; j < blobs.length; j++) {
                const a = blobs[i], c = blobs[j];
                const gapX = Math.max(a.minX, c.minX) - Math.min(a.maxX, c.maxX);
                const overlapY = Math.min(a.maxY, c.maxY) >= Math.max(a.minY, c.minY);
                if (gapX <= 7 && overlapY) {
                    const area = a.area + c.area;
                    a.x = (a.x * a.area + c.x * c.area) / area;
                    a.y = (a.y * a.area + c.y * c.area) / area;
                    a.area = area;
                    a.minX = Math.min(a.minX, c.minX); a.maxX = Math.max(a.maxX, c.maxX);
                    a.minY = Math.min(a.minY, c.minY); a.maxY = Math.max(a.maxY, c.maxY);
                    blobs.splice(j--, 1);
                }
            }
        }

        const round = blobs.filter(b => {
            if (b.area < minArea || b.area > maxArea) return false;
            const bw = b.maxX - b.minX + 1, bh = b.maxY - b.minY + 1;
            const aspect = bw / bh;
            if (aspect < 0.28 || aspect > 3.4) return false;
            return b.area / (bw * bh) >= minFill;
        });

        round.sort((a, b) => b.area - a.area);
        const kept = round.slice(0, MAX_NOTES);
        const maxA = kept.length ? kept[0].area : 1;

        state.notes = capPerStep(kept.map(b => ({
            x: b.x, y: b.y,
            r: Math.sqrt(b.area / Math.PI),
            strength: Math.sqrt(b.area / maxA),
            step: Math.min(STEPS - 1, Math.floor(b.x / W * STEPS)),
            flashAt: 0,
        })));

        // Round figures alone leave most photographs nearly silent, so the
        // busier the image the more notes it owes us; the grid makes up the
        // difference. Sensitivity scales the whole appetite.
        const busyness = Math.min(1, (state.detail || 0) / BUSY_DETAIL);
        const want = Math.round((MIN_NOTES + (BUSY_NOTES - MIN_NOTES) * busyness)
                                * (0.55 + 0.9 * state.dotSens));
        const target = Math.max(MIN_NOTES, Math.min(MAX_NOTES, want));
        if (state.notes.length < target) {
            state.notes = state.notes.concat(gridNotes(gray, W, H, target - state.notes.length));
        }
        // the contrast gate can legitimately refuse every cell; a picture with
        // nothing in it still owes us a sound
        if (state.notes.length < MIN_NOTES) {
            state.notes = state.notes.concat(flatNotes(gray, W, H, MIN_NOTES - state.notes.length));
        }
        state.notes.sort((a, b) => a.x - b.x);
    }

    // Everything drawn should be heard, so thin the pile-ups here rather than
    // when the step maps are built: a step keeps its strongest few notes.
    function capPerStep(notes) {
        const byStep = new Map();
        for (const n of notes) {
            const list = byStep.get(n.step) || [];
            list.push(n);
            byStep.set(n.step, list);
        }
        const out = [];
        for (const list of byStep.values()) {
            list.sort((a, b) => b.strength - a.strength);
            out.push(...list.slice(0, NOTES_PER_STEP));
        }
        return out;
    }

    // Whatever the blob pass missed — texture, foliage, type, soft edges — is
    // still somewhere specific in the frame. Find where by contrast, never by
    // brightness: an empty sky sits far from the image average but has nothing
    // in it, and a note floating there is a note the viewer can't account for.
    //
    // Two scans, matching the way beats are read. Left to right, a column per
    // step, gives the horizontal position. Top to bottom gives the row profile:
    // which bands of the picture actually carry weight, so the note budget goes
    // where the clusters are instead of being spread evenly down the frame.
    function gridNotes(gray, W, H, want) {
        if (want <= 0) return [];
        const cols = STEPS, rows = 12;
        const mag = state.mag || edgeMagnitude(gray, W, H);

        // top-to-bottom scan: how heavy is each row of the picture?
        const rowScore = new Float32Array(H);
        for (let y = 0; y < H; y++) {
            let s = 0;
            for (let x = 0; x < W; x++) s += mag[y * W + x];
            rowScore[y] = s;
        }

        const cells = [];
        const bandEnergy = new Float32Array(rows);
        let maxCell = 0;

        for (let ry = 0; ry < rows; ry++) {
            const y0 = Math.floor(ry * H / rows), y1 = Math.max(y0 + 1, Math.floor((ry + 1) * H / rows));
            for (let y = y0; y < y1; y++) bandEnergy[ry] += rowScore[y];

            for (let rx = 0; rx < cols; rx++) {
                const x0 = Math.floor(rx * W / cols), x1 = Math.max(x0 + 1, Math.floor((rx + 1) * W / cols));
                let sum = 0, n = 0, peak = -1, px = (x0 + x1) >> 1, py = (y0 + y1) >> 1;
                for (let y = y0; y < y1; y++) {
                    for (let x = x0; x < x1; x++) {
                        const m = mag[y * W + x];
                        sum += m; n++;
                        // the note lands on the busiest pixel in the cell, so it
                        // sits on the cluster rather than on a grid intersection
                        if (m > peak) { peak = m; px = x; py = y; }
                    }
                }
                const energy = sum / n;
                if (energy > maxCell) maxCell = energy;
                cells.push({ x: px + 0.5, y: py + 0.5, row: ry, energy });
            }
        }

        if (maxCell <= 0) return [];   // nothing to see; the caller falls back

        // Cells with almost no contrast are not clusters and get no note at all,
        // however much budget is left over.
        const floor = maxCell * 0.08;
        let maxBand = 0;
        for (const e of bandEnergy) if (e > maxBand) maxBand = e;

        // A heavier band outranks a lighter one even if a single lonely cell
        // elsewhere is sharper.
        const weighted = cells
            .filter(c => c.energy >= floor)
            .map(c => ({ ...c, score: c.energy * (0.35 + 0.65 * (bandEnergy[c.row] / (maxBand || 1))) }))
            .sort((a, b) => b.score - a.score);

        const perStep = new Int32Array(STEPS);
        for (const n of state.notes) perStep[n.step]++;
        const perRow = new Int32Array(rows);
        const taken = new Uint8Array(weighted.length);
        const out = [];
        const base = Math.max(2.5, Math.min(W, H) * 0.02);

        // Each band's share of the notes tracks its share of the weight, so the
        // ground and the canopy fill up and the empty half of the frame stays
        // quiet. Spread across steps before stacking any one of them.
        const totalBand = bandEnergy.reduce((a, b) => a + b, 0) || 1;
        const quota = new Int32Array(rows);
        for (let r = 0; r < rows; r++) {
            quota[r] = Math.ceil(want * (bandEnergy[r] / totalBand) * 1.6);
        }

        // Two notes on top of each other read as one smudge, so keep them a
        // radius apart while there is still room to be choosy.
        const placed = state.notes.map(n => [n.x, n.y]);
        const sep = base * 1.1;
        const clear = (c, min) => {
            if (min <= 0) return true;
            for (const [x, y] of placed) {
                if ((c.x - x) ** 2 + (c.y - y) ** 2 < min * min) return false;
            }
            return true;
        };

        const passes = [
            { step: 1, row: (r) => quota[r], sep },
            { step: NOTES_PER_STEP, row: (r) => quota[r] * 2, sep: sep * 0.7 },
            { step: NOTES_PER_STEP, row: () => Infinity, sep: 0 },
        ];

        for (const pass of passes) {
            for (let i = 0; i < weighted.length && out.length < want; i++) {
                if (taken[i]) continue;
                const c = weighted[i];
                const step = Math.min(STEPS - 1, Math.floor(c.x / W * STEPS));
                if (perStep[step] >= pass.step || perRow[c.row] >= pass.row(c.row)) continue;
                if (!clear(c, pass.sep)) continue;
                taken[i] = 1;
                placed.push([c.x, c.y]);
                perStep[step]++;
                perRow[c.row]++;
                const strength = Math.max(0.3, Math.min(1, c.energy / maxCell));
                out.push({
                    x: c.x, y: c.y,
                    r: base * (0.6 + 0.8 * strength),
                    strength,
                    step,
                    flashAt: 0,
                });
            }
            if (out.length >= want) break;
        }
        return out;
    }

    function edgeMagnitude(gray, W, H) {
        const mag = new Float32Array(W * H);
        for (let y = 1; y < H - 1; y++) {
            for (let x = 1; x < W - 1; x++) {
                const i = y * W + x;
                const [gx, gy] = sobelAt(gray, W, i);
                mag[i] = Math.hypot(gx, gy);
            }
        }
        return mag;
    }

    // Last resort for a picture with no contrast anywhere — a flat fill, a
    // smooth gradient. Spread a few notes over it so it still makes a sound.
    function flatNotes(gray, W, H, want) {
        if (want <= 0) return [];
        let mean = 0;
        for (let i = 0; i < gray.length; i++) mean += gray[i];
        mean /= gray.length;

        const perStep = new Int32Array(STEPS);
        for (const n of state.notes) perStep[n.step]++;
        const out = [];
        for (let s = 0; s < STEPS && out.length < want; s++) {
            if (perStep[s]) continue;
            const x = (s + 0.5) / STEPS * W;
            let best = -1, by = H >> 1;
            for (let y = 0; y < H; y++) {
                const d = Math.abs(gray[y * W + (x | 0)] - mean);
                if (d > best) { best = d; by = y; }
            }
            out.push({
                x, y: by + 0.5,
                r: Math.max(2.5, Math.min(W, H) * 0.016),
                strength: 0.4,
                step: s,
                flashAt: 0,
            });
        }
        return out;
    }

    // ---------- music ----------

    let beatsByStep = [], notesByStep = [];

    function buildStepMaps() {
        beatsByStep = Array.from({ length: STEPS }, () => []);
        notesByStep = Array.from({ length: STEPS }, () => []);
        // one drum hit per step: keep the strongest line that lands there
        for (const b of state.beats) {
            const cur = beatsByStep[b.step][0];
            if (!cur || b.strength > cur.strength) beatsByStep[b.step] = [b];
        }
        for (const n of state.notes) notesByStep[n.step].push(n);
    }

    function pitches() {
        const scale = SCALES[state.scale];
        const base = BASE_FREQ * Math.pow(2, state.root / 12);
        const out = [];
        for (let o = 0; o <= OCTAVES; o++) {
            for (const s of scale) out.push(base * Math.pow(2, o + s / 12));
        }
        out.push(base * Math.pow(2, OCTAVES + 1));
        return out;
    }

    // ---------- audio engine ----------

    let ac = null, master = null, delaySend = null;
    let noiseBuf = null;
    let stepIndex = 0, nextStepTime = 0, timer = null;
    const stepRing = []; // recent { time, step } for the playhead

    function audioInit() {
        if (ac) return;
        ac = new (window.AudioContext || window.webkitAudioContext)();

        const comp = ac.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.ratio.value = 4;
        comp.connect(ac.destination);

        master = ac.createGain();
        master.gain.value = 0.8;
        master.connect(comp);

        const delay = ac.createDelay(1);
        delay.delayTime.value = 0.34;
        const fb = ac.createGain();
        fb.gain.value = 0.32;
        const damp = ac.createBiquadFilter();
        damp.type = 'lowpass';
        damp.frequency.value = 1600;
        delay.connect(damp); damp.connect(fb); fb.connect(delay);
        const wet = ac.createGain();
        wet.gain.value = 0.35;
        delay.connect(wet); wet.connect(master);
        delaySend = delay;

        noiseBuf = ac.createBuffer(1, ac.sampleRate / 2, ac.sampleRate);
        const nd = noiseBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    }

    function playKick(t, vel) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
        g.gain.setValueAtTime(0.9 * vel, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + 0.3);
    }

    function playTick(t, vel) {
        const s = ac.createBufferSource();
        s.buffer = noiseBuf;
        const f = ac.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 6500;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.28 * vel, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        s.connect(f); f.connect(g); g.connect(master);
        s.start(t); s.stop(t + 0.08);
    }

    function playNote(t, freq, vel, dur) {
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.5 * vel, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);

        const f = ac.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 900 + 2600 * vel;
        f.Q.value = 0.8;

        for (const det of [-4, 4]) {
            const o = ac.createOscillator();
            o.type = 'triangle';
            o.frequency.value = freq;
            o.detune.value = det;
            o.connect(f);
            o.start(t); o.stop(t + dur + 0.05);
        }
        f.connect(g);
        g.connect(master);
        g.connect(delaySend);
    }

    function scheduleStep(step, t) {
        const stepDur = 60 / state.bpm / 4;
        const beat = beatsByStep[step][0];
        if (beat) {
            const vel = 0.35 + 0.65 * beat.strength;
            if (beat.strength >= 0.6) playKick(t, vel); else playTick(t, vel);
        }
        const pset = pitches();
        for (const n of notesByStep[step]) {
            const yn = 1 - n.y / state.H;
            const freq = pset[Math.round(yn * (pset.length - 1))];
            const vel = 0.3 + 0.7 * n.strength;
            const dur = Math.min(1.2, Math.max(0.18, stepDur * 2 + n.strength * 0.5));
            playNote(t, freq, vel, dur);
        }
        stepRing.push({ time: t, step });
        if (stepRing.length > STEPS) stepRing.shift();
    }

    function schedulerTick() {
        const lookahead = 0.12;
        while (nextStepTime < ac.currentTime + lookahead) {
            scheduleStep(stepIndex, nextStepTime);
            nextStepTime += 60 / state.bpm / 4;
            stepIndex = (stepIndex + 1) % STEPS;
        }
    }

    function togglePlay() {
        if (!state.img) return;
        if (state.playing) {
            state.playing = false;
            clearInterval(timer);
            timer = null;
        } else {
            audioInit();
            ac.resume();
            state.playing = true;
            stepIndex = 0;
            nextStepTime = ac.currentTime + 0.06;
            stepRing.length = 0;
            timer = setInterval(schedulerTick, 30);
            ensureFrame();
        }
        // `hidden` is not a reflected IDL property on SVG elements, so the
        // attribute has to be toggled directly or both icons stay on screen
        els.playIcon.toggleAttribute('hidden', state.playing);
        els.stopIcon.toggleAttribute('hidden', !state.playing);
        els.playLabel.textContent = state.playing ? 'Stop' : 'Play';
        if (!state.playing) render();
    }

    // ---------- intro reveal ----------

    // The image walks through what the analyzer did to it — photograph, edges,
    // two-tone, score — and then the playhead takes over from the last wipe.
    // Each stage wipes in, then holds a beat so you can actually look at it.
    const HOLD = 1000;
    // Each wipe runs against the one before it: the edges come in left to
    // right, the two-tone comes back right to left, then the score is drawn on
    // in two strokes — stripes up off the floor, dots down from the ceiling.
    const PHASES = [
        { name: 'source', ms: 420, label: 'Reading the image' },
        { name: 'source', ms: HOLD, hold: true },
        { name: 'edges',  ms: 900, label: 'Finding edges' },
        { name: 'edges',  ms: HOLD, hold: true },
        { name: 'meter',  ms: 1600, label: 'Measuring lightness' },
        { name: 'meter',  ms: 500, hold: true },        // a breath once the arrow lands
        { name: 'quant',  ms: 900, label: 'Quantizing' },
        { name: 'quant',  ms: HOLD, hold: true },
        { name: 'lines',  ms: 760, label: 'Reading the beat' },
        { name: 'lines',  ms: HOLD * 2, hold: true },   // the beat wants longer to land
        { name: 'dots',   ms: 820, label: 'Placing the notes' },
        // the workings clear off the desk, leaving the score on the photograph
        { name: 'clear',  ms: 900 },
    ];

    let intro = null; // { start, phase }

    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    // The wipes get a far heavier curve than the cross-fades: they creep off the
    // edge, cross the frame fast, and settle into their pause rather than
    // stopping dead. Quintic in-out.
    const easeWipe = (t) => (t < 0.5 ? 16 * t * t * t * t * t
                                     : 1 - Math.pow(-2 * t + 2, 5) / 2);

    // The dots are the last thing to arrive and the handover to playback, so
    // they travel on a gentler curve than the wipes that set them up. Cubic.
    const easeDots = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    function startIntro() {
        if (!state.edgeC || matchMedia('(prefers-reduced-motion: reduce)').matches) {
            if (!state.playing) togglePlay();
            return;
        }
        intro = { start: performance.now(), phase: -1 };
        ensureFrame();
    }

    // { name, t } for the phase now, or null once the reveal has run out.
    function introAt(now) {
        let e = now - intro.start;
        for (let i = 0; i < PHASES.length; i++) {
            const p = PHASES[i];
            // a hold is its stage frozen at completion
            if (e < p.ms) return { i, name: p.name, hold: !!p.hold, t: p.hold ? 1 : e / p.ms };
            e -= p.ms;
        }
        return null;
    }

    function tickIntro(now) {
        const at = introAt(now);
        if (!at) { endIntro(); return; }
        if (at.i !== intro.phase) {
            intro.phase = at.i;
            // holds carry the label of the stage they belong to
            for (let i = at.i; i >= 0; i--) {
                if (PHASES[i].label) { els.stats.textContent = `${PHASES[i].label}…`; break; }
            }
        }
    }

    function endIntro() {
        if (!intro) return;
        intro = null;
        updateStats();
        if (!state.playing) togglePlay();
    }

    // ---------- rendering ----------

    function currentPlayhead() {
        if (!ac) return -1;
        const now = ac.currentTime;
        let cur = null;
        for (const s of stepRing) if (s.time <= now && (!cur || s.time > cur.time)) cur = s;
        if (!cur) return -1;
        const stepDur = 60 / state.bpm / 4;
        const frac = Math.min(1, (now - cur.time) / stepDur);
        return ((cur.step + frac) / STEPS) * state.W;
    }

    function markFlashes() {
        if (!ac) return;
        const now = ac.currentTime;
        for (const s of stepRing) {
            if (s.time > now || s.done) continue;
            s.done = true;
            const b = beatsByStep[s.step][0];
            if (b) b.flashAt = performance.now();
            for (const n of notesByStep[s.step]) n.flashAt = performance.now();
        }
    }

    // one layer of the reveal, clipped to the columns the wipe has passed
    function drawBand(src, x0, x1, alpha, blend) {
        if (x1 <= x0) return;
        cx.save();
        cx.beginPath();
        cx.rect(x0, 0, x1 - x0, state.H);
        cx.clip();
        cx.globalAlpha = alpha;
        if (blend) cx.globalCompositeOperation = blend;
        cx.drawImage(src, 0, 0);
        cx.restore();
        cx.globalAlpha = 1;
    }

    // The leading line of a wipe, with a glow trailing back over the ground it
    // has already covered — so the same helper serves a wipe in either
    // direction, just by being told where the trail starts.
    function drawWipeEdge(x, trailFrom) {
        const { H } = state;
        const g = cx.createLinearGradient(trailFrom, 0, x, 0);
        g.addColorStop(0, 'rgba(198,34,34,0)');
        g.addColorStop(1, 'rgba(198,34,34,0.3)');
        cx.fillStyle = g;
        cx.fillRect(Math.min(x, trailFrom), 0, Math.abs(x - trailFrom), H);
        cx.strokeStyle = '#c62222';
        cx.lineWidth = 1.5;
        cx.beginPath();
        cx.moveTo(x, 0);
        cx.lineTo(x, H);
        cx.stroke();
    }

    function drawWipeEdgeH(y, trailFrom) {
        const { W } = state;
        const g = cx.createLinearGradient(0, trailFrom, 0, y);
        g.addColorStop(0, 'rgba(198,34,34,0)');
        g.addColorStop(1, 'rgba(198,34,34,0.3)');
        cx.fillStyle = g;
        cx.fillRect(0, Math.min(y, trailFrom), W, Math.abs(y - trailFrom));
        cx.strokeStyle = '#c62222';
        cx.lineWidth = 1.5;
        cx.beginPath();
        cx.moveTo(0, y);
        cx.lineTo(W, y);
        cx.stroke();
    }

    function render() {
        const { img, W, H } = state;
        if (!img) return;
        const scale = Math.min(2, 900 / W); // crisp on retina without huge canvases
        canvas.width = Math.round(W * scale);
        canvas.height = Math.round(H * scale);
        cx.setTransform(scale, 0, 0, scale, 0, 0);

        const now = performance.now();
        const at = intro ? introAt(now) : null;

        // The source sits at the bottom of every frame and never leaves: the
        // analysis layers ride over it translucent and the score is drawn on
        // the full accumulated stack, so the whole reveal builds one picture
        // up. Only after the last dot has arrived does the working material —
        // Sobel and two-tone together — fade off, the photo receding partway
        // with it so what is left is the score on a clean, quiet image.
        const shed = at && at.name === 'clear' ? ease(at.t) : 0;

        let srcAlpha = GHOST;
        if (at) {
            if (at.name === 'source') srcAlpha = ease(at.t);
            else if (at.name === 'clear') srcAlpha = 1 - (1 - GHOST) * shed;
            else srcAlpha = 1;
        }

        cx.globalAlpha = 1;
        cx.fillStyle = '#fff';
        cx.fillRect(0, 0, W, H);
        cx.globalAlpha = srcAlpha;
        cx.drawImage(img, 0, 0);
        cx.globalAlpha = 1;

        const band = Math.max(6, W * 0.035);
        const bandY = Math.max(6, H * 0.035);

        if (at && at.name === 'edges') {
            const wx = W * easeWipe(at.t);             // left to right
            drawBand(state.edgeC, 0, wx, OVERLAY);
            if (!at.hold) drawWipeEdge(wx, wx - band);
        } else if (at && at.name === 'meter') {
            drawBand(state.edgeC, 0, W, OVERLAY);      // holds while the meter reads
        } else if (at && at.name === 'quant') {
            // The threshold pass does not erase the Sobel view — it multiplies
            // over it, blacking in the dark mass while the edge drawing keeps
            // showing through the light mass: each stage calculating on top of
            // the one before, the picture building up rather than switching.
            const wx = W * (1 - easeWipe(at.t));       // and back, right to left
            drawBand(state.edgeC, 0, W, OVERLAY);
            drawBand(state.quantC, wx, W, OVERLAY, 'multiply');
            if (!at.hold) drawWipeEdge(wx, wx + band);
        } else if (at && (at.name === 'lines' || at.name === 'dots' || at.name === 'clear')) {
            // the full composite holds under the score being drawn, then the
            // whole accumulated stack sheds together once the dots are in
            const a = OVERLAY * (1 - shed);
            drawBand(state.edgeC, 0, W, a);
            drawBand(state.quantC, 0, W, a, 'multiply');
        }

        const flash = (at2) => Math.max(0, 1 - (now - at2) / 260);

        // Beats: full-height stripes, grown up off the floor during 'lines'.
        // lineTop is where the drawn part of each stripe stops.
        let lineTop = 0;
        if (at) {
            if (at.name === 'lines') lineTop = H * (1 - easeWipe(at.t));
            else if (at.name !== 'dots' && at.name !== 'clear') lineTop = H;  // not drawn yet
        }
        if (lineTop < H) {
            for (const b of state.beats) {
                const f = flash(b.flashAt);
                cx.strokeStyle = f > 0 ? '#c62222' : '#000';
                cx.globalAlpha = 0.35 + 0.65 * b.strength * (f > 0 ? 1 : 0.8);
                cx.lineWidth = 1 + b.strength * 1.5 + f * 2;
                cx.beginPath();
                cx.moveTo(b.x + 0.5, H);
                cx.lineTo(b.x + 0.5, lineTop);
                cx.stroke();
            }
            cx.globalAlpha = 1;
        }

        // Notes: dots, wiped on downwards from the ceiling during 'dots'.
        let dotsY = H * 1.2;                            // everything visible
        if (at) {
            if (at.name === 'dots') dotsY = -H * 0.1 + H * 1.3 * easeDots(at.t);
            else if (at.name !== 'clear') dotsY = -1;   // not placed yet
        }
        const dotReveal = (y) => Math.max(0, Math.min(1, (dotsY - y) / (H * 0.12)));

        for (const n of state.notes) {
            if (dotReveal(n.y) <= 0) continue;
            // Stamped the first frame the wipe clears the dot: it grows from
            // nothing up to size, arriving out of the paper rather than landing
            // on it. Only ceremonial during the reveal — outside it, dots are
            // simply there at size, so a paused re-analysis never draws blanks.
            if (!n.popAt) n.popAt = now;
            const g = at ? Math.min(1, (now - n.popAt) / POP_MS) : 1;
            const grow = 1 - Math.pow(1 - g, 3);
            const f = flash(n.flashAt);
            cx.fillStyle = f > 0 ? '#c62222' : '#000';
            cx.globalAlpha = 0.55 + 0.45 * f;
            cx.beginPath();
            cx.arc(n.x, n.y, n.r * grow * (1 + f * 0.5), 0, Math.PI * 2);
            cx.fill();
        }
        cx.globalAlpha = 1;

        if (at && at.name === 'lines' && lineTop > 0) drawWipeEdgeH(lineTop, lineTop + bandY);
        if (at && at.name === 'dots' && dotsY > 0 && dotsY < H) drawWipeEdgeH(dotsY, dotsY - bandY);

        // The register readout: after the Sobel pass has held, a 0–255
        // lightness ramp rises up the far left and the pointer drops onto the
        // image's mean lightness — the number that chose the octave — with a
        // label counting down as it falls. Bar up then pointer down is one
        // gesture on one in-out curve: the bar accelerates out of the floor,
        // hands off at speed, and the pointer spends the ease-out settling
        // onto the reading. The instrument clears off with the working
        // material.
        if (at && at.name !== 'source' && at.name !== 'edges') {
            const seq = at.name === 'meter' ? easeDots(at.t) : 1;
            const BAR_CUT = 0.45;               // the bar's share of the gesture
            cx.globalAlpha = 1 - shed;
            const barW = Math.max(2.5, W / 320);
            const rampH = H * Math.min(1, seq / BAR_CUT);
            const ramp = cx.createLinearGradient(0, H, 0, 0);
            ramp.addColorStop(0, '#000');
            ramp.addColorStop(1, '#fff');
            cx.fillStyle = ramp;
            cx.fillRect(0, H - rampH, barW, rampH);
            // No drawn colour reads on every image, so everything laid over
            // the ramp works in difference: white fills that invert whatever
            // sits beneath them. The right edge is a difference seam rather
            // than a stroke, and the marker and label can't be swallowed by
            // either end of the ramp or the picture behind them.
            cx.globalCompositeOperation = 'difference';
            cx.fillStyle = '#fff';
            cx.fillRect(barW, H - rampH, 0.5, rampH);

            if (seq > BAR_CUT) {
                const target = H * (1 - state.light);
                const drop = (seq - BAR_CUT) / (1 - BAR_CUT);
                const y = (target + 4) * drop - 4;
                // the /shaders dial marker at miniature: base flush on the
                // bar's right seam, tip reaching the centre of the ramp
                const th = barW * 0.4;
                cx.beginPath();
                cx.moveTo(barW, y - th);
                cx.lineTo(barW / 2, y);
                cx.lineTo(barW, y + th);
                cx.closePath();
                cx.fill();
                const val = Math.round(255 * (1 - Math.min(1, Math.max(0, y / H))));
                cx.font = `${Math.max(7, Math.round(W * 0.008))}px ui-monospace, monospace`;
                cx.textBaseline = 'middle';
                cx.fillText(val, barW + 3, Math.max(6, Math.min(H - 6, y)));
            }
            cx.globalCompositeOperation = 'source-over';
            cx.globalAlpha = 1;
        }

        // once the last wipe is done the playhead has the frame to itself
        if (!at && state.playing) {
            const px = currentPlayhead();
            if (px >= 0) {
                cx.strokeStyle = '#c62222';
                cx.lineWidth = 1.5;
                cx.beginPath();
                cx.moveTo(px, 0);
                cx.lineTo(px, H);
                cx.stroke();
            }
        }
    }

    let rafId = null;

    function ensureFrame() {
        if (rafId == null) rafId = requestAnimationFrame(frame);
    }

    function frame() {
        rafId = null;
        if (intro) tickIntro(performance.now());
        if (state.playing) markFlashes();
        render();
        if (intro || state.playing) ensureFrame();
    }

    // Last-ditch fallback if a sample image can't be fetched at all, so
    // "try a sample" always does something.
    function makeSample() {
        unlockAudio();
        const W = 640, H = 400;
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const g = c.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, W, H);

        g.fillStyle = '#000';
        const bars = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < bars; i++) {
            const x = Math.round((i / bars) * W + Math.random() * (W / bars) * 0.6) + 20;
            const w = 3 + Math.random() * 6;
            g.fillRect(x, 0, w, H);
        }

        const dots = 10 + Math.floor(Math.random() * 8);
        for (let i = 0; i < dots; i++) {
            const r = 7 + Math.random() * 16;
            const x = 30 + Math.random() * (W - 60);
            const y = 30 + Math.random() * (H - 60);
            g.beginPath();
            g.arc(x, y, r, 0, Math.PI * 2);
            g.fill();
        }
        show(null, c);
    }

    // ---------- logo animation ----------

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
     * The same animated mark the rest of the site runs. Loaded dynamically and
     * last so its weight never delays the tool; the inline SVG stays put until
     * the animation is on screen, so any failure just leaves the static mark.
     *
     * Unlike /matte — which has to vendor its own copies because it doubles as
     * a Chrome extension and can't reach outside its root — this is an ordinary
     * page on the site, so it loads the canonical files straight from the root.
     */
    function initMarkAnimation() {
        const host = $('utMarkAnim');
        const mark = $('utMark');
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
                // Drop the accent layer rather than editing the source, which
                // the main site renders too — this header wants the mono mark.
                data.layers = data.layers.filter((l) => !isAccentLayer(l));

                const anim = lottie.loadAnimation({
                    container: host,
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    animationData: data,
                    rendererSettings: {
                        // Crop to the artwork's own bounds so the animated mark
                        // sits at the same scale as the static one.
                        viewBoxSize: '191 271 1607 452',
                        preserveAspectRatio: 'xMidYMid meet',
                    },
                });
                anim.addEventListener('DOMLoaded', () => mark.classList.add('animated'));
            })
            .catch(() => { /* static mark stands in */ });
    }

    // ---------- ui wiring ----------

    els.browse.addEventListener('click', () => els.file.click());
    els.newBtn.addEventListener('click', () => els.file.click());
    els.file.addEventListener('change', () => { acceptFile(els.file.files[0]); els.file.value = ''; });
    els.sample.addEventListener('click', showPicker);
    els.pickerBack.addEventListener('click', hidePicker);
    renderLibrary();
    initMarkAnimation();

    // during the reveal, the transport button skips to the end of it
    function transport() {
        if (intro) endIntro(); else togglePlay();
    }
    els.play.addEventListener('click', transport);
    canvas.addEventListener('click', transport);

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && state.img && e.target === document.body) {
            e.preventDefault();
            transport();
        }
    });

    document.addEventListener('paste', (e) => {
        for (const item of e.clipboardData?.items || []) {
            if (item.kind !== 'file') continue;
            // match on the file, not the item type: HEIC often arrives untyped
            const f = item.getAsFile();
            if (f && ((f.type || '').startsWith('image/') || isHeic(f))) { acceptFile(f); return; }
        }
    });

    let dragDepth = 0;
    window.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; document.body.classList.add('dragging'); });
    window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('dragging'); } });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dragDepth = 0;
        document.body.classList.remove('dragging');
        acceptFile(e.dataTransfer.files[0]);
    });

    const reanalyze = (() => {
        let t = null;
        return () => { clearTimeout(t); t = setTimeout(analyze, 120); };
    })();

    els.tempo.addEventListener('input', () => {
        state.bpm = +els.tempo.value;
        els.tempoVal.textContent = `${state.bpm} bpm`;
    });
    // Segmented icon buttons: one of the row is always checked, matching the
    // radiogroup pattern the other tools use.
    function radioGroup(row, initial, onPick) {
        const buttons = [...row.querySelectorAll('button[data-val]')];
        const select = (val, fire) => {
            for (const b of buttons) b.setAttribute('aria-checked', String(b.dataset.val === val));
            if (fire) onPick(val);
        };
        for (const b of buttons) b.addEventListener('click', () => select(b.dataset.val, true));
        select(initial, false);
        return select;
    }

    setScaleButton = radioGroup(els.scale, state.scale, (v) => { state.scale = v; updateStats(); });
    setLineSensButton = radioGroup(els.lineSens, String(state.lineSens * 100), (v) => {
        state.lineSens = +v / 100;
        reanalyze();
    });
    setDotSensButton = radioGroup(els.dotSens, String(state.dotSens * 100), (v) => {
        state.dotSens = +v / 100;
        reanalyze();
    });
})();
