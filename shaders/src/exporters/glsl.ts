import type { ParamValue, PresetDefinition } from "../types";
import { bakeFragment } from "./shared";

export function exportGLSL(
    preset: PresetDefinition,
    params: Record<string, ParamValue>,
    shareURL: string
): string {
    const header = `/*
 * ${preset.name} — Shader Fill Studio
 * Remix: ${shareURL}
 *
 * Complete GLSL ES 3.00 fragment shader (WebGL2). All parameters are baked
 * to consts below; the only live inputs are:
 *   uniform float u_time;        // seconds since start
 *   uniform vec2  u_resolution;  // canvas size in physical pixels
 *
 * License: CC0 — use anywhere, no attribution required.
 */
`;
    return header + bakeFragment(preset, params);
}
