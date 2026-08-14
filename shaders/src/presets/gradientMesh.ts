import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

// The site's own mesh gradient (the Stripe MiniGl look the homepage runs):
// stacked low-frequency fields, each colour arriving as a soft wash with a
// steep-but-smooth silhouette, plus near-black lobes floating over the top.
// The whole frame reads out-of-focus while every boundary stays defined.
const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 sp = p * u_scale + seedOffset();
    float t = u_time * 0.06;

    // edge width: the blurry↔defined dial
    float w = mix(0.03, 0.45, u_softness);

    vec3 col = u_colors[0];

    // each remaining colour stop is its own slowly drifting layer
    for (int i = 1; i < 4; i++) {
        if (i >= u_colorCount) break;
        float fi = float(i);
        vec2 dir = vec2(sin(fi * 2.1), cos(fi * 1.3));
        float f = fbm(sp * (0.55 + fi * 0.17) + dir * t * (0.6 + fi * 0.35) + fi * 7.31, 3);
        // fbm clusters near 0.4 — expand around it or the layers never surface
        f = (f - 0.4) * 2.4 + 0.5;
        float m = smoothstep(0.5, 0.5 + w, f);
        col = mix(col, u_colors[i], m);
    }

    // dark lobes over everything — the shadow shapes that give it depth
    float d1 = (fbm(sp * 0.7 + vec2(-t * 0.5, t * 0.8) + 31.7, 3) - 0.4) * 2.4 + 0.5;
    float d2 = (fbm(sp * 0.45 + vec2(t * 0.4, t * 0.2) + 57.1, 3) - 0.4) * 2.4 + 0.5;
    float dark = smoothstep(0.62, 0.62 + w * 0.8, d1)
               + smoothstep(0.68, 0.68 + w, d2) * 0.8;
    col = mix(col, u_colors[0] * 0.12, clamp(dark, 0.0, 1.0) * u_shadow);

    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const gradientMesh: PresetDefinition = {
    id: "gradientMesh",
    name: "Haze",
    group: "Gradient",
    description: "Mesh gradient — soft washes under dark floating lobes",
    body,
    params: [
        colorsParam,
        slider("scale", "Spread", 0.3, 1.6, 0.01, "u_scale"),
        slider("softness", "Softness", 0, 1, 0.01, "u_softness"),
        slider("shadow", "Shadow", 0, 1, 0.01, "u_shadow"),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["1a1a2e", "16213e", "0f3460", "e94560"],
        scale: 0.8,
        softness: 0.55,
        shadow: 0.75,
        noise: 1,
        speed: 0.6,
        grain: 0.07,
        seed: 1841
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        scale: round2(range(rng, 0.5, 1.2)),
        softness: round2(range(rng, 0.3, 0.8)),
        shadow: round2(range(rng, 0.5, 1)),
        noise: pickNoise(rng, [0, 1]),
        speed: round2(range(rng, 0.3, 1.0)),
        grain: round2(range(rng, 0.02, 0.14)),
        seed: freshSeed()
    })
};
