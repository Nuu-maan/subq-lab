export type Drop = { x: number; y: number; strength: number; radius: number };

const queue: Drop[] = [];
let listener: (() => void) | null = null;

export const ripple = {
  drop(x: number, y: number, strength = 1, radius = 16) {
    queue.push({ x, y, strength, radius });
    if (queue.length > 24) queue.shift();
    listener?.();
  },
  dropAt(element: Element, strength = 1, radius = 28) {
    const rect = element.getBoundingClientRect();
    ripple.drop(rect.left + rect.width / 2, rect.top + rect.height / 2, strength, radius);
  },
  drain(max: number) {
    return queue.splice(0, max);
  },
  listen(callback: () => void) {
    listener = callback;
    return () => {
      listener = null;
    };
  },
};

export function cssColor(value: string): [number, number, number] {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

export function tokenColor(name: string) {
  return cssColor(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
}
