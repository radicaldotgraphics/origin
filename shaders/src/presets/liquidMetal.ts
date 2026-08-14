import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 sp = p * u_scale + seedOffset();
    float t = u_time * 0.12;

    float f = fbm(sp + vec2(fbm(sp * 0.7 + t, u_detail), fbm(sp * 0.7 - t, u_detail)) * u_warp,
                  u_detail);

    // tight repeating highlights over a broad body tone = chrome
    float spec = pow(abs(sin(f * u_bands * 3.1416 + t * 3.0)), u_polish);
    vec3 col = ramp(clamp(f * 1.1, 0.0, 1.0));
    col = mix(col, vec3(1.0), spec * u_gloss);

    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const liquidMetal: PresetDefinition = {
    id: "liquidMetal",
    name: "Mercury",
    group: "Optical",
    description: "Chrome highlights rolling over molten noise",
    body,
    params: [
        colorsParam,
        slider("scale", "Scale", 0.4, 4, 0.01, "u_scale"),
        slider("warp", "Warp", 0, 3, 0.01, "u_warp"),
        slider("bands", "Highlights", 1, 10, 0.1, "u_bands"),
        slider("polish", "Polish", 2, 40, 0.5, "u_polish"),
        slider("gloss", "Gloss", 0, 1, 0.01, "u_gloss"),
        slider("detail", "Detail", 2, 6, 1, "u_detail", true),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["1b1b1e", "373f51", "58a4b0", "a9bcd0"],
        scale: 1.4,
        warp: 1.5,
        bands: 4,
        polish: 14,
        gloss: 0.7,
        detail: 4,
        noise: 1,
        speed: 0.45,
        grain: 0.04,
        seed: 5959
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        scale: round2(range(rng, 0.8, 2.4)),
        warp: round2(range(rng, 0.8, 2.2)),
        bands: round2(range(rng, 2, 7)),
        polish: round2(range(rng, 6, 26)),
        gloss: round2(range(rng, 0.4, 0.9)),
        detail: Math.round(range(rng, 3, 5)),
        noise: pickNoise(rng, [0, 1, 2]),
        speed: round2(range(rng, 0.25, 0.8)),
        grain: round2(range(rng, 0.01, 0.09)),
        seed: freshSeed()
    })
};
