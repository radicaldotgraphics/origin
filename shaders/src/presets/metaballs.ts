import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    float t = u_time * 0.4;

    float field = 0.0;
    for (int i = 0; i < 30; i++) {
        if (i >= u_count) break;
        float fi = float(i);
        float h1 = hash11(u_seed + fi * 13.1);
        float h2 = hash11(u_seed + fi * 7.7 + 2.0);
        vec2 c = 0.44 * u_spread * vec2(
            sin(t * (0.6 + h1 * 0.8) + h1 * 6.2832),
            cos(t * (0.5 + h2 * 0.9) + h2 * 6.2832));
        float r = u_radius * (0.7 + 0.6 * h1);
        field += r * r / (dot(p - c, p - c) + 0.0008);
    }

    float mask = smoothstep(1.0 - u_edge, 1.0 + u_edge, field);
    float shade = clamp(field * 0.16, 0.0, 1.0);
    vec3 col = mix(u_colors[0] * 0.45, ramp(shade), mask);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const metaballs: PresetDefinition = {
    id: "metaballs",
    name: "Lava Lamp",
    group: "Organic",
    description: "Lava-lamp blobs that merge and split",
    body,
    params: [
        colorsParam,
        slider("count", "Blobs", 2, 30, 1, "u_count", true),
        slider("radius", "Size", 0.08, 0.32, 0.005, "u_radius"),
        slider("spread", "Spread", 0.3, 1.4, 0.01, "u_spread"),
        slider("edge", "Edge", 0.05, 1.2, 0.01, "u_edge"),
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["0f0e17", "ff8906", "f25f4c", "e53170"],
        count: 20,
        radius: 0.1,
        spread: 0.85,
        edge: 0.35,
        speed: 0.6,
        grain: 0.05,
        seed: 3312
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        count: Math.round(range(rng, 10, 28)),
        radius: round2(range(rng, 0.07, 0.15)),
        spread: round2(range(rng, 0.6, 1.2)),
        edge: round2(range(rng, 0.12, 0.7)),
        speed: round2(range(rng, 0.35, 1.0)),
        grain: round2(range(rng, 0.02, 0.1)),
        seed: freshSeed()
    })
};
