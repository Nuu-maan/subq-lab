"use client";

import NumberFlow from "@number-flow/react";
import { useSyncExternalStore } from "react";
import { activity } from "@/lib/activity";

export function SessionStats() {
  const state = useSyncExternalStore(activity.subscribe, activity.get, activity.get);
  const average = state.calls ? Math.round(state.totalMs / state.calls) : 0;

  const stats = [
    { label: "Calls", value: state.calls, suffix: "" },
    { label: "Avg latency", value: average, suffix: " ms" },
    { label: "Tokens", value: state.tokens, suffix: "" },
  ];

  return (
    <dl className="flex gap-6 text-sm" aria-label="This session">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col">
          <dt className="text-xs text-fg-tertiary">{stat.label}</dt>
          <dd className="font-medium tabular-nums">
            <NumberFlow value={stat.value} suffix={stat.suffix} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
