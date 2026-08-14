import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 sp = p * u_scale + seedOffset();

    float h = fbm(sp + u_time * 0.03, u_detail);

    // contour lines at each integer crossing of the elevation, width kept
    // constant in screen space via the derivative
    float e = h * u_levels;
    float f = abs(fract(e) - 0.5) * 2.0;
    float lw = fwidth(e) * u_width;
    float line = smoothstep(1.0 - lw, 1.0, f);

    vec3 base = ramp(mix(h, floor(e) / u_levels, u_terrace));
    vec3 col = mix(base, u_colors[u_colorCount - 1], line * u_lineStrength);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const topographic: PresetDefinition = {
    id: "topographic",
    name: "Elevation",
    group: "Geometric",
    description: "Contour lines over an elevation field",
    body,
    params: [
        colorsParam,
        slider("scale", "Scale", 0.4, 4, 0.01, "u_scale"),
        slider("levels", "Contours", 3, 40, 1, "u_levels"),
        slider("width", "Line width", 0.5, 6, 0.1, "u_width"),
        slider("lineStrength", "Line strength", 0, 1, 0.01, "u_lineStrength"),
        slider("terrace", "Terracing", 0, 1, 0.01, "u_terrace"),
        slider("detail", "Detail", 2, 7, 1, "u_detail", true),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["001219", "005f73", "94d2bd", "e9d8a6"],
        scale: 1.6,
        levels: 14,
        width: 2.2,
        lineStrength: 0.85,
        terrace: 0.3,
        detail: 5,
        noise: 1,
        speed: 0.4,
        grain: 0.04,
        seed: 3030
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        scale: round2(range(rng, 0.9, 2.6)),
        levels: Math.round(range(rng, 6, 26)),
        width: round2(range(rng, 1.2, 3.5)),
        lineStrength: round2(range(rng, 0.5, 1.0)),
        terrace: round2(range(rng, 0, 0.8)),
        detail: Math.round(range(rng, 4, 6)),
        noise: pickNoise(rng, [0, 1, 3]),
        speed: round2(range(rng, 0.2, 0.7)),
        grain: round2(range(rng, 0.01, 0.09)),
        seed: freshSeed()
    })
};
