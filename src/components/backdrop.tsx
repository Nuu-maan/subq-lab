"use client";

import { useEffect, useRef } from "react";
import { activity } from "@/lib/activity";

const VERTEX = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uEnergy;
uniform float uConf;
uniform vec2 uPointer;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * (0.035 + 0.09 * uEnergy);

  vec2 q = vec2(fbm(p * 1.3 + t), fbm(p * 1.3 - t + 3.1));
  vec2 r = vec2(fbm(p * 1.7 + 2.0 * q + vec2(1.7, 9.2) + t * 1.3),
                fbm(p * 1.7 + 2.0 * q + vec2(8.3, 2.8) - t));
  float f = fbm(p * 1.1 + 2.4 * r);

  vec3 deep = vec3(0.022, 0.024, 0.04);
  vec3 violet = vec3(0.46, 0.3, 0.98);
  vec3 signal = mix(vec3(0.98, 0.5, 0.28), vec3(0.22, 0.86, 0.92), smoothstep(0.45, 0.85, uConf));

  vec3 col = deep;
  col = mix(col, violet * 0.62, smoothstep(0.3, 0.85, f) * 0.7);
  col = mix(col, signal * 0.7, smoothstep(0.55, 0.95, length(r)) * (0.4 + 0.45 * uEnergy));
  col += violet * exp(-3.2 * length(p - uPointer)) * 0.08;

  vec2 v = uv - 0.5;
  col *= 1.0 - 1.1 * dot(v, v);
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.022;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

export function Backdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const uRes = uniform("uRes");
    const uTime = uniform("uTime");
    const uEnergy = uniform("uEnergy");
    const uConf = uniform("uConf");
    const uPointer = uniform("uPointer");

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let energy = 0;
    let confidence = activity.get().confidence;
    let frame = 0;
    const startedAt = performance.now();

    const resize = () => {
      canvas.width = Math.round(innerWidth * 0.5);
      canvas.height = Math.round(innerHeight * 0.5);
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw(reduceMotion.matches ? 0 : performance.now());
    };

    const draw = (now: number) => {
      const state = activity.get();
      const settle = reduceMotion.matches ? 1 : 0.04;
      energy += ((state.inFlight > 0 ? 1 : 0) - energy) * settle;
      confidence += (state.confidence - confidence) * settle;
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduceMotion.matches ? 12 : (now - startedAt) / 1000);
      gl.uniform1f(uEnergy, energy);
      gl.uniform1f(uConf, confidence);
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      draw(now);
      frame = requestAnimationFrame(loop);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      if (reduceMotion.matches || document.hidden) draw(0);
      else frame = requestAnimationFrame(loop);
    };

    const onPointer = (event: PointerEvent) => {
      pointer.tx = (event.clientX - innerWidth / 2) / innerHeight;
      pointer.ty = (innerHeight / 2 - event.clientY) / innerHeight;
    };

    const unsubscribe = activity.subscribe(() => {
      if (reduceMotion.matches) draw(0);
    });

    resize();
    start();
    addEventListener("resize", resize);
    addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", start);
    reduceMotion.addEventListener("change", start);

    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", start);
      reduceMotion.removeEventListener("change", start);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 size-full" />;
}
