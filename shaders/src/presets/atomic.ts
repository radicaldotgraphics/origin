import type { PresetDefinition } from "../types";
import { angleParam, colorsParam, grainParam, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    p -= vec2(u_centerX, u_centerY);
    p = rot2(u_angle) * p;

    float r = length(p);
    float a = atan(p.y, p.x) + u_time * 0.15 * u_spin;

    // wedge spokes, tapered toward the middle so the centre stays a rosette
    float spokes = a / 6.2832 * float(u_spokes);
    float wedge = abs(fract(spokes) - 0.5) * 2.0;
    float aa = fwidth(wedge) * 1.2;
    float ray = smoothstep(u_thickness + aa, u_thickness - aa, wedge);

    // concentric rings cut the spokes into a starburst
    float ring = fract(r * u_rings - u_time * 0.2);
    float ringMask = smoothstep(0.0, 0.06, ring) * smoothstep(1.0, 0.94, ring);

    vec3 col = mix(u_colors[0], ramp(clamp(r * 1.3, 0.0, 1.0)), ray);
    col = mix(col, ramp(fract(floor(r * u_rings) * 0.3 + 0.5)), (1.0 - ringMask) * u_ringStrength);
    col = mix(col, u_colors[u_colorCount - 1], smoothstep(u_core + 0.02, u_core, r));

    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const atomic: PresetDefinition = {
    id: "atomic",
    name: "Kamikaze",
    group: "Geometric",
    description: "Mid-century sunburst — spokes, rings and a core",
    body,
    params: [
        colorsParam,
        slider("spokes", "Spokes", 4, 64, 1, "u_spokes", true),
        slider("thickness", "Spoke width", 0.05, 0.95, 0.01, "u_thickness"),
        slider("rings", "Rings", 0.5, 12, 0.1, "u_rings"),
        slider("ringStrength", "Ring contrast", 0, 1, 0.01, "u_ringStrength"),
        slider("core", "Core", 0, 0.5, 0.005, "u_core"),
        slider("spin", "Spin", -2, 2, 0.01, "u_spin"),
        slider("centerX", "Center X", -0.8, 0.8, 0.01, "u_centerX"),
        slider("centerY", "Center Y", -0.8, 0.8, 0.01, "u_centerY"),
        angleParam(),
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["fdf0d5", "c1121f", "780000"],
        spokes: 24,
        thickness: 0.5,
        rings: 3,
        ringStrength: 0.35,
        core: 0.12,
        spin: 0.6,
        centerX: 0,
        centerY: 0,
        angle: 0,
        speed: 0.5,
        grain: 0.04,
        seed: 1958
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        spokes: Math.round(range(rng, 8, 48)),
        thickness: round2(range(rng, 0.3, 0.7)),
        rings: round2(range(rng, 1, 6)),
        ringStrength: round2(range(rng, 0.1, 0.7)),
        core: round2(range(rng, 0.05, 0.25)),
        spin: round2(range(rng, -1.2, 1.2)),
        centerX: round2(range(rng, -0.4, 0.4)),
        centerY: round2(range(rng, -0.4, 0.4)),
        angle: Math.round(range(rng, 0, 90)),
        speed: round2(range(rng, 0.2, 0.8)),
        grain: round2(range(rng, 0.01, 0.09)),
        seed: freshSeed()
    })
};
