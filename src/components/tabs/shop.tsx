"use client";

import clsx from "clsx";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Button, Chip, Label, LiveStatus, Panel, SectionLabel, Split, TaskHeader, Waiting, fieldClass, humanize } from "@/components/ui";
import { linkKey, type Grounding } from "@/lib/grounding";
import { ripple } from "@/lib/ripple";
import { useShop, type Step, type Turn } from "@/lib/use-shop";

const EXAMPLES = ["Cheapest RTX 5060 right now", "27-inch 1440p monitor under ₹20,000", "Wireless gaming mouse under ₹3,000"];

const TOKEN = new RegExp(
  [
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/.source,
    /(https?:\/\/[^\s<>()\]"']+)/.source,
    /\*\*([^*]+)\*\*/.source,
    /((?:₹|Rs\.?\s?|INR\s?)\s?(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?)/.source,
  ].join("|"),
  "g",
);

function storeLabel(url: string) {
  if (/amazon\.in/i.test(url)) return "Amazon.in";
  if (/flipkart\.com/i.test(url)) return "Flipkart";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Unverified({ children, note }: { children: ReactNode; note: string }) {
  return (
    <span className="text-danger underline decoration-dotted underline-offset-4" title={note}>
      {children}
      <span className="sr-only"> ({note})</span>
    </span>
  );
}

function Inline({ text, check }: { text: string; check?: Grounding }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    const [whole, label, labelledUrl, bareUrl, bold, price] = match;
    const url = (labelledUrl ?? bareUrl)?.replace(/[.,;:!?]+$/, "");

    if (url) {
      const verified = check?.links.some((link) => linkKey(link.url) === linkKey(url) && link.verified) ?? true;
      const anchor = (
        <a href={url} target="_blank" rel="noreferrer" className="font-medium underline decoration-bar underline-offset-4 hover:decoration-fg">
          {label ?? `View on ${storeLabel(url)}`}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      );
      parts.push(verified ? <span key={index}>{anchor}</span> : <Unverified key={index} note="link not in tool results">{anchor}</Unverified>);
      if (bareUrl && bareUrl.length > url.length) parts.push(bareUrl.slice(url.length));
    } else if (bold) {
      parts.push(
        <strong key={index} className="font-medium text-fg">
          {bold}
        </strong>,
      );
    } else if (price) {
      const amount = Number(price.replace(/[^\d.]/g, "").replace(/\.\d+$/, ""));
      const verified = check?.prices.some((entry) => entry.amount === amount && entry.verified) ?? true;
      parts.push(
        verified ? (
          <span key={index} className="font-medium text-fg tabular-nums">
            {price}
          </span>
        ) : (
          <Unverified key={index} note="price not in tool results">
            {price}
          </Unverified>
        ),
      );
    } else {
      parts.push(whole);
    }
    last = index + whole.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function AnswerText({ text, check }: { text: string; check?: Grounding }) {
  const blocks: ReactNode[] = [];
  let items: string[] = [];
  const flush = () => {
    if (!items.length) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="flex flex-col gap-2 pl-4">
        {items.map((item, i) => (
          <li key={i} className="list-disc text-pretty marker:text-bar">
            <Inline text={item} check={check} />
          </li>
        ))}
      </ul>,
    );
    items = [];
  };

  for (const line of text.split("\n")) {
    const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) items.push(bullet[1]);
    else {
      flush();
      if (line.trim()) {
        blocks.push(
          <p key={`p-${blocks.length}`} className="text-pretty">
            <Inline text={line.replace(/^#+\s*/, "")} check={check} />
          </p>,
        );
      }
    }
  }
  flush();
  return <div className="flex flex-col gap-3 text-ui text-fg-secondary">{blocks}</div>;
}

function describeArgs(args: Record<string, unknown>) {
  const query = args.query ?? args.asin_or_url ?? args.pid_or_url;
  return typeof query === "string" ? `“${query}”` : "";
}

function StepRow({ step, index }: { step: Step; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (ref.current) ripple.dropAt(ref.current, 0.25, 26);
  }, []);
  return (
    <li ref={ref} className="rise flex items-start gap-3 rounded-xl px-3 py-2.5 text-[13px]" style={{ "--i": index } as CSSProperties}>
      <span
        aria-hidden="true"
        className={clsx(
          "mt-1.5 size-1.5 shrink-0 rounded-full",
          step.status === "running" && "bg-busy motion-safe:animate-pulse",
          step.status === "done" && "bg-success",
          step.status === "failed" && "bg-danger",
        )}
      />
      <span className="flex min-w-0 flex-col">
        <span>
          <span className="font-medium text-fg">{humanize(step.name)}</span> <span className="text-fg-secondary">{describeArgs(step.args)}</span>
        </span>
        <span className={clsx("text-pretty", step.status === "failed" ? "text-danger" : "text-fg-secondary")}>
          {step.status === "running" ? "Running…" : step.status === "failed" ? `Failed${step.summary ? `: ${step.summary}` : ""}` : step.summary}
        </span>
      </span>
    </li>
  );
}

function CheckSummary({ check, model }: { check?: Grounding; model?: string }) {
  if (!check) return null;
  const all = [...check.prices, ...check.links];
  const missing = all.filter((entry) => !entry.verified).length;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-fg-secondary">
      <span aria-hidden="true" className={clsx("size-1.5 rounded-full", missing ? "bg-danger" : "bg-success")} />
      {all.length === 0
        ? "No prices or links to check"
        : missing
          ? `${missing} of ${all.length} prices and links not found in the tool results`
          : `All ${all.length} prices and links match the tool results`}
      {model && <span>· answered by {model}</span>}
    </p>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  return (
    <article className="flex flex-col gap-4">
      <p className="text-ui font-medium text-balance">{turn.question}</p>
      {turn.steps.length > 0 && (
        <ol aria-label="Agent steps" className="-mx-3 flex flex-col">
          {turn.steps.map((step, index) => (
            <StepRow key={step.id} step={step} index={index} />
          ))}
        </ol>
      )}
      {!turn.done && !turn.steps.length && <p className="text-[13px] text-fg-secondary">Thinking…</p>}
      {turn.answer && (
        <div className="reveal flex flex-col gap-4 rounded-2xl bg-surface p-5">
          <AnswerText text={turn.answer} check={turn.check} />
          <CheckSummary check={turn.check} model={turn.model} />
        </div>
      )}
      {turn.error && (
        <p role="alert" className="rounded-2xl bg-surface p-5 text-[13px] text-pretty text-danger">
          {turn.error}
        </p>
      )}
    </article>
  );
}

export function ShopTab() {
  const [question, setQuestion] = useState(EXAMPLES[0]);
  const { turns, pending, ask, reset } = useShop();
  const latest = turns.at(-1);

  return (
    <Split
      input={
        <>
          <TaskHeader step="Task 04 · Shopping" title="Ask the shopping agent">
            A LangChain agent on a free OpenRouter model searches Flipkart and Amazon.in through your shopping MCP. Every price and link it quotes is
            checked against what the tools returned.
          </TaskHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (question.trim()) ask(question.trim());
            }}
          >
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Example questions">
              {EXAMPLES.map((example) => (
                <Chip key={example} selected={question === example} onClick={() => setQuestion(example)}>
                  {example}
                </Chip>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="shop-question">{turns.some((turn) => turn.answer) ? "Follow-up question" : "What are you shopping for?"}</Label>
              <textarea
                id="shop-question"
                required
                rows={3}
                maxLength={2000}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Best 1TB NVMe SSD under ₹8,000"
                className={fieldClass}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" variant="primary" pending={pending}>
                Ask agent
              </Button>
              {turns.length > 0 && (
                <Button type="button" onClick={reset} disabled={pending}>
                  New conversation
                </Button>
              )}
            </div>
          </form>
          <p className="text-[13px] text-pretty text-fg-secondary">
            Free OpenRouter models allow 20 requests a minute and 50 a day on free accounts. A question usually takes 2 to 6 of them.
          </p>
        </>
      }
      readout={
        <Panel aria-labelledby="shop-results" aria-busy={pending}>
          <LiveStatus>{pending ? "The agent is working…" : latest?.answer ? "Answer ready." : latest?.error ? latest.error : ""}</LiveStatus>
          <SectionLabel id="shop-results" title="Conversation" count={turns.length || undefined} />
          {turns.length ? (
            <div className="flex flex-col gap-10">
              {turns.map((turn) => (
                <TurnView key={turn.id} turn={turn} />
              ))}
            </div>
          ) : (
            <Waiting title="The conversation will show up here">
              Ask for any product. You&rsquo;ll watch the agent search Flipkart and Amazon.in step by step, then get up to three picks with checked
              prices and links.
            </Waiting>
          )}
        </Panel>
      }
    />
  );
}
