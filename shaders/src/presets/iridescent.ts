import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 sp = p * u_scale + seedOffset();
    float t = u_time * 0.1;

    float w = fbm(sp + vec2(fbm(sp * 0.8 + t, u_detail)) * u_warp, u_detail);

    // thin-film style: cycling the palette repeatedly across a smooth field is
    // what reads as interference
    float shift = w * u_bands + length(p) * u_curve + t * 2.0;
    vec3 col = ramp(fract(shift));

    // sheen so it looks like a surface rather than flat bands
    col *= 0.72 + 0.55 * w;
    col += pow(clamp(w, 0.0, 1.0), 6.0) * u_sheen;

    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const iridescent: PresetDefinition = {
    id: "iridescent",
    name: "Oil Slick",
    group: "Optical",
    description: "Oil-slick interference across a warped film",
    body,
    params: [
        colorsParam,
        slider("scale", "Scale", 0.4, 4, 0.01, "u_scale"),
        slider("bands", "Bands", 0.5, 8, 0.05, "u_bands"),
        slider("curve", "Curvature", 0, 4, 0.01, "u_curve"),
        slider("warp", "Warp", 0, 2.5, 0.01, "u_warp"),
        slider("sheen", "Sheen", 0, 1, 0.01, "u_sheen"),
        slider("detail", "Detail", 2, 6, 1, "u_detail", true),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["10002b", "5a189a", "c77dff", "e0aaff"],
        scale: 1.3,
        bands: 2.4,
        curve: 1.2,
        warp: 1.1,
        sheen: 0.35,
        detail: 4,
        noise: 1,
        speed: 0.5,
        grain: 0.05,
        seed: 7474
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        scale: round2(range(rng, 0.7, 2.4)),
        bands: round2(range(rng, 1.2, 4.5)),
        curve: round2(range(rng, 0.3, 2.5)),
        warp: round2(range(rng, 0.5, 1.8)),
        sheen: round2(range(rng, 0.1, 0.6)),
        detail: Math.round(range(rng, 3, 5)),
        noise: pickNoise(rng, [0, 1, 3]),
        speed: round2(range(rng, 0.3, 0.9)),
        grain: round2(range(rng, 0.02, 0.1)),
        seed: freshSeed()
    })
};
