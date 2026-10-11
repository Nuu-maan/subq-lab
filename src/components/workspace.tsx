"use client";

import { Tabs } from "@base-ui/react/tabs";
import clsx from "clsx";
import { useState } from "react";
import { flushSync } from "react-dom";
import { bubbleTransition, captureGhost, finishBubble } from "@/lib/bubble";
import { StatusPill } from "./status-pill";
import { PcBuilderTab } from "./tabs/pc-builder";
import { PlaygroundTab } from "./tabs/playground";
import { ShopTab } from "./tabs/shop";
import { TriageTab } from "./tabs/triage";
import { VisionTab } from "./tabs/vision";

const TABS = [
  {
    value: "pc",
    label: "PC builder",
    summary: "Tell it your budget and the games you play. Get a compatible parts list with live Amazon.in and Flipkart prices.",
    panel: <PcBuilderTab />,
  },
  {
    value: "triage",
    label: "Ticket triage",
    summary: "Paste a customer complaint. See who should handle it, how urgent it is and how upset the customer is.",
    panel: <TriageTab />,
  },
  {
    value: "vision",
    label: "Photo check",
    summary: "Upload a photo of a PC part or a product. Find out what it is, whether it's damaged and if it's good enough to sell.",
    panel: <VisionTab />,
  },
  {
    value: "shop",
    label: "Shopping agent",
    summary: "Ask for any product. An AI agent searches Flipkart and Amazon.in and quotes prices it has checked.",
    panel: <ShopTab />,
  },
  {
    value: "playground",
    label: "API playground",
    summary: "For developers: send your own requests to the SubQ API and read the raw responses.",
    panel: <PlaygroundTab />,
  },
];

function Mark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="currentColor">
      <rect x="1.5" y="9" width="3" height="5.5" rx="1" />
      <rect x="6.5" y="5" width="3" height="9.5" rx="1" />
      <rect x="11.5" y="1.5" width="3" height="13" rx="1" />
    </svg>
  );
}

function FooterLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center rounded-lg px-2 transition-colors duration-150 hover:text-fg">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
      <span aria-hidden="true" className="ml-1">
        ↗
      </span>
    </a>
  );
}

function activePanel() {
  return document.querySelector<HTMLElement>('main [role="tabpanel"]:not([hidden])');
}

export function Workspace() {
  const [tab, setTab] = useState("pc");

  function switchTo(next: string, trigger: HTMLElement | null, fromPointer: boolean) {
    if (next === tab) return;
    const current = activePanel();
    finishBubble();

    if (!fromPointer || !trigger || !current || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTab(next);
      return;
    }

    const ghost = captureGhost(current);
    flushSync(() => setTab(next));
    const incoming = activePanel();
    if (incoming) bubbleTransition(ghost, trigger, incoming);
    else ghost.element.remove();
  }

  function change(next: string, details: Tabs.Root.ChangeEventDetails) {
    const event = details.event;
    const trigger = event.target instanceof Element ? event.target.closest<HTMLElement>('[role="tab"]') : null;
    switchTo(next, trigger, event instanceof MouseEvent && event.detail > 0);
  }

  return (
    <Tabs.Root value={tab} onValueChange={change} className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
          <span className="flex items-center gap-2 text-ui font-medium">
            <Mark />
            subq lab
          </span>
          <Tabs.List
            aria-label="Tasks"
            className="relative order-last flex w-full flex-wrap justify-center rounded-2xl bg-surface p-1 sm:order-none sm:mx-auto sm:w-auto sm:flex-nowrap sm:rounded-full"
          >
            {TABS.map((tab) => (
              <Tabs.Tab
                key={tab.value}
                value={tab.value}
                className="relative z-10 min-h-8 rounded-full px-2 text-[13px] whitespace-nowrap text-fg-secondary transition-colors duration-150 hover:text-fg data-[active]:font-medium data-[active]:text-fg sm:px-3.5"
              >
                {tab.label}
              </Tabs.Tab>
            ))}
            <Tabs.Indicator className="absolute top-[var(--active-tab-top)] left-0 h-[var(--active-tab-height)] w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] rounded-full bg-canvas shadow-[0_1px_2px_oklch(0_0_0/0.08),0_0_0_1px_oklch(0_0_0/0.04)] motion-safe:transition-[translate,width] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]" />
          </Tabs.List>
          <div className="ml-auto sm:ml-0">
            <StatusPill />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1180px] flex-1 px-4 pt-10 pb-24 outline-none sm:px-6 lg:pt-16">
        <section aria-labelledby="intro-heading" className="mb-14 flex flex-col gap-7 lg:mb-20">
          <div className="flex max-w-[64ch] flex-col gap-3">
            <h1 id="intro-heading" className="text-[30px] leading-[1.1] font-medium tracking-[-0.035em] text-balance sm:text-[36px]">
              An AI that tells you how sure it is
            </h1>
            <p className="text-ui text-pretty text-fg-secondary">
              SubQ doesn&rsquo;t write paragraphs. It answers yes/no, pick-one and rating questions with a percentage, so you can see when
              it&rsquo;s confident and when it&rsquo;s guessing. Pick a task to try it.
            </p>
          </div>
          <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
            {TABS.map((item, index) => {
              const active = item.value === tab;
              return (
                <li key={item.value} className="w-[78%] shrink-0 snap-start sm:w-auto">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={(event) => switchTo(item.value, event.currentTarget, event.detail > 0)}
                    className={clsx(
                      "flex h-full w-full flex-col gap-1.5 rounded-2xl p-4 text-left transition-[background-color,scale] duration-150 ease-out motion-safe:active:scale-[0.98]",
                      active ? "bg-solid text-on-solid" : "bg-surface hover:bg-raised",
                    )}
                  >
                    <span className={clsx("text-[12px] tabular-nums", active ? "text-on-solid/75" : "text-fg-secondary")}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-ui font-medium">{item.label}</span>
                    <span className={clsx("text-[13px] text-pretty", active ? "text-on-solid/75" : "text-fg-secondary")}>{item.summary}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        {TABS.map((tab) => (
          <Tabs.Panel key={tab.value} value={tab.value} keepMounted className="data-[hidden]:hidden">
            {tab.panel}
          </Tabs.Panel>
        ))}
      </main>

      <footer className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-2 px-4 py-6 text-[13px] text-fg-secondary sm:px-6">
        <span>
          Answers come from SubQ&rsquo;s <code className="font-mono text-fg">subq-snap-preview</code> model. Percentages show how sure it is.
        </span>
        <nav aria-label="Project links" className="-mx-2 flex flex-wrap items-center">
          <FooterLink href="https://github.com/Nuu-maan/subq-lab">github.com/Nuu-maan/subq-lab</FooterLink>
          <FooterLink href="https://docs.subq.ai">SubQ docs</FooterLink>
        </nav>
      </footer>
    </Tabs.Root>
  );
}
