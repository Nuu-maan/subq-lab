"use client";

import clsx from "clsx";
import { useState } from "react";
import { AnswerCard, AnswerGrid, UsageLine } from "@/components/answers";
import { ImagePicker } from "@/components/image-picker";
import { Button, Chip, Label, LiveStatus, Panel, SectionLabel, Skeletons, Split, TaskHeader, Waiting, fieldClass, humanize } from "@/components/ui";
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
    <Split
      input={
        <>
          <TaskHeader step="Task 04 · Raw API" title="Send a request">
            Edit the body sent to <code className="font-mono text-[13px] text-fg">POST /v1/systemone</code>. The model defaults to{" "}
            <code className="font-mono text-[13px] text-fg">subq-snap-preview</code>; set <code className="font-mono text-[13px] text-fg">model</code>{" "}
            to override it.
          </TaskHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Example requests">
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
                rows={14}
                spellCheck={false}
                value={source}
                onChange={(event) => setSource(event.target.value)}
                aria-invalid={parseError ? true : undefined}
                aria-describedby={parseError ? "playground-error" : undefined}
                className={clsx(fieldClass, "font-mono text-[13px] leading-relaxed sm:text-[13px]", parseError && "outline-2 outline-danger")}
              />
              {parseError && (
                <p id="playground-error" className="text-[13px] text-danger">
                  {parseError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium">Images (optional, sent as the images field)</span>
              <ImagePicker images={images} onChange={setImages} />
            </div>
            <Button type="submit" variant="primary" pending={pending} className="self-start">
              Send request
            </Button>
          </form>
        </>
      }
      readout={
        <Panel aria-labelledby="playground-results" aria-busy={pending}>
          <LiveStatus>{pending ? "Sending request…" : result ? `Response ${result.status} received.` : ""}</LiveStatus>
          <SectionLabel
            id="playground-results"
            title="Response"
            action={result?.data && <UsageLine ms={result.ms} tokens={result.data.usage.input_tokens + result.data.usage.output_tokens} />}
          />
          {pending ? (
            <Skeletons count={2} />
          ) : result ? (
            <div key={result.id} className="flex flex-col gap-3">
              <p className="rise inline-flex w-fit items-center gap-2 rounded-lg bg-surface px-2.5 py-1 text-[13px]">
                <span aria-hidden="true" className={clsx("size-1.5 rounded-full", result.error ? "bg-danger" : "bg-success")} />
                <span className="font-mono font-medium">HTTP {result.status || "—"}</span>
                <span className="text-fg-secondary">{result.error ? "Error" : "OK"}</span>
              </p>
              {result.error && <p className="text-[13px] text-pretty text-danger">{result.error}</p>}
              {result.data && (
                <AnswerGrid>
                  {Object.entries(result.data.answers).map(([key, answer], index) => (
                    <AnswerCard key={key} title={humanize(key)} answer={answer} index={index} />
                  ))}
                </AnswerGrid>
              )}
              <details className="rounded-2xl bg-surface" open={!result.data}>
                <summary className="cursor-pointer rounded-2xl px-5 py-3.5 text-[13px] font-medium">Raw response</summary>
                <pre className="max-h-96 overflow-auto px-5 pb-5 font-mono text-[12px] leading-relaxed break-words whitespace-pre-wrap text-fg-secondary">
                  {pretty(result.raw)}
                </pre>
              </details>
            </div>
          ) : (
            <Waiting title="No request sent yet">Start from an example, edit the JSON, then select Send request. Try Invalid request to see an error.</Waiting>
          )}
        </Panel>
      }
    />
  );
}
