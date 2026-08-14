import type { PresetDefinition } from "../types";
import { angleParam, colorsParam, grainParam, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
// One line grid: concentric if u_radial is on, straight otherwise.
float grid(vec2 p, float angle, float freq) {
    vec2 q = rot2(angle) * p;
    float v = mix(q.x, length(p), u_radial);
    return 0.5 + 0.5 * sin(v * freq);
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    // the interference between two near-identical grids is the whole effect —
    // small offsets produce the widest beat patterns
    float drift = sin(u_time * 0.25) * u_sway;
    float a = grid(p, u_angle, u_freq);
    float b = grid(p - vec2(u_offset, 0.0), u_angle + u_delta + drift, u_freq * u_ratio);

    float v = pow(clamp(a * b, 0.0, 1.0), u_contrast);
    vec3 col = ramp(v);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const moire: PresetDefinition = {
    id: "moire",
    name: "Op Art",
    group: "Geometric",
    description: "Two line grids beating against each other",
    body,
    params: [
        colorsParam,
        slider("freq", "Frequency", 20, 260, 1, "u_freq"),
        slider("delta", "Grid offset", 0.2, 24, 0.1, "u_delta"),
        slider("ratio", "Scale ratio", 0.9, 1.1, 0.001, "u_ratio"),
        slider("sway", "Sway", 0, 8, 0.05, "u_sway"),
        slider("offset", "Shift", -0.5, 0.5, 0.01, "u_offset"),
        slider("radial", "Radial", 0, 1, 1, "u_radial"),
        slider("contrast", "Contrast", 0.3, 3, 0.01, "u_contrast"),
        angleParam(),
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["0e0e11", "f5f0e8"],
        freq: 80,
        delta: 4,
        ratio: 1.0,
        sway: 2,
        offset: 0,
        radial: 0,
        contrast: 1.0,
        angle: 0,
        speed: 0.5,
        grain: 0.03,
        seed: 909
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        freq: Math.round(range(rng, 60, 200)),
        delta: round2(range(rng, 1, 12)),
        ratio: Math.round(range(rng, 970, 1030)) / 1000,
        sway: round2(range(rng, 0.5, 4)),
        offset: round2(range(rng, -0.25, 0.25)),
        radial: rng() < 0.35 ? 1 : 0,
        contrast: round2(range(rng, 0.6, 1.8)),
        angle: Math.round(range(rng, 0, 180)),
        speed: round2(range(rng, 0.25, 0.8)),
        grain: round2(range(rng, 0.01, 0.07)),
        seed: freshSeed()
    })
};
