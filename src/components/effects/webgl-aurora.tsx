"use client";

import { useEffect, useRef } from "react";

const VERTEX_SRC = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SRC = `
precision mediump float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uDark;

vec3 warmColor(float t) {
  vec3 base = mix(vec3(1.0, 0.97, 0.92), vec3(0.04, 0.07, 0.12), uDark);
  vec3 amber = vec3(0.98, 0.58, 0.24);
  vec3 ember = vec3(0.90, 0.34, 0.09);
  vec3 low = mix(base, amber, smoothstep(0.0, 1.0, t));
  return mix(low, ember, smoothstep(0.55, 1.0, t));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= uResolution.x / uResolution.y;

  float t = uTime * 0.05;
  float wave = sin(p.x * 1.6 + t * 1.3) * 0.25
    + sin(p.y * 2.1 - t * 0.9) * 0.25
    + sin((p.x + p.y) * 1.2 + t) * 0.2;

  vec2 focus = p + vec2(sin(t * 0.7) * 0.45, cos(t * 0.5) * 0.32);
  float glow = smoothstep(1.3, 0.0, length(focus)) * 0.6;

  float field = clamp(0.5 + wave + glow, 0.0, 1.0);
  vec3 color = warmColor(field);

  float vignette = smoothstep(1.45, 0.15, length(p));
  float alpha = (0.14 + 0.12 * glow) * vignette * mix(1.0, 1.5, uDark);

  gl_FragColor = vec4(color, alpha);
}
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Purely decorative animated background. Silently renders nothing when WebGL,
 * a stable context, or motion is unavailable/unwanted.
 */
export function WebglAurora({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
    });
    if (!gl) return;

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    gl.useProgram(program);

    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const resolutionLoc = gl.getUniformLocation(program, "uResolution");
    const timeLoc = gl.getUniformLocation(program, "uTime");
    const darkLoc = gl.getUniformLocation(program, "uDark");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    let dark = document.documentElement.classList.contains("dark") ? 1 : 0;
    const themeObserver = new MutationObserver(() => {
      dark = document.documentElement.classList.contains("dark") ? 1 : 0;
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.floor(canvas.clientWidth * dpr);
      const height = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    let raf = 0;
    let stopped = false;

    const draw = (timeMs: number) => {
      if (stopped) return;
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, reducedMotion ? 0 : timeMs / 1000);
      gl.uniform1f(darkLoc, dark);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!reducedMotion) raf = requestAnimationFrame(draw);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else if (!reducedMotion) {
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      stopped = true;
      cancelAnimationFrame(raf);
    };
    canvas.addEventListener("webglcontextlost", handleContextLost);

    draw(0);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className ?? "pointer-events-none fixed inset-0 -z-10 h-full w-full"}
    />
  );
}
