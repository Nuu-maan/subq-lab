"use client";

import { useEffect, useRef } from "react";
import { tokenColor } from "@/lib/ripple";

const VERTEX = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uLevel;
uniform float uSlosh;
uniform float uTime;
uniform vec3 uFill;
uniform vec3 uTrack;
uniform vec3 uShine;

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float px = uRes.y;
  float wave = uSlosh * (sin(uv.y * 6.2 + uTime * 10.0) + 0.45 * sin(uv.y * 15.0 - uTime * 16.0)) * 0.22 * px;
  float edge = uLevel * uRes.x + wave - gl_FragCoord.x;
  float inside = smoothstep(-0.7, 0.7, edge);

  vec3 fill = mix(uFill, uShine, 0.07 * uv.y);
  float meniscus = (1.0 - smoothstep(0.0, 3.0, abs(edge - 2.0))) * inside;

  vec3 color = mix(uTrack, fill, inside);
  color = mix(color, uShine, meniscus * 0.28);
  gl_FragColor = vec4(color, 1.0);
}
`;

export function LiquidGauge({ value, className }: { value: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetRef = useRef(value);
  const kickRef = useRef<() => void>(() => {});

  useEffect(() => {
    targetRef.current = Math.min(Math.max(value, 0), 1);
    kickRef.current();
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) return;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const at = (name: string) => gl.getUniformLocation(program, name);
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const darkScheme = matchMedia("(prefers-color-scheme: dark)");

    let level = reduceMotion.matches ? targetRef.current : 0;
    let velocity = 0;
    let slosh = 0;
    let time = 0;
    let last = 0;
    let frame = 0;

    const paint = () => {
      gl.uniform3fv(at("uFill"), tokenColor("--gray-12"));
      gl.uniform3fv(at("uTrack"), tokenColor("--gray-3"));
      gl.uniform3fv(at("uShine"), tokenColor("--gray-1"));
    };

    const draw = () => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(at("uRes"), canvas.width, canvas.height);
      gl.uniform1f(at("uLevel"), level);
      gl.uniform1f(at("uSlosh"), slosh);
      gl.uniform1f(at("uTime"), time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const tick = (now: number) => {
      const dt = Math.min((now - (last || now)) / 1000, 1 / 30);
      last = now;
      time += dt;
      const force = (targetRef.current - level) * 140;
      velocity = (velocity + force * dt) * Math.exp(-11 * dt);
      level += velocity * dt;
      slosh = Math.min(1, slosh * Math.exp(-3 * dt) + Math.abs(velocity) * dt * 6);
      draw();
      if (Math.abs(targetRef.current - level) < 0.0005 && Math.abs(velocity) < 0.001 && slosh < 0.01) {
        slosh = 0;
        draw();
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    kickRef.current = () => {
      if (reduceMotion.matches) {
        level = targetRef.current;
        draw();
        return;
      }
      if (!frame) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };

    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      draw();
    };

    const onScheme = () => {
      paint();
      draw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    darkScheme.addEventListener("change", onScheme);
    paint();
    resize();
    kickRef.current();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      darkScheme.removeEventListener("change", onScheme);
      kickRef.current = () => {};
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
