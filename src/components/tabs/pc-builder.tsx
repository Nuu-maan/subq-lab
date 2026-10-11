"use client";

import NumberFlow from "@number-flow/react";
import clsx from "clsx";
import { useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { Button, Chip, EmptyState, Label, LiveStatus, Panel, PanelHeading, fieldClass } from "@/components/ui";
import { PRICES_NOTE, solve, type Build, type Needs } from "@/lib/pc";
import { certainty, type Answer, type ChoiceAnswer, type NoulAnswer, type Question, type ScoreAnswer } from "@/lib/subq";
import { decide } from "@/lib/use-decide";

const inr = { style: "currency", currency: "INR", maximumFractionDigits: 0 } as const;
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
      pick: {
        type: "choice",
        instructions: "Which build option best fits this person's request and budget?",
        criteria: Object.fromEntries(builds.map((build, i) => [OPTIONS[i], describe(build)])),
      },
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
    ...build.parts.map((part) => `${part.kind}: ${part.name}, ${formatInr(part.price)}`),
  ].join("\n");
}

export function PcBuilderTab() {
  const [budget, setBudget] = useState(123000);
  const [request, setRequest] = useState(PRESETS[0].text);
  const [phase, setPhase] = useState<Phase>("idle");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [selected, setSelected] = useState("A");
  const [shortfall, setShortfall] = useState<{ budget: number; cheapest: number } | null>(null);

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
    const { builds, cheapest } = solve(needs, budget);
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
    const pick = answers.pick as ChoiceAnswer;
    const value = Object.fromEntries(OPTIONS.map((option) => [option, answers[`value_${option}`] as ScoreAnswer]));
    setPlan({ needs, readings, builds, pick, value });
    setSelected(pick.choice);
  }

  const pending = phase !== "idle";
  const selectedIndex = Math.max(0, OPTIONS.indexOf(selected));
  const build = plan?.builds[selectedIndex];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Panel aria-labelledby="pc-heading" className="self-start">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            planBuild();
          }}
        >
          <PanelHeading
            id="pc-heading"
            title="Gaming PC planner"
            description="Describe what you play. SubQ reads your needs, a solver finds compatible builds under budget, then SubQ picks the best fit."
          />
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="budget">Budget</Label>
              <output htmlFor="budget" className="text-lg font-semibold tabular-nums">
                <NumberFlow value={budget} format={inr} locales="en-IN" />
              </output>
            </div>
            <input
              id="budget"
              type="range"
              min={60000}
              max={250000}
              step={1000}
              value={budget}
              onChange={(event) => setBudget(Number(event.target.value))}
              className="h-10 w-full cursor-pointer accent-accent"
            />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Example requests">
            {PRESETS.map((preset) => (
              <Chip key={preset.label} selected={request === preset.text} onClick={() => setRequest(preset.text)}>
                {preset.label}
              </Chip>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pc-request">What will you use it for?</Label>
            <textarea
              id="pc-request"
              required
              rows={6}
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              placeholder="Mostly AAA games at 1440p, some Valorant. Need Wi-Fi."
              className={fieldClass}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" pending={pending}>
              Plan my build
            </Button>
            {pending && (
              <span className="text-sm text-fg-secondary">{phase === "reading" ? "Reading your request…" : "Comparing builds…"}</span>
            )}
          </div>
          <p className="text-xs text-pretty text-fg-tertiary">{PRICES_NOTE} Excludes monitor, peripherals and Windows.</p>
        </form>
      </Panel>

      <Panel aria-labelledby="pc-results" aria-busy={pending}>
        <h2 id="pc-results" className="sr-only">
          Build plan
        </h2>
        <LiveStatus>
          {phase === "reading" ? "Reading your request…" : phase === "comparing" ? "Comparing builds…" : plan ? `SubQ picked option ${plan.pick.choice}.` : ""}
        </LiveStatus>

        {shortfall && (
          <EmptyState title={`Nothing compatible fits ${formatInr(shortfall.budget)}`}>
            The cheapest build for these needs costs {formatInr(shortfall.cheapest)}. Raise the budget or relax a requirement such as Wi-Fi or storage.
          </EmptyState>
        )}

        {!shortfall && !plan && (
          <EmptyState title="No build planned yet">Set your budget, describe how you&rsquo;ll use the PC, then select Plan my build.</EmptyState>
        )}

        {!shortfall && plan && build && (
          <div className="flex flex-col gap-6">
            <section aria-labelledby="pc-reading" className="flex flex-col gap-3">
              <h3 id="pc-reading" className="text-sm font-medium text-fg-secondary">
                How SubQ read your request
              </h3>
              <ul className="flex flex-wrap gap-2">
                {plan.readings.map((reading, index) => (
                  <li
                    key={reading.label}
                    className="rise flex items-baseline gap-1.5 rounded-full bg-raised px-3 py-1.5 text-sm ring-1 ring-line"
                    style={{ "--i": index } as CSSProperties}
                  >
                    <span className="text-fg-tertiary">{reading.label}</span>
                    <span className="font-medium">{reading.value}</span>
                    <span className="text-xs text-fg-tertiary tabular-nums">{Math.round(reading.probability * 100)}%</span>
                  </li>
                ))}
              </ul>
            </section>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-sm font-medium text-fg-secondary">Build options</legend>
              <div className="grid gap-3 md:grid-cols-3">
                {plan.builds.map((option, index) => {
                  const letter = OPTIONS[index];
                  const fit = plan.pick.probabilities[letter] ?? 0;
                  const value = plan.value[letter];
                  const picked = plan.pick.choice === letter;
                  return (
                    <label
                      key={option.id}
                      className="rise flex cursor-pointer flex-col gap-3 rounded-2xl bg-raised p-4 ring-1 ring-line transition-[box-shadow,scale] duration-150 ease-out motion-safe:active:scale-[0.98] has-checked:ring-2 has-checked:ring-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent hover:ring-line-strong"
                      style={{ "--i": index + 2 } as CSSProperties}
                    >
                      <input
                        type="radio"
                        name="build"
                        value={letter}
                        checked={selected === letter}
                        onChange={() => setSelected(letter)}
                        className="sr-only"
                      />
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">Option {letter}</span>
                        {picked && (
                          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium whitespace-nowrap text-on-accent">SubQ&rsquo;s pick</span>
                        )}
                      </span>
                      <span className="flex flex-col gap-0.5 text-sm">
                        <span className="font-medium text-pretty">{option.gpu.name}</span>
                        <span className="text-pretty text-fg-secondary">
                          {option.cpu.name} · {option.ramGb}GB
                        </span>
                      </span>
                      <span className="text-xl font-semibold tracking-tight tabular-nums">{formatInr(option.total)}</span>
                      <span className="flex flex-col gap-1.5">
                        <span className="flex justify-between text-xs text-fg-secondary">
                          <span>Fit</span>
                          <span className="tabular-nums">{Math.round(fit * 100)}%</span>
                        </span>
                        <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-track">
                          <span className={clsx("bar block h-full rounded-full", picked ? "bg-accent" : "bg-bar")} style={{ "--p": fit } as CSSProperties} />
                        </span>
                        <span className="text-xs text-fg-secondary">Value: {value.legend[String(Math.round(value.score))]}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <PartsTable build={build} budget={budget} />
          </div>
        )}
      </Panel>
    </div>
  );
}

function PartsTable({ build, budget }: { build: Build; budget: number }) {
  const headroom = budget - build.total;

  async function copy() {
    try {
      await navigator.clipboard.writeText(partsListText(build, budget));
      toast.success("Parts list copied");
    } catch {
      toast.error("Unable to copy. Select the table and copy it manually.");
    }
  }

  return (
    <section aria-labelledby="pc-parts" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id="pc-parts" className="text-sm font-medium text-fg-secondary">
          Parts list
        </h3>
        <Button type="button" onClick={copy}>
          Copy parts list
        </Button>
      </div>
      <div className="relative overflow-x-auto rounded-2xl ring-1 ring-line">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="bg-raised text-xs text-fg-tertiary">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Part
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Model
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                Price
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                <span className="sr-only">Links</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {build.parts.map((part) => (
              <tr key={part.kind}>
                <th scope="row" className="px-4 py-2.5 font-normal whitespace-nowrap text-fg-secondary">
                  {part.kind}
                </th>
                <td className="px-4 py-2.5">{part.name}</td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums">{formatInr(part.price)}</td>
                <td className="px-4 py-2.5 text-right">
                  <a
                    href={`https://www.amazon.in/s?k=${encodeURIComponent(part.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Search Amazon.in for ${part.name} (opens in a new tab)`}
                    className="text-accent underline-offset-4 hover:underline"
                  >
                    Amazon.in
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-raised">
            <tr>
              <th scope="row" colSpan={2} className="px-4 py-3 font-medium">
                Total · {formatInr(headroom)} under budget
              </th>
              <td className="px-4 py-3 text-right text-base font-semibold whitespace-nowrap tabular-nums">
                <NumberFlow value={build.total} format={inr} locales="en-IN" />
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
