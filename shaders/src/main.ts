import { buildFragment, getPreset, presets, programKey } from "./presets/index";
import { GLRenderer } from "./renderer/gl";
import { uploadUniforms } from "./renderer/uniforms";
import { createLoop } from "./renderer/loop";
import { currentShareURL, hydrateFromURL, selectPreset, setParam, setPaused, setPreset, state, subscribe } from "./state";
import { initPanel } from "./ui/panel";
import { initPresetGrid, resetVariant } from "./ui/presetGrid";
import { initExportModal } from "./ui/exportModal";
import { initMark } from "./ui/mark";
import { ICON_RANDOM, ICON_SPARKLE, KEY_BRACKET, KEY_R, KEY_SPACE } from "./ui/icons";
import { freshSeed, mulberry32 } from "./utils/rand";
import { bakeFragment } from "./exporters/shared";
import { exportCanvasSnippet } from "./exporters/canvasSnippet";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

function boot(): void {
    const stage = $<HTMLElement>("#stage");
    const canvas = $<HTMLCanvasElement>("#glcanvas");

    hydrateFromURL();

    let renderer: GLRenderer;
    try {
        renderer = new GLRenderer(canvas);
    } catch {
        // Graceful fallback: no WebGL1 path, just an honest message.
        $("#fallback").hidden = false;
        canvas.hidden = true;
        $<HTMLElement>(".panel").style.display = "none";
        return;
    }

    // --- sizing (container × DPR, capped at 2; auto-drops to 1 if slow) ---
    let dprCap = 2;
    const resize = () => {
        const dpr = Math.min(devicePixelRatio || 1, dprCap);
        const w = Math.round(stage.clientWidth * dpr);
        const h = Math.round(stage.clientHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            loop.markDirty();
        }
    };

    const loop = createLoop({
        getSpeed: () => (state.params.speed as number) ?? 1,
        isPaused: () => state.paused,
        onSustainedSlow: () => {
            dprCap = 1;
            resize();
        },
        render: (time) => {
            const preset = getPreset(state.presetId);
            const info = renderer.getProgram(programKey(preset, state.params), buildFragment(preset, state.params));
            uploadUniforms(renderer, info, preset, state.params, time, canvas.width, canvas.height);
            renderer.draw(info);
        }
    });

    new ResizeObserver(resize).observe(stage);
    resize();
    loop.start();
    subscribe(() => loop.markDirty());

    // --- context loss ---
    const lostNote = $<HTMLElement>("#contextLost");
    canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        lostNote.hidden = false;
    });
    canvas.addEventListener("webglcontextrestored", () => {
        renderer.invalidate();
        lostNote.hidden = true;
        loop.markDirty();
    });

    // --- UI ---
    initPresetGrid($("#presetGrid"));
    initPanel($("#colorSection"), $("#paramSection"));
    initExportModal($("#exportBtn"));
    initMark();

    // Controls start collapsed so the preset list owns the panel by default.
    const toggle = $<HTMLButtonElement>("#controlsToggle");
    const controlsBody = $<HTMLElement>("#controlsBody");
    toggle.addEventListener("click", () => {
        const open = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!open));
        controlsBody.hidden = open;
    });

    const playBtn = $<HTMLButtonElement>("#playBtn");
    const syncPlay = () => {
        playBtn.textContent = state.paused ? "▶" : "⏸";
        playBtn.title = state.paused ? "Play (space)" : "Pause (space)";
    };
    playBtn.addEventListener("click", () => setPaused(!state.paused));
    subscribe((_s, c) => {
        if (c.includes("paused")) syncPlay();
    });
    syncPlay();

    $("#shuffleBtn").innerHTML = `<span class="btn-icon">${ICON_RANDOM}</span>`;
    $("#creditSparkle").innerHTML = ICON_SPARKLE;
    $("#keySpace").innerHTML = KEY_SPACE;
    $("#keyR").innerHTML = KEY_R;
    $("#keyBracket").innerHTML = KEY_BRACKET;

    const shuffle = () => {
        const preset = getPreset(state.presetId);
        const rng = mulberry32(freshSeed() * 7919 + Date.now() % 100000);
        setPreset(preset.id, { ...preset.defaults, ...preset.randomize(rng) });
    };
    $("#shuffleBtn").addEventListener("click", shuffle);

    const copyBtn = $<HTMLButtonElement>("#copyLink");
    copyBtn.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(currentShareURL());
            copyBtn.textContent = "Copied ✓";
            setTimeout(() => (copyBtn.textContent = "Copy link"), 1500);
        } catch {
            copyBtn.textContent = "Copy failed";
        }
    });

    stage.addEventListener("dblclick", () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else stage.requestFullscreen?.();
    });

    document.addEventListener("keydown", (e) => {
        const t = e.target as HTMLElement;
        if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
        if (e.key === " ") {
            e.preventDefault();
            setPaused(!state.paused);
        } else if (e.key === "r") {
            shuffle();
        } else if (e.key === "[" || e.key === "]") {
            // 24 presets outgrew the number keys — bracket to step through them
            const i = presets.findIndex((p) => p.id === state.presetId);
            const next = presets[(i + (e.key === "]" ? 1 : -1) + presets.length) % presets.length];
            resetVariant();
            selectPreset(next.id);
        }
    });

    runQAHooks(renderer);
}

// Dev/QA hooks (headless verification):
//   ?qa=1       — compile every preset + its baked export shader, report into #qa
//   ?shot=<id>  — hide chrome and render one preset's defaults for screenshots
function runQAHooks(renderer: GLRenderer): void {
    const q = new URLSearchParams(location.search);
    if (q.get("qa") === "1") {
        const results: string[] = [];
        for (const preset of presets) {
            try {
                renderer.getProgram(programKey(preset, preset.defaults), buildFragment(preset, preset.defaults));
                results.push(`PASS ${preset.id}`);
            } catch (err) {
                results.push(`FAIL ${preset.id}: ${String(err)}`);
            }
            try {
                renderer.getProgram(preset.id + ":baked", bakeFragment(preset, preset.defaults));
                results.push(`PASS ${preset.id}:baked`);
            } catch (err) {
                results.push(`FAIL ${preset.id}:baked: ${String(err)}`);
            }
        }
        const failed = results.filter((r) => r.startsWith("FAIL"));
        const qa = document.createElement("pre");
        qa.id = "qa";
        qa.textContent = results.join("\n");
        qa.style.display = "none";
        document.body.append(qa);
        // Full generated canvas snippet for the current preset, for runtime testing
        const snip = document.createElement("script");
        snip.id = "qa-snippet";
        snip.type = "text/plain";
        snip.textContent = exportCanvasSnippet(getPreset(state.presetId), state.params, "qa");
        document.body.append(snip);
        document.title = failed.length ? `QA FAIL ${failed.length}` : "QA PASS";
    }
    const shot = q.get("shot");
    if (shot) {
        document.body.classList.add("shot-mode");
        // ?p=… wins: screenshot the hydrated URL state, else the named preset's defaults
        if (!q.get("p")) {
            const preset = getPreset(shot);
            setPreset(preset.id, preset.defaults);
        }
        setPaused(true);
    }
}

boot();
