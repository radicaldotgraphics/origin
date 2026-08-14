import type { PresetDefinition } from "../types";
import { angleParam, colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 q = rot2(u_angle) * p * u_scale + seedOffset();
    float t = u_time * 0.1;

    q += vec2(fbm(q * 0.45 + t, u_detail), fbm(q * 0.45 + vec2(7.3, 2.1) - t * 0.8, u_detail))
         * u_warp * 2.0;

    // smooth checker so it can be antialiased and softened
    float ch = sin(q.x * 3.1416) * sin(q.y * 3.1416);
    float aa = fwidth(ch) * 1.2;
    float m = smoothstep(-u_soft - aa, u_soft + aa, ch);

    vec3 col = mix(ramp(0.08), ramp(0.92), m);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const checkerWarp: PresetDefinition = {
    id: "checkerWarp",
    name: "Nascar",
    group: "Geometric",
    description: "A checkerboard dragged through turbulence",
    body,
    params: [
        colorsParam,
        slider("scale", "Scale", 1, 14, 0.1, "u_scale"),
        slider("warp", "Warp", 0, 2, 0.01, "u_warp"),
        slider("soft", "Softness", 0.005, 0.6, 0.005, "u_soft"),
        slider("detail", "Detail", 2, 6, 1, "u_detail", true),
        angleParam(),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["fffcf2", "252422"],
        scale: 5,
        warp: 0.55,
        soft: 0.06,
        detail: 4,
        angle: 12,
        noise: 1,
        speed: 0.5,
        grain: 0.04,
        seed: 2020
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        scale: round2(range(rng, 3, 9)),
        warp: round2(range(rng, 0.25, 1.1)),
        soft: round2(range(rng, 0.02, 0.25)),
        detail: Math.round(range(rng, 3, 5)),
        angle: Math.round(range(rng, 0, 90)),
        noise: pickNoise(rng, [0, 1]),
        speed: round2(range(rng, 0.25, 0.8)),
        grain: round2(range(rng, 0.01, 0.09)),
        seed: freshSeed()
    })
};
