import { getPreset } from "../presets/index";
import { currentShareURL, state } from "../state";
import { exportFigma } from "../exporters/figma";
import { exportGLSL } from "../exporters/glsl";
import { exportCanvasSnippet } from "../exporters/canvasSnippet";
import { exportThreeJS } from "../exporters/threejs";

interface Tab {
    id: string;
    label: string;
    howTo: string;
    generate: () => string;
}

const tabs: Tab[] = [
    {
        id: "figma",
        label: "Figma",
        howTo:
            "Figma shader fills are built by the Figma agent (WebGPU). Select your layer, open the agent chat, and paste this whole package — prompt and shader together.",
        generate: () => exportFigma(getPreset(state.presetId), state.params, currentShareURL())
    },
    {
        id: "glsl",
        label: "GLSL",
        howTo:
            "Complete GLSL ES 3.00 fragment shader for WebGL2. Provide u_time (seconds) and u_resolution (pixels); everything else is baked in.",
        generate: () => exportGLSL(getPreset(state.presetId), state.params, currentShareURL())
    },
    {
        id: "canvas",
        label: "Canvas",
        howTo:
            "Self-contained HTML — paste into any page. Zero dependencies; the canvas fills its parent and handles resize + retina automatically.",
        generate: () => exportCanvasSnippet(getPreset(state.presetId), state.params, currentShareURL())
    },
    {
        id: "threejs",
        label: "Three.js",
        howTo:
            "ES module exporting createShaderFillMaterial(). Usage example in the header comment — add the material to a quad and call update(dt) per frame.",
        generate: () => exportThreeJS(getPreset(state.presetId), state.params, currentShareURL())
    }
];

export function initExportModal(openBtn: HTMLElement): void {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
        <div class="modal" role="dialog" aria-label="Export">
            <div class="modal-head">
                <div class="modal-tabs">
                    ${tabs.map((t) => `<button class="modal-tab" data-tab="${t.id}">${t.label}</button>`).join("")}
                </div>
                <button class="icon-btn modal-close" aria-label="Close">×</button>
            </div>
            <p class="modal-howto"></p>
            <pre class="modal-code"><code></code></pre>
            <button class="copy-btn">Copy</button>
        </div>`;
    document.body.append(overlay);

    const howto = overlay.querySelector<HTMLElement>(".modal-howto")!;
    const code = overlay.querySelector<HTMLElement>(".modal-code code")!;
    const copyBtn = overlay.querySelector<HTMLButtonElement>(".copy-btn")!;
    let activeTab = tabs[0];

    const show = (tab: Tab) => {
        activeTab = tab;
        overlay.querySelectorAll(".modal-tab").forEach((b) => {
            b.classList.toggle("active", (b as HTMLElement).dataset.tab === tab.id);
        });
        howto.textContent = tab.howTo;
        code.textContent = tab.generate();
        copyBtn.textContent = "Copy";
    };

    overlay.querySelectorAll<HTMLElement>(".modal-tab").forEach((b) => {
        b.addEventListener("click", () => show(tabs.find((t) => t.id === b.dataset.tab)!));
    });
    copyBtn.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(code.textContent ?? "");
            copyBtn.textContent = "Copied ✓";
        } catch {
            copyBtn.textContent = "Copy failed — select manually";
        }
    });

    const close = () => (overlay.hidden = true);
    overlay.querySelector(".modal-close")!.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !overlay.hidden) close();
    });

    openBtn.addEventListener("click", () => {
        overlay.hidden = false;
        show(activeTab);
    });
}
