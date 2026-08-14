import type { PresetDefinition } from "../types";
import { angleParam, colorsParam, grainParam, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

// Half-square triangles and quarter-circle arcs on a grid, each cell rotated at
// random — the quilt-block / Bauhaus-tile construction behind most of those
// mid-century pattern sheets.
const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 q = rot2(u_angle) * p * u_cellScale;

    vec2 id = floor(q);
    vec2 f = fract(q);

    // one of four quarter-turns per cell, drifting over time
    float h = hash21(id + u_seed * 0.01);
    float turn = floor(h * 4.0 + floor(u_time * 0.25 * u_churn));
    for (int i = 0; i < 3; i++) {
        if (float(i) >= mod(turn, 4.0)) break;
        f = vec2(f.y, 1.0 - f.x);
    }

    // diagonal split vs quarter-circle, blended by u_round
    float diag = f.x + f.y - 1.0;
    float arc = length(f) - 1.0;
    float d = mix(diag, arc, u_round);

    float aa = fwidth(d) * 1.2;
    float m = smoothstep(-aa, aa, d);

    float h2 = hash21(id + 7.3);
    vec3 a = ramp(h2 * 0.45);
    vec3 b = ramp(0.55 + h2 * 0.45);
    vec3 col = mix(a, b, m);

    // optional grout line between blocks
    float grid = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
    col = mix(u_colors[0], col, smoothstep(0.0, u_gap + 0.005, grid));

    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const quilt: PresetDefinition = {
    id: "quilt",
    name: "Quilt",
    group: "Tessellation",
    description: "Half-square triangles and arcs, randomly turned",
    body,
    params: [
        colorsParam,
        slider("cellScale", "Grid", 2, 18, 0.2, "u_cellScale"),
        slider("round", "Triangle ↔ arc", 0, 1, 0.01, "u_round"),
        slider("gap", "Grout", 0, 0.12, 0.002, "u_gap"),
        slider("churn", "Churn", 0, 2, 0.01, "u_churn"),
        angleParam(),
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["2b2d42", "8d99ae", "edf2f4", "ef233c"],
        cellScale: 6,
        round: 0.35,
        gap: 0.0,
        churn: 0.5,
        angle: 0,
        speed: 0.5,
        grain: 0.04,
        seed: 1971
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        cellScale: round2(range(rng, 3, 11)),
        round: rng() < 0.4 ? 0 : round2(range(rng, 0.2, 1)),
        gap: rng() < 0.5 ? 0 : round2(range(rng, 0.01, 0.06)),
        churn: round2(range(rng, 0, 1.2)),
        angle: Math.round(range(rng, 0, 90)),
        speed: round2(range(rng, 0.2, 0.8)),
        grain: round2(range(rng, 0.01, 0.09)),
        seed: freshSeed()
    })
};
