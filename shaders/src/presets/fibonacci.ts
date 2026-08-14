import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

// Phyllotaxis: seed n sits at angle n·137.5° and radius c·√n — the packing a
// sunflower head uses. Rather than loop every seed, invert the radius law to
// guess n for this pixel and only test the neighbours around it.
const body = /* glsl */ `
const float GOLDEN = 2.39996323;
#define MAX_K 48

void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    p = rot2(u_angle + u_time * 3.0) * p;

    float c = 0.5 / max(u_density, 0.001);
    float r = length(p);
    float nEst = (r / c) * (r / c);

    // Seeds within one spacing of this radius span an index band of about
    // 3.54*sqrt(n) — it GROWS with radius, which is why a fixed window made the
    // seeds cut off further out. Scale the search with radius and cap it; the
    // fade below then ends the head exactly where the search stops being exact,
    // so the pattern never shows the garbage beyond it.
    float base = floor(nEst + 0.5);
    float span = min(3.54 * sqrt(max(base, 1.0)), float(MAX_K));
    float best = 1e9;
    float bestN = 0.0;
    for (int k = -MAX_K; k <= MAX_K; k++) {
        float fk = float(k);
        if (abs(fk) > span) continue;
        float n = base + fk;
        if (n < 0.0) continue;
        float ang = n * GOLDEN;
        vec2 s = c * sqrt(n) * vec2(cos(ang), sin(ang));
        float d = length(p - s);
        if (d < best) { best = d; bestN = n; }
    }

    // radius at which the capped search stops covering the true neighbours
    float reliableR = c * sqrt(float(MAX_K) / 3.54 * float(MAX_K) / 3.54);

    // seeds grow with distance from the centre, as in a real head
    float size = c * mix(0.32, 0.62, clamp(u_seedSize, 0.0, 1.0));
    float aa = fwidth(best) * 1.4;
    float dot = smoothstep(size + aa, size - aa, best);

    vec3 seedCol = ramp(fract(bestN * u_colorCycle * 0.01 + hash11(u_seed) ));
    vec3 col = mix(u_colors[0], seedCol, dot);
    col = mix(col, u_colors[0], smoothstep(u_fade, u_fade + 0.5, r));
    col = mix(col, u_colors[0], smoothstep(reliableR * 0.82, reliableR, r));

    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const fibonacci: PresetDefinition = {
    id: "fibonacci",
    name: "Fibonacci",
    group: "Organic",
    description: "Sunflower seed packing on the golden angle",
    body,
    params: [
        colorsParam,
        slider("density", "Seed count", 3, 22, 0.5, "u_density"),
        slider("seedSize", "Seed size", 0, 1, 0.01, "u_seedSize"),
        slider("colorCycle", "Colour cycle", 0.2, 20, 0.1, "u_colorCycle"),
        slider("fade", "Fade radius", 0.3, 1.6, 0.01, "u_fade"),
        slider("angle", "Rotation", 0, 360, 1, "u_angle"),
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["0d1b2a", "fca311", "e5e5e5"],
        density: 8,
        seedSize: 0.62,
        colorCycle: 4,
        fade: 1.1,
        angle: 0,
        speed: 0.4,
        grain: 0.04,
        seed: 1202
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        density: round2(range(rng, 5, 16)),
        seedSize: round2(range(rng, 0.45, 0.85)),
        colorCycle: round2(range(rng, 0.5, 12)),
        fade: round2(range(rng, 0.8, 1.5)),
        angle: Math.round(range(rng, 0, 360)),
        speed: round2(range(rng, 0.15, 0.7)),
        grain: round2(range(rng, 0.01, 0.09)),
        seed: freshSeed()
    })
};
