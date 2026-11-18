type Landmark = { x: number; y: number; z?: number };

const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_uv;
varying vec2 v_uv;

void main() {
  gl_Position = vec4(a_position.x * 2.0 - 1.0, 1.0 - a_position.y * 2.0, 0.0, 1.0);
  v_uv = vec2(a_uv.x, 1.0 - a_uv.y);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D u_video;
varying vec2 v_uv;

void main() {
  gl_FragColor = texture2D(u_video, v_uv);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Face warp shader failed to compile:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function randomUnit() {
  const value = new Uint32Array(1);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(value);
    return value[0] / 0xffffffff;
  }
  return Math.random();
}

/** Renders a textured 468-landmark mesh with stable, session-local offsets. */
export class FaceWarper {
  readonly canvas = document.createElement("canvas");
  private readonly gl: WebGLRenderingContext | null;
  private readonly program: WebGLProgram | null;
  private readonly buffer: WebGLBuffer | null;
  private readonly texture: WebGLTexture | null;
  private readonly eyeSpread = 0.012 + randomUnit() * 0.014;
  private readonly noseWidth = (randomUnit() - 0.5) * 0.07;
  private readonly jawAngle = (randomUnit() - 0.5) * 0.035;

  constructor() {
    this.gl =
      this.canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
      }) ?? null;
    if (!this.gl) {
      this.program = null;
      this.buffer = null;
      this.texture = null;
      return;
    }

    const vertex = compileShader(this.gl, this.gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compileShader(this.gl, this.gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = this.gl.createProgram();
    if (!vertex || !fragment || !program) {
      this.program = null;
      this.buffer = null;
      this.texture = null;
      return;
    }
    this.gl.attachShader(program, vertex);
    this.gl.attachShader(program, fragment);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error("Face warp program failed to link:", this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      this.program = null;
      this.buffer = null;
      this.texture = null;
      return;
    }

    this.program = program;
    this.buffer = this.gl.createBuffer();
    this.texture = this.gl.createTexture();
    if (!this.buffer || !this.texture) {
      console.error("Face warp could not allocate WebGL resources.");
      return;
    }
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
  }

  render(
    video: HTMLVideoElement,
    faces: Landmark[][],
    triangleIndices: number[],
    width: number,
    height: number
  ): boolean {
    const gl = this.gl;
    if (!gl || !this.program || !this.buffer || !this.texture || gl.isContextLost()) return false;
    if (!triangleIndices.length || video.readyState < 2) return false;

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);

    try {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    } catch (error) {
      console.error("Face warp could not upload the current camera frame.", error);
      return false;
    }
    const sampler = gl.getUniformLocation(this.program, "u_video");
    gl.uniform1i(sampler, 0);

    for (const landmarks of faces) {
      if (landmarks.length < 468) continue;
      const bounds = faceBounds(landmarks);
      const vertices: number[] = [];
      for (let i = 0; i + 2 < triangleIndices.length; i += 3) {
        const a = landmarks[triangleIndices[i]];
        const b = landmarks[triangleIndices[i + 1]];
        const c = landmarks[triangleIndices[i + 2]];
        if (!a || !b || !c) continue;
        for (const point of [a, b, c]) {
          const warped = this.warp(point, landmarks, bounds);
          vertices.push(warped.x, warped.y, point.x, point.y);
        }
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
      const position = gl.getAttribLocation(this.program, "a_position");
      const uv = gl.getAttribLocation(this.program, "a_uv");
      gl.enableVertexAttribArray(position);
      gl.enableVertexAttribArray(uv);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
      gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 4);
    }
    return true;
  }

  dispose() {
    if (!this.gl) return;
    if (this.program) this.gl.deleteProgram(this.program);
    if (this.buffer) this.gl.deleteBuffer(this.buffer);
    if (this.texture) this.gl.deleteTexture(this.texture);
  }

  private warp(point: Landmark, landmarks: Landmark[], bounds: Bounds): Landmark {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const leftEye = midpoint(landmarks[33], landmarks[133]);
    const rightEye = midpoint(landmarks[263], landmarks[362]);
    const leftWeight = gaussian(point, leftEye, width * 0.13, height * 0.09);
    const rightWeight = gaussian(point, rightEye, width * 0.13, height * 0.09);
    const noseWeight = gaussian(point, landmarks[1], width * 0.14, height * 0.18);
    const yPosition = (point.y - bounds.minY) / Math.max(height, 1);
    const side = point.x < centerX ? -1 : 1;

    let x = point.x;
    x += -this.eyeSpread * width * leftWeight + this.eyeSpread * width * rightWeight;
    x += (point.x - landmarks[1].x) * this.noseWidth * noseWeight;
    x += side * this.jawAngle * width * Math.max(0, (yPosition - 0.62) / 0.38);
    return { x, y: point.y };
  }
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function faceBounds(landmarks: Landmark[]): Bounds {
  return landmarks.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxX: Math.max(bounds.maxX, point.x),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  );
}

function midpoint(a: Landmark, b: Landmark): Landmark {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function gaussian(point: Landmark, center: Landmark, radiusX: number, radiusY: number) {
  const dx = (point.x - center.x) / Math.max(radiusX, 1);
  const dy = (point.y - center.y) / Math.max(radiusY, 1);
  return Math.exp(-0.5 * (dx * dx + dy * dy));
}
