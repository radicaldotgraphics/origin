import type { AngleDef, ColorStopsDef, SeedDef, SelectDef, SliderDef } from "../types";
import { pick } from "../utils/rand";

export function slider(
    key: string,
    label: string,
    min: number,
    max: number,
    step: number,
    uniform: string,
    int = false
): SliderDef {
    return { kind: "slider", key, label, min, max, step, uniform, int };
}

export const colorsParam: ColorStopsDef = {
    kind: "colorStops",
    key: "colors",
    label: "Colors",
    uniform: "u_colors"
};

// speed scales time on the CPU (uniform "" = never uploaded)
export const speedParam: SliderDef = slider("speed", "Speed", 0, 3, 0.01, "");

export const grainParam: SliderDef = slider("grain", "Grain", 0, 1, 0.01, "u_grain");

export const seedParam: SeedDef = { kind: "seed", key: "seed", uniform: "u_seed" };

export function angleParam(label = "Angle"): AngleDef {
    return { kind: "angle", key: "angle", label, uniform: "u_angle" };
}

// Compile-time: one cached program per noise type, no per-pixel branching.
export const noiseParam: SelectDef = {
    kind: "select",
    key: "noise",
    label: "Noise",
    uniform: "",
    define: "NOISE_TYPE",
    options: [
        { value: 0, label: "Value" },
        { value: 1, label: "Gradient" },
        { value: 2, label: "Ridged" },
        { value: 3, label: "Billow" },
        { value: 4, label: "Cellular" }
    ]
};

// Compile-time like the noise type: one cached program per blend mode.
// Labels map to the artwork in algo-icons/ via the icon lookup in controls.ts.
export const blendParam: SelectDef = {
    kind: "select",
    key: "blend",
    label: "Blend",
    uniform: "",
    define: "BLEND_MODE",
    options: [
        { value: 0, label: "Color dodge" },
        { value: 1, label: "Screen" },
        { value: 3, label: "Overlay" },
        { value: 2, label: "Color burn" }
    ]
};

// Cellular and ridged wreck some presets; each family passes what suits it.
export function pickNoise(rng: () => number, allowed: readonly number[] = [0, 1, 2, 3]): number {
    return pick(rng, allowed);
}
