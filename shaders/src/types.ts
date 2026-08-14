export type ParamValue = number | string[];

export type SliderDef = {
    kind: "slider";
    key: string;
    label: string;
    min: number;
    max: number;
    step: number;
    uniform: string; // "" = CPU-side only (speed), never uploaded
    int?: boolean;
};

export type ColorStopsDef = {
    kind: "colorStops";
    key: string;
    label: string;
    uniform: string; // vec3[4] + companion int u_colorCount
};

export type AngleDef = {
    kind: "angle";
    key: string;
    label: string;
    uniform: string;
};

export type SeedDef = {
    kind: "seed";
    key: string;
    uniform: string;
};

// Discrete choice. With `define` set the value becomes a compile-time #define
// (one cached program per value) instead of a uniform — used for anything that
// would otherwise branch per-pixel, like the noise function.
export type SelectDef = {
    kind: "select";
    key: string;
    label: string;
    options: { value: number; label: string }[];
    uniform: string;
    define?: string;
};

export type ParamDefinition = SliderDef | ColorStopsDef | AngleDef | SeedDef | SelectDef;

export interface PresetDefinition {
    id: string; // stable forever — used in URLs
    name: string;
    group: "Gradient" | "Organic" | "Geometric" | "Tessellation" | "Optical";
    description: string;
    body: string; // GLSL: helper fns + main(), references param uniforms
    params: ParamDefinition[];
    defaults: Record<string, ParamValue>;
    // Constrained randomize: every output must look shippable.
    randomize: (rng: () => number) => Record<string, ParamValue>;
}

export interface AppState {
    presetId: string;
    params: Record<string, ParamValue>;
    paused: boolean; // not serialized
}
