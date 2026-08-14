import type { AngleDef, SeedDef, SelectDef, SliderDef } from "../types";
import { freshSeed } from "../utils/rand";
import { ALGO_ICONS, ICON_RANDOM } from "./icons";

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string
): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
}

export function makeSlider(def: SliderDef, value: number, onChange: (v: number) => void): HTMLElement {
    const row = el("div", "control-row");
    const label = el("label", "control-label", def.label);
    const input = el("input");
    input.type = "range";
    input.min = String(def.min);
    input.max = String(def.max);
    input.step = String(def.step);
    input.value = String(value);
    const out = el("span", "control-value", fmt(value, def));
    input.addEventListener("input", () => {
        const v = def.int ? Math.round(parseFloat(input.value)) : parseFloat(input.value);
        out.textContent = fmt(v, def);
        onChange(v);
    });
    row.append(label, input, out);
    return row;
}

function fmt(v: number, def: SliderDef): string {
    return def.int ? String(v) : v.toFixed(def.step < 0.1 ? 2 : 1);
}

// Compact drag dial for angles, with live degree readout.
export function makeAngleDial(def: AngleDef, value: number, onChange: (v: number) => void): HTMLElement {
    const row = el("div", "control-row");
    const label = el("label", "control-label", def.label);
    const dial = el("div", "dial");
    dial.tabIndex = 0;
    // Marker is a triangle sitting at the rim pointing inward, its outer
    // corners shaved by the circle — same read as the /matte angle dial.
    const needle = el("div", "dial-hand");
    dial.append(needle);
    const out = el("span", "control-value");

    let angle = value;
    const apply = (a: number, notify: boolean) => {
        angle = ((Math.round(a) % 360) + 360) % 360;
        // The marker rests at 12 o'clock, but 0° means east here (the shaders
        // read the angle through cos/sin), so offset the visual by a quarter turn.
        needle.style.transform = `rotate(${angle + 90}deg)`;
        out.textContent = `${angle}°`;
        if (notify) onChange(angle);
    };
    apply(value, false);

    const fromPointer = (ev: PointerEvent) => {
        const r = dial.getBoundingClientRect();
        const dx = ev.clientX - (r.left + r.width / 2);
        const dy = ev.clientY - (r.top + r.height / 2);
        apply((Math.atan2(dy, dx) * 180) / Math.PI, true);
    };
    dial.addEventListener("pointerdown", (ev) => {
        dial.setPointerCapture(ev.pointerId);
        fromPointer(ev);
        const move = (e: PointerEvent) => fromPointer(e);
        const up = () => {
            dial.removeEventListener("pointermove", move);
            dial.removeEventListener("pointerup", up);
        };
        dial.addEventListener("pointermove", move);
        dial.addEventListener("pointerup", up);
    });
    dial.addEventListener("keydown", (ev) => {
        if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") apply(angle - 5, true);
        else if (ev.key === "ArrowRight" || ev.key === "ArrowUp") apply(angle + 5, true);
        else return;
        ev.preventDefault();
    });

    row.append(label, dial, out);
    return row;
}

export function makeSelect(def: SelectDef, value: number, onChange: (v: number) => void): HTMLElement {
    const row = el("div", "control-row select-row");
    const label = el("label", "control-label", def.label);

    // When every option has artwork (the noise types), show the swatches
    // instead of a dropdown — the pattern is the label.
    const icons = def.options.map((o) => ALGO_ICONS[o.label.toLowerCase()]);
    if (icons.every(Boolean)) {
        const group = el("div", "icon-choice");
        group.setAttribute("role", "radiogroup");
        group.setAttribute("aria-label", def.label);
        def.options.forEach((opt, i) => {
            const btn = el("button", "icon-choice-item");
            btn.type = "button";
            btn.title = opt.label;
            btn.setAttribute("role", "radio");
            btn.setAttribute("aria-label", opt.label);
            btn.setAttribute("aria-checked", String(opt.value === value));
            btn.innerHTML = icons[i];
            btn.addEventListener("click", () => {
                group.querySelectorAll("[role=radio]").forEach((b) => b.setAttribute("aria-checked", "false"));
                btn.setAttribute("aria-checked", "true");
                onChange(opt.value);
            });
            group.append(btn);
        });
        row.append(label, group);
        return row;
    }

    const sel = el("select", "control-select");
    for (const opt of def.options) {
        const o = el("option", undefined, opt.label);
        o.value = String(opt.value);
        if (opt.value === value) o.selected = true;
        sel.append(o);
    }
    sel.addEventListener("change", () => onChange(parseInt(sel.value, 10)));
    row.append(label, sel);
    return row;
}

export function makeSeedRow(def: SeedDef, value: number, onChange: (v: number) => void): HTMLElement {
    const row = el("div", "control-row seed-row");
    const label = el("label", "control-label", "Seed");

    // Icon + number live inside one button: the whole thing is the roll target.
    const btn = el("button", "seed-btn");
    btn.title = "Roll a new seed";
    btn.setAttribute("aria-label", "Roll a new seed");
    const icon = el("span", "seed-icon");
    icon.innerHTML = ICON_RANDOM;
    const num = el("span", "seed-num", String(value));
    btn.append(icon, num);

    btn.addEventListener("click", () => {
        const s = freshSeed();
        num.textContent = String(s);
        onChange(s);
    });
    row.append(label, btn);
    return row;
}

export interface ColorStopsControl {
    el: HTMLElement;
    /** Reflect an external change (palette pick, shuffle) without rebuilding mid-drag. */
    sync(colors: string[]): void;
}

/**
 * Color stops as one joined bar — swatches butt against each other with only
 * the outer corners rounded, so the row reads as a single palette rather than
 * separate chips. Native pickers, × to remove, + to add up to 4, ⇄ to reverse.
 */
export function makeColorStops(colors: string[], onChange: (colors: string[]) => void): ColorStopsControl {
    const wrap = el("div", "color-stops");
    const bar = el("div", "color-bar");
    const tools = el("div", "color-tools");
    wrap.append(bar, tools);
    let current = [...colors];

    const rebuild = () => {
        bar.textContent = "";
        tools.textContent = "";
        current.forEach((hex, i) => {
            const stop = el("div", "color-stop");
            if (i === 0) stop.classList.add("first");
            if (i === current.length - 1) stop.classList.add("last");
            const input = el("input");
            input.type = "color";
            input.value = "#" + hex;
            input.addEventListener("input", () => {
                current[i] = input.value.slice(1);
                onChange([...current]);
            });
            stop.append(input);
            if (current.length > 2) {
                const rm = el("button", "color-remove", "×");
                rm.title = "Remove stop";
                rm.addEventListener("click", () => {
                    current.splice(i, 1);
                    onChange([...current]);
                    rebuild();
                });
                stop.append(rm);
            }
            bar.append(stop);
        });

        if (current.length < 4) {
            const add = el("button", "color-tool", "+");
            add.title = "Add stop";
            add.addEventListener("click", () => {
                current.push(current[current.length - 1]);
                onChange([...current]);
                rebuild();
            });
            tools.append(add);
        }
        const rev = el("button", "color-tool", "⇄");
        rev.title = "Reverse order";
        rev.addEventListener("click", () => {
            current.reverse();
            onChange([...current]);
            rebuild();
        });
        tools.append(rev);
    };
    rebuild();

    return {
        el: wrap,
        sync(next: string[]) {
            if (next.length === current.length) {
                // Same count: just repaint the inputs, leaving the DOM (and any
                // open native picker) alone.
                current = [...next];
                bar.querySelectorAll<HTMLInputElement>('input[type="color"]').forEach((input, i) => {
                    const v = "#" + current[i];
                    if (input.value.toLowerCase() !== v.toLowerCase()) input.value = v;
                });
            } else {
                current = [...next];
                rebuild();
            }
        }
    };
}
