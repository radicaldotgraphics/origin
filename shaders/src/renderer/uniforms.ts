import type { ParamValue, PresetDefinition } from "../types";
import type { GLRenderer, ProgramInfo } from "./gl";

// Preallocated: 4 vec3 color stops. No per-frame allocations.
const colorArr = new Float32Array(12);
let colorCacheKey = "";

function hexNibble(c: number): number {
    // '0'-'9' → 0-9, 'a'-'f'/'A'-'F' → 10-15
    return c <= 57 ? c - 48 : (c | 32) - 87;
}

function packColors(colors: string[]): number {
    const key = colors.join(",");
    if (key !== colorCacheKey) {
        colorCacheKey = key;
        for (let i = 0; i < 4; i++) {
            const hex = colors[Math.min(i, colors.length - 1)];
            const o = hex.charCodeAt(0) === 35 ? 1 : 0; // skip '#'
            for (let ch = 0; ch < 3; ch++) {
                const hi = hexNibble(hex.charCodeAt(o + ch * 2));
                const lo = hexNibble(hex.charCodeAt(o + ch * 2 + 1));
                colorArr[i * 3 + ch] = (hi * 16 + lo) / 255;
            }
        }
    }
    return Math.min(colors.length, 4);
}

export function uploadUniforms(
    r: GLRenderer,
    info: ProgramInfo,
    preset: PresetDefinition,
    params: Record<string, ParamValue>,
    time: number,
    width: number,
    height: number
): void {
    const gl = r.gl;
    gl.useProgram(info.program);
    gl.uniform2f(r.loc(info, "u_resolution"), width, height);
    gl.uniform1f(r.loc(info, "u_time"), time);

    for (const def of preset.params) {
        const v = params[def.key];
        if (v === undefined) continue;
        if (def.kind === "colorStops") {
            const count = packColors(v as string[]);
            gl.uniform3fv(r.loc(info, def.uniform), colorArr);
            gl.uniform1i(r.loc(info, "u_colorCount"), count);
        } else if (def.kind === "slider") {
            if (def.uniform === "") continue; // CPU-side (speed)
            if (def.int) gl.uniform1i(r.loc(info, def.uniform), v as number);
            else gl.uniform1f(r.loc(info, def.uniform), v as number);
        } else if (def.kind === "select") {
            if (def.define) continue; // baked into the program at compile time
            gl.uniform1i(r.loc(info, def.uniform), v as number);
        } else {
            // angle (degrees) and seed upload as float
            gl.uniform1f(r.loc(info, def.uniform), v as number);
        }
    }
}
