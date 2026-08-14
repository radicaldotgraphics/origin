// mulberry32 — small seeded PRNG for constrained randomize
export function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Fresh entropy for seeding a run of the PRNG or the u_seed param
export function freshSeed(): number {
    return Math.floor(Math.random() * 99999) + 1;
}

// Helpers for writing constrained randomize() functions
export function range(rng: () => number, min: number, max: number): number {
    return min + rng() * (max - min);
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
    return arr[Math.floor(rng() * arr.length) % arr.length];
}

export function round2(v: number): number {
    return Math.round(v * 100) / 100;
}
