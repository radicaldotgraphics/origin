import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 q = p * u_scale + seedOffset();
    float t = u_time * 0.15;

    // walk each pixel along the noise-directed field, then stripe the result:
    // the stripes bend into streamlines
    for (int i = 0; i < 8; i++) {
        if (i >= u_steps) break;
        float a = fbm(q * 0.7 + t, 3) * 6.2832 * u_curl;
        q += vec2(cos(a), sin(a)) * 0.055;
    }

    float lines = 0.5 + 0.5 * sin(q.y * u_density * 3.1416);
    lines = pow(clamp(lines, 0.0, 1.0), u_contrast);

    vec3 col = ramp(lines);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const flowField: PresetDefinition = {
    id: "flowField",
    name: "Murmuration",
    group: "Organic",
    description: "Streamlines combed by a noise field",
    body,
    params: [
        colorsParam,
        slider("scale", "Scale", 0.4, 3, 0.01, "u_scale"),
        slider("steps", "Flow length", 1, 8, 1, "u_steps", true),
        slider("curl", "Curl", 0.2, 2, 0.01, "u_curl"),
        slider("density", "Line density", 2, 24, 0.1, "u_density"),
        slider("contrast", "Contrast", 0.4, 4, 0.01, "u_contrast"),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["10101a", "7209b7", "f72585"],
        scale: 1.2,
        steps: 5,
        curl: 1.0,
        density: 9,
        contrast: 1.2,
        noise: 1,
        speed: 0.5,
        grain: 0.06,
        seed: 6112
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        scale: round2(range(rng, 0.7, 2.0)),
        steps: Math.round(range(rng, 3, 7)),
        curl: round2(range(rng, 0.5, 1.5)),
        density: round2(range(rng, 5, 16)),
        contrast: round2(range(rng, 0.7, 2.2)),
        noise: pickNoise(rng, [0, 1]),
        speed: round2(range(rng, 0.25, 0.8)),
        grain: round2(range(rng, 0.02, 0.12)),
        seed: freshSeed()
    })
};
