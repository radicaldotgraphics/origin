import type { PresetDefinition } from "../types";
import { angleParam, colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, pick, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 uv = frag / u_resolution;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    float a = radians(u_angle);
    vec2 dir = vec2(cos(a), sin(a));
    float lin = dot(uv - 0.5, dir) + 0.5;
    float rad = length(p) * 1.6;
    float t0 = mix(lin, rad, u_radial);

    t0 += (fbm(p * 2.0 + seedOffset(), 3) - 0.5) * 0.2;   // organic wobble
    t0 += 0.04 * sin(u_time * 0.5 + u_seed);               // slow breathe
    t0 = 0.5 + (t0 - 0.5) / max(u_softness, 0.05);

    vec3 col = ramp(t0);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const grainGradient: PresetDefinition = {
    id: "grainGradient",
    name: "Film School",
    group: "Gradient",
    description: "Linear or radial gradient under heavy film grain",
    body,
    params: [
        colorsParam,
        angleParam(),
        slider("radial", "Radial", 0, 1, 1, "u_radial"),
        slider("softness", "Spread", 0.2, 1.5, 0.01, "u_softness"),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["10002b", "5a189a", "c77dff", "e0aaff"],
        angle: 32,
        radial: 0,
        softness: 0.9,
        noise: 1,
        speed: 0.3,
        grain: 0.5,
        seed: 7211
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        angle: pick(rng, [0, 24, 32, 45, 90, 120, 135, 270]),
        radial: rng() < 0.3 ? 1 : 0,
        softness: round2(range(rng, 0.6, 1.2)),
        noise: pickNoise(rng, [0, 1]),
        speed: round2(range(rng, 0.15, 0.6)),
        grain: round2(range(rng, 0.3, 0.75)),
        seed: freshSeed()
    })
};
