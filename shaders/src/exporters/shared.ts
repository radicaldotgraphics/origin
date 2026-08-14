import type { ParamValue, PresetDefinition } from "../types";
import { COMMON, defineBlock, FRAG_HEADER } from "../presets/index";
import { hexToVec3 } from "../utils/color";

// Exports bake every parameter to a const so artifacts are zero-config.
// Only u_time (seconds) and u_resolution (px) stay live.

function fmtFloat(v: number): string {
    const s = String(Math.round(v * 10000) / 10000);
    return s.includes(".") || s.includes("e") ? s : s + ".0";
}

export function bakeConstBlock(preset: PresetDefinition, params: Record<string, ParamValue>): string {
    const lines: string[] = ["// ---- Baked parameters — edit freely ----"];
    for (const def of preset.params) {
        const v = params[def.key];
        if (def.kind === "colorStops") {
            const colors = v as string[];
            const vecs: string[] = [];
            for (let i = 0; i < 4; i++) {
                vecs.push(hexToVec3(colors[Math.min(i, colors.length - 1)]));
            }
            lines.push(
                `const vec3 u_colors[4] = vec3[4](${vecs.join(", ")});`,
                `const int u_colorCount = ${Math.min(colors.length, 4)};`
            );
        } else if (def.kind === "slider") {
            const name = def.uniform === "" ? "u_" + def.key : def.uniform;
            if (def.int) lines.push(`const int ${name} = ${Math.round(v as number)}; // ${def.label}`);
            else lines.push(`const float ${name} = ${fmtFloat(v as number)}; // ${def.label}`);
        } else if (def.kind === "select") {
            if (def.define) continue; // emitted in the #define block instead
            lines.push(`const int ${def.uniform} = ${Math.round(v as number)}; // ${def.label}`);
        } else if (def.kind === "angle") {
            lines.push(`const float ${def.uniform} = ${fmtFloat(v as number)}; // ${def.label} (degrees)`);
        } else {
            lines.push(`const float ${def.uniform} = ${fmtFloat(v as number)}; // seed`);
        }
    }
    return lines.join("\n") + "\n";
}

// Complete #version 300 es fragment shader with everything baked.
// Speed is baked by scaling the live u_time everywhere it is read.
export function bakeFragment(preset: PresetDefinition, params: Record<string, ParamValue>): string {
    const consts = bakeConstBlock(preset, params);
    const timeScaled = (COMMON + preset.body).replace(/\bu_time\b/g, "(u_time * u_speed)");
    return FRAG_HEADER + consts + defineBlock(preset, params) + timeScaled;
}
