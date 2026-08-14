// The animated Radical mark, matching /matte and /qrcode.
// Loaded dynamically and last so its weight never delays the tool; the inline
// SVG stays put until the animation is actually on screen, so any failure just
// leaves the static mark.

/** Repaint every fill in the animation to `rgb` (0-1 floats). */
function recolor(node: any, rgb: [number, number, number]): void {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
        node.forEach((n) => recolor(n, rgb));
        return;
    }
    if (node.ty === "fl" && node.c && Array.isArray(node.c.k) && typeof node.c.k[0] === "number") {
        node.c.k = [rgb[0], rgb[1], rgb[2], node.c.k[3] ?? 1];
    }
    Object.values(node).forEach((n) => recolor(n, rgb));
}

/** Current text colour as 0-1 floats, so the mark always matches the type. */
function textColor(el: Element): [number, number, number] {
    const m = getComputedStyle(el).color.match(/\d+(\.\d+)?/g);
    if (!m) return [1, 1, 1];
    return [Number(m[0]) / 255, Number(m[1]) / 255, Number(m[2]) / 255];
}

/** True when a layer paints with the lavender accent rather than the ink colour. */
function isAccentLayer(layer: unknown): boolean {
    let accent = false;
    (function walk(node: any): void {
        if (accent || !node || typeof node !== "object") return;
        if (Array.isArray(node)) {
            node.forEach(walk);
            return;
        }
        if (node.ty === "fl" && node.c && Array.isArray(node.c.k)) {
            const [r, g, b] = node.c.k as number[]; // 0-1 floats
            // Ink is #222 (sums to ~0.4); the accent is a pale lavender (~2.0).
            if (r + g + b > 1.5) accent = true;
        }
        Object.values(node).forEach(walk);
    })(layer);
    return accent;
}

export function initMark(): void {
    const host = document.getElementById("markAnim");
    const mark = document.getElementById("mark");
    if (!host || !mark) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    Promise.all([
        import("../../vendor/lottie-light.js"),
        fetch(new URL("../../vendor/mark.json", import.meta.url)).then((r) => {
            if (!r.ok) throw new Error(`mark.json ${r.status}`);
            return r.json();
        })
    ])
        .then(([mod, data]) => {
            const lottie = (mod as any).default ?? mod;
            // Drop the accent layer here rather than editing the source, which
            // the main site renders too — this page just wants the mono mark.
            data.layers = data.layers.filter((l: unknown) => !isAccentLayer(l));
            // The artwork is #222 ink for the light-themed site; on this dark
            // chrome it would be invisible, so repaint it to the text colour.
            recolor(data.layers, textColor(mark));

            const anim = lottie.loadAnimation({
                container: host,
                renderer: "svg",
                loop: true,
                autoplay: true,
                animationData: data,
                rendererSettings: {
                    // Crop to the artwork's own bounds so the animated mark sits
                    // at the same scale as the static one.
                    viewBoxSize: "191 271 1607 452",
                    preserveAspectRatio: "xMidYMid meet"
                }
            });
            anim.addEventListener("DOMLoaded", () => mark.classList.add("animated"));
        })
        .catch(() => {
            /* static mark stands in */
        });
}
