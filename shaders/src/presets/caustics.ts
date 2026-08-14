import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 sp = p * u_scale + seedOffset();
    float t = u_time * 0.35;

    // warp the sampling domain, then take the ridge of the field — the bright
    // filaments where light would focus
    vec2 w = sp + vec2(
        fbm(sp * 1.1 + t, u_detail),
        fbm(sp * 1.1 + vec2(5.2, 1.3) - t * 0.8, u_detail)) * u_warp;

    float d = fbm(w * 1.3, u_detail);
    float caust = pow(1.0 - abs(d * 2.0 - 1.0), u_sharp);
    caust += 0.35 * pow(1.0 - abs(fbm(w * 2.6 + 3.3, 3) * 2.0 - 1.0), u_sharp * 0.6);

    vec3 col = ramp(clamp(caust * 0.9, 0.0, 1.0));
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const caustics: PresetDefinition = {
    id: "caustics",
    name: "Poolside",
    group: "Organic",
    description: "Focused light filaments, like a pool floor",
    body,
    params: [
        colorsParam,
        slider("scale", "Scale", 0.5, 5, 0.01, "u_scale"),
        slider("warp", "Warp", 0, 2, 0.01, "u_warp"),
        slider("sharp", "Sharpness", 2, 24, 0.1, "u_sharp"),
        slider("detail", "Detail", 2, 6, 1, "u_detail", true),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["001219", "005f73", "94d2bd", "e9d8a6"],
        scale: 2.2,
        warp: 0.7,
        sharp: 9,
        detail: 4,
        noise: 1,
        speed: 0.6,
        grain: 0.05,
        seed: 8080
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        scale: round2(range(rng, 1.2, 3.6)),
        warp: round2(range(rng, 0.35, 1.3)),
        sharp: round2(range(rng, 5, 16)),
        detail: Math.round(range(rng, 3, 5)),
        noise: pickNoise(rng, [0, 1]),
        speed: round2(range(rng, 0.35, 1.0)),
        grain: round2(range(rng, 0.02, 0.1)),
        seed: freshSeed()
    })
};
