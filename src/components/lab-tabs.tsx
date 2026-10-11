"use client";

import { Tabs } from "@base-ui/react/tabs";
import { PcBuilderTab } from "./tabs/pc-builder";
import { PlaygroundTab } from "./tabs/playground";
import { TriageTab } from "./tabs/triage";
import { VisionTab } from "./tabs/vision";

const TABS = [
  { value: "pc", label: "PC builder", panel: <PcBuilderTab /> },
  { value: "triage", label: "Triage", panel: <TriageTab /> },
  { value: "vision", label: "Vision", panel: <VisionTab /> },
  { value: "playground", label: "Playground", panel: <PlaygroundTab /> },
];

export function LabTabs() {
  return (
    <Tabs.Root defaultValue="pc" className="flex flex-col gap-6">
      <Tabs.List
        aria-label="Tasks"
        className="relative flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-surface p-1 ring-1 ring-line backdrop-blur-xl"
      >
        {TABS.map((tab) => (
          <Tabs.Tab
            key={tab.value}
            value={tab.value}
            className="relative z-10 min-h-10 rounded-full px-4 text-sm font-medium whitespace-nowrap text-fg-secondary transition-colors duration-150 hover:text-fg data-[active]:text-on-accent"
          >
            {tab.label}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator className="absolute top-1/2 left-0 h-[var(--active-tab-height)] w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] -translate-y-1/2 rounded-full bg-accent motion-safe:transition-[translate,width] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]" />
      </Tabs.List>
      {TABS.map((tab) => (
        <Tabs.Panel key={tab.value} value={tab.value} keepMounted className="data-[hidden]:hidden">
          {tab.panel}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
