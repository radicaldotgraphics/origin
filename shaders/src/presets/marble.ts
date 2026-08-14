import type { PresetDefinition } from "../types";
import { angleParam, colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 sp = rot2(u_angle) * p * u_scale + seedOffset();

    // Turbulence displaces a periodic vein function — the classic marble
    // recipe. Displacement is applied to the *phase* in radians, not to the
    // domain: scaling the domain instead makes the wobble grow with vein
    // density and the pattern collapses into cauliflower.
    float turb = fbm(sp * 0.9 + u_time * 0.04, u_detail);
    float turb2 = fbm(sp * 2.3 + 3.7, u_detail);
    float phase = sp.x * u_freq + (turb - 0.5) * u_turbulence * 9.0;

    float v = 0.5 + 0.5 * sin(phase);
    float fine = 0.5 + 0.5 * sin(phase * 2.7 + (turb2 - 0.5) * u_turbulence * 6.0);
    v = mix(v, fine, 0.25);
    v = pow(clamp(v, 0.0, 1.0), u_contrast);

    vec3 col = ramp(clamp(v, 0.0, 1.0));
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const marble: PresetDefinition = {
    id: "marble",
    name: "Carrara",
    group: "Organic",
    description: "Stone veining from displaced sine bands",
    body,
    params: [
        colorsParam,
        slider("scale", "Scale", 0.5, 4, 0.01, "u_scale"),
        slider("freq", "Vein density", 2, 40, 0.5, "u_freq"),
        slider("turbulence", "Turbulence", 0.2, 3, 0.01, "u_turbulence"),
        slider("contrast", "Contrast", 0.4, 4, 0.01, "u_contrast"),
        slider("detail", "Detail", 2, 7, 1, "u_detail", true),
        angleParam(),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["fffcf2", "ccc5b9", "403d39", "252422"],
        scale: 1.6,
        freq: 16,
        turbulence: 0.85,
        contrast: 1.0,
        detail: 5,
        angle: 28,
        noise: 1,
        speed: 0.35,
        grain: 0.06,
        seed: 1204
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        scale: round2(range(rng, 1.0, 2.6)),
        freq: round2(range(rng, 8, 26)),
        turbulence: round2(range(rng, 0.6, 1.6)),
        contrast: round2(range(rng, 0.8, 2.2)),
        detail: Math.round(range(rng, 4, 6)),
        angle: Math.round(range(rng, 0, 180)),
        noise: pickNoise(rng, [1, 1, 2]),
        speed: round2(range(rng, 0.15, 0.6)),
        grain: round2(range(rng, 0.02, 0.12)),
        seed: freshSeed()
    })
};
