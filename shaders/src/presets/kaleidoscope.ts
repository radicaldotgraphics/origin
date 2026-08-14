import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    float a = atan(p.y, p.x) + u_time * 0.12 * u_spin;
    float r = length(p);

    // fold the circle into one mirrored wedge
    float seg = 6.2832 / float(u_segments);
    a = mod(a, seg);
    a = abs(a - seg * 0.5);

    vec2 q = vec2(cos(a), sin(a)) * pow(r, u_zoom) * u_scale + seedOffset();
    float f = fbm(q + u_time * 0.06, u_detail);

    vec3 col = ramp(clamp(f * u_contrast + (1.0 - u_contrast) * 0.5, 0.0, 1.0));
    col *= mix(1.0, smoothstep(1.1, 0.15, r), u_vignette);
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const kaleidoscope: PresetDefinition = {
    id: "kaleidoscope",
    name: "Patchouli",
    group: "Optical",
    description: "Noise folded into mirrored wedges",
    body,
    params: [
        colorsParam,
        slider("segments", "Segments", 3, 16, 1, "u_segments", true),
        slider("scale", "Scale", 0.5, 6, 0.01, "u_scale"),
        slider("zoom", "Radial curve", 0.4, 2, 0.01, "u_zoom"),
        slider("spin", "Spin", -2, 2, 0.01, "u_spin"),
        slider("contrast", "Contrast", 0.4, 2.5, 0.01, "u_contrast"),
        slider("vignette", "Vignette", 0, 1, 0.01, "u_vignette"),
        slider("detail", "Detail", 2, 6, 1, "u_detail", true),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["2d00f7", "ff0054", "ffbd00"],
        segments: 8,
        scale: 3.6,
        zoom: 1.0,
        spin: 0.6,
        contrast: 1.9,
        vignette: 0.22,
        detail: 5,
        noise: 1,
        speed: 0.6,
        grain: 0.05,
        seed: 1616
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        segments: Math.round(range(rng, 5, 12)),
        scale: round2(range(rng, 2.4, 5)),
        zoom: round2(range(rng, 0.6, 1.5)),
        spin: round2(range(rng, -1.2, 1.2)),
        contrast: round2(range(rng, 1.4, 2.3)),
        vignette: round2(range(rng, 0.1, 0.6)),
        detail: Math.round(range(rng, 3, 5)),
        noise: pickNoise(rng, [0, 1, 2, 4]),
        speed: round2(range(rng, 0.3, 1.0)),
        grain: round2(range(rng, 0.02, 0.1)),
        seed: freshSeed()
    })
};
