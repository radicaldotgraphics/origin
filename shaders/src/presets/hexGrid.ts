import type { PresetDefinition } from "../types";
import { angleParam, colorsParam, grainParam, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
// Returns .xy = position within the cell, .zw = cell id
vec4 hexCell(vec2 p) {
    const vec2 s = vec2(1.0, 1.7320508);
    vec4 hC = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
    vec4 h = vec4(p - hC.xy * s, p - (hC.zw + 0.5) * s);
    return dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, hC.xy) : vec4(h.zw, hC.zw + 0.5);
}

// Distance to the hexagon border
float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x);
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    vec4 hc = hexCell(rot2(u_angle) * p * u_cellScale);
    float value = fbm(hc.zw * 0.35 + seedOffset() + u_time * 0.12, 3);
    value = clamp((value - 0.5) * 2.4 + 0.5, 0.0, 1.0); // expand into the full ramp

    float d = hexDist(hc.xy);
    float aa = fwidth(d) * 1.4;
    float inner = smoothstep(0.5, 0.5 - u_gap - aa, d);

    // cells shrink with lower value, so the field reads as depth
    float size = mix(0.24, 0.5 - u_gap, clamp(value * u_fill, 0.0, 1.0));
    float cell = smoothstep(size + aa, size - aa, d);

    vec3 col = mix(u_colors[0], ramp(value), cell * inner);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const hexGrid: PresetDefinition = {
    id: "hexGrid",
    name: "Honey",
    group: "Tessellation",
    description: "Hexagonal cells sized by a drifting field",
    body,
    params: [
        colorsParam,
        slider("cellScale", "Grid", 3, 26, 0.2, "u_cellScale"),
        slider("gap", "Gap", 0.0, 0.2, 0.005, "u_gap"),
        slider("fill", "Fill", 0.5, 2.5, 0.01, "u_fill"),
        angleParam(),
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["0b132b", "1c2541", "3a506b", "5bc0be"],
        cellScale: 10,
        gap: 0.05,
        fill: 1.4,
        angle: 0,
        speed: 0.5,
        grain: 0.04,
        seed: 6161
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        cellScale: round2(range(rng, 6, 18)),
        gap: round2(range(rng, 0.01, 0.12)),
        fill: round2(range(rng, 0.9, 2.0)),
        angle: Math.round(range(rng, 0, 60)),
        speed: round2(range(rng, 0.25, 0.9)),
        grain: round2(range(rng, 0.01, 0.09)),
        seed: freshSeed()
    })
};
