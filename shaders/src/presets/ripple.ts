import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    vec2 c = vec2(u_centerX, u_centerY);
    float r = length(p - c);
    float n = (fbm(p * 3.0 + seedOffset(), 3) - 0.5) * u_distort;
    float phase = r * u_freq * 3.1416 - u_time * 1.8 + n * 5.0;
    float wv = 0.5 + 0.5 * sin(phase);
    wv *= exp(-r * 0.55);   // rings dissolve into the base color outward

    vec3 col = ramp(wv);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const ripple: PresetDefinition = {
    id: "ripple",
    name: "Koi Pond",
    group: "Geometric",
    description: "Concentric rings with noisy perturbation",
    body,
    params: [
        colorsParam,
        slider("freq", "Frequency", 2, 20, 0.1, "u_freq"),
        slider("centerX", "Center X", -0.8, 0.8, 0.01, "u_centerX"),
        slider("centerY", "Center Y", -0.8, 0.8, 0.01, "u_centerY"),
        slider("distort", "Distortion", 0, 2, 0.01, "u_distort"),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["03045e", "0077b6", "00b4d8", "caf0f8"],
        freq: 9,
        centerX: 0,
        centerY: 0,
        distort: 0.7,
        noise: 1,
        speed: 0.6,
        grain: 0.05,
        seed: 314
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        freq: round2(range(rng, 4, 14)),
        centerX: round2(range(rng, -0.5, 0.5)),
        centerY: round2(range(rng, -0.5, 0.5)),
        distort: round2(range(rng, 0.15, 1.2)),
        noise: pickNoise(rng, [0, 1, 2]),
        speed: round2(range(rng, 0.3, 1.0)),
        grain: round2(range(rng, 0.02, 0.12)),
        seed: freshSeed()
    })
};
