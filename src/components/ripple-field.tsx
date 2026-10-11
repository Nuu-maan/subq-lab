"use client";

import { useEffect, useRef } from "react";
import { activity } from "@/lib/activity";
import { ripple, tokenColor } from "@/lib/ripple";

const MAX_DROPS = 8;
const SIM_SCALE = 0.25;
const IDLE_AFTER_MS = 7000;

const VERTEX = `#version 300 es
in vec2 position;
out vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const SIMULATE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform float uAspect;
uniform vec4 uDrops[${MAX_DROPS}];
uniform int uDropCount;

void main() {
  vec4 state = texture(uState, vUv);
  float sum = texture(uState, vUv + vec2(uTexel.x, 0.0)).r
            + texture(uState, vUv - vec2(uTexel.x, 0.0)).r
            + texture(uState, vUv + vec2(0.0, uTexel.y)).r
            + texture(uState, vUv - vec2(0.0, uTexel.y)).r;
  float next = (sum * 0.5 - state.g) * 0.972;
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    if (i >= uDropCount) break;
    vec2 d = (vUv - uDrops[i].xy) * vec2(uAspect, 1.0);
    next += uDrops[i].w * exp(-dot(d, d) / (uDrops[i].z * uDrops[i].z));
  }
  outColor = vec4(next, state.r, 0.0, 1.0);
}`;

const RENDER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform float uDpr;
uniform vec3 uBg;
uniform vec3 uDot;
uniform vec3 uShade;

void main() {
  float hl = texture(uState, vUv - vec2(uTexel.x, 0.0)).r;
  float hr = texture(uState, vUv + vec2(uTexel.x, 0.0)).r;
  float hd = texture(uState, vUv - vec2(0.0, uTexel.y)).r;
  float hu = texture(uState, vUv + vec2(0.0, uTexel.y)).r;
  vec2 grad = vec2(hr - hl, hu - hd);

  vec2 px = gl_FragCoord.xy / uDpr + grad * 90.0;
  vec2 cell = mod(px, 22.0) - 11.0;
  float dotMask = 1.0 - smoothstep(0.6, 1.3, length(cell));
  vec3 col = mix(uBg, uDot, dotMask);

  vec3 normal = normalize(vec3(-grad * 7.0, 1.0));
  vec3 light = normalize(vec3(-0.45, 0.55, 0.7));
  float lambert = dot(normal, light) - light.z;
  vec3 lit = min(uBg + vec3(0.14), vec3(1.0));
  col = mix(col, lambert > 0.0 ? lit : uShade, clamp(abs(lambert) * 1.4, 0.0, 0.2));

  float glint = pow(max(dot(reflect(-light, normal), vec3(0.0, 0.0, 1.0)), 0.0), 90.0);
  float rest = pow(max(dot(reflect(-light, vec3(0.0, 0.0, 1.0)), vec3(0.0, 0.0, 1.0)), 0.0), 90.0);
  col += max(glint - rest, 0.0) * 0.18;

  outColor = vec4(col, 1.0);
}`;

function program(gl: WebGL2RenderingContext, fragment: string) {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };
  const result = gl.createProgram()!;
  gl.attachShader(result, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(result, compile(gl.FRAGMENT_SHADER, fragment));
  gl.bindAttribLocation(result, 0, "position");
  gl.linkProgram(result);
  return gl.getProgramParameter(result, gl.LINK_STATUS) ? result : null;
}

function target(gl: WebGL2RenderingContext, width: number, height: number) {
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const framebuffer = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return { texture, framebuffer };
}

function installInteractions(signal: AbortSignal) {
  let last = { x: -999, y: -999 };

  addEventListener(
    "pointerdown",
    (event) => ripple.drop(event.clientX, event.clientY, event.pointerType === "touch" ? 0.7 : 0.5, 12),
    { signal, passive: true, capture: true },
  );

  addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse") return;
      if (Math.hypot(event.clientX - last.x, event.clientY - last.y) < 18) return;
      last = { x: event.clientX, y: event.clientY };
      ripple.drop(event.clientX, event.clientY, 0.035, 8);
    },
    { signal, passive: true },
  );

  addEventListener(
    "input",
    (event) => {
      const field = event.target;
      if (!(field instanceof HTMLTextAreaElement || (field instanceof HTMLInputElement && field.type !== "range"))) return;
      const rect = field.getBoundingClientRect();
      ripple.drop(rect.left + 12 + Math.random() * (rect.width - 24), rect.bottom + 2, 0.18, 8);
    },
    { signal, capture: true },
  );

  let pulse = 0;
  const unsubscribe = activity.subscribe(() => {
    const busy = activity.get().inFlight > 0;
    if (busy && !pulse) {
      const emit = () => {
        const button = document.querySelector('button[aria-busy="true"]');
        if (button) ripple.dropAt(button, 0.35, 18);
      };
      emit();
      pulse = window.setInterval(emit, 520);
    } else if (!busy && pulse) {
      clearInterval(pulse);
      pulse = 0;
    }
  });

  signal.addEventListener("abort", () => {
    unsubscribe();
    clearInterval(pulse);
  });
}

export function RippleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "low-power" });
    const controller = new AbortController();
    if (!gl) return;

    const simulate = program(gl, SIMULATE);
    const render = program(gl, RENDER);
    const canSimulate = Boolean(gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float"));
    if (!simulate || !render) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const at = (p: WebGLProgram, name: string) => gl.getUniformLocation(p, name);
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const darkScheme = matchMedia("(prefers-color-scheme: dark)");

    let targets: ReturnType<typeof target>[] = [];
    let simWidth = 1;
    let simHeight = 1;
    let frame = 0;
    let running = false;
    let lastDropAt = 0;
    let palette = { bg: [1, 1, 1], dot: [0.9, 0.9, 0.9], shade: [0.7, 0.7, 0.7] };

    const readPalette = () => {
      palette = {
        bg: tokenColor("--gray-1"),
        dot: tokenColor("--gray-4"),
        shade: darkScheme.matches ? [0, 0, 0] : tokenColor("--gray-8"),
      };
    };

    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      canvas.width = Math.round(innerWidth * dpr);
      canvas.height = Math.round(innerHeight * dpr);
      simWidth = Math.max(2, Math.round(innerWidth * SIM_SCALE));
      simHeight = Math.max(2, Math.round(innerHeight * SIM_SCALE));
      targets.forEach(({ texture, framebuffer }) => {
        gl.deleteTexture(texture);
        gl.deleteFramebuffer(framebuffer);
      });
      targets = canSimulate ? [target(gl, simWidth, simHeight), target(gl, simWidth, simHeight)] : [];
      draw();
    };

    const step = (drops: { x: number; y: number; strength: number; radius: number }[]) => {
      const [read, write] = targets;
      gl.useProgram(simulate);
      gl.viewport(0, 0, simWidth, simHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read.texture);
      gl.uniform1i(at(simulate, "uState"), 0);
      gl.uniform2f(at(simulate, "uTexel"), 1 / simWidth, 1 / simHeight);
      gl.uniform1f(at(simulate, "uAspect"), innerWidth / innerHeight);
      const packed = new Float32Array(MAX_DROPS * 4);
      drops.forEach((drop, i) => {
        packed.set([drop.x / innerWidth, 1 - drop.y / innerHeight, drop.radius / innerHeight, drop.strength], i * 4);
      });
      gl.uniform4fv(at(simulate, "uDrops"), packed);
      gl.uniform1i(at(simulate, "uDropCount"), drops.length);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      targets = [write, read];
    };

    const draw = () => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(render);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, targets[0]?.texture ?? null);
      gl.uniform1i(at(render, "uState"), 0);
      gl.uniform2f(at(render, "uTexel"), 1 / simWidth, 1 / simHeight);
      gl.uniform1f(at(render, "uDpr"), Math.min(devicePixelRatio, 2));
      gl.uniform3fv(at(render, "uBg"), palette.bg);
      gl.uniform3fv(at(render, "uDot"), palette.dot);
      gl.uniform3fv(at(render, "uShade"), palette.shade);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      const drops = ripple.drain(MAX_DROPS);
      if (drops.length) lastDropAt = now;
      step(drops);
      step([]);
      draw();
      if (now - lastDropAt > IDLE_AFTER_MS) {
        running = false;
        return;
      }
      frame = requestAnimationFrame(loop);
    };

    const wake = () => {
      if (reduceMotion.matches || !canSimulate) {
        ripple.drain(Infinity);
        return;
      }
      lastDropAt = performance.now();
      if (!running && !document.hidden) {
        running = true;
        frame = requestAnimationFrame(loop);
      }
    };

    const onScheme = () => {
      readPalette();
      draw();
    };

    readPalette();
    resize();
    installInteractions(controller.signal);
    const unlisten = ripple.listen(wake);
    addEventListener("resize", resize, { signal: controller.signal });
    darkScheme.addEventListener("change", onScheme, { signal: controller.signal });

    return () => {
      controller.abort();
      unlisten();
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 size-full" />;
}
