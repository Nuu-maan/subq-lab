import { ripple } from "./ripple";

const GROW = 680;
const HOLD = 140;
const DROPLETS = 28;

type Ghost = { element: HTMLElement; rect: DOMRect };

let running: (() => void) | null = null;

export function finishBubble() {
  running?.();
}

export function captureGhost(panel: HTMLElement): Ghost {
  const rect = panel.getBoundingClientRect();
  const element = panel.cloneNode(true) as HTMLElement;

  const sourceFields = panel.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
  element.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea").forEach((field, i) => {
    if (field.type !== "file") field.value = sourceFields[i]?.value ?? "";
  });
  const sourceCanvases = panel.querySelectorAll("canvas");
  element.querySelectorAll("canvas").forEach((canvas, i) => {
    canvas.getContext("2d")?.drawImage(sourceCanvases[i], 0, 0);
  });
  element.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  element.removeAttribute("id");
  element.setAttribute("aria-hidden", "true");
  element.inert = true;
  Object.assign(element.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${Math.max(rect.height, innerHeight - rect.top)}px`,
    margin: "0",
    zIndex: "15",
    pointerEvents: "none",
    background: "var(--gray-1)",
  });
  document.body.append(element);
  return { element, rect };
}

function layer(styles: Partial<CSSStyleDeclaration>, parent: HTMLElement = document.body) {
  const node = document.createElement("div");
  node.setAttribute("aria-hidden", "true");
  Object.assign(node.style, { position: "fixed", pointerEvents: "none", ...styles });
  parent.append(node);
  return node;
}

function createBubble(cx: number, cy: number, radius: number) {
  const bubble = layer({
    left: `${cx - radius}px`,
    top: `${cy - radius}px`,
    width: `${radius * 2}px`,
    height: `${radius * 2}px`,
    borderRadius: "50%",
    zIndex: "25",
    backdropFilter: "blur(9px) saturate(1.15) brightness(1.03)",
    background:
      "radial-gradient(circle, transparent 56%, oklch(1 0 0 / 0.08) 68%, oklch(1 0 0 / 0.32) 96%, oklch(1 0 0 / 0.5) 100%)",
    boxShadow:
      "inset 0 0 0 1.5px oklch(1 0 0 / 0.7), inset 0 0 0 2.5px oklch(0 0 0 / 0.06), inset -40px -60px 120px oklch(0 0 0 / 0.07), 0 40px 90px -40px oklch(0 0 0 / 0.3)",
    transformOrigin: "center",
  });
  layer(
    {
      position: "absolute",
      inset: "0",
      borderRadius: "50%",
      background:
        "conic-gradient(from 20deg, oklch(0.86 0.09 300 / 0.5), oklch(0.9 0.08 210 / 0.5), oklch(0.92 0.09 140 / 0.5), oklch(0.9 0.09 70 / 0.5), oklch(0.86 0.09 330 / 0.5), oklch(0.86 0.09 300 / 0.5))",
      maskImage: "radial-gradient(circle, transparent 64%, #000 69%, #000 71%, transparent 75%)",
      opacity: "0.55",
    },
    bubble,
  );
  layer(
    {
      position: "absolute",
      left: "16%",
      top: "11%",
      width: "34%",
      height: "20%",
      borderRadius: "50%",
      background: "radial-gradient(ellipse at center, oklch(1 0 0 / 0.85), oklch(1 0 0 / 0) 70%)",
      transform: "rotate(-28deg)",
    },
    bubble,
  );
  layer(
    {
      position: "absolute",
      right: "18%",
      bottom: "14%",
      width: "12%",
      height: "7%",
      borderRadius: "50%",
      background: "radial-gradient(ellipse at center, oklch(1 0 0 / 0.6), oklch(1 0 0 / 0) 70%)",
      transform: "rotate(-28deg)",
    },
    bubble,
  );
  return bubble;
}

function burst(cx: number, cy: number, radius: number) {
  const droplets: Animation[] = [];
  for (let i = 0; i < DROPLETS; i++) {
    const angle = (i / DROPLETS) * Math.PI * 2 + Math.random() * 0.2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (x < -20 || x > innerWidth + 20 || y < -20 || y > innerHeight + 20) continue;
    const size = 4 + Math.random() * 8;
    const drop = layer({
      left: `${x - size / 2}px`,
      top: `${y - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      zIndex: "26",
      background: "radial-gradient(circle at 35% 30%, oklch(1 0 0), oklch(0.86 0.01 230) 70%)",
      boxShadow: "0 0 0 1px oklch(0 0 0 / 0.12), 0 2px 4px oklch(0 0 0 / 0.15)",
    });
    const distance = 40 + Math.random() * 110;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const animation = drop.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${dx * 0.7}px, ${dy * 0.7}px) scale(0.9)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy + 70}px) scale(0.2)`, opacity: 0 },
      ],
      { duration: 600 + Math.random() * 300, easing: "cubic-bezier(0.2, 0.7, 0.4, 1)", fill: "forwards" },
    );
    animation.finished.then(() => drop.remove(), () => drop.remove());
    droplets.push(animation);
    if (i % 3 === 0) ripple.drop(x, y, 0.1, 16);
  }
  ripple.drop(cx, cy, 0.18, 80);
  return droplets;
}

export async function bubbleTransition(ghost: Ghost, tab: HTMLElement, panel: HTMLElement) {
  finishBubble();

  const tabRect = tab.getBoundingClientRect();
  const fromX = tabRect.left + tabRect.width / 2;
  const fromY = tabRect.top + tabRect.height / 2;
  const cx = innerWidth / 2;
  const cy = innerHeight / 2 + 24;
  const radius = Math.min(innerWidth, innerHeight - 64) * 0.46;
  const start = 18 / radius;

  const bubble = createBubble(cx, cy, radius);
  const animations: Animation[] = [];
  const play = (target: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    const animation = target.animate(keyframes, { fill: "forwards", ...options });
    animations.push(animation);
    return animation.finished.catch(() => undefined);
  };

  let cancelled = false;
  const cleanup = () => {
    cancelled = true;
    animations.forEach((animation) => animation.cancel());
    ghost.element.remove();
    bubble.remove();
    running = null;
  };
  running = cleanup;

  const offsetX = fromX - cx;
  const offsetY = fromY - cy;
  [0, 0.25, 0.5, 0.75].forEach((t, i) =>
    setTimeout(() => ripple.drop(fromX + (cx - fromX) * t, fromY + (cy - fromY) * t, 0.06, 30 + 60 * t), i * 150),
  );

  play(ghost.element, [{ filter: "blur(0px)" }, { filter: "blur(2.5px)" }], { duration: GROW, easing: "ease-out" });
  await play(
    bubble,
    [
      { transform: `translate(${offsetX}px, ${offsetY}px) scale(${start})`, opacity: 0.4 },
      { transform: `translate(${offsetX * 0.6}px, ${offsetY * 0.6}px) scale(0.18, 0.2)`, opacity: 1, offset: 0.25 },
      { transform: "translate(0, 0) scale(1.03, 0.97)", offset: 0.82 },
      { transform: "translate(0, 0) scale(0.985, 1.015)", offset: 0.93 },
      { transform: "translate(0, 0) scale(1)" },
    ],
    { duration: GROW, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  );
  if (cancelled) return;

  await play(bubble, [{ transform: "scale(1)" }, { transform: "scale(1.012, 0.99)" }, { transform: "scale(1)" }], {
    duration: HOLD,
    easing: "ease-in-out",
  });
  if (cancelled) return;

  ghost.element.remove();
  burst(cx, cy, radius);
  await Promise.all([
    play(bubble, [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.08)", opacity: 0 }], {
      duration: 170,
      easing: "cubic-bezier(0.23, 1, 0.32, 1)",
    }),
    play(
      panel,
      [
        { transform: "scale(0.985)", filter: "blur(6px)", opacity: 0.4 },
        { transform: "scale(1)", filter: "blur(0px)", opacity: 1 },
      ],
      { duration: 520, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
    ),
  ]);
  if (!cancelled) cleanup();
}
