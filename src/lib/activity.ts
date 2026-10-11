export type Activity = {
  inFlight: number;
  calls: number;
  totalMs: number;
  tokens: number;
  confidence: number;
};

let current: Activity = { inFlight: 0, calls: 0, totalMs: 0, tokens: 0, confidence: 0.85 };
const listeners = new Set<() => void>();

function set(next: Partial<Activity>) {
  current = { ...current, ...next };
  listeners.forEach((listener) => listener());
}

export const activity = {
  get: () => current,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  start: () => set({ inFlight: current.inFlight + 1 }),
  fail: () => set({ inFlight: current.inFlight - 1 }),
  finish: (ms: number, tokens: number, confidence: number) =>
    set({
      inFlight: current.inFlight - 1,
      calls: current.calls + 1,
      totalMs: current.totalMs + ms,
      tokens: current.tokens + tokens,
      confidence,
    }),
};
