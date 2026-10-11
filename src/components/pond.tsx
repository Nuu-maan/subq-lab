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
uniform float uDark;
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
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

float caustic(vec2 p, float t) {
  vec2 warp = vec2(fbm(p + t * 0.6), fbm(p + vec2(5.2, 1.3) - t * 0.5));
  float n = fbm(p * 1.7 + 2.2 * warp + t * 0.25);
  return pow(1.0 - abs(n * 2.0 - 1.0), 7.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y * 3.2;
  float t = uTime * (0.12 + 0.35 * uEnergy);

  float light = caustic(p, t) * 0.7 + caustic(p * 1.9 + 3.7, t * 1.3) * 0.45;
  float depth = smoothstep(0.35, 0.75, fbm(p * 0.45 + vec2(t * 0.05, 2.0)));
  float ripple = exp(-6.0 * length(p - uPointer * 3.2));

  vec3 calm = mix(vec3(0.62, 0.6, 0.5), vec3(0.5, 0.63, 0.57), smoothstep(0.45, 0.85, uConf));
  vec3 col = mix(calm, calm * vec3(0.62, 0.7, 0.68), depth);
  col += vec3(0.95, 1.0, 0.94) * light * (0.32 + 0.25 * uEnergy + 0.3 * ripple);

  vec3 night = mix(vec3(0.07, 0.09, 0.085), vec3(0.04, 0.06, 0.055), depth);
  night += mix(vec3(0.32, 0.3, 0.24), vec3(0.24, 0.36, 0.32), smoothstep(0.45, 0.85, uConf)) * light * (0.7 + 0.5 * uEnergy + 0.5 * ripple);
  col = mix(col, night, uDark);

  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.035;
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

export function Pond() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl", { antialias: false, powerPreference: "low-power" });
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
    const uDark = uniform("uDark");
    const uPointer = uniform("uPointer");

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const darkScheme = matchMedia("(prefers-color-scheme: dark)");
    const pointer = { x: 9, y: 9, tx: 9, ty: 9 };
    let energy = 0;
    let confidence = activity.get().confidence;
    let frame = 0;
    let visible = true;
    const startedAt = performance.now();

    const draw = (now: number) => {
      const state = activity.get();
      const settle = reduceMotion.matches ? 1 : 0.04;
      energy += ((state.inFlight > 0 ? 1 : 0) - energy) * settle;
      confidence += (state.confidence - confidence) * settle;
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduceMotion.matches ? 20 : (now - startedAt) / 1000);
      gl.uniform1f(uEnergy, energy);
      gl.uniform1f(uConf, confidence);
      gl.uniform1f(uDark, darkScheme.matches ? 1 : 0);
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      draw(now);
      frame = requestAnimationFrame(loop);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      if (reduceMotion.matches || document.hidden || !visible) draw(0);
      else frame = requestAnimationFrame(loop);
    };

    const resize = () => {
      const scale = Math.min(devicePixelRatio, 2) * 0.75;
      canvas.width = Math.round(canvas.clientWidth * scale);
      canvas.height = Math.round(canvas.clientHeight * scale);
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw(reduceMotion.matches ? 0 : performance.now());
    };

    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.tx = (event.clientX - rect.left - rect.width / 2) / rect.height;
      pointer.ty = (rect.height / 2 - (event.clientY - rect.top)) / rect.height;
    };

    const onLeave = () => {
      pointer.tx = 9;
      pointer.ty = 9;
    };

    const sizeObserver = new ResizeObserver(resize);
    const viewObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    const unsubscribe = activity.subscribe(() => {
      if (reduceMotion.matches) draw(0);
    });

    sizeObserver.observe(canvas);
    viewObserver.observe(canvas);
    canvas.addEventListener("pointermove", onPointer);
    canvas.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", start);
    reduceMotion.addEventListener("change", start);
    darkScheme.addEventListener("change", start);

    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
      sizeObserver.disconnect();
      viewObserver.disconnect();
      canvas.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", start);
      reduceMotion.removeEventListener("change", start);
      darkScheme.removeEventListener("change", start);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="feather block aspect-[16/7] w-full bg-[oklch(0.62_0.04_165)] dark:bg-[oklch(0.12_0.01_165)]"
    />
  );
}
