import { resolve } from "node:path";

// Sub-project config, run from the repo root with:
//   vite build --config shaders/vite.config.js
// Same pattern as the root site: production output lands in this folder
// (index.html rewritten, hashed bundle in shaders/assets/). Never empty it.
export default {
    root: resolve(__dirname),
    base: "./",
    build: {
        outDir: "./",
        emptyOutDir: false
    }
};
