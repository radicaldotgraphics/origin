# Radical: Shader Studio — radical.graphics/shaders

Animated procedural fills for designers with zero shader knowledge: pick a
preset, drag sliders, export. Live WebGL2 preview, full state in the URL, no
accounts, no backend. Every preset animates — `u_time` is live, and the Speed
slider scales it (0 freezes).

Type (field gothic via Typekit `tok0jjl`) and the animated Lottie mark follow
/matte and /qrcode. `vendor/` holds copies of the site's canonical
`lottie-light.js` and `data.json` because the Vite root is `shaders/` and can't
reach above it — re-run `vendor/sync.sh` if either changes upstream. Lottie is
dynamically imported, so it lands in a lazy chunk rather than the main bundle.

## Reference-ported presets

Presets built from real external sources rather than designed from scratch.
Each reference technique is kept as its **own** preset — they look related at
a glance but are different machines, and collapsing them into one would lose
what makes each work:

- **Swarm** — *currently unregistered* (see `presets/index.ts`). It baked real
  `.glb` geometry into GLSL via `tools/bake-points.mjs`, but at 160 particles it
  was the most expensive preset in the set (4.1ms vs 0.6ms for a cheap one) and
  a per-pixel particle loop cannot scale to the density the effect really wants
  — 50x more particles would be ~200ms/frame. That density needs GPU vertex
  rendering (one draw per particle), not per-pixel iteration. The files are
  still on disk if it's ever wanted back; re-add the import and array entry.
- **Kodachrome** — the canvas 2D "many low-alpha blobs + `color-dodge`
  compositing, accumulated over thousands of frames" trick behind a lot of
  generative site backgrounds. No persistent framebuffer here either, so it
  reproduces the *optical signature* directly: ~20 fbm-warped soft blobs
  composited in one pass with the real color-dodge formula
  (`dodge(base,blend) = base/(1-blend)`), weighted so one hue dominates the
  core rather than round-robining evenly. The failure mode worth knowing:
  a handful of *strong* dodge layers saturates a channel almost instantly for
  any reasonably saturated colour — many *gentle* layers is what the
  technique actually depends on.
- **Skein** — glowing flow-line/light-trail art. Contours of a scalar field are
  valid streamlines of that field's curl, so instead of marching particles it
  extracts sparse iso-contours of a domain-warped fbm and renders each as a
  soft glowing thread. Note the thread width is deliberately *not* normalised
  by `fwidth()`: fbm's derivative swings hard with position, which made threads
  flicker between hairline and invisible.
- **Sparkler** — long-exposure light trails. Particles drag trails behind them
  along analytic wandering paths, grouped into ribbons of near-parallel hairs.
  A **Decay** slider covers both asks: 0 draws an even line, 1 fades to a comet
  tail. Note `pow(max(1.0 - age, 1e-4), 2.2)` — the guard is load-bearing, see
  below.
- **Overspray** — airbrush/spray-paint stencil, a different *medium* from every
  other preset: stipple density along a shape's SDF boundary rather than a
  filled or gradient field. Droplets are soft round dots with jitter and
  varying radius — a binary `step()` over a grid reads as dither, not spray.

## Performance

Measured with `gl.readPixels` forcing pipeline completion, 800x600, headless
software rendering (relative costs are what matter, real GPUs are far faster):

| preset | ms/frame |
|---|---|
| Skein, Voronoi, Fibonacci | 0.6 |
| Lava Lamp (20 blobs) | 0.9 |
| Haze | 1.5 |
| Kodachrome | 2.6 |
| Sparkler | 3.0 |

Sparkler is the most expensive and was ~3x worse before optimisation: each
hair in a ribbon re-marched the whole path. Since the hairs are parallel, the
centreline is now marched **once** per ribbon and the hairs are derived from
that single distance — `bundles x hairs x steps` became `bundles x steps`.

## Gotcha: pow(0.0, y) returns NaN

Sparkler rendered **pure black** for a long debugging session despite compiling
cleanly, throwing no errors, and having correct geometry. The cause: at the
last trail step `age` is exactly 1.0, so `pow(1.0 - age, 2.2)` evaluated
`pow(0.0, 2.2)`, which this driver returns as NaN — and a single NaN poisons
the whole accumulator, so every pixel came out black.

If a shader compiles but renders black, suspect NaN before suspecting the
maths. The fastest way to localise it is to output an intermediate as colour
(iteration count, min distance) rather than reasoning about it: that
immediately showed the loop was running and distances were correct, which
narrowed it to the one term that could produce NaN. Guard any `pow()` whose
base can reach exactly zero.

## Tessellation

Zellige (Moroccan star-and-cross), Penrose, Seigaiha, Quilt, Labyrinth and
Honeycomb. Penrose is worth a note: it sums N plane waves at evenly spread
angles, and with an odd N the resulting 2N-fold symmetry cannot tile
periodically — a genuinely aperiodic field for the cost of a short cosine loop,
rather than an actual Penrose tile solver.

## Panel layout

The right column is two panes. **Controls** (colours, palettes, params) sits on
top and starts collapsed, with play/shuffle in its header so transport works
without expanding. **Presets** sits below, scrolls internally, and never
collapses — expanding Controls just moves it down. With 24 presets this is the
difference between the params being reachable and being buried.

## Customization surface

- **37 presets** in five groups: Gradient, Organic, Geometric, Tessellation,
  Optical. Display
  names are evocative rather than technical (Patchouli, Carrara, Ben Day…); the
  `description` field carries the technical meaning. **Preset `id`s are frozen**
  — they're the URL contract, so renaming a preset never breaks a shared link.
- **Three styles per preset** — each family shows its own range in the grid
  (defaults plus two alternates that push its characteristic parameters), so a
  preset isn't judged by one frozen thumbnail. Defined centrally in
  `presets/variants.ts`; the styles are unnamed by design.
- **Live preset thumbnails** — all 96 tiles re-render in the current palette
  whenever colours change (debounced 120ms). One scratch WebGL context draws
  each tile and is blitted into per-tile 2D canvases; blitting rather than
  `toDataURL` is what keeps a full-grid re-render cheap.
- **Colors** — 2–4 individually editable stops shown as one joined bar (equal
  slices, no gaps, outer corners only), plus a browsable bank of 32 named
  palettes drawn as hard-edged blocks rather than blends.
  The palette is a **standalone working set**: switching preset keeps your
  colours (`selectPreset()` in `state.ts`), so the result matches the thumbnail
  you clicked. Only Shuffle deliberately rerolls colours.
- **Blend mode** — Kodachrome picks its compositing mode from four icon
  buttons (`algo-icons/blend[n]-icon.svg`) instead of a dodge-only slider. The
  icons are pathfinder-style overlapping circles and the *lens colour* is the
  key: white lens = lightening (Color dodge / Screen), grey = contrast mix
  (Overlay), black = darkening (Color burn). `blendPixel()` in `common.glsl`
  also implements soft-light, linear-dodge(add) and multiply — they're one
  `#define` away if a preset wants them, but Screen beat soft-light and Add,
  and Burn covered Multiply. Compile-time like the noise type, so no per-pixel
  branch. Each mode gets a different **base tone** (dark for lightening modes,
  light for darkening, neutral for contrast) — otherwise overlay and burn just
  render black on Kodachrome's near-black canvas.
- **Noise type** — value, gradient, ridged, billow, or cellular, swappable on
  any fbm-based preset. This is a compile-time `#define`, so the octave loop
  never branches; each variant is a separately cached program.
- **Per-family params** — scale, speed, warp, detail/octaves, grain, angle,
  and whatever else the family needs (vein density, segment count, dither
  levels…), capped at roughly 8–10 visible controls.
- **Shuffle** draws from constrained per-preset ranges, so every roll should
  look shippable.

## Export targets

- **Figma** — an agent-ready package. Figma's shader fills (Config 2026) run on
  WebGPU/WGSL and are created through the Figma agent; there's no raw-code
  paste path, so the export is a porting brief + fully baked GLSL for the agent.
- **GLSL** — complete `#version 300 es` fragment shader, params baked to
  consts, only `u_time` / `u_resolution` live.
- **Canvas** — self-contained HTML snippet (canvas + ~60-line boot), zero deps.
- **Three.js** — ES module exporting `createShaderFillMaterial()`
  (RawShaderMaterial, GLSL3).

## Architecture

Vite + vanilla TypeScript sub-project sharing the root repo's node_modules.
Raw WebGL2, one fullscreen triangle, one cached program per preset — slider
moves only touch uniforms, recompiles happen only on preset switch.
Presets live in `src/presets/` (definition + fragment source per family;
shared noise/ramp/grain library in `common.glsl`). State is a plain object +
tiny pub/sub in `src/state.ts`; the URL is hydrated on load and rewritten
(throttled) on change. **Preset ids and param keys are permanent** — renames
need an alias in the URL parser.

## Commands (from the repo root)

- `npm run dev:shaders` — dev server
- `npm run build` — builds the root site, then this tool (CI runs this)

The committed `shaders/index.html` is the *source* (references `src/main.ts`);
the Pages workflow's build rewrites it in the deploy artifact. Don't commit a
built `index.html` here — a rebuild would then bundle the previous bundle.
A local `npm run build` **will** rewrite it in place; restore it afterwards
with `git checkout shaders/index.html`. (`shaders/assets/` is gitignored for
the same reason.)

## QA hooks

- `?qa=1` — compiles every preset + its baked export shader, writes
  PASS/FAIL into a hidden `#qa` element and the document title.
- `?shot=<presetId>` — chrome hidden, preset defaults, paused at t=0 for
  deterministic screenshots. With `?p=…` params present, the hydrated URL
  state is rendered instead.
