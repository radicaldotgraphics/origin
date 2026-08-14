// ---- shared library (hash / noise / fbm / color ramp / grain / dither) ----
// Requires: u_seed, u_colors[4], u_colorCount, u_time declared before inclusion.

// NOISE_TYPE is injected as a #define so the octave loop never branches.
// 0 value · 1 gradient · 2 ridged · 3 billow · 4 cellular
#ifndef NOISE_TYPE
#define NOISE_TYPE 0
#endif

float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

// Deterministic per-seed domain offset so u_seed reshuffles every pattern.
vec2 seedOffset() {
    return vec2(hash11(u_seed * 0.123 + 7.1), hash11(u_seed * 0.317 + 3.7)) * 61.7;
}

// --- noise variants, all returning ~[0,1] ---

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float gradientNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    vec2 ga = hash22(i) * 2.0 - 1.0;
    vec2 gb = hash22(i + vec2(1.0, 0.0)) * 2.0 - 1.0;
    vec2 gc = hash22(i + vec2(0.0, 1.0)) * 2.0 - 1.0;
    vec2 gd = hash22(i + vec2(1.0, 1.0)) * 2.0 - 1.0;
    float va = dot(ga, f);
    float vb = dot(gb, f - vec2(1.0, 0.0));
    float vc = dot(gc, f - vec2(0.0, 1.0));
    float vd = dot(gd, f - vec2(1.0, 1.0));
    return mix(mix(va, vb, u.x), mix(vc, vd, u.x), u.y) * 0.7 + 0.5;
}

// Worley F1 — distance to nearest feature point.
float cellularNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float best = 8.0;
    for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
        vec2 nb = vec2(float(x), float(y));
        vec2 pt = nb + hash22(i + nb) - f;
        best = min(best, dot(pt, pt));
    }
    return clamp(sqrt(best), 0.0, 1.0);
}

float baseNoise(vec2 p) {
#if NOISE_TYPE == 1
    return gradientNoise(p);
#elif NOISE_TYPE == 2
    return 1.0 - abs(gradientNoise(p) * 2.0 - 1.0);   // ridged: sharp veins
#elif NOISE_TYPE == 3
    return abs(gradientNoise(p) * 2.0 - 1.0);          // billow: puffy lobes
#elif NOISE_TYPE == 4
    return cellularNoise(p);
#else
    return valueNoise(p);
#endif
}

// Kept as an alias: presets that want plain value noise regardless of the
// selected type (grids, jitter) call this directly.
float vnoise(vec2 p) {
    return valueNoise(p);
}

// fbm normalized to ~[0,1]; oct clamped to 8 so loops stay bounded.
float fbm(vec2 p, int oct) {
    float v = 0.0;
    float amp = 0.5;
    float norm = 0.0;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 8; i++) {
        if (i >= oct) break;
        v += amp * baseNoise(p);
        norm += amp;
        p = rot * p * 2.02;
        amp *= 0.5;
    }
    return v / max(norm, 0.001);
}

// BLEND_MODE is injected as a #define so the branch costs nothing per pixel.
// 0 color-dodge | 1 screen | 2 color-burn | 3 overlay
// 4 soft-light  | 5 linear-dodge(add) | 6 multiply
#ifndef BLEND_MODE
#define BLEND_MODE 0
#endif

// Separable blend modes, matching the W3C compositing definitions.
vec3 blendPixel(vec3 base, vec3 bl) {
#if BLEND_MODE == 1
    return 1.0 - (1.0 - base) * (1.0 - bl);                       // screen
#elif BLEND_MODE == 2
    return 1.0 - min((1.0 - base) / max(bl, vec3(1e-4)), vec3(1.0)); // colour burn
#elif BLEND_MODE == 3
    return mix(2.0 * base * bl, 1.0 - 2.0 * (1.0 - base) * (1.0 - bl), step(0.5, base));
#elif BLEND_MODE == 4
    vec3 d = mix(((16.0 * base - 12.0) * base + 4.0) * base, sqrt(max(base, 0.0)), step(0.25, base));
    return mix(base - (1.0 - 2.0 * bl) * base * (1.0 - base),
               base + (2.0 * bl - 1.0) * (d - base), step(0.5, bl));
#elif BLEND_MODE == 5
    return min(base + bl, vec3(1.0));                             // linear dodge (add)
#elif BLEND_MODE == 6
    return base * bl;                                             // multiply
#else
    return min(base / max(1.0 - bl, vec3(1e-4)), vec3(1.0));      // colour dodge
#endif
}

// Map t in [0,1] through the active color stops with smooth interpolation.
vec3 ramp(float t) {
    float n = float(u_colorCount - 1);
    float x = clamp(t, 0.0, 1.0) * n;
    int i = int(min(x, n - 1.0));
    float f = smoothstep(0.0, 1.0, x - float(i));
    return mix(u_colors[i], u_colors[i + 1], f);
}

// Rotate around the origin by degrees.
mat2 rot2(float degrees) {
    float a = radians(degrees);
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

// Animated film grain, centered on 0.
float grain(vec2 frag) {
    return hash21(frag + vec2(fract(u_time * 1.13) * 61.7, u_seed)) - 0.5;
}

// Grain overlay + hash dither (±1/255) so smooth gradients never band.
vec3 finish(vec3 col, vec2 frag, float grainAmt) {
    col += grain(frag) * grainAmt * 0.35;
    col += (hash21(frag * 1.371 + 0.5) - 0.5) / 255.0;
    return col;
}
