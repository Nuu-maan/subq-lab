"use client";

import { Tabs } from "@base-ui/react/tabs";
import { SectionLabel } from "./ui";
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
    <section aria-labelledby="tasks-heading" className="flex flex-col gap-6">
      <Tabs.Root defaultValue="pc" className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <SectionLabel id="tasks-heading" title="Tasks" count={TABS.length} level={2} />
          <Tabs.List aria-label="Tasks" className="relative -mx-3 flex flex-wrap">
            {TABS.map((tab) => (
              <Tabs.Tab
                key={tab.value}
                value={tab.value}
                className="relative z-10 min-h-9 rounded-lg px-3 text-ui whitespace-nowrap text-fg-secondary transition-colors duration-150 hover:text-fg data-[active]:text-fg"
              >
                {tab.label}
              </Tabs.Tab>
            ))}
            <Tabs.Indicator className="absolute top-[var(--active-tab-top)] left-0 h-[var(--active-tab-height)] w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] rounded-lg bg-surface motion-safe:transition-[translate,width,top] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]" />
          </Tabs.List>
        </div>
        {TABS.map((tab) => (
          <Tabs.Panel key={tab.value} value={tab.value} keepMounted className="data-[hidden]:hidden">
            {tab.panel}
          </Tabs.Panel>
        ))}
      </Tabs.Root>
    </section>
  );
}
