"use client";

import NumberFlow from "@number-flow/react";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import type { Answer, ChoiceAnswer, NoulAnswer, ScoreAnswer } from "@/lib/subq";
import { humanize } from "./ui";

const percent = { style: "percent", maximumFractionDigits: 0 } as const;

export function Bar({ value, strong }: { value: number; strong?: boolean }) {
  return (
    <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-track">
      <div className={clsx("bar h-full rounded-full", strong ? "bg-solid" : "bg-bar")} style={{ "--p": value } as CSSProperties} />
    </div>
  );
}

function Percent({ value }: { value: number }) {
  return <NumberFlow value={value} format={percent} className="tabular-nums" />;
}

function Row({ label, value, strong }: { label: string; value: number; strong: boolean }) {
  return (
    <li className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className={clsx("break-words", strong ? "font-medium text-fg" : "text-fg-secondary")}>{label}</span>
        <span className="text-fg-secondary">
          <Percent value={value} />
        </span>
      </span>
      <Bar value={value} strong={strong} />
    </li>
  );
}

function Headline({ value, detail }: { value: string; detail?: ReactNode }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="text-xl font-medium tracking-[-0.02em] text-balance">{value}</span>
      {detail && <span className="text-[13px] text-fg-secondary">{detail}</span>}
    </p>
  );
}

function NoulView({ answer }: { answer: NoulAnswer }) {
  return (
    <>
      <Headline
        value={answer.noul >= 0.5 ? "Yes" : "No"}
        detail={
          <>
            <Percent value={answer.noul} /> likely yes
          </>
        }
      />
      <Bar value={answer.noul} strong />
    </>
  );
}

function ChoiceView({ answer, labels }: { answer: ChoiceAnswer; labels?: Record<string, string> }) {
  const rows = Object.entries(answer.probabilities).sort(([, a], [, b]) => b - a);
  return (
    <>
      <Headline value={labels?.[answer.choice] ?? humanize(answer.choice)} />
      <ul className="flex flex-col gap-3">
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
      <Headline
        value={nearest}
        detail={
          <>
            <NumberFlow value={answer.score} format={{ maximumFractionDigits: 2 }} className="tabular-nums" /> of {levels - 1}
          </>
        }
      />
      <ol className="flex flex-col gap-3">
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
    <article className="rise flex flex-col gap-4 rounded-2xl bg-surface p-5" style={{ "--i": index } as CSSProperties}>
      <header className="flex items-baseline justify-between gap-3 text-[13px] text-fg-secondary">
        <h4 className="text-pretty">{title}</h4>
        {answer.type !== "noul" && (
          <span className="shrink-0 whitespace-nowrap">
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
    <span className="text-[13px] text-fg-secondary tabular-nums">
      {ms} ms · {tokens} tokens
    </span>
  );
}
