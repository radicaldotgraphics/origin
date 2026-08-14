import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

// The gooey-filter look: the colour field stays soft and out-of-focus, but
// every contour is cut razor sharp — blur and focus at the same time. Focus
// blends between the smooth field and its hard-posterised bands.
const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 sp = p * u_scale + seedOffset();
    float t = u_time * 0.08;

    vec2 w = vec2(fbm(sp + t, u_detail), fbm(sp + vec2(4.7, 9.1) - t * 0.8, u_detail));
    float v = fbm(sp + (w - 0.5) * u_warp * 2.0, u_detail);
    // fbm of billow/gradient noise clusters near 0.4, not 0.5 — recentre there
    // or almost everything lands in a single band
    v = clamp((v - 0.4) * u_contrast + 0.5, 0.0, 1.0);

    // blurry: the field as-is
    vec3 soft = ramp(v);

    // in focus: flat fill per band, edges antialiased over exactly one pixel
    float lv = v * u_levels;
    float band = floor(lv);
    float e = fwidth(lv) * 1.2;
    vec3 hard = mix(
        ramp((band + 0.5) / u_levels),
        ramp((band + 1.5) / u_levels),
        smoothstep(1.0 - e, 1.0, fract(lv)));

    vec3 col = mix(soft, hard, u_focus);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const gloop: PresetDefinition = {
    id: "gloop",
    name: "Gloop",
    group: "Organic",
    description: "Soft blobs cut with hard edges — blurry and in focus",
    body,
    params: [
        colorsParam,
        slider("scale", "Scale", 0.5, 5, 0.01, "u_scale"),
        slider("warp", "Warp", 0, 2.5, 0.01, "u_warp"),
        slider("levels", "Bands", 2, 8, 1, "u_levels"),
        slider("focus", "Focus", 0, 1, 0.01, "u_focus"),
        slider("contrast", "Contrast", 1, 5, 0.01, "u_contrast"),
        slider("detail", "Detail", 2, 6, 1, "u_detail", true),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["10002b", "5a189a", "c77dff", "e0aaff"],
        scale: 2.4,
        warp: 1.4,
        levels: 5,
        focus: 0.9,
        contrast: 3,
        detail: 5,
        noise: 1,
        speed: 0.5,
        grain: 0.05,
        seed: 881
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        scale: round2(range(rng, 1.4, 3)),
        warp: round2(range(rng, 0.6, 1.8)),
        levels: Math.round(range(rng, 3, 6)),
        focus: round2(range(rng, 0.6, 1)),
        contrast: round2(range(rng, 2, 3.6)),
        detail: Math.round(range(rng, 3, 5)),
        noise: pickNoise(rng, [1, 1, 3]),
        speed: round2(range(rng, 0.25, 0.8)),
        grain: round2(range(rng, 0.02, 0.1)),
        seed: freshSeed()
    })
};
