"use client";

import NumberFlow from "@number-flow/react";
import clsx from "clsx";
import { useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { LiquidGauge } from "@/components/liquid-gauge";
import { Button, Chip, Label, LiveStatus, Panel, SectionLabel, Split, TaskHeader, Waiting, fieldClass } from "@/components/ui";
import { SNAPSHOT_DATE, solve, type Build, type Needs, type PriceBook, type Store } from "@/lib/pc";
import { certainty, type Answer, type ChoiceAnswer, type NoulAnswer, type Question, type ScoreAnswer } from "@/lib/subq";
import { decide } from "@/lib/use-decide";
import { usePrices, type PriceStatus } from "@/lib/use-prices";

const inr = { style: "currency", currency: "INR", maximumFractionDigits: 0 } as const;
const STORE_NAMES: Record<Store, string> = { amazon: "Amazon.in", flipkart: "Flipkart" };
const formatInr = (value: number) => new Intl.NumberFormat("en-IN", inr).format(value);
const OPTIONS = ["A", "B", "C"];

const PRESETS = [
  {
    label: "1440p AAA + streaming",
    text: "Gaming PC under ₹1.23 lakh. Mostly AAA games like Cyberpunk 2077 and GTA V at 1440p high settings, plus some Valorant with friends. I might start streaming on YouTube. Need Wi-Fi in my room.",
  },
  {
    label: "Competitive 240 Hz",
    text: "I only play Valorant, CS2 and Apex on a 1080p 240 Hz monitor. I want the highest frame rates possible. Wired ethernet, no RGB needed.",
  },
  {
    label: "White showcase build",
    text: "Want a good-looking white build with glass and RGB for my desk setup. Play story games like Elden Ring and Spider-Man at 1440p. Lots of games installed, so I need plenty of storage.",
  },
];

const NEEDS_QUESTIONS: Record<string, Question> = {
  resolution: {
    type: "choice",
    instructions: "What resolution will they game at? If unstated, infer it from their games and budget.",
    criteria: { "1080p": "Full HD, often a high refresh rate", "1440p": "QHD", "4k": "4K UHD" },
  },
  workload: {
    type: "choice",
    instructions: "What kind of games matter most to them?",
    criteria: { esports: "Competitive titles like Valorant, CS2 or Fortnite", aaa: "Graphics-heavy single-player games", mixed: "A balance of both" },
  },
  streaming: { type: "noul", instructions: "Will they stream, record or edit video?" },
  wifi: { type: "noul", instructions: "Do they need built-in Wi-Fi rather than a wired connection?" },
  showcase: { type: "noul", instructions: "Do they want a showpiece look with glass, RGB lighting or a white theme?" },
  storage: { type: "score", instructions: "How much storage do they need?", criteria: ["1 TB is enough", "2 TB or more"] },
  upgradePath: { type: "noul", instructions: "Do they care about upgrading the CPU later without replacing the motherboard?" },
};

type Reading = { label: string; value: string; probability: number };
type Plan = { needs: Needs; readings: Reading[]; builds: Build[]; pick: ChoiceAnswer; value: Record<string, ScoreAnswer> };
type Phase = "idle" | "reading" | "comparing";

function interpret(answers: Record<string, Answer>) {
  const yes = (key: string) => (answers[key] as NoulAnswer).noul >= 0.5;
  const choice = (key: string) => answers[key] as ChoiceAnswer;
  const storage = answers.storage as ScoreAnswer;

  const needs: Needs = {
    resolution: choice("resolution").choice as Needs["resolution"],
    workload: choice("workload").choice as Needs["workload"],
    streaming: yes("streaming"),
    wifi: yes("wifi"),
    showcase: yes("showcase"),
    storageTb: storage.score >= 0.5 ? 2 : 1,
    upgradePath: yes("upgradePath"),
  };

  const workloadLabel = { esports: "Competitive games", aaa: "AAA games", mixed: "Mixed games" }[needs.workload];
  const readings: Reading[] = [
    { label: "Resolution", value: needs.resolution === "4k" ? "4K" : needs.resolution, probability: certainty(answers.resolution) },
    { label: "Focus", value: workloadLabel, probability: certainty(answers.workload) },
    { label: "Streaming", value: needs.streaming ? "Yes" : "No", probability: certainty(answers.streaming) },
    { label: "Wi-Fi", value: needs.wifi ? "Yes" : "No", probability: certainty(answers.wifi) },
    { label: "Look", value: needs.showcase ? "Showcase" : "Performance first", probability: certainty(answers.showcase) },
    { label: "Storage", value: `${needs.storageTb} TB`, probability: certainty(storage) },
    { label: "Upgrade path", value: needs.upgradePath ? "Yes" : "No", probability: certainty(answers.upgradePath) },
  ];
  return { needs, readings };
}

function comparisonRequest(request: string, budget: number, builds: Build[]) {
  const describe = (build: Build) =>
    `${build.cpu.name}, ${build.gpu.name}, ${build.ramGb}GB RAM, ${formatInr(build.total)} (${formatInr(budget - build.total)} under budget)`;
  return {
    state: { request, budget: formatInr(budget), options: Object.fromEntries(builds.map((build, i) => [OPTIONS[i], build.parts])) },
    questions: {
      ...(builds.length > 1 && {
        pick: {
          type: "choice",
          instructions: "Which build option best fits this person's request and budget?",
          criteria: Object.fromEntries(builds.map((build, i) => [OPTIONS[i], describe(build)])),
        },
      }),
      ...Object.fromEntries(
        builds.map((build, i) => [
          `value_${OPTIONS[i]}`,
          {
            type: "score",
            instructions: `How good is the value for money of option ${OPTIONS[i]} (${describe(build)}) for this person?`,
            criteria: ["Poor", "Fair", "Good", "Excellent"],
          },
        ]),
      ),
    },
  };
}

function partsListText(build: Build, budget: number) {
  return [
    `Gaming PC: ${formatInr(build.total)} (budget ${formatInr(budget)})`,
    ...build.parts.map((part) => `${part.kind}: ${part.name}, ${formatInr(part.price)} on ${STORE_NAMES[part.store]}, ${part.url}`),
  ].join("\n");
}

export function PcBuilderTab() {
  const [budget, setBudget] = useState(123000);
  const [request, setRequest] = useState(PRESETS[0].text);
  const [phase, setPhase] = useState<Phase>("idle");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [selected, setSelected] = useState("A");
  const [shortfall, setShortfall] = useState<{ budget: number; cheapest: number | null } | null>(null);
  const [pricedWith, setPricedWith] = useState<PriceBook | null>(null);
  const prices = usePrices();

  async function planBuild() {
    setPhase("reading");
    setShortfall(null);
    const reading = await decide({ state: { request, budget: formatInr(budget) }, questions: NEEDS_QUESTIONS });
    if (!reading.data) {
      setPhase("idle");
      toast.error(reading.error, { duration: Infinity });
      return;
    }

    const { needs, readings } = interpret(reading.data.answers);
    const book = prices.status?.book ?? null;
    setPricedWith(book);
    const { builds, cheapest } = solve(needs, budget, book ?? undefined);
    if (builds.length === 0) {
      setPhase("idle");
      setPlan(null);
      setShortfall({ budget, cheapest });
      return;
    }

    setPhase("comparing");
    const comparison = await decide(comparisonRequest(request, budget, builds));
    setPhase("idle");
    if (!comparison.data) {
      toast.error(comparison.error, { duration: Infinity });
      return;
    }

    const answers = comparison.data.answers;
    const pick = (answers.pick as ChoiceAnswer | undefined) ?? { type: "choice", choice: "A", probabilities: { A: 1 }, confidence: 1 };
    const value = Object.fromEntries(builds.map((_, i) => [OPTIONS[i], answers[`value_${OPTIONS[i]}`] as ScoreAnswer]));
    setPlan({ needs, readings, builds, pick, value });
    setSelected(pick.choice);
  }

  const pending = phase !== "idle";
  const selectedIndex = Math.max(0, OPTIONS.indexOf(selected));
  const build = plan?.builds[selectedIndex];
  const only = plan?.builds.length === 1;

  return (
    <Split
      input={
        <>
          <TaskHeader step="Task 01 · Hardware" title="Plan a gaming PC">
            Describe what you play. SubQ reads your needs, a solver finds compatible builds from live Amazon.in and Flipkart prices, then SubQ
            picks the best fit.
          </TaskHeader>
          <form
            className="flex flex-col gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              planBuild();
            }}
          >
            <BudgetSlider value={budget} onChange={setBudget} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="pc-request">What will you use it for?</Label>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Example requests">
                {PRESETS.map((preset) => (
                  <Chip key={preset.label} selected={request === preset.text} onClick={() => setRequest(preset.text)}>
                    {preset.label}
                  </Chip>
                ))}
              </div>
              <textarea
                id="pc-request"
                required
                rows={5}
                value={request}
                onChange={(event) => setRequest(event.target.value)}
                placeholder="Mostly AAA games at 1440p, some Valorant. Need Wi-Fi."
                className={fieldClass}
              />
            </div>
            <Button type="submit" variant="primary" pending={pending} className="self-start">
              Plan my build
            </Button>
          </form>
          <PriceSource status={prices.status} onRefresh={prices.refresh} />
        </>
      }
      readout={
        <>
          <LiveStatus>
            {phase === "reading"
              ? "Reading your request…"
              : phase === "comparing"
                ? "Comparing builds…"
                : plan
                  ? only
                    ? "One build fits your budget."
                    : `SubQ picked option ${plan.pick.choice}.`
                  : ""}
          </LiveStatus>

          {pending && <Progress phase={phase} />}

          {!pending && shortfall && (
            <Waiting title={`Nothing compatible fits ${formatInr(shortfall.budget)}`}>
              {shortfall.cheapest === null
                ? "No compatible build is in stock right now. Refresh prices later or relax a requirement such as Wi-Fi or storage."
                : `The cheapest build for these needs costs ${formatInr(shortfall.cheapest)}. Raise the budget or relax a requirement such as Wi-Fi or storage.`}
            </Waiting>
          )}

          {!pending && !shortfall && !plan && (
            <Waiting title="No build planned yet">Set a budget, describe how you&rsquo;ll use the PC, then select Plan my build.</Waiting>
          )}

          {!pending && !shortfall && plan && build && (
            <>
              <Panel aria-labelledby="pc-reading">
                <SectionLabel id="pc-reading" title="How SubQ read you" count={plan.readings.length} />
                <ul className="flex flex-wrap gap-1.5">
                  {plan.readings.map((reading, index) => (
                    <li
                      key={reading.label}
                      className="rise flex items-baseline gap-1.5 rounded-lg bg-surface px-2.5 py-1 text-[13px]"
                      style={{ "--i": index } as CSSProperties}
                    >
                      <span className="text-fg-secondary">{reading.label}</span>
                      <span className="font-medium">{reading.value}</span>
                      <span className="text-fg-secondary tabular-nums">{Math.round(reading.probability * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel aria-labelledby="pc-options">
                <SectionLabel id="pc-options" title="Builds" count={plan.builds.length} />
                {only && (
                  <p className="text-[13px] text-pretty text-fg-secondary">
                    Only one compatible build fits this budget at today&rsquo;s prices. Raise the budget or drop Wi-Fi to see alternatives.
                  </p>
                )}
                <fieldset className="-mx-3 flex flex-col">
                  <legend className="sr-only">Choose a build</legend>
                  {plan.builds.map((option, index) => {
                    const letter = OPTIONS[index];
                    const fit = plan.pick.probabilities[letter] ?? 0;
                    const value = plan.value[letter];
                    const picked = plan.pick.choice === letter;
                    return (
                      <label
                        key={option.id}
                        className="rise flex cursor-pointer items-center gap-3.5 rounded-xl px-3 py-3 transition-colors duration-150 hover:bg-surface has-checked:bg-surface has-focus-visible:outline-2 has-focus-visible:outline-fg"
                        style={{ "--i": index + 3 } as CSSProperties}
                      >
                        <input
                          type="radio"
                          name="build"
                          value={letter}
                          checked={selected === letter}
                          onChange={() => setSelected(letter)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={clsx(
                            "grid size-9 shrink-0 place-items-center rounded-lg text-[13px] font-medium transition-colors duration-150",
                            selected === letter ? "bg-solid text-on-solid" : "bg-raised text-fg",
                          )}
                        >
                          {letter}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="flex flex-wrap items-center gap-x-2">
                            <span className="text-ui font-medium">{option.gpu.name}</span>
                            {picked && (
                              <span className="rounded-md bg-canvas px-1.5 text-[12px] text-fg-secondary">{only ? "Only fit" : "SubQ\u2019s pick"}</span>
                            )}
                          </span>
                          <span className="text-[13px] text-fg-secondary">
                            {option.cpu.name} · {option.ramGb}GB · {value.legend[String(Math.round(value.score))].toLowerCase()} value
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end">
                          <span className="text-ui font-medium tabular-nums">{formatInr(option.total)}</span>
                          {!only && <span className="text-[13px] text-fg-secondary tabular-nums">{Math.round(fit * 100)}% fit</span>}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              </Panel>

              <PartsList build={build} budget={budget} book={pricedWith} />
            </>
          )}
        </>
      }
    />
  );
}

const BUDGET_MIN = 60000;
const BUDGET_MAX = 300000;

function BudgetSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor="budget">Budget</Label>
        <output htmlFor="budget" className="text-[22px] leading-none font-medium tracking-[-0.02em] tabular-nums">
          <NumberFlow value={value} format={inr} locales="en-IN" />
        </output>
      </div>
      <div className="relative h-11 overflow-hidden rounded-xl has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-fg">
        <LiquidGauge value={(value - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)} className="absolute inset-0 size-full" />
        <input
          id="budget"
          type="range"
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={1000}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="absolute inset-0 size-full cursor-ew-resize opacity-0"
        />
      </div>
      <div aria-hidden="true" className="flex justify-between text-[12px] text-fg-secondary tabular-nums">
        <span>₹60k</span>
        <span>₹1.8L</span>
        <span>₹3L</span>
      </div>
    </div>
  );
}

const STEPS: { phase: Phase; label: string }[] = [
  { phase: "reading", label: "Reading your request" },
  { phase: "comparing", label: "Solving and comparing builds" },
];

function Progress({ phase }: { phase: Phase }) {
  const current = STEPS.findIndex((step) => step.phase === phase);
  return (
    <ol aria-hidden="true" className="flex min-h-80 flex-col justify-center gap-4 rounded-3xl border border-dashed border-bar/50 px-8 py-12">
      {STEPS.map((step, index) => (
        <li key={step.phase} className={clsx("flex items-center gap-3 text-ui", index > current ? "text-fg-secondary" : "text-fg")}>
          <span
            className={clsx(
              "size-2 rounded-full",
              index < current && "bg-solid",
              index === current && "bg-busy motion-safe:animate-pulse",
              index > current && "bg-track",
            )}
          />
          {step.label}
          {index < current && <span className="text-[13px] text-fg-secondary">done</span>}
        </li>
      ))}
    </ol>
  );
}

function PartsList({ build, budget, book }: { build: Build; budget: number; book: PriceBook | null }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(partsListText(build, budget));
      toast.success("Parts list copied");
    } catch {
      toast.error("Unable to copy. Select the list and copy it manually.");
    }
  }

  return (
    <Panel aria-labelledby="pc-parts">
      <SectionLabel
        id="pc-parts"
        title="Parts"
        count={build.parts.length}
        action={
          <button
            type="button"
            onClick={copy}
            className="-mr-2 inline-flex min-h-9 items-center rounded-lg px-2 text-[13px] text-fg-secondary transition-colors duration-150 hover:text-fg"
          >
            Copy list
          </button>
        }
      />
      <ul className="-mx-3 flex flex-col">
        {build.parts.map((part, index) => (
          <li key={`${build.id}-${part.kind}`} className="rise" style={{ "--i": index + 5 } as CSSProperties}>
            <a
              href={part.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-surface"
            >
              <span className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-3">
                <span className="shrink-0 text-[13px] text-fg-secondary sm:w-28">{part.kind}</span>
                <span className="text-ui text-pretty">{part.name}</span>
              </span>
              <span aria-hidden="true" className="hidden h-px min-w-6 flex-1 bg-line sm:block" />
              <span className="ml-auto flex shrink-0 flex-col items-end sm:ml-0">
                <span className="text-ui tabular-nums">{formatInr(part.price)}</span>
                <span className="text-[12px] whitespace-nowrap text-fg-secondary">
                  {STORE_NAMES[part.store]}
                  {!part.live && " · snapshot"}
                  {part.alternative && ` · ${STORE_NAMES[part.alternative.store]} ${formatInr(part.alternative.price)}`}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="shrink-0 text-[13px] text-fg-secondary transition-[color,translate] duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fg"
              >
                ↗
              </span>
              <span className="sr-only">View on {STORE_NAMES[part.store]} (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 rounded-2xl bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] text-fg-secondary">
            Total · {formatInr(budget - build.total)} left of {formatInr(budget)}
          </span>
          <span className="text-[22px] leading-none font-medium tracking-[-0.02em] tabular-nums">
            <NumberFlow value={build.total} format={inr} locales="en-IN" />
          </span>
        </div>
        <LiquidGauge value={build.total / budget} className="h-3 w-full rounded-full" />
      </div>
      <p className="text-[13px] text-pretty text-fg-secondary">
        {book
          ? `Live prices from Amazon.in and Flipkart, checked ${checkedAgo(book.checkedAt)}. Each part uses the cheaper in-stock store.`
          : `Prices from the ${SNAPSHOT_DATE} Amazon.in snapshot.`}{" "}
        Confirm on the listing before buying. Excludes monitor, peripherals and Windows.
      </p>
    </Panel>
  );
}

function checkedAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-minutes < -59 ? -Math.round(minutes / 60) : -minutes, minutes > 59 ? "hour" : "minute");
}

function PriceSource({ status, onRefresh }: { status: PriceStatus | null; onRefresh: () => void }) {
  if (!status) return null;
  const { book, refreshing, progress, error } = status;
  const message = refreshing
    ? `Checking live prices on Amazon.in and Flipkart${progress ? ` · ${progress.done} of ${progress.total}` : ""}`
    : book
      ? `Live prices · checked ${checkedAgo(book.checkedAt)}`
      : `Using the ${SNAPSHOT_DATE} price snapshot`;

  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-surface px-3.5 py-3 text-[13px]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={clsx("size-1.5 shrink-0 rounded-full", refreshing ? "bg-busy motion-safe:animate-pulse" : book ? "bg-success" : "bg-bar")}
          />
          <span role="status">{message}</span>
        </span>
        {!refreshing && (
          <button
            type="button"
            onClick={onRefresh}
            className="-my-1 -mr-1.5 inline-flex min-h-8 items-center rounded-lg px-1.5 text-fg-secondary transition-colors duration-150 hover:text-fg"
          >
            Refresh prices
          </button>
        )}
      </div>
      {error && !refreshing && <p className="text-pretty text-danger">{error}</p>}
    </div>
  );
}
