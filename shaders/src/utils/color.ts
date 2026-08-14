// hex ("1a1a2e" or "#1a1a2e") ↔ [r,g,b] floats in 0..1

export function hexToRgb01(hex: string): [number, number, number] {
    let h = hex.replace(/^#/, "").trim();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return [0, 0, 0];
    const n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function isValidHex(hex: string): boolean {
    return /^[0-9a-fA-F]{6}$/.test(hex.replace(/^#/, ""));
}

export function normalizeHex(hex: string): string {
    return hex.replace(/^#/, "").toLowerCase();
}

// GLSL vec3 literal for exports, e.g. "vec3(0.102, 0.102, 0.180)"
export function hexToVec3(hex: string): string {
    const [r, g, b] = hexToRgb01(hex);
    const f = (v: number) => v.toFixed(4);
    return `vec3(${f(r)}, ${f(g)}, ${f(b)})`;
}
