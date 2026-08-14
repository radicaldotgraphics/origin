// rAF loop with speed-scaled time accumulation.
// Changing speed never jumps the animation; speed 0 + no dirty uniforms = idle
// (rAF keeps ticking but no GPU work is issued).

export interface LoopOptions {
    render: (time: number) => void;
    getSpeed: () => number;
    isPaused: () => boolean;
    // Fired once when frame time stays above 20ms — caller drops DPR.
    onSustainedSlow: () => void;
}

export interface Loop {
    markDirty(): void;
    getTime(): number;
    start(): void;
}

export function createLoop(opts: LoopOptions): Loop {
    let time = 0;
    let last = performance.now();
    let dirty = true;
    let ema = 0;
    let slowFrames = 0;
    let slowFired = false;

    function frame(now: number): void {
        requestAnimationFrame(frame);
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        if (document.hidden) return;

        const speed = opts.getSpeed();
        const animating = speed !== 0 && !opts.isPaused();
        if (animating) time += dt * speed;
        if (!animating && !dirty) return; // idle: last frame already on screen

        const t0 = performance.now();
        opts.render(time);
        dirty = false;

        const cost = performance.now() - t0;
        ema = ema === 0 ? cost : ema * 0.9 + cost * 0.1;
        if (!slowFired && animating) {
            slowFrames = ema > 20 ? slowFrames + 1 : 0;
            if (slowFrames > 60) {
                slowFired = true;
                opts.onSustainedSlow();
            }
        }
    }

    return {
        markDirty: () => {
            dirty = true;
        },
        getTime: () => time,
        start: () => {
            last = performance.now();
            requestAnimationFrame(frame);
        }
    };
}
