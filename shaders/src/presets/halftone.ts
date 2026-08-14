import type { PresetDefinition } from "../types";
import { angleParam, colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, pick, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    float a = radians(u_angle);
    mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
    mat2 rotI = mat2(cos(a), sin(a), -sin(a), cos(a));

    vec2 g = rot * p * u_dotScale;
    vec2 id = floor(g);
    vec2 gv = fract(g) - 0.5;

    // sample the field at the cell center so every dot has one size
    vec2 cellP = rotI * ((id + 0.5) / u_dotScale);
    float linf = clamp(cellP.y + 0.5, 0.0, 1.0);
    float nf = fbm(cellP * 2.2 + seedOffset() + u_time * 0.15, 3);
    float field = clamp(mix(linf, nf, u_fieldMix), 0.0, 1.0);

    float r = mix(0.06, 0.62, field);
    float d = length(gv);
    float aa = fwidth(d) * 1.5;
    float m = smoothstep(r, r - aa, d);

    vec3 bg = u_colors[0];
    vec3 fg = ramp(clamp(field * 0.75 + 0.25, 0.0, 1.0));
    vec3 col = mix(bg, fg, m);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const halftone: PresetDefinition = {
    id: "halftone",
    name: "Comicon",
    group: "Geometric",
    description: "Dot grid sized by a gradient or noise field",
    body,
    params: [
        colorsParam,
        slider("dotScale", "Dot grid", 6, 48, 0.5, "u_dotScale"),
        angleParam(),
        slider("fieldMix", "Field: fade ↔ noise", 0, 1, 0.01, "u_fieldMix"),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["0d1b2a", "fca311", "e5e5e5"],
        dotScale: 18,
        angle: 30,
        fieldMix: 0.45,
        noise: 1,
        speed: 0.5,
        grain: 0.04,
        seed: 5150
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        dotScale: round2(range(rng, 10, 34)),
        angle: pick(rng, [0, 15, 30, 45, 60, 75]),
        fieldMix: round2(range(rng, 0.2, 0.9)),
        noise: pickNoise(rng, [0, 1, 3]),
        speed: round2(range(rng, 0.3, 0.9)),
        grain: round2(range(rng, 0.01, 0.08)),
        seed: freshSeed()
    })
};
