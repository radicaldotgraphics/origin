import type { PresetDefinition } from "../types";
import { angleParam, colorsParam, grainParam, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 q = rot2(u_angle) * p * u_scale;

    // triangle wave along x displaces y — the zigzag is the displacement, so
    // every band stays exactly parallel
    float tri = abs(fract(q.x * u_freq) - 0.5) * 2.0;
    float v = q.y * u_density + tri * u_amplitude + u_time * 0.4;

    float band = floor(v);
    float within = fract(v);

    // soften the band edge without losing the hard knit look
    float aa = fwidth(v) * 1.4;
    float edge = smoothstep(0.0, aa + u_soft, within) * smoothstep(1.0, 1.0 - aa - u_soft, within);

    vec3 col = ramp(fract(band * 0.31 + hash11(u_seed)));
    col = mix(u_colors[0], col, mix(1.0, edge, u_gap));

    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const missoni: PresetDefinition = {
    id: "missoni",
    name: "Charlie Brown",
    group: "Geometric",
    description: "Zigzag knit bands, one colour per row",
    body,
    params: [
        colorsParam,
        slider("scale", "Scale", 0.3, 4, 0.01, "u_scale"),
        slider("freq", "Zigzags", 0.5, 10, 0.1, "u_freq"),
        slider("amplitude", "Amplitude", 0, 4, 0.01, "u_amplitude"),
        slider("density", "Band density", 1, 20, 0.1, "u_density"),
        slider("gap", "Gap", 0, 1, 0.01, "u_gap"),
        slider("soft", "Softness", 0, 0.4, 0.005, "u_soft"),
        angleParam(),
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["0f0e17", "ff8906", "f25f4c", "e53170"],
        scale: 1.2,
        freq: 2.5,
        amplitude: 1.4,
        density: 7,
        gap: 0,
        soft: 0.02,
        angle: 0,
        speed: 0.5,
        grain: 0.05,
        seed: 1953
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        scale: round2(range(rng, 0.7, 2.2)),
        freq: round2(range(rng, 1.2, 5)),
        amplitude: round2(range(rng, 0.8, 2.6)),
        density: round2(range(rng, 4, 13)),
        gap: rng() < 0.6 ? 0 : round2(range(rng, 0.2, 0.8)),
        soft: round2(range(rng, 0, 0.1)),
        angle: Math.round(range(rng, 0, 180)),
        speed: round2(range(rng, 0.2, 0.8)),
        grain: round2(range(rng, 0.01, 0.1)),
        seed: freshSeed()
    })
};
