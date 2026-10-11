"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { activity } from "./activity";
import { certainty, errorMessage, type DecideResponse } from "./subq";

export type DecideResult = {
  id: number;
  status: number;
  ms: number;
  data?: DecideResponse;
  raw: unknown;
  error?: string;
};

let requests = 0;

export async function decide(body: unknown): Promise<DecideResult> {
  const id = ++requests;
  activity.start();
  const started = performance.now();
  try {
    const response = await fetch("/api/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const ms = Number(response.headers.get("X-Upstream-Ms")) || Math.round(performance.now() - started);
    const raw: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      activity.end();
      const detail = (raw as { detail?: { message?: string } } | null)?.detail?.message;
      return { id, status: response.status, ms, raw, error: errorMessage(response.status, detail) };
    }

    const data = raw as DecideResponse;
    const answers = Object.values(data.answers);
    const mean = answers.reduce((sum, answer) => sum + certainty(answer), 0) / Math.max(answers.length, 1);
    activity.finish(ms, data.usage.input_tokens + data.usage.output_tokens, mean);
    return { id, status: response.status, ms, data, raw };
  } catch {
    activity.end();
    return { id, status: 0, ms: 0, raw: null, error: errorMessage(0) };
  }
}

export function useDecide({ toastErrors = true } = {}) {
  const [result, setResult] = useState<DecideResult | null>(null);
  const [pending, setPending] = useState(false);

  const run = useCallback(async (body: unknown) => {
    setPending(true);
    const next = await decide(body);
    setPending(false);
    setResult(next);
    if (next.error && toastErrors) toast.error(next.error, { duration: Infinity });
    return next;
  }, [toastErrors]);

  return { result, pending, run };
}
