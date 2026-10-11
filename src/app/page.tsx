import { LabTabs } from "@/components/lab-tabs";
import { Pond } from "@/components/pond";
import { StatusPill } from "@/components/status-pill";
import { Intro } from "@/components/ui";

function Mark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="currentColor">
      <rect x="1.5" y="9" width="3" height="5.5" rx="1" />
      <rect x="6.5" y="5" width="3" height="9.5" rx="1" />
      <rect x="11.5" y="1.5" width="3" height="13" rx="1" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-[672px] flex-1 flex-col px-4 sm:px-6">
      <header className="flex h-16 items-center justify-between">
        <span className="flex items-center gap-2 text-ui font-medium">
          <Mark />
          subq lab
        </span>
        <a
          href="https://docs.subq.ai"
          target="_blank"
          rel="noreferrer"
          className="-mr-2 inline-flex min-h-9 items-center rounded-lg px-2 text-[13px] text-fg-secondary transition-colors duration-150 hover:text-fg"
        >
          SubQ docs<span className="sr-only"> (opens in a new tab)</span>
          <span aria-hidden="true" className="ml-1">
            ↗
          </span>
        </a>
      </header>

      <main id="main" tabIndex={-1} className="flex flex-col gap-16 pt-6 pb-20 outline-none">
        <section className="flex flex-col gap-7">
          <Pond />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-0.5">
              <h1 className="text-[22px] leading-tight font-medium tracking-[-0.02em]">SubQ Lab</h1>
              <p className="text-ui text-fg-secondary">A field test of the SubQ Decisions API</p>
            </div>
            <StatusPill />
          </div>
          <Intro>
            Every answer here is a <span className="text-fg">calibrated probability</span>, not generated text. Plan a gaming PC from{" "}
            <span className="text-fg">real Amazon.in listings</span>, triage support tickets, check images, or send raw requests and inspect what
            comes back.
          </Intro>
        </section>

        <LabTabs />
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-2 py-8 text-[13px] text-fg-secondary">
        <span>© 2026 subq lab</span>
        <span>
          Model <code className="font-mono text-fg">subq-snap-preview</code>
        </span>
      </footer>
    </div>
  );
}
