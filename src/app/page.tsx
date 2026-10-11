import { LabTabs } from "@/components/lab-tabs";
import { SessionStats } from "@/components/session-stats";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-[0.08em] text-accent uppercase">SubQ Decisions API</p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance">SubQ Lab</h1>
          <p className="max-w-xl text-pretty text-fg-secondary">
            Real tasks answered with calibrated probabilities instead of generated text. Every answer shows how sure the model is.
          </p>
        </div>
        <SessionStats />
      </header>
      <main id="main" tabIndex={-1} className="outline-none">
        <LabTabs />
      </main>
    </div>
  );
}
