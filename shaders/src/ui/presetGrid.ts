import type { ParamValue } from "../types";
import { buildFragment, presetGroups, presets, programKey } from "../presets/index";
import { variantsFor } from "../presets/variants";
import { GLRenderer } from "../renderer/gl";
import { uploadUniforms } from "../renderer/uniforms";
import { selectPreset, state, subscribe } from "../state";

// Smaller than the old two-up tiles because each preset now shows three.
const THUMB_W = 208;
const THUMB_H = 132;
const THUMB_TIME = 2.0;

// One scratch GL context renders every tile in turn and is blitted into each
// tile's own 2D canvas. Blitting (not toDataURL) is what makes re-rendering the
// whole grid on every colour change affordable — no PNG encode in the loop.
let scratch: HTMLCanvasElement | null = null;
let scratchGL: GLRenderer | null = null;

function getScratch(): GLRenderer | null {
    if (scratchGL) return scratchGL;
    scratch = document.createElement("canvas");
    scratch.width = THUMB_W;
    scratch.height = THUMB_H;
    try {
        scratchGL = new GLRenderer(scratch);
    } catch {
        return null; // tiles stay flat-coloured
    }
    return scratchGL;
}

interface Tile {
    ctx: CanvasRenderingContext2D;
    presetId: string;
    variant: number;
    params: Record<string, ParamValue>;
}

const tiles: Tile[] = [];
let activeVariant = 0;

/**
 * Renders every tile using its own variant settings but the *current* colour
 * stops, so the grid previews each style in the palette you're working in.
 */
export function renderThumbs(colors: string[]): void {
    const r = getScratch();
    if (!r || !scratch) return;
    for (const tile of tiles) {
        const preset = presets.find((p) => p.id === tile.presetId);
        if (!preset) continue;
        try {
            const params: Record<string, ParamValue> = { ...tile.params, colors };
            const info = r.getProgram(programKey(preset, params), buildFragment(preset, params));
            uploadUniforms(r, info, preset, params, THUMB_TIME, THUMB_W, THUMB_H);
            r.draw(info);
            tile.ctx.clearRect(0, 0, THUMB_W, THUMB_H);
            tile.ctx.drawImage(scratch, 0, 0);
        } catch (err) {
            console.error(`Thumbnail failed for ${tile.presetId}:`, err);
        }
    }
}

let pending: number | undefined;
function scheduleThumbs(): void {
    if (pending !== undefined) return;
    pending = window.setTimeout(() => {
        pending = undefined;
        renderThumbs((state.params.colors as string[]) ?? []);
    }, 120);
}

export function initPresetGrid(grid: HTMLElement): void {
    for (const group of presetGroups) {
        const inGroup = presets.filter((p) => p.group === group);
        if (!inGroup.length) continue;

        const heading = document.createElement("h3");
        heading.className = "preset-group";
        heading.textContent = group;
        grid.append(heading);

        for (const preset of inGroup) {
            const block = document.createElement("div");
            block.className = "preset-block";
            block.dataset.preset = preset.id;

            const name = document.createElement("div");
            name.className = "preset-name";
            name.textContent = preset.name;
            name.title = preset.description;
            block.append(name);

            const row = document.createElement("div");
            row.className = "variant-row";
            variantsFor(preset).forEach((params, i) => {
                const tile = document.createElement("button");
                tile.className = "preset-tile";
                tile.dataset.preset = preset.id;
                tile.dataset.variant = String(i);
                tile.title = `${preset.name} — ${preset.description}`;

                const canvas = document.createElement("canvas");
                canvas.className = "tile-thumb";
                canvas.width = THUMB_W;
                canvas.height = THUMB_H;
                const ctx = canvas.getContext("2d");
                if (ctx) tiles.push({ ctx, presetId: preset.id, variant: i, params });

                tile.append(canvas);
                tile.addEventListener("click", () => {
                    activeVariant = i;
                    selectPreset(preset.id, params);
                });
                row.append(tile);
            });
            block.append(row);
            grid.append(block);
        }
    }

    const highlight = () => {
        grid.querySelectorAll<HTMLElement>(".preset-tile").forEach((t) => {
            const on = t.dataset.preset === state.presetId && Number(t.dataset.variant) === activeVariant;
            t.classList.toggle("active", on);
        });
        grid.querySelectorAll<HTMLElement>(".preset-block").forEach((b) => {
            b.classList.toggle("active", b.dataset.preset === state.presetId);
        });
    };
    highlight();

    subscribe((_s, changed) => {
        if (changed.includes("preset")) highlight();
        // Colour edits, palette picks and shuffles all restyle the whole grid.
        if (changed.includes("colors") || changed.includes("preset")) scheduleThumbs();
    });

    // First paint of the hero canvas wins; the grid fills in right after.
    if ("requestIdleCallback" in window) {
        requestIdleCallback(() => renderThumbs((state.params.colors as string[]) ?? []), { timeout: 3000 });
    } else {
        setTimeout(() => renderThumbs((state.params.colors as string[]) ?? []), 300);
    }
}

/** Keyboard preset stepping resets to the first style. */
export function resetVariant(): void {
    activeVariant = 0;
}
