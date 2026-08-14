import { pick } from "../utils/rand";

export interface Palette {
    name: string;
    colors: string[];
}

// Curated 2–4 stop palettes, browsable in the Colors panel and drawn from by
// shuffle. Every entry must look shippable in every preset — if one keeps
// producing ugly shuffles, cut it rather than tuning the presets around it.
export const PALETTES: readonly Palette[] = [
    { name: "Signal", colors: ["0e0e11", "e94560", "f5f0e8"] },
    { name: "Midnight", colors: ["1a1a2e", "16213e", "0f3460", "e94560"] },
    { name: "Terracotta", colors: ["f8f5f0", "e8c4a0", "d97757"] },
    { name: "Harbour", colors: ["0b132b", "1c2541", "3a506b", "5bc0be"] },
    { name: "Primary", colors: ["2d00f7", "ff0054", "ffbd00"] },
    { name: "Ultraviolet", colors: ["10002b", "5a189a", "c77dff", "e0aaff"] },
    { name: "Lagoon", colors: ["001219", "005f73", "94d2bd", "e9d8a6"] },
    { name: "Amber", colors: ["0d1b2a", "fca311", "e5e5e5"] },
    { name: "Slate", colors: ["1b1b1e", "373f51", "58a4b0", "a9bcd0"] },
    { name: "Bloodwood", colors: ["fdf0d5", "c1121f", "780000"] },
    { name: "Ember", colors: ["03071e", "9d0208", "f48c06", "ffba08"] },
    { name: "Dusk", colors: ["22223b", "4a4e69", "9a8c98", "f2e9e4"] },
    { name: "Fern", colors: ["081c15", "2d6a4f", "74c69d", "d8f3dc"] },
    { name: "Magenta", colors: ["10101a", "7209b7", "f72585"] },
    { name: "Newsprint", colors: ["fffcf2", "ccc5b9", "403d39", "252422"] },
    { name: "Deep Water", colors: ["03045e", "0077b6", "00b4d8", "caf0f8"] },
    { name: "Mint", colors: ["232528", "41d3bd", "f2f5ea"] },
    { name: "Flag", colors: ["2b2d42", "8d99ae", "edf2f4", "ef233c"] },
    { name: "Cream", colors: ["ff9f1c", "ffbf69", "fffffc"] },
    { name: "Sunset", colors: ["0f0e17", "ff8906", "f25f4c", "e53170"] },
    { name: "Monochrome", colors: ["000000", "6b6b6b", "ffffff"] },
    { name: "Sepia", colors: ["2b2118", "7f5539", "ddb892", "ede0d4"] },
    { name: "Acid", colors: ["0d0d0d", "d4ff3f", "9ef01a"] },
    { name: "Ice", colors: ["0b1d26", "1b4965", "62b6cb", "bee9e8"] },
    { name: "Peach", colors: ["1d1128", "ff5d8f", "ffa5ab", "ffe0e9"] },
    { name: "Moss", colors: ["12130f", "31572c", "90a955", "ecf39e"] },
    { name: "Oxblood", colors: ["14080e", "4a1c2b", "9e2a2b", "e09f3e"] },
    { name: "Vapour", colors: ["1a0033", "7b2cbf", "00d4ff", "f7f7ff"] },
    { name: "Clay", colors: ["3d2b1f", "a9714b", "d9b08c", "ffcb9a"] },
    { name: "Nordic", colors: ["2e3440", "5e81ac", "88c0d0", "eceff4"] },
    { name: "Highlighter", colors: ["101010", "ff2e63", "08d9d6", "eaeaea"] },
    { name: "Bone", colors: ["1c1c1c", "8d8741", "bc986a", "daad86"] }
];

export function pickPalette(rng: () => number): string[] {
    const p = [...pick(rng, PALETTES).colors];
    if (rng() < 0.3) p.reverse();
    return p;
}
