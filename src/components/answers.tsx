"use client";

import NumberFlow from "@number-flow/react";
import clsx from "clsx";
import type { CSSProperties } from "react";
import type { Answer, ChoiceAnswer, NoulAnswer, ScoreAnswer } from "@/lib/subq";
import { humanize } from "./ui";

const percent = { style: "percent", maximumFractionDigits: 0 } as const;

function Bar({ value, strong }: { value: number; strong?: boolean }) {
  return (
    <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-track">
      <div
        className={clsx("bar h-full rounded-full", strong ? "bg-accent" : "bg-bar")}
        style={{ "--p": value } as CSSProperties}
      />
    </div>
  );
}

function Percent({ value }: { value: number }) {
  return <NumberFlow value={value} format={percent} className="tabular-nums" />;
}

function Row({ label, value, strong }: { label: string; value: number; strong: boolean }) {
  return (
    <li className="flex flex-col gap-1.5 text-sm">
      <span className="flex items-baseline justify-between gap-3">
        <span className={clsx("break-words", strong ? "font-medium text-fg" : "text-fg-secondary")}>{label}</span>
        <span className="text-fg-secondary">
          <Percent value={value} />
        </span>
      </span>
      <Bar value={value} strong={strong} />
    </li>
  );
}

function NoulView({ answer }: { answer: NoulAnswer }) {
  const yes = answer.noul >= 0.5;
  return (
    <>
      <p className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight">{yes ? "Yes" : "No"}</span>
        <span className="text-sm text-fg-secondary">
          <Percent value={answer.noul} /> likely yes
        </span>
      </p>
      <Bar value={answer.noul} strong={yes} />
    </>
  );
}

function ChoiceView({ answer, labels }: { answer: ChoiceAnswer; labels?: Record<string, string> }) {
  const rows = Object.entries(answer.probabilities).sort(([, a], [, b]) => b - a);
  return (
    <>
      <p className="text-2xl font-semibold tracking-tight text-balance">{labels?.[answer.choice] ?? humanize(answer.choice)}</p>
      <ul className="flex flex-col gap-2.5">
        {rows.map(([option, probability]) => (
          <Row key={option} label={labels?.[option] ?? humanize(option)} value={probability} strong={option === answer.choice} />
        ))}
      </ul>
    </>
  );
}

function ScoreView({ answer }: { answer: ScoreAnswer }) {
  const levels = Object.keys(answer.legend).length;
  const nearest = answer.legend[String(Math.round(answer.score))];
  return (
    <>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-2xl font-semibold tracking-tight">{nearest}</span>
        <span className="text-sm text-fg-secondary">
          <NumberFlow value={answer.score} format={{ maximumFractionDigits: 2 }} className="tabular-nums" /> on a 0–{levels - 1} scale
        </span>
      </p>
      <ol className="flex flex-col gap-2.5">
        {Object.entries(answer.legend).map(([level, label]) => (
          <Row key={level} label={label} value={answer.probabilities[level] ?? 0} strong={label === nearest} />
        ))}
      </ol>
    </>
  );
}

export function AnswerCard({
  title,
  answer,
  labels,
  index = 0,
}: {
  title: string;
  answer: Answer;
  labels?: Record<string, string>;
  index?: number;
}) {
  return (
    <article
      className="rise flex flex-col gap-3 rounded-2xl bg-raised p-4 ring-1 ring-line"
      style={{ "--i": index } as CSSProperties}
    >
      <header className="flex items-start justify-between gap-3">
        <h3 className="text-sm text-pretty text-fg-secondary">{title}</h3>
        {answer.type !== "noul" && (
          <span className="shrink-0 text-xs whitespace-nowrap text-fg-tertiary">
            <Percent value={answer.confidence} /> sure
          </span>
        )}
      </header>
      {answer.type === "noul" && <NoulView answer={answer} />}
      {answer.type === "choice" && <ChoiceView answer={answer} labels={labels} />}
      {answer.type === "score" && <ScoreView answer={answer} />}
    </article>
  );
}

export function UsageLine({ ms, tokens }: { ms: number; tokens: number }) {
  return (
    <p className="text-xs text-fg-tertiary tabular-nums">
      {ms} ms · {tokens} tokens
    </p>
  );
}
