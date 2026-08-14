import { getPreset } from "../presets/index";
import { setParam, state, subscribe } from "../state";
import { makeAngleDial, makeColorStops, makeSeedRow, makeSelect, makeSlider } from "./controls";
import type { ColorStopsControl } from "./controls";
import { makePalettePicker } from "./palettePicker";

// Builds the Colors + Params sections from the active preset's definitions.
// Rebuilt wholesale on preset change / shuffle; slider drags update in place.
export function initPanel(colorSection: HTMLElement, paramSection: HTMLElement): void {
    let stops: ColorStopsControl | null = null;

    const highlightPalette = (colors: string[]) => {
        const key = colors.join(",");
        colorSection.querySelectorAll<HTMLElement>(".palette-chip").forEach((chip) => {
            chip.classList.toggle("active", chip.dataset.colors === key);
        });
    };

    const rebuild = () => {
        const preset = getPreset(state.presetId);
        colorSection.textContent = "";
        paramSection.textContent = "";
        stops = null;
        for (const def of preset.params) {
            const value = state.params[def.key];
            if (def.kind === "colorStops") {
                stops = makeColorStops(value as string[], (colors) => setParam(def.key, colors));
                const picker = makePalettePicker(value as string[], (colors) => setParam(def.key, colors));
                colorSection.append(stops.el, picker);
            } else if (def.kind === "slider") {
                paramSection.append(makeSlider(def, value as number, (v) => setParam(def.key, v)));
            } else if (def.kind === "select") {
                paramSection.append(makeSelect(def, value as number, (v) => setParam(def.key, v)));
            } else if (def.kind === "angle") {
                paramSection.append(makeAngleDial(def, value as number, (v) => setParam(def.key, v)));
            } else {
                paramSection.append(makeSeedRow(def, value as number, (v) => setParam(def.key, v)));
            }
        }
    };

    rebuild();
    subscribe((_s, changed) => {
        if (changed.includes("preset")) {
            rebuild();
        } else if (changed.includes("colors")) {
            // Palette picks and shuffles change colours from outside the swatch
            // row; mirror them back into it rather than rebuilding.
            const colors = state.params.colors as string[] | undefined;
            if (colors) {
                stops?.sync(colors);
                highlightPalette(colors);
            }
        }
    });
}
