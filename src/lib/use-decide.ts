"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { activity } from "./activity";
import { certainty, errorMessage, type DecideResponse } from "./subq";

export type DecideResult = {
  status: number;
  ms: number;
  data?: DecideResponse;
  raw: unknown;
  error?: string;
};

export async function decide(body: unknown): Promise<DecideResult> {
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
      activity.fail();
      const detail = (raw as { detail?: { message?: string } } | null)?.detail?.message;
      return { status: response.status, ms, raw, error: errorMessage(response.status, detail) };
    }

    const data = raw as DecideResponse;
    const answers = Object.values(data.answers);
    const mean = answers.reduce((sum, answer) => sum + certainty(answer), 0) / Math.max(answers.length, 1);
    activity.finish(ms, data.usage.input_tokens + data.usage.output_tokens, mean);
    return { status: response.status, ms, data, raw };
  } catch {
    activity.fail();
    return { status: 0, ms: 0, raw: null, error: errorMessage(0) };
  }
}

export function useDecide() {
  const [result, setResult] = useState<DecideResult | null>(null);
  const [pending, setPending] = useState(false);

  const run = useCallback(async (body: unknown) => {
    setPending(true);
    const next = await decide(body);
    setPending(false);
    setResult(next);
    if (next.error) toast.error(next.error, { duration: Infinity });
    return next;
  }, []);

  return { result, pending, run };
}
