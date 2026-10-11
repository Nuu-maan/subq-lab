"use client";

import { useState } from "react";
import { AnswerCard, AnswerGrid, UsageLine } from "@/components/answers";
import { ImagePicker } from "@/components/image-picker";
import { Button, Chip, Label, LiveStatus, Panel, SectionLabel, Skeletons, Split, TaskHeader, Waiting, fieldClass, humanize } from "@/components/ui";
import type { PickedImage } from "@/lib/image";
import type { Question } from "@/lib/subq";
import { useDecide } from "@/lib/use-decide";

type Lens = { label: string; state: string; questions: Record<string, Question & { title: string }> };

const LENSES: Record<string, Lens> = {
  parts: {
    label: "PC parts",
    state: "Photos of computer hardware or a PC build.",
    questions: {
      part: {
        title: "Main component",
        type: "choice",
        instructions: "What is the main computer component shown?",
        criteria: {
          gpu: "Graphics card",
          cpu: "Processor",
          motherboard: "Motherboard",
          ram: "Memory sticks",
          storage: "SSD or hard drive",
          psu: "Power supply",
          full_build: "An assembled PC",
          not_hardware: "Not computer hardware",
        },
      },
      damage: {
        title: "Visible damage?",
        type: "noul",
        instructions: "Does the hardware show visible physical damage such as bent pins, burn marks, cracks or corrosion?",
      },
      cables: {
        title: "Cable management",
        type: "score",
        instructions: "How tidy is the cable management?",
        criteria: ["Messy", "Acceptable", "Clean", "Showcase"],
      },
    },
  },
  safety: {
    label: "Content safety",
    state: "User-uploaded images for a public community feed.",
    questions: {
      safe: {
        title: "Safe for everyone?",
        type: "noul",
        instructions: "Is this safe to show a general audience, with no nudity, gore, weapons aimed at people or hate symbols?",
      },
      subject: {
        title: "Subject",
        type: "choice",
        instructions: "What is the main subject?",
        criteria: { people: null, animal: null, food: null, landscape: null, product: null, vehicle: null, document: "Text or a document", screenshot: null, other: null },
      },
    },
  },
  product: {
    label: "Product photo QA",
    state: "Product photos submitted for an online store listing.",
    questions: {
      sharpness: { title: "Sharpness", type: "score", instructions: "How sharp is the product in focus?", criteria: ["Blurry", "Soft", "Sharp", "Studio sharp"] },
      lighting: { title: "Lighting", type: "score", instructions: "How good is the lighting?", criteria: ["Poor", "Fair", "Good", "Professional"] },
      background: { title: "Clean background?", type: "noul", instructions: "Is the background clean and uncluttered?" },
      ready: { title: "Ready to list?", type: "noul", instructions: "Could this go live as a store listing photo without edits?" },
    },
  },
};

export function VisionTab() {
  const [lens, setLens] = useState("parts");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [custom, setCustom] = useState("");
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [labels, setLabels] = useState<Record<string, Record<string, string>>>({});
  const [missingImages, setMissingImages] = useState(false);
  const { result, pending, run } = useDecide();
  const active = LENSES[lens];

  function submit() {
    if (images.length === 0) return setMissingImages(true);
    const questions: Record<string, Question> = {};
    const nextTitles: Record<string, string> = {};
    const nextLabels: Record<string, Record<string, string>> = {};
    for (const [key, { title, ...question }] of Object.entries(active.questions)) {
      questions[key] = question as Question;
      nextTitles[key] = title;
      if (question.type === "choice") {
        nextLabels[key] = Object.fromEntries(
          Object.entries(question.criteria).filter((entry): entry is [string, string] => entry[1] !== null),
        );
      }
    }
    if (custom.trim()) {
      questions.custom = { type: "noul", instructions: custom.trim() };
      nextTitles.custom = custom.trim();
    }
    setTitles(nextTitles);
    setLabels(nextLabels);
    run({ state: active.state, images: images.map((image) => image.input), questions });
  }

  return (
    <Split
      input={
        <>
          <TaskHeader step="Task 03 · Vision" title="Check images">
            Add up to four images and choose what SubQ should look for. A photo of your GPU or your current build works well.
          </TaskHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="What to check">
              {Object.entries(LENSES).map(([key, { label }]) => (
                <Chip key={key} selected={lens === key} onClick={() => setLens(key)}>
                  {label}
                </Chip>
              ))}
            </div>
            <ImagePicker
              images={images}
              onChange={(next) => {
                setImages(next);
                setMissingImages(false);
              }}
            />
            {missingImages && (
              <p role="alert" className="-mt-1 text-[13px] text-danger">
                Add at least one image to run a check.
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="vision-custom">Your own yes/no question (optional)</Label>
              <input
                id="vision-custom"
                value={custom}
                onChange={(event) => setCustom(event.target.value)}
                placeholder="Is there a dog in the photo?"
                className={fieldClass}
                autoComplete="off"
              />
            </div>
            <Button type="submit" variant="primary" pending={pending} className="self-start">
              Check {images.length === 1 ? "image" : "images"}
            </Button>
          </form>
        </>
      }
      readout={
        <Panel aria-labelledby="vision-results" aria-busy={pending}>
          <LiveStatus>{pending ? "Checking images…" : result?.data ? "Image check results ready." : ""}</LiveStatus>
          <SectionLabel
            id="vision-results"
            title="Readout"
            count={result?.data ? Object.keys(result.data.answers).length : undefined}
            action={result?.data && <UsageLine ms={result.ms} tokens={result.data.usage.input_tokens + result.data.usage.output_tokens} />}
          />
          {pending ? (
            <Skeletons count={3} />
          ) : result?.data ? (
            <AnswerGrid key={result.id}>
              {Object.entries(result.data.answers).map(([key, answer], index) => (
                <AnswerCard key={key} title={titles[key] || humanize(key)} answer={answer} labels={labels[key]} index={index} />
              ))}
            </AnswerGrid>
          ) : (
            <Waiting title="No images checked yet">Add an image, choose a check, then select Check image. The answers land here.</Waiting>
          )}
        </Panel>
      }
    />
  );
}
