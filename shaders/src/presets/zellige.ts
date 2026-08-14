import type { PresetDefinition } from "../types";
import { angleParam, colorsParam, grainParam, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

// Moroccan zellige: an n-fold star sits at each lattice point, the gaps between
// stars read as crosses, and a strapwork line traces the boundary between them.
const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 q = rot2(u_angle + u_time * 2.0) * p * u_cellScale;

    vec2 id = floor(q);
    vec2 f = fract(q) - 0.5;

    // Stars sit on the lattice; the offset copy fills the gaps with crosses.
    float best = 1e9;
    float which = 0.0;
    for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
        vec2 nb = vec2(float(x), float(y));
        for (int k = 0; k < 2; k++) {
            vec2 centre = nb + (k == 0 ? vec2(0.0) : vec2(0.5));
            vec2 d = f - centre;
            float r = length(d);
            float a = atan(d.y, d.x);
            // Lattice points carry the n-point stars; the offset points carry
            // smaller four-lobed crosses, which is what fills the gaps in real
            // zellige rather than a second rank of stars.
            float lobes = (k == 0) ? float(u_points) : 4.0;
            float base = (k == 0) ? 0.3 : 0.2 * u_crossSize;
            float star = r / max(base * (1.0 + u_sharp * cos(lobes * a)), 0.001);
            if (star < best) { best = star; which = float(k) + hash21(id + nb) * 0.001; }
        }
    }

    float aa = fwidth(best) * 1.2;
    float body = smoothstep(1.0 + aa, 1.0 - aa, best);
    float strap = smoothstep(1.0 + u_strap + aa, 1.0 + u_strap - aa, best) - body;

    vec3 tileCol = ramp(fract(which) < 0.5 ? 0.5 : 0.92);
    vec3 col = mix(u_colors[0], tileCol, body);
    col = mix(col, u_colors[u_colorCount - 1], strap * u_strapStrength);

    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const zellige: PresetDefinition = {
    id: "zellige",
    name: "Zellige",
    group: "Tessellation",
    description: "Moroccan star-and-cross tilework with strapwork",
    body,
    params: [
        colorsParam,
        slider("cellScale", "Grid", 1.5, 12, 0.1, "u_cellScale"),
        slider("points", "Star points", 5, 12, 1, "u_points", true),
        slider("sharp", "Point depth", 0.05, 0.6, 0.01, "u_sharp"),
        slider("crossSize", "Cross size", 0.3, 1.6, 0.01, "u_crossSize"),
        slider("strap", "Strap width", 0.02, 0.5, 0.005, "u_strap"),
        slider("strapStrength", "Strap", 0, 1, 0.01, "u_strapStrength"),
        angleParam(),
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["0b132b", "1c2541", "3a506b", "5bc0be"],
        cellScale: 4,
        points: 8,
        sharp: 0.3,
        crossSize: 1,
        strap: 0.12,
        strapStrength: 0.9,
        angle: 0,
        speed: 0.3,
        grain: 0.04,
        seed: 1453
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        cellScale: round2(range(rng, 2.5, 7)),
        points: Math.round(range(rng, 6, 12)),
        sharp: round2(range(rng, 0.15, 0.45)),
        crossSize: round2(range(rng, 0.6, 1.3)),
        strap: round2(range(rng, 0.05, 0.25)),
        strapStrength: round2(range(rng, 0.5, 1)),
        angle: Math.round(range(rng, 0, 90)),
        speed: round2(range(rng, 0.1, 0.5)),
        grain: round2(range(rng, 0.01, 0.08)),
        seed: freshSeed()
    })
};
