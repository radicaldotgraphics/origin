import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 uv = frag / u_resolution;
    float t = u_time * u_flow * 0.3;

    vec3 col = u_colors[0] * 0.16;
    for (int i = 0; i < 5; i++) {
        if (i >= u_layers) break;
        float fi = float(i);
        float h = hash11(u_seed + fi * 17.7);

        float yc = 0.15 + 0.7 * fbm(vec2(uv.x * (1.3 + h) + h * 43.0 + seedOffset().x,
                                         t * (0.7 + 0.4 * h) + fi * 9.0), 3);
        float d = abs(uv.y - yc);
        float k = mix(30.0, 7.0, clamp(u_glow / 1.5, 0.0, 1.0));
        float wisp = 0.5 + 0.5 * fbm(vec2(uv.x * 3.0 - t * (0.5 + h), fi * 7.0), 2);

        vec3 c = ramp(fi / max(float(u_layers - 1), 1.0));
        col += c * exp(-d * k) * wisp * (0.55 + 0.45 * u_glow);
    }
    col = 1.0 - exp(-col * 1.6);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const aurora: PresetDefinition = {
    id: "aurora",
    name: "Aurora",
    group: "Organic",
    description: "Flowing curtains of layered light",
    body,
    params: [
        colorsParam,
        slider("layers", "Layers", 1, 5, 1, "u_layers", true),
        slider("flow", "Flow", 0.1, 2, 0.01, "u_flow"),
        slider("glow", "Glow", 0.2, 1.5, 0.01, "u_glow"),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["001219", "005f73", "94d2bd", "e9d8a6"],
        layers: 3,
        flow: 0.8,
        glow: 0.7,
        noise: 1,
        speed: 0.6,
        grain: 0.06,
        seed: 2077
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        layers: Math.round(range(rng, 2, 4)),
        flow: round2(range(rng, 0.4, 1.4)),
        glow: round2(range(rng, 0.45, 1.2)),
        noise: pickNoise(rng, [0, 1]),
        speed: round2(range(rng, 0.3, 1.0)),
        grain: round2(range(rng, 0.02, 0.12)),
        seed: freshSeed()
    })
};
