import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

// Glowing flow-line art: tangled, weaving light trails, distinct from every
// other preset's filled-field look. The trick is that contour lines of a
// scalar field are mathematically valid streamlines of that field's curl —
// so instead of marching particles through a vector field (expensive, and
// still reads as a filled stripe pattern, see Stripes/Murmuration), this
// extracts sparse iso-contours of a domain-warped fbm field and renders each
// one as a soft glowing thread rather than a filled band.
const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec2 sp = p * u_scale + seedOffset();
    float t = u_time * 0.06;

    vec2 warp = vec2(fbm(sp * 0.8 + t, u_detail), fbm(sp * 0.8 + 9.2 - t * 0.8, u_detail));
    vec2 wp = sp + (warp - 0.5) * u_warp;

    float psi = fbm(wp, u_detail);
    psi = (psi - 0.4) * 2.4 + 0.5; // fbm clusters near 0.4 — recentre so contours spread evenly

    float e = psi * u_density;
    float nearest = floor(e + 0.5);
    float d = abs(e - nearest);
    // Deliberately NOT normalised by fwidth(e): fbm's derivative swings wildly
    // with position, so dividing by it made threads flicker between hairline
    // and invisible. A fixed width in e-space reads as a smooth, even glow.
    float glow = exp(-d * d * u_sharp);

    float hStrand = hash11(nearest * 0.173 + u_seed);
    vec3 strandColor = ramp(fract(hStrand * 1.7 + 0.15));
    float hot = step(0.86, hash11(nearest * 3.71 + u_seed + 5.0)); // a few threads run hot white
    strandColor = mix(strandColor, vec3(1.0), hot * 0.65);

    vec3 col = u_colors[0] * 0.07;
    col += strandColor * glow * u_glow;
    col = 1.0 - exp(-col * 1.5); // soft tone-map so overlapping threads bloom without blowing out

    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const skein: PresetDefinition = {
    id: "skein",
    name: "Skein",
    group: "Optical",
    description: "Glowing flow-line threads, weaving and crossing",
    body,
    params: [
        colorsParam,
        slider("scale", "Scale", 0.4, 3, 0.01, "u_scale"),
        slider("density", "Threads", 2, 20, 0.1, "u_density"),
        slider("warp", "Warp", 0, 3, 0.01, "u_warp"),
        slider("sharp", "Thinness", 100, 3000, 10, "u_sharp"),
        slider("glow", "Glow", 0.5, 2.5, 0.01, "u_glow"),
        slider("detail", "Detail", 2, 6, 1, "u_detail", true),
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["190a1f", "ff2f92", "ffb23d", "c65bff"],
        scale: 1.3,
        density: 8,
        warp: 1.4,
        sharp: 900,
        glow: 1.5,
        detail: 4,
        noise: 1,
        speed: 0.5,
        grain: 0.04,
        seed: 8181
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        scale: round2(range(rng, 0.8, 2.2)),
        density: round2(range(rng, 5, 14)),
        warp: round2(range(rng, 0.7, 2.2)),
        sharp: Math.round(range(rng, 400, 1800)),
        glow: round2(range(rng, 1.1, 2.2)),
        detail: Math.round(range(rng, 3, 5)),
        noise: pickNoise(rng, [0, 1]),
        speed: round2(range(rng, 0.25, 0.8)),
        grain: round2(range(rng, 0.02, 0.08)),
        seed: freshSeed()
    })
};
