import { PALETTES } from "../presets/palettes";

/** Hard-edged blocks, one equal slice per colour — not a blend. */
export function paletteBlocks(colors: string[]): string {
    const step = 100 / colors.length;
    const stops = colors.map((c, i) => `#${c} ${i * step}% ${(i + 1) * step}%`);
    return `linear-gradient(90deg, ${stops.join(", ")})`;
}

// Palettes used to be reachable only by rolling shuffle. This makes the whole
// bank browsable: each swatch shows the actual stops, click to apply.
export function makePalettePicker(current: string[], onPick: (colors: string[]) => void): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "palette-picker";

    const key = current.join(",");
    for (const palette of PALETTES) {
        const btn = document.createElement("button");
        btn.className = "palette-chip";
        btn.title = palette.name;
        btn.setAttribute("aria-label", `Palette ${palette.name}`);
        btn.style.background = paletteBlocks(palette.colors);
        btn.dataset.colors = palette.colors.join(",");
        if (palette.colors.join(",") === key) btn.classList.add("active");
        btn.addEventListener("click", () => onPick([...palette.colors]));
        wrap.append(btn);
    }
    return wrap;
}
