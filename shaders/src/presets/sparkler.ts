import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";

// Long-exposure light painting: particles dragging trails behind them.
//
// Distinct from Skein, which extracts iso-contours of a field. Contours are
// level sets, so they can never cross and never terminate mid-frame — but real
// particle trails do both. Here each strand is an analytic wandering path and
// the trail is the span of that path over the last `length` of parameter time,
// drawn as connected segments. Strands are grouped into bundles that share a
// path with tiny offsets, which is what produces the ribbon-of-many-hairs look
// rather than isolated single lines.
//
// The path is a sum of sinusoids rather than curl-noise: this loop runs
// bundles × strands × steps times per pixel, and fbm in that inner loop would
// be far too expensive.
const body = /* glsl */ `
float segDist(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    return length(pa - ba * h);
}

// Analytic wandering path. The four per-bundle hashes are passed in rather
// than recomputed: this runs bundles x strands x steps times per pixel, and
// hashing inside the inner loop made the shader too expensive to render at
// full canvas size. "off" offsets strands within a bundle so they run
// near-parallel instead of on top of each other.
// Low frequencies deliberately: the trail is sampled at a fixed step count, so
// a fast second harmonic undersamples into visible zigzags. These give long
// sweeping arcs that stay smooth across the whole trail.
vec2 pathAt(vec4 hh, float off, float s) {
    float x = sin(s * (0.34 + hh.x * 0.42) + hh.x * 6.2832 + off * 1.1)
            + 0.45 * sin(s * (0.7 + hh.y * 0.7) + hh.z * 6.2832 + off * 1.9);
    float y = cos(s * (0.3 + hh.z * 0.4) + hh.y * 6.2832 + off * 1.1)
            + 0.45 * cos(s * (0.62 + hh.w * 0.66) + hh.x * 6.2832 + off * 1.9);
    return vec2(x, y) * 0.5 * u_scale;
}

void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    vec3 acc = vec3(0.0);

    for (int bi = 0; bi < 12; bi++) {
        if (bi >= u_bundles) break;
        float b = float(bi);

        // hoisted per bundle — never recomputed in the inner loops
        vec4 hh = vec4(
            hash11(b * 13.1 + u_seed),
            hash11(b * 7.7 + u_seed + 3.0),
            hash11(b * 21.3 + u_seed + 9.0),
            hash11(b * 5.3 + u_seed + 17.0));

        // one hue per bundle, so a ribbon reads as a single stroke
        float hc = hash11(b * 3.77 + u_seed + 23.0);
        vec3 bundleColor = ramp(fract(hc * 1.7 + 0.15));
        float hot = step(0.82, hash11(b * 9.13 + u_seed + 41.0));
        bundleColor = mix(bundleColor, vec3(1.0), hot * 0.7);

        // each bundle starts at a different point along its own path, so they
        // don't all sweep the frame in lockstep
        float head = u_time * 0.35 + hash11(b * 17.9 + u_seed) * 40.0;

        // March the ribbon's centreline ONCE and keep the nearest approach.
        // The hairs are parallel to it, so they can be derived from that one
        // distance instead of re-marching the path per hair — which is what
        // made this preset cost bundles x hairs x steps segment tests.
        float dmin = 1e9;
        float fadeAtMin = 1.0;
        vec2 headPos = pathAt(hh, 0.0, head);
        vec2 prev = headPos;
        for (int m = 1; m <= 14; m++) {
            float age = float(m) / 14.0;
            vec2 cur = pathAt(hh, 0.0, head - age * u_length);

            float d = segDist(p, prev, cur);
            if (d < dmin) {
                dmin = d;
                // decay = 0 -> even "drawn" line; 1 -> comet tail fading out
                // max() guards pow(0.0, y): at the last step age is exactly 1,
                // and this driver returns NaN for pow(0, 2.2) — one NaN poisons
                // the whole accumulator and the shader renders pure black.
                fadeAtMin = mix(1.0, pow(max(1.0 - age, 1e-4), 2.2), u_decay);
            }
            prev = cur;
        }

        // Hairs sit at fixed offsets either side of the centreline. dmin is
        // unsigned, so each offset draws a symmetric pair — exactly a ribbon.
        // hairs must sit within a few pixels of the centreline, i.e. on the
        // order of the line half-width (~1/sqrt(sharp)), not the frame
        float spacing = u_spread * 0.010;
        float g = 0.0;
        for (int ki = 0; ki < 6; ki++) {
            if (ki >= u_strands) break;
            float o = float(ki) * spacing;
            float hd = dmin - o;
            g += exp(-hd * hd * u_sharp) * (0.55 + 0.45 * hash11(b * 31.0 + float(ki) * 5.1 + u_seed));
        }
        acc += bundleColor * g * fadeAtMin;

        // the particle itself, brighter than its trail
        float dh = length(p - headPos);
        acc += bundleColor * exp(-dh * dh * u_sharp * 4.0) * u_head;
    }

    vec3 col = u_colors[0] * 0.06 + acc * u_glow * 0.10;
    col = 1.0 - exp(-col * 1.6); // tone-map so crossings bloom without clipping

    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const sparkler: PresetDefinition = {
    id: "trails",
    name: "Sparkler",
    group: "Optical",
    description: "Long-exposure light trails, bundled and crossing",
    body,
    params: [
        colorsParam,
        slider("bundles", "Ribbons", 1, 12, 1, "u_bundles", true),
        slider("strands", "Hairs per ribbon", 1, 6, 1, "u_strands", true),
        slider("spread", "Hair spacing", 0.1, 3, 0.01, "u_spread"),
        slider("length", "Trail length", 1, 14, 0.1, "u_length"),
        slider("decay", "Decay", 0, 1, 0.01, "u_decay"),
        slider("sharp", "Thinness", 1000, 60000, 100, "u_sharp"),
        slider("head", "Head", 0, 3, 0.01, "u_head"),
        slider("glow", "Glow", 0.3, 3, 0.01, "u_glow"),
        slider("scale", "Scale", 0.5, 2, 0.01, "u_scale"),
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["1a0616", "ff2d95", "ff8ad8", "ffffff"],
        bundles: 11,
        strands: 5,
        spread: 1.0,
        length: 5.5,
        decay: 0.3,
        sharp: 34000,
        head: 0.5,
        glow: 1.4,
        scale: 1.2,
        speed: 0.5,
        grain: 0.04,
        seed: 5150
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        bundles: Math.round(range(rng, 6, 12)),
        strands: Math.round(range(rng, 3, 6)),
        spread: round2(range(rng, 0.8, 2.2)),
        length: round2(range(rng, 3.5, 8)),
        decay: round2(range(rng, 0, 0.8)),
        sharp: Math.round(range(rng, 18000, 48000)),
        head: round2(range(rng, 0.2, 0.9)),
        glow: round2(range(rng, 0.8, 1.8)),
        scale: round2(range(rng, 0.8, 1.5)),
        speed: round2(range(rng, 0.25, 0.8)),
        grain: round2(range(rng, 0.02, 0.08)),
        seed: freshSeed()
    })
};
