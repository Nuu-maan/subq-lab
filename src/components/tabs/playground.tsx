"use client";

import clsx from "clsx";
import { useState } from "react";
import { AnswerCard, UsageLine } from "@/components/answers";
import { ImagePicker } from "@/components/image-picker";
import { Button, Chip, EmptyState, Label, LiveStatus, Panel, PanelHeading, fieldClass, humanize } from "@/components/ui";
import type { PickedImage } from "@/lib/image";
import { useDecide } from "@/lib/use-decide";

const PRESETS: Record<string, object> = {
  "Review sentiment": {
    state: "Battery life is great but the screen scratches way too easily. Support replaced it quickly though.",
    questions: {
      sentiment: { type: "score", instructions: "Overall sentiment of the review", criteria: ["Negative", "Mixed", "Positive"] },
      recommend: { type: "noul", instructions: "Would this reviewer recommend the product?" },
      topic: { type: "choice", instructions: "Main topic", criteria: { battery: null, display: null, support: null, price: null } },
    },
  },
  "Spam filter": {
    state: { from: "prize-desk@winner-claims.co", subject: "URGENT: claim your ₹50,000 reward", body: "Click the link within 2 hours to verify your bank details." },
    questions: {
      spam: { type: "noul", instructions: "Is this email spam or phishing?", criteria: { true: "Unsolicited, deceptive or a scam", false: "Legitimate email" } },
      risk: { type: "score", instructions: "How risky is it to click the link?", criteria: ["Safe", "Suspicious", "Dangerous"] },
    },
  },
  "Lead scoring": {
    state: { company: "Northwind Logistics", employees: 1200, message: "We need pricing for 300 seats and SSO. Looking to roll out next quarter." },
    questions: {
      qualified: { type: "noul", instructions: "Is this a sales-qualified lead?" },
      plan: { type: "choice", instructions: "Which plan fits?", criteria: { starter: "Under 20 seats", team: "20 to 200 seats", enterprise: "200+ seats or SSO" } },
      intent: { type: "score", instructions: "Buying intent", criteria: ["Browsing", "Evaluating", "Ready to buy"] },
    },
  },
  "Invalid request": {
    state: "Edge case: a score question needs 2 to 10 levels.",
    questions: { broken: { type: "score", instructions: "This should return 422", criteria: ["Only one level"] } },
  },
};

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

export function PlaygroundTab() {
  const [preset, setPreset] = useState("Review sentiment");
  const [source, setSource] = useState(pretty(PRESETS[preset]));
  const [images, setImages] = useState<PickedImage[]>([]);
  const [parseError, setParseError] = useState("");
  const { result, pending, run } = useDecide({ toastErrors: false });

  function send() {
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(source);
    } catch (error) {
      setParseError(`Fix the JSON before sending: ${(error as Error).message}`);
      return;
    }
    setParseError("");
    run(images.length ? { ...body, images: images.map((image) => image.input) } : body);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel aria-labelledby="playground-heading">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <PanelHeading
            id="playground-heading"
            title="Request playground"
            description={
              <>
                Edit the body sent to <code className="font-mono text-fg">POST /v1/systemone</code>. The model defaults to subq-snap-preview; set{" "}
                <code className="font-mono text-fg">model</code> to override it.
              </>
            }
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Example requests">
            {Object.keys(PRESETS).map((name) => (
              <Chip
                key={name}
                selected={preset === name}
                onClick={() => {
                  setPreset(name);
                  setSource(pretty(PRESETS[name]));
                  setParseError("");
                }}
              >
                {name}
              </Chip>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="playground-body">Request body (JSON)</Label>
            <textarea
              id="playground-body"
              rows={16}
              spellCheck={false}
              value={source}
              onChange={(event) => setSource(event.target.value)}
              aria-invalid={parseError ? true : undefined}
              aria-describedby={parseError ? "playground-error" : undefined}
              className={clsx(fieldClass, "font-mono text-sm leading-relaxed sm:text-xs", parseError && "ring-danger")}
            />
            {parseError && (
              <p id="playground-error" className="text-sm text-danger">
                {parseError}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-fg-secondary">Images (optional, added as the images field)</span>
            <ImagePicker images={images} onChange={setImages} />
          </div>
          <Button type="submit" variant="primary" pending={pending} className="self-start">
            Send request
          </Button>
        </form>
      </Panel>

      <Panel aria-labelledby="playground-results" aria-busy={pending}>
        <h2 id="playground-results" className="sr-only">
          Response
        </h2>
        <LiveStatus>{pending ? "Sending request…" : result ? `Response ${result.status} received.` : ""}</LiveStatus>
        {result ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={clsx(
                  "rounded-full px-2.5 py-1 font-mono text-xs font-medium ring-1",
                  result.error ? "text-danger ring-danger/40" : "text-accent ring-accent/40",
                )}
              >
                HTTP {result.status || "—"} {result.error ? "error" : "OK"}
              </span>
              {result.data && <UsageLine ms={result.ms} tokens={result.data.usage.input_tokens + result.data.usage.output_tokens} />}
            </div>
            {result.error && <p className="text-sm text-pretty text-danger">{result.error}</p>}
            {result.data && (
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(result.data.answers).map(([key, answer], index) => (
                  <AnswerCard key={key} title={humanize(key)} answer={answer} index={index} />
                ))}
              </div>
            )}
            <details className="group rounded-2xl bg-raised ring-1 ring-line" open={!result.data}>
              <summary className="cursor-pointer rounded-2xl px-4 py-3 text-sm font-medium">Raw response</summary>
              <pre className="max-h-96 overflow-auto px-4 pb-4 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-fg-secondary">
                {pretty(result.raw)}
              </pre>
            </details>
          </div>
        ) : (
          <EmptyState title="No request sent yet">
            Start from an example, edit the JSON, then select Send request. Try Invalid request to see how errors come back.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
