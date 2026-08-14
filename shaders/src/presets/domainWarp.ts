import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 sp = p * u_scale * 2.0 + seedOffset();
    float t = u_time * 0.12;

    vec2 q = vec2(fbm(sp, u_detail), fbm(sp + vec2(5.2, 1.3), u_detail));
    vec2 r = vec2(fbm(sp + 2.0 * u_warp * q + vec2(1.7, 9.2) + t, u_detail),
                  fbm(sp + 2.0 * u_warp * q + vec2(8.3, 2.8) - t * 0.7, u_detail));
    float f = fbm(sp + 2.0 * u_warp * r, u_detail);

    float v = f + 0.35 * (r.x - q.y);
    v = smoothstep(0.12, 0.88, v);
    vec3 col = ramp(v);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const domainWarp: PresetDefinition = {
    id: "domainWarp",
    name: "Ink Bloom",
    group: "Organic",
    description: "Liquid marble — fbm warped through itself",
    body,
    params: [
        colorsParam,
        slider("warp", "Warp", 0, 3, 0.01, "u_warp"),
        slider("detail", "Detail", 2, 7, 1, "u_detail", true),
        slider("scale", "Scale", 0.4, 4, 0.01, "u_scale"),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["0e0e11", "e94560", "f5f0e8"],
        warp: 1.6,
        detail: 5,
        scale: 1.4,
        noise: 1,
        speed: 0.5,
        grain: 0.08,
        seed: 42817
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        warp: round2(range(rng, 0.9, 2.4)),
        detail: Math.round(range(rng, 3, 6)),
        scale: round2(range(rng, 0.8, 2.4)),
        noise: pickNoise(rng, [0, 1, 2, 3]),
        speed: round2(range(rng, 0.25, 0.9)),
        grain: round2(range(rng, 0.03, 0.15)),
        seed: freshSeed()
    })
};
