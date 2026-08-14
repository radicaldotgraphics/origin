import type { AppState, ParamDefinition, ParamValue, PresetDefinition } from "./types";
import { getPreset, defaultPresetId } from "./presets/index";
import { isValidHex, normalizeHex } from "./utils/color";

type Listener = (state: AppState, changed: string[]) => void;

const listeners: Listener[] = [];

export const state: AppState = {
    presetId: defaultPresetId,
    params: {},
    paused: false
};

export function subscribe(fn: Listener): void {
    listeners.push(fn);
}

function emit(changed: string[]): void {
    for (const fn of listeners) fn(state, changed);
}

// Replace all params (preset switch / shuffle / hydrate)
export function setPreset(presetId: string, params: Record<string, ParamValue>): void {
    state.presetId = presetId;
    state.params = { ...params };
    scheduleURLWrite();
    emit(["preset"]);
}

/**
 * Switch preset while keeping the working colour set. The palette is a
 * standalone choice that outlives preset changes — and because the grid
 * thumbnails preview each preset in the current palette, preserving it is what
 * makes the result match the tile you clicked.
 */
export function selectPreset(presetId: string, params?: Record<string, ParamValue>): void {
    const preset = getPreset(presetId);
    const colors = state.params.colors;
    setPreset(preset.id, {
        ...(params ?? preset.defaults),
        ...(colors ? { colors: [...(colors as string[])] } : {})
    });
}

export function setParam(key: string, value: ParamValue): void {
    state.params[key] = value;
    scheduleURLWrite();
    emit([key]);
}

export function setPaused(paused: boolean): void {
    state.paused = paused;
    emit(["paused"]);
}

// ---------- validation ----------

function clampParam(def: ParamDefinition, raw: ParamValue | undefined, fallback: ParamValue): ParamValue {
    if (def.kind === "slider") {
        const v = typeof raw === "number" ? raw : NaN;
        if (!isFinite(v)) return fallback;
        const clamped = Math.min(def.max, Math.max(def.min, v));
        return def.int ? Math.round(clamped) : clamped;
    }
    if (def.kind === "angle") {
        const v = typeof raw === "number" ? raw : NaN;
        if (!isFinite(v)) return fallback;
        return ((v % 360) + 360) % 360;
    }
    if (def.kind === "seed") {
        const v = typeof raw === "number" ? raw : NaN;
        if (!isFinite(v)) return fallback;
        return Math.max(0, Math.round(v));
    }
    if (def.kind === "select") {
        const v = typeof raw === "number" ? Math.round(raw) : NaN;
        return def.options.some((o) => o.value === v) ? v : fallback;
    }
    // colorStops
    if (Array.isArray(raw)) {
        const colors = raw.filter((c) => typeof c === "string" && isValidHex(c)).map(normalizeHex);
        if (colors.length >= 2) return colors.slice(0, 4);
    }
    return fallback;
}

export function validateParams(
    preset: PresetDefinition,
    raw: Record<string, ParamValue | undefined>
): Record<string, ParamValue> {
    const out: Record<string, ParamValue> = {};
    for (const def of preset.params) {
        out[def.key] = clampParam(def, raw[def.key], preset.defaults[def.key]);
    }
    return out;
}

// ---------- URL serialization ----------
// ?p=domainWarp&c=1a1a2e,e94560,f5f5f5&scale=2.4&seed=42817
// Param keys and preset ids are permanent once shipped.

export function serializeToQuery(): string {
    const preset = getPreset(state.presetId);
    const q = new URLSearchParams();
    q.set("p", state.presetId);
    for (const def of preset.params) {
        const v = state.params[def.key];
        if (v === undefined) continue;
        if (def.kind === "colorStops") {
            q.set("c", (v as string[]).join(","));
        } else {
            const n = v as number;
            q.set(def.key, String(Math.round(n * 1000) / 1000));
        }
    }
    return q.toString();
}

export function hydrateFromURL(): void {
    const q = new URLSearchParams(location.search);
    const presetId = q.get("p") ?? defaultPresetId;
    const preset = getPreset(presetId); // falls back to default preset
    const raw: Record<string, ParamValue | undefined> = {};
    for (const def of preset.params) {
        if (def.kind === "colorStops") {
            const c = q.get("c");
            raw[def.key] = c ? c.split(",") : undefined;
        } else {
            const s = q.get(def.key);
            raw[def.key] = s === null ? undefined : parseFloat(s);
        }
    }
    state.presetId = preset.id;
    state.params = validateParams(preset, raw);
}

// Hosts without a writable URL (the Figma plugin iframe) opt out; the rest of
// the core is identical in both hosts.
let urlSyncEnabled = true;
export function disableURLSync(): void {
    urlSyncEnabled = false;
}

let urlTimer: number | undefined;
function scheduleURLWrite(): void {
    if (!urlSyncEnabled || urlTimer !== undefined) return;
    urlTimer = window.setTimeout(() => {
        urlTimer = undefined;
        try {
            history.replaceState(null, "", "?" + serializeToQuery());
        } catch {
            urlSyncEnabled = false; // sandboxed iframe — stop trying
        }
    }, 250);
}

export const SHARE_BASE = "https://radical.graphics/shaders/";

export function currentShareURL(): string {
    // Inside the plugin there is no meaningful page URL, so point at the web app.
    const base = urlSyncEnabled ? location.origin + location.pathname : SHARE_BASE;
    return base + "?" + serializeToQuery();
}
