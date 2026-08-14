import type { ParamValue, PresetDefinition } from "../types";
import COMMON from "./common.glsl?raw";
import { gradientMesh } from "./gradientMesh";
import { grainGradient } from "./grainGradient";
import { domainWarp } from "./domainWarp";
import { aurora } from "./aurora";
import { metaballs } from "./metaballs";
import { caustics } from "./caustics";
import { marble } from "./marble";
import { flowField } from "./flowField";
import { nebula } from "./nebula";
import { woodgrain } from "./woodgrain";
import { stripes } from "./stripes";
import { halftone } from "./halftone";
import { ripple } from "./ripple";
import { voronoiCells } from "./voronoiCells";
import { truchet } from "./truchet";
import { hexGrid } from "./hexGrid";
import { checkerWarp } from "./checkerWarp";
import { moire } from "./moire";
import { topographic } from "./topographic";
import { iridescent } from "./iridescent";
import { liquidMetal } from "./liquidMetal";
import { kaleidoscope } from "./kaleidoscope";
import { plasma } from "./plasma";
import { dither } from "./dither";
import { zellige } from "./zellige";
import { penrose } from "./penrose";
import { seigaiha } from "./seigaiha";
import { quilt } from "./quilt";
import { bullseye } from "./bullseye";
import { missoni } from "./missoni";
import { atomic } from "./atomic";
import { fibonacci } from "./fibonacci";
import { gloop } from "./gloop";
import { kodachrome } from "./kodachrome";
import { skein } from "./skein";
import { sparkler } from "./sparkler";
import { overspray } from "./overspray";

// Grouped for the preset grid; order within a group is the display order.
export const presets: PresetDefinition[] = [
    // Gradient
    gradientMesh,
    grainGradient,
    // Organic
    domainWarp,
    gloop,
    kodachrome,
    aurora,
    metaballs,
    caustics,
    marble,
    flowField,
    nebula,
    woodgrain,
    fibonacci,
    // Geometric
    stripes,
    halftone,
    ripple,
    voronoiCells,
    checkerWarp,
    moire,
    topographic,
    bullseye,
    missoni,
    atomic,
    overspray,
    // Tessellation
    truchet,
    hexGrid,
    zellige,
    penrose,
    seigaiha,
    quilt,
    // Optical
    skein,
    sparkler,
    iridescent,
    liquidMetal,
    kaleidoscope,
    plasma,
    dither
];

export const presetGroups: PresetDefinition["group"][] = ["Gradient", "Organic", "Geometric", "Tessellation", "Optical"];

export const defaultPresetId = domainWarp.id;

const byId = new Map(presets.map((p) => [p.id, p]));

export function getPreset(id: string): PresetDefinition {
    return byId.get(id) ?? byId.get(defaultPresetId)!;
}

export const FRAG_HEADER = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform float u_time;
`;

export function uniformDeclarations(preset: PresetDefinition): string {
    const lines: string[] = [];
    for (const def of preset.params) {
        if (def.kind === "colorStops") {
            lines.push(`uniform vec3 ${def.uniform}[4];`, `uniform int u_colorCount;`);
        } else if (def.kind === "slider") {
            if (def.uniform === "") continue; // speed lives on the CPU
            lines.push(`uniform ${def.int ? "int" : "float"} ${def.uniform};`);
        } else if (def.kind === "select") {
            if (def.define) continue; // becomes a #define, not a uniform
            lines.push(`uniform int ${def.uniform};`);
        } else {
            lines.push(`uniform float ${def.uniform};`);
        }
    }
    return lines.join("\n") + "\n";
}

// Compile-time constants (currently just NOISE_TYPE). These must appear before
// common.glsl, and any change to them needs a different cached program.
export function defineBlock(preset: PresetDefinition, params: Record<string, ParamValue>): string {
    const lines: string[] = [];
    for (const def of preset.params) {
        if (def.kind === "select" && def.define) {
            const v = Math.round((params[def.key] as number) ?? (preset.defaults[def.key] as number));
            lines.push(`#define ${def.define} ${v}`);
        }
    }
    return lines.length ? lines.join("\n") + "\n" : "";
}

export function programKey(preset: PresetDefinition, params: Record<string, ParamValue>): string {
    let key = preset.id;
    for (const def of preset.params) {
        if (def.kind === "select" && def.define) {
            key += `|${def.define}=${Math.round((params[def.key] as number) ?? 0)}`;
        }
    }
    return key;
}

export function buildFragment(preset: PresetDefinition, params: Record<string, ParamValue>): string {
    return FRAG_HEADER + uniformDeclarations(preset) + defineBlock(preset, params) + COMMON + preset.body;
}

export { COMMON };
