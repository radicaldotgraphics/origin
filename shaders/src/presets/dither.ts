import type { PresetDefinition } from "../types";
import { angleParam, colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
// Recursive Bayer construction — cheaper than an indexed matrix and exact.
float bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x / 2.0 + a.y * a.y * 0.75);
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    // quantise position first so the pattern reads as chunky pixels
    vec2 px = floor(frag / u_pixel);
    vec2 p = (px * u_pixel - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    // underlying field: a linear ramp blended toward drifting noise
    vec2 dir = vec2(cos(radians(u_angle)), sin(radians(u_angle)));
    float lin = dot(p, dir) * 0.9 + 0.5;
    float nse = fbm(p * u_scale + seedOffset() + u_time * 0.08, u_detail);
    float field = clamp(mix(lin, nse, u_fieldMix), 0.0, 1.0);

    float b4 = bayer2(px * 0.5) * 0.25 + bayer2(px);
    float b8 = bayer2(px * 0.25) * 0.0625 + b4;
    float threshold = (b8 - 0.5) * u_strength;

    float q = floor(field * u_levels + threshold + 0.5) / u_levels;
    vec3 col = ramp(clamp(q, 0.0, 1.0));
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const dither: PresetDefinition = {
    id: "dither",
    name: "Riso",
    group: "Optical",
    description: "Ordered Bayer dithering — riso and early-web",
    body,
    params: [
        colorsParam,
        slider("pixel", "Pixel size", 1, 16, 1, "u_pixel"),
        slider("levels", "Levels", 2, 12, 1, "u_levels"),
        slider("strength", "Dither", 0, 2.5, 0.01, "u_strength"),
        slider("fieldMix", "Field: fade ↔ noise", 0, 1, 0.01, "u_fieldMix"),
        slider("scale", "Noise scale", 0.3, 4, 0.01, "u_scale"),
        slider("detail", "Detail", 2, 6, 1, "u_detail", true),
        angleParam(),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["0f0e17", "ff8906", "fffffc"],
        pixel: 3,
        levels: 4,
        strength: 1.0,
        fieldMix: 0.5,
        scale: 1.4,
        detail: 4,
        angle: 60,
        noise: 1,
        speed: 0.5,
        grain: 0.0,
        seed: 1024
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        pixel: Math.round(range(rng, 2, 7)),
        levels: Math.round(range(rng, 2, 6)),
        strength: round2(range(rng, 0.7, 1.6)),
        fieldMix: round2(range(rng, 0.2, 0.9)),
        scale: round2(range(rng, 0.8, 2.4)),
        detail: Math.round(range(rng, 3, 5)),
        angle: Math.round(range(rng, 0, 180)),
        noise: pickNoise(rng, [0, 1, 3]),
        speed: round2(range(rng, 0.25, 0.8)),
        grain: 0,
        seed: freshSeed()
    })
};
