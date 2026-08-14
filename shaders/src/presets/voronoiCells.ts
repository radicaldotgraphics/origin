import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    vec2 g = p * u_cellScale + seedOffset();
    vec2 gi = floor(g);
    vec2 gf = fract(g);

    float f1 = 8.0;
    float f2 = 8.0;
    vec2 bestId = vec2(0.0);
    for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
        vec2 nb = vec2(float(x), float(y));
        vec2 h = hash22(gi + nb);
        vec2 pt = nb + 0.5 + 0.5 * u_jitter * sin(u_time * 0.7 + 6.2832 * h) - gf;
        float d = dot(pt, pt);
        if (d < f1) { f2 = f1; f1 = d; bestId = gi + nb; }
        else if (d < f2) { f2 = d; }
    }
    float edge = sqrt(f2) - sqrt(f1);

    vec3 cellCol = ramp(hash21(bestId + u_seed * 0.01));
    float m = smoothstep(0.0, max(u_edge, 0.001), edge);
    vec3 col = mix(u_colors[0] * 0.35, cellCol, m);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const voronoiCells: PresetDefinition = {
    id: "voronoiCells",
    name: "Cathedral",
    group: "Geometric",
    description: "Animated cellular pattern with inked edges",
    body,
    params: [
        colorsParam,
        slider("cellScale", "Cell scale", 2, 14, 0.1, "u_cellScale"),
        slider("edge", "Edge width", 0.01, 0.35, 0.005, "u_edge"),
        slider("jitter", "Jitter", 0, 1, 0.01, "u_jitter"),
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["081c15", "2d6a4f", "74c69d", "d8f3dc"],
        cellScale: 5,
        edge: 0.08,
        jitter: 0.85,
        speed: 0.5,
        grain: 0.05,
        seed: 6006
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        cellScale: round2(range(rng, 3, 9)),
        edge: round2(range(rng, 0.03, 0.2)),
        jitter: round2(range(rng, 0.5, 1.0)),
        speed: round2(range(rng, 0.25, 0.9)),
        grain: round2(range(rng, 0.02, 0.1)),
        seed: freshSeed()
    })
};
