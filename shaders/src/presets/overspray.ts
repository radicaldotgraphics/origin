import type { PresetDefinition } from "../types";
import { angleParam, colorsParam, grainParam, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

// Spray-paint stencil: dot density built up along a shape's SDF boundary,
// like airbrush overspray around a cutout, plus a sparser scatter of stray
// mist particles further out. Genuinely different medium from every other
// preset — dithered stipple density rather than a filled/gradient field —
// and light-on-dark by default rather than dark-on-light.
const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 rp = rot2(u_angle + sin(u_time * 0.08) * 4.0) * p * u_scale;

    // diamond (L1) through circle (L2) — one shape, a roundness dial
    float dL1 = abs(rp.x) + abs(rp.y);
    float dL2 = length(rp);
    float size = u_size + 0.02 * sin(u_time * 0.3); // slow breathing so it's never fully static
    float d = mix(dL1, dL2, u_roundness) - size;
    float edgeDist = abs(d);

    // a soft unstippled wash sits behind the speckle, like paint bleeding through
    float wash = exp(-edgeDist * edgeDist / max(u_spread * u_spread * 2.0, 0.0001));

    // Speckle is per-cell but each droplet is drawn as a soft round dot, not a
    // hard filled cell — a binary step() over a grid reads as dither/noise,
    // whereas airbrush overspray is many soft-edged droplets of varying weight.
    //
    // The lattice is sampled in a MOVING frame rather than in screen space, so
    // the droplets drift and churn instead of being welded to the pixels. A
    // droplet crossing a cell boundary would pop, so each also runs a fade-in/
    // fade-out lifecycle below, which hides the handover and reads as spray
    // settling and lifting.
    vec2 flow = vec2(0.0, -u_drift * u_time * 26.0);
    flow += (vec2(fbm(p * 1.6 + u_time * 0.06, 2),
                  fbm(p * 1.6 + 5.7 - u_time * 0.05, 2)) - 0.4) * u_churn * 70.0;

    vec2 sp = frag + flow; // NB: 'sample' is a reserved word in GLSL ES 3.0
    vec2 cellId = floor(sp / u_cellSize);
    vec2 cellUv = fract(sp / u_cellSize) - 0.5;
    vec2 jitter = (hash22(cellId + u_seed) - 0.5) * 0.7;

    float density = exp(-edgeDist * edgeDist / max(u_spread * u_spread, 0.0001));
    float overDensity = exp(-edgeDist * edgeDist / max(u_overSpread * u_overSpread, 0.0001)) * u_overspray;
    float total = clamp(density + overDensity * 0.7, 0.0, 1.0);

    // droplets thin out AND shrink as density falls, so edges feather
    float present = step(1.0 - total, hash21(cellId * 1.37 + u_seed));
    float radius = mix(0.12, 0.42, total) * (0.6 + 0.8 * hash11(hash21(cellId + 3.1)));
    float dot = smoothstep(radius, radius * 0.35, length(cellUv - jitter));

    // per-droplet lifecycle — also masks the pop when a droplet's cell changes
    float life = fract(hash21(cellId * 5.3 + 11.0) + u_time * u_twinkle * 0.3);
    float alpha = smoothstep(0.0, 0.3, life) * smoothstep(1.0, 0.6, life);

    float ink = clamp(present * dot * alpha + wash * 0.1, 0.0, 1.0);
    vec3 col = mix(u_colors[0], u_colors[u_colorCount - 1], ink);

    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const overspray: PresetDefinition = {
    id: "overspray",
    name: "Overspray",
    group: "Geometric",
    description: "Spray-paint stencil — dot density along a shape's edge",
    body,
    params: [
        colorsParam,
        slider("size", "Size", 0.2, 1.2, 0.01, "u_size"),
        slider("roundness", "Diamond ↔ Circle", 0, 1, 0.01, "u_roundness"),
        slider("spread", "Edge spread", 0.03, 0.4, 0.005, "u_spread"),
        slider("overspray", "Overspray", 0, 1, 0.01, "u_overspray"),
        slider("overSpread", "Overspray reach", 0.1, 0.9, 0.01, "u_overSpread"),
        slider("cellSize", "Droplet size", 2, 14, 0.5, "u_cellSize"),
        slider("drift", "Drift", 0, 2, 0.01, "u_drift"),
        slider("churn", "Churn", 0, 2, 0.01, "u_churn"),
        slider("twinkle", "Twinkle", 0, 3, 0.01, "u_twinkle"),
        slider("scale", "Scale", 0.5, 2, 0.01, "u_scale"),
        angleParam(),
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["eef0f2", "23232b"],
        size: 0.55,
        roundness: 0.05,
        spread: 0.14,
        overspray: 0.35,
        overSpread: 0.45,
        cellSize: 5,
        drift: 0.5,
        churn: 0.6,
        twinkle: 1.0,
        scale: 1.0,
        angle: 0,
        speed: 0.5,
        grain: 0,
        seed: 4114
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        size: round2(range(rng, 0.35, 0.8)),
        roundness: round2(range(rng, 0, 0.7)),
        spread: round2(range(rng, 0.06, 0.24)),
        overspray: round2(range(rng, 0.15, 0.6)),
        overSpread: round2(range(rng, 0.3, 0.7)),
        cellSize: round2(range(rng, 3, 9)),
        drift: round2(range(rng, 0.1, 1.2)),
        churn: round2(range(rng, 0.2, 1.3)),
        twinkle: round2(range(rng, 0.4, 2)),
        scale: round2(range(rng, 0.7, 1.5)),
        angle: Math.round(range(rng, 0, 90)),
        speed: round2(range(rng, 0.3, 0.8)),
        grain: 0,
        seed: freshSeed()
    })
};
