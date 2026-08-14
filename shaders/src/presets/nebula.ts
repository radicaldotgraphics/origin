import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 sp = p * u_scale + seedOffset();
    float t = u_time * 0.03;

    // two decorrelated fields multiplied — gives voids as well as clouds
    float d1 = fbm(sp + t, u_detail);
    float d2 = fbm(sp * 1.7 + vec2(3.1, 7.4) - t * 0.7, u_detail);
    float dens = pow(clamp(d1 * d2 * 2.6, 0.0, 1.0), u_density);

    vec3 col = mix(u_colors[0] * 0.35, ramp(clamp(dens * 1.25, 0.0, 1.0)), dens);

    // sparse stars on a fixed lattice so they don't crawl
    vec2 cell = floor(frag / max(u_starSize, 1.0));
    float star = step(0.9975, hash21(cell + u_seed));
    float tw = 0.6 + 0.4 * sin(u_time * 3.0 + hash21(cell) * 6.2832);
    col += star * tw * u_stars;

    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const nebula: PresetDefinition = {
    id: "nebula",
    name: "Deep Field",
    group: "Organic",
    description: "Deep-space gas clouds with drifting stars",
    body,
    params: [
        colorsParam,
        slider("scale", "Scale", 0.4, 4, 0.01, "u_scale"),
        slider("density", "Density", 0.4, 3, 0.01, "u_density"),
        slider("detail", "Detail", 3, 7, 1, "u_detail", true),
        slider("stars", "Stars", 0, 1.5, 0.01, "u_stars"),
        slider("starSize", "Star size", 1, 5, 0.5, "u_starSize"),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["03071e", "9d0208", "f48c06", "ffba08"],
        scale: 1.5,
        density: 1.2,
        detail: 6,
        stars: 0.7,
        starSize: 2,
        noise: 1,
        speed: 0.7,
        grain: 0.07,
        seed: 1987
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        scale: round2(range(rng, 0.8, 2.6)),
        density: round2(range(rng, 0.7, 2.0)),
        detail: Math.round(range(rng, 5, 7)),
        stars: round2(range(rng, 0.2, 1.1)),
        starSize: Math.round(range(rng, 1, 3)),
        noise: pickNoise(rng, [0, 1, 3]),
        speed: round2(range(rng, 0.4, 1.2)),
        grain: round2(range(rng, 0.03, 0.14)),
        seed: freshSeed()
    })
};
