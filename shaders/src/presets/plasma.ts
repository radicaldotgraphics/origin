import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 q = p * u_scale + seedOffset() * 0.1;
    float t = u_time * 0.6;

    // the demoscene original: a few summed sines, one of them radial
    float v = sin(q.x * 1.3 + t);
    v += sin(q.y * 1.1 - t * 0.8);
    v += sin((q.x + q.y) * 0.9 + t * 0.5);
    v += sin(length(q * u_radial) * 1.4 - t * 1.1);
    v = v * 0.25 * u_amplitude;

    // fract() posterizes the palette into repeating bands
    float m = mix(v * 0.5 + 0.5, fract(v * u_bands), u_banding);
    vec3 col = ramp(clamp(m, 0.0, 1.0));
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const plasma: PresetDefinition = {
    id: "plasma",
    name: "Amiga",
    group: "Optical",
    description: "Summed sine waves — the demoscene classic",
    body,
    params: [
        colorsParam,
        slider("scale", "Scale", 0.5, 10, 0.05, "u_scale"),
        slider("radial", "Radial weight", 0, 3, 0.01, "u_radial"),
        slider("amplitude", "Amplitude", 0.4, 2.5, 0.01, "u_amplitude"),
        slider("banding", "Banding", 0, 1, 0.01, "u_banding"),
        slider("bands", "Band count", 1, 8, 0.1, "u_bands"),
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["03045e", "0077b6", "00b4d8", "caf0f8"],
        scale: 3.2,
        radial: 1.2,
        amplitude: 1.1,
        banding: 0.25,
        bands: 2.5,
        speed: 0.7,
        grain: 0.04,
        seed: 1989
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        scale: round2(range(rng, 1.8, 6)),
        radial: round2(range(rng, 0.3, 2.2)),
        amplitude: round2(range(rng, 0.8, 1.8)),
        banding: rng() < 0.4 ? round2(range(rng, 0.4, 1.0)) : round2(range(rng, 0, 0.25)),
        bands: round2(range(rng, 1.5, 5)),
        speed: round2(range(rng, 0.4, 1.1)),
        grain: round2(range(rng, 0.01, 0.09)),
        seed: freshSeed()
    })
};
