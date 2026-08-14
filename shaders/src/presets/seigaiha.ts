import type { PresetDefinition } from "../types";
import { angleParam, colorsParam, grainParam, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

// Seigaiha — the Japanese wave scale. Overlapping circles on a staggered
// lattice, each drawn as concentric arcs; taking the nearest centre is what
// makes the fronts overlap like fish scales.
const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 q = rot2(u_angle) * p * u_cellScale;
    q.y += u_time * 0.3;

    // rows offset by half a cell
    float row = floor(q.y);
    q.x += mod(row, 2.0) * 0.5;

    float best = 1e9;
    float cellId = 0.0;
    for (int y = 0; y <= 2; y++)
    for (int x = -1; x <= 1; x++) {
        vec2 nb = vec2(float(x), float(y));
        vec2 centre = floor(q) + nb + vec2(0.5, 0.0);
        float d = length((q - centre) * vec2(1.0, u_squash));
        if (d < best) { best = d; cellId = hash21(centre + u_seed * 0.01); }
    }

    float rings = fract(best * u_rings);
    float aa = fwidth(rings) * 1.5;
    float band = smoothstep(u_lineWidth + aa, u_lineWidth - aa, abs(rings - 0.5) * 2.0);

    vec3 base = ramp(clamp(best * 1.2, 0.0, 1.0));
    vec3 col = mix(base, ramp(cellId * 0.4 + 0.6), band * u_bandStrength);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const seigaiha: PresetDefinition = {
    id: "seigaiha",
    name: "Seigaiha",
    group: "Tessellation",
    description: "Japanese wave scales — overlapping arc fans",
    body,
    params: [
        colorsParam,
        slider("cellScale", "Grid", 2, 20, 0.2, "u_cellScale"),
        slider("rings", "Arcs per scale", 1, 10, 0.5, "u_rings"),
        slider("lineWidth", "Arc width", 0.05, 0.95, 0.01, "u_lineWidth"),
        slider("bandStrength", "Arc contrast", 0, 1, 0.01, "u_bandStrength"),
        slider("squash", "Squash", 0.4, 2, 0.01, "u_squash"),
        angleParam(),
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["03045e", "0077b6", "00b4d8", "caf0f8"],
        cellScale: 7,
        rings: 4,
        lineWidth: 0.55,
        bandStrength: 0.9,
        squash: 1,
        angle: 0,
        speed: 0.4,
        grain: 0.04,
        seed: 1831
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        cellScale: round2(range(rng, 4, 13)),
        rings: round2(range(rng, 2, 7)),
        lineWidth: round2(range(rng, 0.3, 0.8)),
        bandStrength: round2(range(rng, 0.6, 1)),
        squash: round2(range(rng, 0.7, 1.4)),
        angle: Math.round(range(rng, 0, 20)),
        speed: round2(range(rng, 0.15, 0.7)),
        grain: round2(range(rng, 0.01, 0.09)),
        seed: freshSeed()
    })
};
