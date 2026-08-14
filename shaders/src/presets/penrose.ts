import type { PresetDefinition } from "../types";
import { angleParam, colorsParam, grainParam, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

// Summing N plane waves at evenly spread angles produces a quasicrystal: with
// an odd N the 2N-fold symmetry can't tile periodically, so the pattern never
// repeats — the cheapest honest route to a Penrose-like aperiodic field.
const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 q = rot2(u_angle) * p * u_scale + seedOffset() * 0.05;

    float t = u_time * 0.25;
    float v = 0.0;
    for (int i = 0; i < 11; i++) {
        if (i >= u_waves) break;
        float a = 3.14159265 * float(i) / float(u_waves);
        v += cos(dot(q, vec2(cos(a), sin(a))) * u_freq + t * (0.6 + 0.4 * float(i)));
    }
    v /= float(u_waves);

    // fract() cuts the smooth field into the tile-like terraces
    float m = mix(v * 0.5 + 0.5, fract(v * u_bands + 0.5), u_terrace);
    m = pow(clamp(m, 0.0, 1.0), u_contrast);

    vec3 col = ramp(m);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const penrose: PresetDefinition = {
    id: "penrose",
    name: "Penrose",
    group: "Tessellation",
    description: "Aperiodic quasicrystal from summed plane waves",
    body,
    params: [
        colorsParam,
        slider("waves", "Fold", 3, 11, 1, "u_waves", true),
        slider("freq", "Frequency", 4, 70, 0.5, "u_freq"),
        slider("scale", "Scale", 0.3, 3, 0.01, "u_scale"),
        slider("terrace", "Terracing", 0, 1, 0.01, "u_terrace"),
        slider("bands", "Bands", 1, 8, 0.1, "u_bands"),
        slider("contrast", "Contrast", 0.3, 3, 0.01, "u_contrast"),
        angleParam(),
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["03071e", "9d0208", "f48c06", "ffba08"],
        waves: 5,
        freq: 34,
        scale: 1,
        terrace: 0.5,
        bands: 2.5,
        contrast: 1,
        angle: 0,
        speed: 0.4,
        grain: 0.04,
        seed: 1974
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        waves: [5, 5, 7, 7, 9, 11][Math.floor(rng() * 6)],
        freq: round2(range(rng, 18, 52)),
        scale: round2(range(rng, 0.6, 1.8)),
        terrace: round2(range(rng, 0, 0.8)),
        bands: round2(range(rng, 1.5, 5)),
        contrast: round2(range(rng, 0.7, 1.8)),
        angle: Math.round(range(rng, 0, 180)),
        speed: round2(range(rng, 0.2, 0.7)),
        grain: round2(range(rng, 0.01, 0.09)),
        seed: freshSeed()
    })
};
