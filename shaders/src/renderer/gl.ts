// WebGL2 context, fullscreen triangle, program cache.
// Slider changes only touch uniforms — programs compile once per preset.

const VERTEX_SRC = `#version 300 es
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export interface ProgramInfo {
    program: WebGLProgram;
    locs: Map<string, WebGLUniformLocation | null>;
}

export class GLRenderer {
    readonly gl: WebGL2RenderingContext;
    private cache = new Map<string, ProgramInfo>();
    private vertexShader: WebGLShader;

    constructor(public canvas: HTMLCanvasElement) {
        const gl = canvas.getContext("webgl2", {
            antialias: false,
            alpha: false,
            preserveDrawingBuffer: false,
            powerPreference: "high-performance"
        });
        if (!gl) throw new Error("WebGL2 unavailable");
        this.gl = gl;
        this.vertexShader = this.compileShader(gl.VERTEX_SHADER, VERTEX_SRC);
    }

    private compileShader(type: number, source: string): WebGLShader {
        const gl = this.gl;
        const sh = gl.createShader(type)!;
        gl.shaderSource(sh, source);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS) && !gl.isContextLost()) {
            const log = gl.getShaderInfoLog(sh);
            gl.deleteShader(sh);
            throw new Error(`Shader compile failed:\n${log}`);
        }
        return sh;
    }

    // Compile + link a fragment source, cached under `key`.
    getProgram(key: string, fragmentSource: string): ProgramInfo {
        const hit = this.cache.get(key);
        if (hit) return hit;
        const gl = this.gl;
        const frag = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
        const program = gl.createProgram()!;
        gl.attachShader(program, this.vertexShader);
        gl.attachShader(program, frag);
        gl.linkProgram(program);
        gl.deleteShader(frag);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
            const log = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(`Program link failed:\n${log}`);
        }
        const info: ProgramInfo = { program, locs: new Map() };
        this.cache.set(key, info);
        return info;
    }

    loc(info: ProgramInfo, name: string): WebGLUniformLocation | null {
        let l = info.locs.get(name);
        if (l === undefined) {
            l = this.gl.getUniformLocation(info.program, name);
            info.locs.set(name, l);
        }
        return l;
    }

    draw(info: ProgramInfo): void {
        const gl = this.gl;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.useProgram(info.program);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // Called after webglcontextrestored: everything GPU-side is gone.
    invalidate(): void {
        this.cache.clear();
        this.vertexShader = this.compileShader(this.gl.VERTEX_SHADER, VERTEX_SRC);
    }
}
