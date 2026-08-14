import type { PresetDefinition } from "../types";
import { colorsParam, grainParam, seedParam, slider, speedParam } from "./std";
import { pickPalette } from "./palettes";
import { freshSeed, range, round2 } from "../utils/rand";
import { SWARM_POINTS_GLSL } from "./swarmPoints";

// The header effect, captured single-pass: dust condensing onto real geometry.
// PTS_A / PTS_B are surface samples of the site's actual sphere.glb and
// cubes.glb, baked into the shader by tools/bake-points.mjs. Each anchor
// morphs between the two shapes on its own staggered clock, scattering
// mid-flight; a speckled halo around the anchors reads as thousands of grains.
const body = SWARM_POINTS_GLSL + /* glsl */ `
void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    float t = u_time;

    float cycle = t * 0.25;
    float ca = cos(t * 0.12 * u_spin), sa = sin(t * 0.12 * u_spin);
    const float cb = 0.9394, sb = 0.3429; // fixed 20° tilt

    vec3 acc = vec3(0.0);
    float halo = 0.0;
    for (int i = 0; i < PT_COUNT; i++) {
        float h = hash11(float(i) * 7.13 + u_seed);
        float h2 = hash11(float(i) * 3.71 + u_seed + 9.0);

        // staggered morph: each particle departs on its own clock
        // dwell on each shape, transit quickly — the form has to assemble
        float ph = 0.5 - 0.5 * cos(cycle + h * 1.1);
        ph = smoothstep(0.32, 0.68, ph);
        vec3 q = mix(PTS_A[i], PTS_B[i], ph);

        // transit chaos: swell outward mid-flight, settle on arrival
        float mid = ph * (1.0 - ph) * 4.0;
        q += (vec3(h, h2, hash11(h * 91.0)) - 0.5) * mid * u_scatter;

        // always-on drift so the resting shape still breathes
        q += 0.025 * vec3(sin(t * 0.9 + h * 40.0), cos(t * 0.7 + h2 * 34.0), sin(t * 0.8 + h * 21.0));

        // spin, tilt, perspective
        q = vec3(ca * q.x + sa * q.z, q.y, -sa * q.x + ca * q.z);
        q = vec3(q.x, cb * q.y - sb * q.z, sb * q.y + cb * q.z);
        // gentle lens: strong perspective scatters the silhouette
        float persp = 3.2 / (3.2 + q.z);
        vec2 s = q.xy * persp * u_scale * 0.46;

        float d2 = dot(p - s, p - s);
        float core = exp(-d2 * 9500.0 * persp);
        float soft = exp(-d2 * 430.0);
        vec3 pc = ramp(0.35 + 0.6 * fract(h * 0.618 + 0.15));
        acc += pc * (core * (0.55 + 0.65 * h2) + soft * 0.03);
        halo += soft;
    }

    // the mist between particles resolves into grains
    float speck = hash21(floor(frag * 0.5) + floor(u_seed));
    float dust = halo * u_dust * (0.2 + 0.8 * smoothstep(0.5, 1.0, speck)) * 0.05;

    // ghost mass: the summed halo approximates the shape's projected volume,
    // so a soft threshold on it gives the silhouette 96 dots alone can't
    float body = smoothstep(1.1, 4.6, halo);
    vec3 add = acc * u_glow + ramp(0.8) * dust + ramp(0.5) * body * 0.3;
    vec3 col = u_colors[0] + (1.0 - exp(-add * 1.6));
    fragColor = vec4(finish(col, frag, u_grain), 1.0);
}`;

export const swarm: PresetDefinition = {
    id: "swarm",
    name: "Swarm",
    group: "Organic",
    description: "Particle dust condensing onto real geometry",
    body,
    params: [
        colorsParam,
        slider("scale", "Scale", 0.4, 2.5, 0.01, "u_scale"),
        slider("spin", "Spin", -2, 2, 0.01, "u_spin"),
        slider("scatter", "Scatter", 0, 2.5, 0.01, "u_scatter"),
        slider("dust", "Dust", 0, 1, 0.01, "u_dust"),
        slider("glow", "Glow", 0.2, 2, 0.01, "u_glow"),
        speedParam,
        grainParam,
        seedParam
    ],
    defaults: {
        colors: ["0b132b", "1c2541", "3a506b", "5bc0be"],
        scale: 0.85,
        spin: 0.8,
        scatter: 1.1,
        dust: 0.6,
        glow: 1.0,
        speed: 0.6,
        grain: 0.06,
        seed: 4242
    },
    randomize: (rng) => ({
        colors: pickPalette(rng),
        scale: round2(range(rng, 0.6, 1.2)),
        spin: round2(range(rng, -1.4, 1.4)),
        scatter: round2(range(rng, 0.5, 1.8)),
        dust: round2(range(rng, 0.3, 0.9)),
        glow: round2(range(rng, 0.6, 1.6)),
        speed: round2(range(rng, 0.3, 1.0)),
        grain: round2(range(rng, 0.02, 0.12)),
        seed: freshSeed()
    })
};
