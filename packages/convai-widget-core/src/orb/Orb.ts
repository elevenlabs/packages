import fragmentCode from "./OrbShader.frag?raw";
import vertexCode from "./OrbShader.vert?raw";

const POSITION_LOCATION = 0;
const QUAD_POSITIONS = new Float32Array([
  -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, -1.0,
]);
const PERLIN_NOISE =
  "https://storage.googleapis.com/eleven-public-cdn/images/perlin-noise.png";

export class Orb {
  private static noiseImage: HTMLImageElement;

  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private startTime: number;
  private targetSpeed = 0;
  private speed = 0.5;
  private rafId: number | null = null;
  private resizeObserver?: ResizeObserver;
  private colorA: number[] = [0, 0, 0];
  private colorB: number[] = [0, 0, 0];
  private offsets = new Float32Array(7).map(() => Math.random() * Math.PI * 2);

  public constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      depth: false,
      stencil: false,
    })!;

    this.gl = gl;
    this.program = this.setupProgram(fragmentCode, vertexCode);
    if (import.meta.hot) {
      import.meta.hot.accept("./OrbShader.frag?raw", module => {
        this.program = this.setupProgram(module!.default, vertexCode);
      });
    }

    const noise = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, noise);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([128, 128, 128, 255])
    );
    if (!Orb.noiseImage) {
      Orb.noiseImage = new Image();
      Orb.noiseImage.crossOrigin = "anonymous";
      Orb.noiseImage.src = PERLIN_NOISE;
    }
    if (Orb.noiseImage.complete) {
      this.copyNoiseImage();
    } else {
      Orb.noiseImage.addEventListener("load", this.copyNoiseImage);
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_POSITIONS, gl.STATIC_DRAW);
    gl.vertexAttribPointer(POSITION_LOCATION, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(POSITION_LOCATION);

    this.updateColors("#2792DC", "#9CE6E6");

    this.resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      const size = entry.devicePixelContentBoxSize
        ? entry.devicePixelContentBoxSize[0]
        : entry.contentBoxSize[0];

      canvas.width = Math.min(512, size.inlineSize);
      canvas.height = Math.min(512, size.blockSize);
      this.updateViewport();
    });

    const parent = canvas.parentElement;
    if (parent) {
      try {
        this.resizeObserver.observe(parent, {
          box: "device-pixel-content-box",
        });
      } catch (e) {
        this.resizeObserver.observe(parent);
      }
    }

    this.startTime = performance.now();
    this.rafId = requestAnimationFrame(this.render);
  }

  public dispose() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    this.resizeObserver?.disconnect();
    this.gl = null as unknown as WebGL2RenderingContext;
    this.program = null as unknown as WebGLProgram;
  }

  public updateViewport() {
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  }

  public updateColors(a: string, b: string) {
    if (!this.gl) return;

    this.colorA = this.updateColor("uColor1", a) ?? this.colorA;
    this.colorB = this.updateColor("uColor2", b) ?? this.colorB;
  }

  public updateVolume(input: number, output: number) {
    this.targetSpeed = 0.2 + (1 - Math.pow(output - 1, 2)) * 1.8;
    if (this.targetSpeed > this.speed) {
      this.speed = this.targetSpeed;
    }

    this.gl.uniform1f(
      this.gl.getUniformLocation(this.program, "uInputVolume"),
      input
    );
    this.gl.uniform1f(
      this.gl.getUniformLocation(this.program, "uOutputVolume"),
      output
    );
  }

  private updateColor(name: string, hex: string) {
    try {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      // Convert sRGB to linear to match our Three.js implementation
      const color = [Math.pow(r, 2.2), Math.pow(g, 2.2), Math.pow(b, 2.2)];
      this.gl.uniform3fv(this.gl.getUniformLocation(this.program, name), color);
      return color;
    } catch (e) {
      console.error(`[ConversationalAI] Failed to parse ${hex} as color:`, e);
    }
  }

  private setupProgram(fragmentCode: string, vertexCode: string) {
    const fragment = this.getShader(this.gl.FRAGMENT_SHADER, fragmentCode);
    const vertex = this.getShader(this.gl.VERTEX_SHADER, vertexCode);
    if (!fragment || !vertex) {
      throw new Error("Failed to compile shaders");
    }

    this.program = this.gl.createProgram()!;
    this.gl.attachShader(this.program, fragment);
    this.gl.attachShader(this.program, vertex);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      if (import.meta.env.DEV) {
        console.error(this.gl.getProgramInfoLog(this.program));
      }
      throw new Error("Failed to link program");
    }

    this.gl.useProgram(this.program);
    this.gl.uniform1i(
      this.gl.getUniformLocation(this.program, "uPerlinTexture"),
      0
    );
    this.gl.uniform1fv(
      this.gl.getUniformLocation(this.program, "uOffsets"),
      this.offsets
    );
    this.gl.uniform3fv(
      this.gl.getUniformLocation(this.program, "uColor1"),
      this.colorA
    );
    this.gl.uniform3fv(
      this.gl.getUniformLocation(this.program, "uColor2"),
      this.colorB
    );

    return this.program;
  }

  private getShader(type: GLenum, source: string): WebGLShader | null {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      if (import.meta.env.DEV) {
        console.error(this.gl.getShaderInfoLog(shader));
      }
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private copyNoiseImage = () => {
    if (!this.gl) {
      return;
    }

    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      Orb.noiseImage
    );
    this.gl.generateMipmap(this.gl.TEXTURE_2D);
  };

  public toDataURL = () => {
    return (this.gl.canvas as HTMLCanvasElement).toDataURL("image/png");
  };

  public render = () => {
    if (!this.gl) {
      this.rafId = null;
      return;
    }

    const time = (performance.now() - this.startTime) / 1000;
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "uTime"), time);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    this.rafId = requestAnimationFrame(this.render);
  };
}
