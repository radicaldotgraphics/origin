import type { PresetDefinition } from "../types";
import { angleParam, colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 sp = rot2(u_angle) * p * u_scale + seedOffset();

    // growth rings: concentric, squashed along one axis, nudged by turbulence
    vec2 stretched = sp * vec2(1.0, u_stretch);
    float turb = fbm(stretched * 0.8 + u_time * 0.02, u_detail);
    float r = length(stretched - vec2(u_offset, 0.0));
    float rings = fract(r * u_freq + turb * u_turbulence * 3.0);
    float v = pow(rings, u_contrast);

    // fine fibre streaks running with the grain
    float fibre = fbm(vec2(sp.x * 90.0, sp.y * 1.5) + seedOffset(), 2);
    v = clamp(v + (fibre - 0.5) * u_fibre, 0.0, 1.0);

    vec3 col = ramp(v);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const woodgrain: PresetDefinition = {
    id: "woodgrain",
    name: "Heartwood",
    group: "Organic",
    description: "Growth rings with fibre streaks",
    body,
    params: [
        colorsParam,
        slider("scale", "Scale", 0.3, 3, 0.01, "u_scale"),
        slider("freq", "Ring density", 1, 20, 0.1, "u_freq"),
        slider("stretch", "Stretch", 0.02, 1, 0.01, "u_stretch"),
        slider("offset", "Ring centre", -3, 3, 0.05, "u_offset"),
        slider("turbulence", "Turbulence", 0, 2, 0.01, "u_turbulence"),
        slider("contrast", "Contrast", 0.3, 3, 0.01, "u_contrast"),
        slider("fibre", "Fibre", 0, 1, 0.01, "u_fibre"),
        slider("detail", "Detail", 2, 6, 1, "u_detail", true),
        angleParam(),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["f8f5f0", "e8c4a0", "d97757"],
        scale: 1.1,
        freq: 4.5,
        stretch: 0.34,
        offset: -1.9,
        turbulence: 1.05,
        contrast: 0.9,
        fibre: 0.42,
        detail: 4,
        angle: 8,
        noise: 1,
        speed: 0.3,
        grain: 0.07,
        seed: 8412
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        scale: round2(range(rng, 0.6, 1.8)),
        freq: round2(range(rng, 4, 13)),
        stretch: round2(range(rng, 0.18, 0.5)),
        offset: round2(range(rng, -2.2, 2.2)),
        turbulence: round2(range(rng, 0.6, 1.4)),
        contrast: round2(range(rng, 0.5, 1.6)),
        fibre: round2(range(rng, 0.1, 0.45)),
        detail: Math.round(range(rng, 3, 5)),
        angle: Math.round(range(rng, 0, 180)),
        noise: pickNoise(rng, [0, 1]),
        speed: round2(range(rng, 0.1, 0.5)),
        grain: round2(range(rng, 0.03, 0.14)),
        seed: freshSeed()
    })
};
