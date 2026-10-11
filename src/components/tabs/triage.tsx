"use client";

import { useState } from "react";
import { AnswerCard, UsageLine } from "@/components/answers";
import { Button, Chip, EmptyState, Intro, Label, LiveStatus, Panel, SectionLabel, fieldClass } from "@/components/ui";
import type { Question } from "@/lib/subq";
import { useDecide } from "@/lib/use-decide";

const SAMPLES = [
  {
    label: "Damaged delivery",
    text: "My order #48213 arrived with a cracked screen and the box was soaked. I need a replacement before my exam on Monday or I want a full refund. This is the second time this has happened.",
  },
  {
    label: "Double charge",
    text: "Hi, I was charged twice for my subscription this month. Could you check and refund the extra payment? Thanks.",
  },
  {
    label: "Address change",
    text: "How do I change the delivery address on an order that hasn't shipped yet?",
  },
];

const QUESTIONS: Record<string, Question> = {
  escalate: {
    type: "noul",
    instructions: "Should a human agent review this ticket?",
    criteria: { true: "Damage, safety, legal risk or a very upset customer", false: "Routine question a saved reply can answer" },
  },
  queue: {
    type: "choice",
    instructions: "Which team should own this ticket?",
    criteria: {
      returns: "Damaged, defective or wrong item",
      billing: "Charges, refunds or invoices",
      shipping: "Delivery status or address changes",
      account: "Login, profile or subscription settings",
      general: null,
    },
  },
  urgency: { type: "score", instructions: "How soon should someone respond?", criteria: ["Within a week", "Within a day", "Within an hour"] },
  mood: { type: "score", instructions: "How does the customer feel?", criteria: ["Angry", "Frustrated", "Neutral", "Positive"] },
  refund: { type: "noul", instructions: "Is the customer asking for money back?" },
};

const TITLES: Record<string, string> = {
  escalate: "Needs a human?",
  queue: "Route to",
  urgency: "Respond",
  mood: "Customer mood",
  refund: "Asking for a refund?",
};

export function TriageTab() {
  const [ticket, setTicket] = useState(SAMPLES[0].text);
  const { result, pending, run } = useDecide();

  return (
    <div className="flex flex-col gap-12">
      <Panel aria-labelledby="triage-heading">
        <SectionLabel id="triage-heading" title="Ticket" />
        <Intro>Paste a support message. SubQ decides who owns it, how urgent it is and whether a person should step in.</Intro>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            run({ state: ticket, questions: QUESTIONS });
          }}
        >
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sample tickets">
            {SAMPLES.map((sample) => (
              <Chip key={sample.label} selected={ticket === sample.text} onClick={() => setTicket(sample.text)}>
                {sample.label}
              </Chip>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ticket">Customer message</Label>
            <textarea
              id="ticket"
              name="ticket"
              required
              rows={5}
              value={ticket}
              onChange={(event) => setTicket(event.target.value)}
              placeholder="My order arrived damaged…"
              className={fieldClass}
            />
          </div>
          <Button type="submit" variant="primary" pending={pending} className="self-start">
            Triage ticket
          </Button>
        </form>
      </Panel>

      <Panel aria-labelledby="triage-results" aria-busy={pending}>
        <LiveStatus>{pending ? "Triaging ticket…" : result?.data ? "Triage results ready." : ""}</LiveStatus>
        <SectionLabel
          id="triage-results"
          title="Result"
          count={result?.data ? Object.keys(result.data.answers).length : undefined}
          action={result?.data && <UsageLine ms={result.ms} tokens={result.data.usage.input_tokens + result.data.usage.output_tokens} />}
        />
        {result?.data ? (
          <div className="grid items-start gap-2 sm:grid-cols-2">
            {Object.entries(result.data.answers).map(([key, answer], index) => (
              <AnswerCard key={key} title={TITLES[key] ?? key} answer={answer} index={index} />
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing triaged yet">Pick a sample or paste your own message, then select Triage ticket.</EmptyState>
        )}
      </Panel>
    </div>
  );
}
