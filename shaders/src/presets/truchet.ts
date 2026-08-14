import type { PresetDefinition } from "../types";
import { angleParam, colorsParam, grainParam, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, pick, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    float spin = u_time * 0.05;
    vec2 g = rot2(u_angle + spin * 57.29) * p * u_cellScale;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;

    // each cell flips one of two quarter-arc orientations
    float h = hash21(id + u_seed * 0.01);
    if (h < 0.5) f.x = -f.x;

    float d = min(length(f - 0.5), length(f + 0.5));
    d = abs(d - 0.5);

    float w = u_width * (0.75 + 0.25 * sin(u_time * 0.8 + h * 6.2832));
    float aa = fwidth(d) * 1.5;
    float m = smoothstep(w + aa, w - aa, d);

    vec3 line = ramp(hash21(id + 3.7) * 0.6 + 0.4);
    vec3 col = mix(u_colors[0], line, m);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const truchet: PresetDefinition = {
    id: "truchet",
    name: "Labyrinth",
    group: "Tessellation",
    description: "Interlocking arcs on a randomized grid",
    body,
    params: [
        colorsParam,
        slider("cellScale", "Grid", 2, 16, 0.1, "u_cellScale"),
        slider("width", "Line width", 0.02, 0.3, 0.005, "u_width"),
        angleParam(),
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["fdf0d5", "c1121f", "780000"],
        cellScale: 6,
        width: 0.11,
        angle: 0,
        speed: 0.5,
        grain: 0.04,
        seed: 4488
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        cellScale: round2(range(rng, 3, 11)),
        width: round2(range(rng, 0.05, 0.2)),
        angle: pick(rng, [0, 15, 30, 45]),
        speed: round2(range(rng, 0.2, 0.8)),
        grain: round2(range(rng, 0.01, 0.09)),
        seed: freshSeed()
    })
};
