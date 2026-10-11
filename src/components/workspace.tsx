"use client";

import { Tabs } from "@base-ui/react/tabs";
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
  { value: "pc", label: "PC builder", panel: <PcBuilderTab /> },
  { value: "triage", label: "Triage", panel: <TriageTab /> },
  { value: "vision", label: "Vision", panel: <VisionTab /> },
  { value: "playground", label: "Playground", panel: <PlaygroundTab /> },
  { value: "shop", label: "Shop agent", panel: <ShopTab /> },
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

  function change(next: string, details: Tabs.Root.ChangeEventDetails) {
    const event = details.event;
    const trigger = event.target instanceof Element ? event.target.closest<HTMLElement>('[role="tab"]') : null;
    const fromPointer = event instanceof MouseEvent && event.detail > 0;
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
        <h1 className="sr-only">SubQ Lab</h1>
        {TABS.map((tab) => (
          <Tabs.Panel key={tab.value} value={tab.value} keepMounted className="data-[hidden]:hidden">
            {tab.panel}
          </Tabs.Panel>
        ))}
      </main>

      <footer className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-2 px-4 py-6 text-[13px] text-fg-secondary sm:px-6">
        <span>
          Every answer is a calibrated probability from <code className="font-mono text-fg">subq-snap-preview</code>
        </span>
        <nav aria-label="Project links" className="-mx-2 flex flex-wrap items-center">
          <FooterLink href="https://github.com/Nuu-maan/subq-lab">github.com/Nuu-maan/subq-lab</FooterLink>
          <FooterLink href="https://docs.subq.ai">SubQ docs</FooterLink>
        </nav>
      </footer>
    </Tabs.Root>
  );
}
