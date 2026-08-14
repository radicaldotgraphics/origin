import type { PresetDefinition } from "../types";
import { angleParam, colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, pick, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    float a = radians(u_angle);
    vec2 rp = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
    float t = u_time * 0.4;

    float w = fbm(rp * 1.8 + seedOffset() + t * 0.25, 3);
    float x = rp.x * u_freq * 3.1416 + (w - 0.5) * u_wave * 6.0 + t;
    float band = 0.5 + 0.5 * sin(x);

    float sharp = mix(14.0, 1.0, u_softness);
    band = clamp(0.5 + (band - 0.5) * sharp, 0.0, 1.0);
    vec3 col = ramp(band);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const stripes: PresetDefinition = {
    id: "stripes",
    name: "Cabana",
    group: "Geometric",
    description: "Sine-displaced bands, soft or razor-sharp",
    body,
    params: [
        colorsParam,
        slider("freq", "Frequency", 2, 24, 0.1, "u_freq"),
        slider("wave", "Wave", 0, 2, 0.01, "u_wave"),
        angleParam(),
        slider("softness", "Softness", 0, 1, 0.01, "u_softness"),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["0b132b", "1c2541", "3a506b", "5bc0be"],
        freq: 9,
        wave: 0.8,
        angle: 24,
        softness: 0.6,
        noise: 1,
        speed: 0.5,
        grain: 0.05,
        seed: 993
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        freq: round2(range(rng, 4, 16)),
        wave: round2(range(rng, 0.3, 1.5)),
        angle: pick(rng, [0, 15, 24, 45, 60, 90, 105, 135]),
        softness: round2(range(rng, 0.25, 0.9)),
        noise: pickNoise(rng, [0, 1]),
        speed: round2(range(rng, 0.25, 0.8)),
        grain: round2(range(rng, 0.02, 0.1)),
        seed: freshSeed()
    })
};
