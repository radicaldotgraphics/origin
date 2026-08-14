import type { PresetDefinition } from "../types";
import { blendParam, colorsParam, grainParam, noiseParam, pickNoise, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

// The generative-background trick behind a lot of Stripe/Linear-era sites:
// canvas 2D, many low-alpha blobs, "color-dodge" compositing, accumulated over
// thousands of frames into a hot saturated core with feathered, colour-fringed
// edges. We don't have a persistent framebuffer to accumulate into (single
// pass), so this reproduces the *optical signature* directly: a handful of
// fbm-warped soft blobs composited with real separable blend modes (the same
// formulas Photoshop/CSS use), which is what produces the hot overlaps and
// chromatic fringing at partial-alpha boundaries. Colour-dodge is the classic
// look; burn/overlay/soft-light give the darker and gentler variants.
const body = /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    float t = u_time * 0.1;

    // Each mode needs a base it can actually act on: dodge lifts out of
    // near-black, but overlay/burn/soft-light multiply or darken, so on a black
    // canvas they stay black. Compile-time, so no per-pixel cost.
#if BLEND_MODE == 2 || BLEND_MODE == 6
    vec3 col = ramp(0.85);              // burn/multiply darken into the palette
#elif BLEND_MODE == 3 || BLEND_MODE == 4
    // neutral, not a palette hue: overlay/soft-light blending a colour onto the
    // same colour just saturates, so the hue has to come from the blobs
    vec3 col = mix(u_colors[0], vec3(0.5), 0.82);
#else
    vec3 col = u_colors[0] * 0.22;      // dodge/screen/add bloom out of the dark
#endif

    // The real trick is MANY tiny nudges, not a few big ones — a handful of
    // strong color-dodge layers saturates a channel almost immediately for any
    // reasonably saturated colour (dodge divides by 1-blend, which is tiny for
    // e.g. a strong red). So this runs more, gentler layers instead.
    for (int i = 0; i < 40; i++) {
        if (i >= u_count) break;
        float fi = float(i);
        float h1 = hash11(u_seed + fi * 11.3);
        float h2 = hash11(u_seed + fi * 5.9 + 4.0);
        float h3 = hash11(u_seed + fi * 17.1 + 8.0);

        vec2 center = u_spread * 0.38 * vec2(
            sin(t * (0.1 + h1 * 0.2) + h1 * 6.2832),
            cos(t * (0.08 + h2 * 0.2) + h2 * 6.2832));

        vec2 wp = (p - center) * u_warpScale;
        float edgeNoise = fbm(wp + center * 1.7 + t * 0.06, 3) - 0.4; // recentre: fbm clusters near 0.4
        float d = length(p - center) + edgeNoise * u_warp * 0.4;

        float radius = mix(0.26, 0.5, h3) * u_size;
        float mask = exp(-(d * d) / max(radius * radius, 0.001));
        // fine texture right at the boundary — the fractal-feathered edge
        mask *= 0.65 + 0.35 * fbm(wp * 4.0 + center * 3.1, 2);

        // weighted, not round-robin: one hue dominates (the hot core reads as
        // a colour, not a wash) and the rest appear as rarer accents/fringe
        float pick = hash11(fi * 2.03 + u_seed + 41.0);
        int extra = max(u_colorCount - 1, 1);
        int ci = 1 + int(min(pick * pick * float(extra), float(extra) - 0.001));
        vec3 blobColor = u_colors[ci];

        col = mix(col, blendPixel(col, blobColor), clamp(mask * u_dodge, 0.0, 1.0));
    }

    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const kodachrome: PresetDefinition = {
    id: "colorBloom",
    name: "Kodachrome",
    group: "Organic",
    description: "Color-dodge blooms — hot saturated cores, fringed edges",
    body,
    params: [
        colorsParam,
        slider("count", "Blooms", 4, 40, 1, "u_count", true),
        slider("size", "Size", 0.3, 1.6, 0.01, "u_size"),
        slider("spread", "Spread", 0.2, 1.4, 0.01, "u_spread"),
        slider("warp", "Warp", 0, 2, 0.01, "u_warp"),
        slider("warpScale", "Warp scale", 0.5, 4, 0.01, "u_warpScale"),
        slider("dodge", "Amount", 0.03, 0.6, 0.005, "u_dodge"),
        blendParam,
        noiseParam,
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["140b0a", "ffd400", "ff6a00", "6a4c93"],
        count: 22,
        size: 0.9,
        spread: 0.85,
        warp: 1.1,
        warpScale: 1.6,
        dodge: 0.2,
        blend: 0,
        noise: 1,
        speed: 0.4,
        grain: 0.05,
        seed: 3535
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        count: Math.round(range(rng, 14, 32)),
        size: round2(range(rng, 0.6, 1.3)),
        spread: round2(range(rng, 0.6, 1.2)),
        warp: round2(range(rng, 0.6, 1.6)),
        warpScale: round2(range(rng, 1.0, 2.6)),
        dodge: round2(range(rng, 0.06, 0.3)),
        blend: [0, 1, 2, 3][Math.floor(rng() * 4)],
        noise: pickNoise(rng, [0, 1]),
        speed: round2(range(rng, 0.2, 0.7)),
        grain: round2(range(rng, 0.02, 0.1)),
        seed: freshSeed()
    })
};
