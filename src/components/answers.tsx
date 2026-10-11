"use client";

import NumberFlow from "@number-flow/react";
import clsx from "clsx";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { ripple } from "@/lib/ripple";
import { certainty, type Answer, type ChoiceAnswer, type NoulAnswer, type ScoreAnswer } from "@/lib/subq";
import { humanize } from "./ui";

const percent = { style: "percent", maximumFractionDigits: 0 } as const;
const SHADES = ["bg-solid", "bg-bar", "bg-track"];

function Percent({ value }: { value: number }) {
  return <NumberFlow value={value} format={percent} className="tabular-nums" />;
}

function Bar({ value }: { value: number }) {
  return (
    <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-track">
      <div className="bar h-full rounded-full bg-solid" style={{ "--p": value } as CSSProperties} />
    </div>
  );
}

function NoulView({ answer }: { answer: NoulAnswer }) {
  const yes = answer.noul >= 0.5;
  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <p className="text-[44px] leading-[0.9] font-medium tracking-[-0.045em]">
          <Percent value={answer.noul} />
        </p>
        <span className={clsx("rounded-lg px-2 py-0.5 text-[13px] font-medium", yes ? "bg-solid text-on-solid" : "bg-canvas text-fg")}>
          {yes ? "Yes" : "No"}
        </span>
      </div>
      <Bar value={answer.noul} />
      <p className="-mt-2 text-[13px] text-fg-secondary">chance the answer is yes</p>
    </>
  );
}

function ChoiceView({ answer, labels }: { answer: ChoiceAnswer; labels?: Record<string, string> }) {
  const rows = Object.entries(answer.probabilities).sort(([, a], [, b]) => b - a);
  const label = (option: string) => labels?.[option] ?? humanize(option);
  return (
    <>
      <p className="text-[22px] leading-tight font-medium tracking-[-0.02em] text-balance">{label(answer.choice)}</p>
      <div aria-hidden="true" className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {rows.map(([option, probability], rank) => (
          <span
            key={option}
            className={clsx("segment rounded-full", SHADES[Math.min(rank, 2)])}
            style={{ "--basis": `${Math.max(probability * 100, 0.8)}%`, "--i": rank } as CSSProperties}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-1.5 text-[13px]">
        {rows.map(([option, probability], rank) => (
          <li key={option} className="flex items-center gap-2">
            <span aria-hidden="true" className={clsx("size-2 shrink-0 rounded-[3px]", SHADES[Math.min(rank, 2)])} />
            <span className={clsx("min-w-0 flex-1 break-words", rank === 0 ? "font-medium text-fg" : "text-fg-secondary")}>{label(option)}</span>
            <span className="text-fg-secondary">
              <Percent value={probability} />
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function ScoreView({ answer }: { answer: ScoreAnswer }) {
  const levels = Object.entries(answer.legend);
  const nearest = answer.legend[String(Math.round(answer.score))];
  const marker = (answer.score + 0.5) / levels.length;
  return (
    <>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-[22px] leading-tight font-medium tracking-[-0.02em]">{nearest}</span>
        <span className="text-[13px] text-fg-secondary">
          <NumberFlow value={answer.score} format={{ maximumFractionDigits: 2 }} className="tabular-nums" /> of {levels.length - 1}
        </span>
      </p>
      <div className="relative">
        <div aria-hidden="true" className="flex h-20 items-end gap-1.5">
          {levels.map(([level, label]) => (
            <span key={level} className="flex h-full flex-1 items-end rounded-md bg-canvas">
              <span
                className={clsx("column w-full rounded-md", label === nearest ? "bg-solid" : "bg-bar")}
                style={{ "--h": Math.max(answer.probabilities[level] ?? 0, 0.04), "--i": Number(level) } as CSSProperties}
              />
            </span>
          ))}
        </div>
        <span aria-hidden="true" className="marker absolute -top-2 -bottom-1 w-px bg-fg" style={{ "--x": marker } as CSSProperties}>
          <span className="absolute -top-1 -left-[3px] size-[7px] rounded-full bg-fg" />
        </span>
      </div>
      <ol className="flex gap-1.5 text-[12px] leading-snug">
        {levels.map(([level, label]) => (
          <li key={level} className={clsx("flex flex-1 flex-col text-center text-balance", label === nearest ? "text-fg" : "text-fg-secondary")}>
            <span>{label}</span>
            <Percent value={answer.probabilities[level] ?? 0} />
          </li>
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
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (ref.current) ripple.dropAt(ref.current, 0.2 + certainty(answer) * 0.35, 40);
    }, index * 90);
    return () => clearTimeout(timer);
  }, [answer, index]);

  return (
    <article ref={ref} className="reveal flex flex-col gap-4 rounded-2xl bg-surface p-5" style={{ "--i": index } as CSSProperties}>
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

export function AnswerGrid({ children }: { children: ReactNode }) {
  return <div className="grid items-start gap-2 sm:grid-cols-2">{children}</div>;
}

export function UsageLine({ ms, tokens }: { ms: number; tokens: number }) {
  return (
    <span className="text-[13px] text-fg-secondary tabular-nums">
      {ms} ms · {tokens} tokens
    </span>
  );
}
