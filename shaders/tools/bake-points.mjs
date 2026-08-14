// Samples N points from the surfaces of the two header GLBs and bakes them
// into GLSL const arrays (src/presets/swarmPoints.ts). This is the "load the
// GLB into memory" step done at authoring time: the geometry travels inside
// the shader source, so every export stays self-contained and the renderer
// needs no loaders or textures. Re-run after swapping the .glb files. The
// originals are Draco-compressed (this parser doesn't speak Draco), so
// decompress first, then bake:
//
//   npx @gltf-transform/cli copy sphere.glb sphere-raw.glb
//   npx @gltf-transform/cli copy cubes.glb cubes-raw.glb
//   node shaders/tools/bake-points.mjs
//
// Hand-rolled GLB/glTF parsing — only what these files use: embedded BIN
// chunk, float32 VEC3 positions, u16/u32 indices, node TRS transforms.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const N = 160; // points per shape — the per-pixel loop cost in the shader
const SEED = 1337;

function mulberry32(a) {
    return () => {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function parseGLB(path) {
    const buf = readFileSync(path);
    if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${path}: not GLB`);
    let off = 12;
    let json = null, bin = null;
    while (off < buf.length) {
        const len = buf.readUInt32LE(off);
        const type = buf.readUInt32LE(off + 4);
        const chunk = buf.subarray(off + 8, off + 8 + len);
        if (type === 0x4e4f534a) json = JSON.parse(chunk.toString("utf8"));
        else if (type === 0x004e4942) bin = chunk;
        off += 8 + len;
    }
    return { json, bin };
}

function accessorData({ json, bin }, index) {
    const acc = json.accessors[index];
    const bv = json.bufferViews[acc.bufferView];
    const start = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
    const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[acc.type];
    const Ctor = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array }[acc.componentType];
    if (!Ctor) throw new Error(`componentType ${acc.componentType} unsupported`);
    // These files are tightly packed (no byteStride games)
    return new Ctor(bin.buffer, bin.byteOffset + start, acc.count * comps);
}

// column-major 4x4 helpers, only what node transforms need
function composeTRS(t = [0, 0, 0], q = [0, 0, 0, 1], s = [1, 1, 1]) {
    const [x, y, z, w] = q;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    return [
        (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
        (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
        (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
        t[0], t[1], t[2], 1
    ];
}
const mmul = (a, b) => {
    const o = new Array(16).fill(0);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
        for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return o;
};
const xform = (m, [x, y, z]) => [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14]
];

// Gather world-space triangles from every mesh node in the default scene.
function triangles(glb) {
    const { json } = glb;
    const tris = [];
    const visit = (nodeIndex, parent) => {
        const node = json.nodes[nodeIndex];
        const local = node.matrix ?? composeTRS(node.translation, node.rotation, node.scale);
        const world = mmul(parent, local);
        if (node.mesh !== undefined) {
            for (const prim of json.meshes[node.mesh].primitives) {
                const pos = accessorData(glb, prim.attributes.POSITION);
                const idx = prim.indices !== undefined ? accessorData(glb, prim.indices) : null;
                const count = idx ? idx.length : pos.length / 3;
                for (let i = 0; i < count; i += 3) {
                    const tri = [];
                    for (let k = 0; k < 3; k++) {
                        const vi = idx ? idx[i + k] : i + k;
                        tri.push(xform(world, [pos[vi * 3], pos[vi * 3 + 1], pos[vi * 3 + 2]]));
                    }
                    tris.push(tri);
                }
            }
        }
        (node.children ?? []).forEach((c) => visit(c, world));
    };
    const scene = json.scenes[json.scene ?? 0];
    const I = composeTRS();
    scene.nodes.forEach((n) => visit(n, I));
    return tris;
}

// Area-weighted surface sampling — the MeshSurfaceSampler recipe.
function samplePoints(tris, n, rng) {
    const areas = tris.map(([a, b, c]) => {
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        const cx = u[1] * v[2] - u[2] * v[1];
        const cy = u[2] * v[0] - u[0] * v[2];
        const cz = u[0] * v[1] - u[1] * v[0];
        return Math.hypot(cx, cy, cz) / 2;
    });
    const cum = [];
    let total = 0;
    for (const a of areas) cum.push(total += a);
    const pts = [];
    for (let i = 0; i < n; i++) {
        const r = rng() * total;
        let lo = 0, hi = cum.length - 1;
        while (lo < hi) { const mid = (lo + hi) >> 1; cum[mid] < r ? (lo = mid + 1) : (hi = mid); }
        const [a, b, c] = tris[lo];
        let u = rng(), v = rng();
        if (u + v > 1) { u = 1 - u; v = 1 - v; }
        pts.push([0, 1, 2].map((k) => a[k] + u * (b[k] - a[k]) + v * (c[k] - a[k])));
    }
    return pts;
}

// Normalise into a shared unit-ish space: centre at origin, max radius 1.
function normalise(pts) {
    const c = [0, 1, 2].map((k) => pts.reduce((s, p) => s + p[k], 0) / pts.length);
    let r = 0;
    for (const p of pts) r = Math.max(r, Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]));
    return pts.map((p) => [0, 1, 2].map((k) => (p[k] - c[k]) / r));
}

// Random surface sampling clumps (Poisson noise) and the projected form reads
// ragged. Farthest-point selection from a large candidate pool gives blue-
// noise-ish coverage, so the silhouette assembles cleanly from few points.
function farthestPoints(pool, n) {
    const picked = [pool[0]];
    const dist = pool.map((p) => Infinity);
    while (picked.length < n) {
        const last = picked[picked.length - 1];
        let bestI = 0, bestD = -1;
        for (let i = 0; i < pool.length; i++) {
            const p = pool[i];
            const d = (p[0] - last[0]) ** 2 + (p[1] - last[1]) ** 2 + (p[2] - last[2]) ** 2;
            if (d < dist[i]) dist[i] = d;
            if (dist[i] > bestD) { bestD = dist[i]; bestI = i; }
        }
        picked.push(pool[bestI]);
    }
    return picked;
}

const rng = mulberry32(SEED);
const shapes = ["sphere", "cubes"].map((name) => {
    const glb = parseGLB(resolve(here, `${name}-raw.glb`)); // draco originals decompressed via gltf-transform
    const tris = triangles(glb);
    const pts = normalise(farthestPoints(samplePoints(tris, N * 40, rng), N));
    console.log(`${name}.glb: ${tris.length} tris -> ${N} points`);
    return pts;
});

const fmt = (p) => `vec3(${p.map((v) => v.toFixed(4)).join(", ")})`;
const arr = (name, pts) =>
    `const vec3 ${name}[PT_COUNT] = vec3[PT_COUNT](\n    ${pts.map(fmt).join(",\n    ")}\n);`;

writeFileSync(resolve(here, "../src/presets/swarmPoints.ts"), `// Generated by shaders/tools/bake-points.mjs — do not edit by hand.
// Surface samples of tools/sphere.glb and tools/cubes.glb (N=${N}, seed ${SEED}).
export const SWARM_POINTS_GLSL = /* glsl */ \`
#define PT_COUNT ${N}
${arr("PTS_A", shapes[0])}
${arr("PTS_B", shapes[1])}
\`;
`);
console.log("wrote src/presets/swarmPoints.ts");
