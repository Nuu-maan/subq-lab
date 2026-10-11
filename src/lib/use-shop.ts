"use client";

import { useCallback, useRef, useState } from "react";
import { activity } from "./activity";
import type { Grounding } from "./grounding";

export type Step = { id: string; name: string; args: Record<string, unknown>; status: "running" | "done" | "failed"; summary?: string };

export type Turn = {
  id: number;
  question: string;
  steps: Step[];
  answer?: string;
  model?: string;
  check?: Grounding;
  error?: string;
  done: boolean;
};

type Event =
  | { type: "tool_call"; id: string; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; id: string; name: string; ok: boolean; summary: string }
  | { type: "answer"; text: string; model: string }
  | ({ type: "check" } & Grounding)
  | { type: "error"; message: string };

function apply(turn: Turn, event: Event): Turn {
  switch (event.type) {
    case "tool_call":
      return { ...turn, steps: [...turn.steps, { id: event.id, name: event.name, args: event.args, status: "running" }] };
    case "tool_result":
      return {
        ...turn,
        steps: turn.steps.map((step) => (step.id === event.id ? { ...step, status: event.ok ? "done" : "failed", summary: event.summary } : step)),
      };
    case "answer":
      return { ...turn, answer: event.text, model: event.model };
    case "check":
      return { ...turn, check: { prices: event.prices, links: event.links } };
    case "error":
      return { ...turn, error: event.message };
  }
}

let nextTurn = 0;

export function useShop() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const controller = useRef<AbortController | null>(null);

  const update = (id: number, change: (turn: Turn) => Turn) =>
    setTurns((current) => current.map((turn) => (turn.id === id ? change(turn) : turn)));

  const ask = useCallback(
    async (question: string) => {
      const id = ++nextTurn;
      const history = turns.flatMap((turn) =>
        turn.answer ? [{ role: "user" as const, content: turn.question }, { role: "assistant" as const, content: turn.answer }] : [],
      );
      setTurns((current) => [...current, { id, question, steps: [], done: false }]);
      setPending(true);
      activity.start();
      controller.current = new AbortController();

      try {
        const response = await fetch("/api/shop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [...history.slice(-6), { role: "user", content: question }] }),
          signal: controller.current.signal,
        });
        if (!response.ok || !response.body) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          update(id, (turn) => ({ ...turn, error: body?.error ?? "Unable to reach the shopping agent." }));
          return;
        }

        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) if (line.trim()) update(id, (turn) => apply(turn, JSON.parse(line) as Event));
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") update(id, (turn) => ({ ...turn, error: "The connection to the agent dropped. Try again." }));
      } finally {
        update(id, (turn) => ({ ...turn, done: true }));
        setPending(false);
        activity.end();
      }
    },
    [turns],
  );

  const reset = useCallback(() => {
    controller.current?.abort();
    setTurns([]);
  }, []);

  return { turns, pending, ask, reset };
}
