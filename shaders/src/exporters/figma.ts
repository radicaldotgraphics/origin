import type { ParamValue, PresetDefinition } from "../types";
import { bakeFragment } from "./shared";

// Figma shader fills (Config 2026) run on WebGPU/WGSL and are created through
// the Figma agent — there is no raw-code paste box in the fill UI, and Figma
// publishes no public uniform/entry-point spec. So this export is an
// agent-ready package: a porting brief plus the exact baked GLSL. The agent
// ports it to WGSL and parameterizes it; the constants pin the visual.
export function exportFigma(
    preset: PresetDefinition,
    params: Record<string, ParamValue>,
    shareURL: string
): string {
    return `Create a shader fill for the selected layer by porting the GLSL fragment
shader below to a Figma shader fill. Follow these rules exactly:

1. Reproduce the visual 1:1. Keep every value in the "Baked parameters" block
   exactly as written — they define the look.
2. u_time is animation time in seconds; u_resolution is the layer size in
   pixels. Map them to your time and resolution inputs.
3. gl_FragCoord.xy is the pixel coordinate (origin bottom-left) — flip Y if
   your coordinate system differs.
4. Expose u_speed and each value in the baked block as adjustable shader
   parameters, using the trailing comment on each line as its label.
5. The output must animate continuously.

Remix source: ${shareURL}

--- GLSL fragment shader ---

${bakeFragment(preset, params)}`;
}
