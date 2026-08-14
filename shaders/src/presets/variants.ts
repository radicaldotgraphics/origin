import type { ParamValue, PresetDefinition } from "../types";

/**
 * Two alternate settings per preset, on top of its defaults — so the grid shows
 * each family's range rather than one frozen look. Each pushes the parameters
 * that actually characterise that family (Aurora's glow, Carrara's vein
 * density), plus noise type and angle where the preset exposes them.
 *
 * Noise values stay inside the set each preset's randomize() allows: cellular
 * or ridged in the wrong family reads as broken rather than varied.
 *
 * Keyed by preset id; index 0 is always the preset's own defaults.
 */
export const VARIANTS: Record<string, Record<string, ParamValue>[]> = {
    // --- Gradient ---
    gradientMesh: [
        { softness: 0.95, scale: 0.6, shadow: 0.4, noise: 0 },
        { softness: 0.12, scale: 1.3, shadow: 1, noise: 1 }
    ],
    grainGradient: [
        { grain: 0.95, softness: 1.3, noise: 0, angle: 90 },
        { radial: 1, grain: 0.15, softness: 0.45, noise: 1, angle: 210 }
    ],

    // --- Organic ---
    gloop: [
        { levels: 2, focus: 1, contrast: 4, scale: 3.2, noise: 3, seed: 4207 },
        { levels: 7, focus: 0.55, warp: 2.0, noise: 1, scale: 1.5, contrast: 3 }
    ],
    swarm: [
        { scatter: 2.2, dust: 0.95, glow: 0.7, spin: 1.6 },
        { scatter: 0.15, dust: 0.15, glow: 1.8, scale: 1.8, spin: -0.5 }
    ],
    colorBloom: [
        { count: 34, dodge: 0.3, spread: 1.1, warp: 1.6 },
        { count: 8, dodge: 0.12, size: 1.3, spread: 0.5, warp: 0.5 }
    ],
    skein: [
        { density: 14, warp: 2.4, sharp: 1800, glow: 2.0 },
        { density: 4, warp: 0.6, sharp: 350, glow: 1.2, scale: 0.9 }
    ],
    domainWarp: [
        { warp: 2.8, detail: 7, scale: 2.6, noise: 2 },
        { warp: 0.35, scale: 0.6, detail: 3, noise: 3 }
    ],
    aurora: [
        { glow: 1.5, layers: 5, flow: 0.5, noise: 0 },
        { glow: 0.22, flow: 1.9, layers: 2, noise: 1 }
    ],
    metaballs: [
        { edge: 0.06, radius: 0.3, count: 3, spread: 1.3 },
        { count: 6, radius: 0.1, edge: 1.1, spread: 0.45 }
    ],
    caustics: [
        { sharp: 21, warp: 1.5, detail: 5, noise: 0 },
        { sharp: 3, scale: 0.8, warp: 0.3, noise: 1 }
    ],
    marble: [
        { freq: 34, turbulence: 0.4, contrast: 1.6, noise: 2, angle: 90 },
        { freq: 5, turbulence: 2.4, contrast: 2.2, noise: 1, angle: 145 }
    ],
    flowField: [
        { density: 20, curl: 1.8, steps: 8, noise: 0 },
        { density: 3.5, contrast: 2.8, curl: 0.4, noise: 1 }
    ],
    nebula: [
        { stars: 1.4, density: 2.4, scale: 2.6, noise: 3 },
        { stars: 0, density: 0.6, scale: 0.8, noise: 0 }
    ],
    woodgrain: [
        { freq: 12, fibre: 0.85, turbulence: 1.4, noise: 0, angle: 90 },
        { stretch: 0.06, freq: 3, fibre: 0.15, noise: 1, angle: 42 }
    ],
    fibonacci: [
        { density: 30, seedSize: 0.9, colorCycle: 1, angle: 120 },
        { density: 6, colorCycle: 16, seedSize: 0.45, angle: 240 }
    ],

    // --- Geometric ---
    stripes: [
        { softness: 0.04, freq: 18, wave: 0.4, noise: 0, angle: 90 },
        { wave: 1.9, freq: 4, softness: 1, noise: 1, angle: 135 }
    ],
    halftone: [
        { dotScale: 40, fieldMix: 0.05, noise: 3, angle: 0 },
        { dotScale: 8, fieldMix: 1, noise: 0, angle: 75 }
    ],
    ripple: [
        { freq: 18, distort: 0.08, centerX: -0.55, centerY: 0.4, noise: 2 },
        { freq: 3, distort: 1.9, centerX: 0.5, centerY: -0.45, noise: 0 }
    ],
    voronoiCells: [
        { edge: 0.3, cellScale: 3, jitter: 0.4 },
        { edge: 0.02, cellScale: 12, jitter: 1 }
    ],
    checkerWarp: [
        { warp: 0, soft: 0.008, scale: 9, noise: 0, angle: 45 },
        { warp: 1.9, soft: 0.45, scale: 3, noise: 1, angle: 0 }
    ],
    moire: [
        { radial: 1, freq: 150, delta: 2, offset: 0.3, angle: 90 },
        { delta: 20, freq: 40, contrast: 1.8, offset: -0.35, angle: 35 }
    ],
    topographic: [
        { levels: 34, lineStrength: 1, terrace: 0, noise: 3 },
        { levels: 5, terrace: 1, lineStrength: 0.2, noise: 0 }
    ],
    bullseye: [
        { cellScale: 1.2, maxRings: 14, angle: 30 },
        { cellScale: 9, maxRings: 4, radius: 0.7, angle: 12 }
    ],
    missoni: [
        { amplitude: 3.2, density: 14, freq: 1.5, angle: 90 },
        { gap: 0.7, amplitude: 0.6, density: 5, angle: 30 }
    ],
    atomic: [
        { spokes: 60, thickness: 0.3, rings: 8, ringStrength: 0.7, centerX: -0.7, centerY: -0.5, angle: 12 },
        { spokes: 8, thickness: 0.7, core: 0.35, rings: 1, centerX: 0.62, centerY: 0.4, angle: 40 }
    ],

    // --- Tessellation ---
    overspray: [
        { roundness: 0, spread: 0.06, overspray: 0.15, size: 0.65 },
        { roundness: 1, spread: 0.3, overspray: 0.7, overSpread: 0.7, size: 0.4 }
    ],
    truchet: [
        { width: 0.28, cellScale: 3, angle: 30 },
        { width: 0.04, cellScale: 12, angle: 15 }
    ],
    hexGrid: [
        { gap: 0.15, fill: 2.2, cellScale: 6, angle: 30 },
        { cellScale: 22, gap: 0.01, fill: 1, angle: 15 }
    ],
    zellige: [
        { points: 12, sharp: 0.5, cellScale: 2.5, angle: 22 },
        { points: 6, crossSize: 1.5, strapStrength: 0.15, angle: 45 }
    ],
    penrose: [
        { waves: 11, freq: 50, terrace: 0, angle: 31 },
        { waves: 5, terrace: 1, bands: 5, freq: 20, angle: 72 }
    ],
    seigaiha: [
        { rings: 8, lineWidth: 0.22, cellScale: 5, angle: 8 },
        { cellScale: 16, squash: 1.6, bandStrength: 0.35, angle: 180 }
    ],
    quilt: [
        { round: 1, gap: 0.05, cellScale: 4, angle: 45 },
        { round: 0, cellScale: 12, churn: 1.5, angle: 15 }
    ],

    // --- Optical ---
    trails: [
        { decay: 1, length: 9, bundles: 8, strands: 6, head: 1.4, sharp: 26000 },
        { decay: 0, length: 3, bundles: 12, strands: 2, spread: 2.6, sharp: 6000 }
    ],
    iridescent: [
        { bands: 6, sheen: 0.9, warp: 0.6, noise: 3 },
        { bands: 1, warp: 2.2, curve: 3.5, noise: 0 }
    ],
    liquidMetal: [
        { polish: 36, gloss: 1, bands: 8, noise: 2 },
        { warp: 2.8, bands: 2, gloss: 0.25, noise: 0 }
    ],
    kaleidoscope: [
        { segments: 16, scale: 5, vignette: 0.6, spin: -1.1, noise: 4 },
        { segments: 4, zoom: 1.7, scale: 2, spin: 1.4, noise: 2 }
    ],
    plasma: [
        { banding: 1, bands: 6, scale: 5 },
        { radial: 3, scale: 8, banding: 0, amplitude: 1.8 }
    ],
    dither: [
        { pixel: 8, levels: 2, strength: 1.4, noise: 3, angle: 0 },
        { pixel: 1, levels: 10, strength: 2.2, noise: 0, angle: 120 }
    ]
};

/**
 * Stable per-variant seed. Derived from the preset id so a given style always
 * looks the same across reloads and shared links — without it every style of a
 * preset inherits one seed and they read as near-duplicates.
 */
function variantSeed(presetId: string, index: number): number {
    let h = 2166136261 ^ (index * 0x9e3779b1);
    for (let i = 0; i < presetId.length; i++) {
        h = Math.imul(h ^ presetId.charCodeAt(i), 16777619);
    }
    return (h >>> 0) % 99999;
}

/** The three styles for a preset: its defaults, then the two alternates. */
export function variantsFor(preset: PresetDefinition): Record<string, ParamValue>[] {
    const extra = VARIANTS[preset.id] ?? [];
    return [
        { ...preset.defaults },
        ...extra.map((over, i) => ({
            ...preset.defaults,
            seed: variantSeed(preset.id, i + 1),
            ...over // an explicit seed in the override still wins
        }))
    ];
}
