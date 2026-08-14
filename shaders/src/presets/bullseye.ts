import type { PresetDefinition } from "../types";
import { angleParam, colorsParam, grainParam, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 q = rot2(u_angle) * p * u_cellScale;

    vec2 id = floor(q);
    vec2 f = fract(q) - 0.5;
    float h = hash21(id + u_seed * 0.01);

    // each cell gets its own ring count and phase, so the grid reads as a
    // sheet of separate targets rather than one repeated stamp
    float count = floor(mix(2.0, u_maxRings, hash21(id + 3.1)));
    float r = length(f) * 2.0;
    float rings = r * count - u_time * 0.35 * u_pulse + h * 6.0;

    float band = floor(rings);
    float col_t = fract(band * 0.37 + h);
    vec3 col = ramp(col_t);

    // outside the disc falls back to the base colour
    float aa = fwidth(r) * 1.5;
    float disc = smoothstep(u_radius + aa, u_radius - aa, r);
    col = mix(u_colors[0], col, disc);

    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const bullseye: PresetDefinition = {
    id: "bullseye",
    name: "Bullseye",
    group: "Geometric",
    description: "A sheet of concentric targets, each its own",
    body,
    params: [
        colorsParam,
        slider("cellScale", "Grid", 1, 12, 0.1, "u_cellScale"),
        slider("maxRings", "Rings", 3, 14, 1, "u_maxRings"),
        slider("radius", "Disc size", 0.4, 1.4, 0.01, "u_radius"),
        slider("pulse", "Pulse", 0, 3, 0.01, "u_pulse"),
        angleParam(),
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["fffcf2", "ccc5b9", "403d39", "252422"],
        cellScale: 3,
        maxRings: 7,
        radius: 0.95,
        pulse: 1,
        angle: 0,
        speed: 0.5,
        grain: 0.04,
        seed: 6262
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        cellScale: round2(range(rng, 1.5, 6)),
        maxRings: Math.round(range(rng, 4, 11)),
        radius: round2(range(rng, 0.7, 1.2)),
        pulse: round2(range(rng, 0.2, 2)),
        angle: Math.round(range(rng, 0, 90)),
        speed: round2(range(rng, 0.2, 0.8)),
        grain: round2(range(rng, 0.01, 0.09)),
        seed: freshSeed()
    })
};
