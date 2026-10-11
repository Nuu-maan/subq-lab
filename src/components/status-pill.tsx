"use client";

import NumberFlow from "@number-flow/react";
import clsx from "clsx";
import { useSyncExternalStore } from "react";
import { activity } from "@/lib/activity";

export function StatusPill() {
  const state = useSyncExternalStore(activity.subscribe, activity.get, activity.get);
  const busy = state.inFlight > 0;
  const average = state.calls ? Math.round(state.totalMs / state.calls) : 0;

  return (
    <p className="inline-flex w-fit flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg bg-surface px-2.5 py-1 text-[13px] text-fg-secondary">
      <span aria-hidden="true" className={clsx("size-1.5 rounded-full", busy ? "bg-busy motion-safe:animate-pulse" : "bg-success")} />
      <span className="font-medium text-fg">{busy ? "Thinking…" : "Ready"}</span>
      <span aria-hidden="true">·</span>
      <span className="tabular-nums">
        <NumberFlow value={state.calls} suffix={state.calls === 1 ? " call" : " calls"} />
      </span>
      {state.calls > 0 && (
        <>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            <NumberFlow value={average} suffix=" ms avg" />
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            <NumberFlow value={state.tokens} suffix=" tokens" />
          </span>
        </>
      )}
    </p>
  );
}
