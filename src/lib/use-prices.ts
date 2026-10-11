"use client";

import { useSyncExternalStore } from "react";
import type { PriceBook } from "./pc";

export type PriceStatus = {
  book: PriceBook | null;
  refreshing: boolean;
  progress: { done: number; total: number } | null;
  error: string | null;
  stale: boolean;
};

const POLL_MS = 2000;
let snapshot: PriceStatus | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let started = false;
const listeners = new Set<() => void>();

async function load(method: "GET" | "POST" = "GET") {
  try {
    const response = await fetch("/api/prices", { method, cache: "no-store" });
    snapshot = (await response.json()) as PriceStatus;
  } catch {
    snapshot = { book: snapshot?.book ?? null, refreshing: false, progress: null, error: "Unable to reach the price service.", stale: true };
  }
  listeners.forEach((listener) => listener());
  clearTimeout(timer);
  if (snapshot.refreshing) timer = setTimeout(() => load(), POLL_MS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    load();
  }
  return () => {
    listeners.delete(listener);
  };
}

export function usePrices() {
  const status = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => null,
  );
  return { status, refresh: () => load("POST") };
}
