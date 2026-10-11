import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

const buttonVariants = {
  primary: "bg-solid text-on-solid hover:opacity-90",
  secondary: "bg-surface text-fg hover:bg-raised",
};

export function Button({
  variant = "secondary",
  pending = false,
  className,
  children,
  disabled,
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof buttonVariants; pending?: boolean }) {
  return (
    <button
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={clsx(
        "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-[13px] font-medium whitespace-nowrap transition-[scale,background-color,opacity] duration-150 ease-out motion-safe:active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
        buttonVariants[variant],
        className,
      )}
    >
      {pending && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-3.5 shrink-0 rounded-full border-[1.5px] border-current border-t-transparent opacity-80 motion-safe:animate-spin"
    />
  );
}

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return <section {...props} className={clsx("flex min-w-0 flex-col gap-5", className)} />;
}

export function SectionLabel({
  id,
  title,
  count,
  action,
  level = 3,
}: {
  id?: string;
  title: string;
  count?: number;
  action?: ReactNode;
  level?: 2 | 3;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 text-[13px] text-fg-secondary">
      <Heading id={id} className="lowercase">
        {title}
        {count !== undefined && (
          <>
            <span aria-hidden="true" className="px-1.5 text-bar">
              /
            </span>
            <span className="tabular-nums">{String(count).padStart(2, "0")}</span>
          </>
        )}
      </Heading>
      {action}
    </div>
  );
}

export const fieldClass =
  "w-full rounded-xl bg-surface px-3.5 py-3 text-base text-fg placeholder:text-fg-secondary hover:bg-raised focus-visible:bg-canvas focus-visible:outline-offset-0 sm:text-ui";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label {...props} className={clsx("text-[13px] font-medium text-fg", className)} />;
}

export function Chip({ selected, className, ...props }: ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...props}
      className={clsx(
        "min-h-8 rounded-full px-3 text-[13px] transition-[scale,background-color,color] duration-150 ease-out motion-safe:active:scale-[0.96]",
        selected ? "bg-solid text-on-solid" : "bg-surface text-fg-secondary hover:bg-raised hover:text-fg",
        className,
      )}
    />
  );
}

export function LiveStatus({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}

export function humanize(key: string) {
  const spaced = key.replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function Split({ input, readout }: { input: ReactNode; readout: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-20">
      <div className="flex min-w-0 flex-col gap-7 lg:sticky lg:top-24 lg:self-start">{input}</div>
      <div className="flex min-w-0 flex-col gap-10">{readout}</div>
    </div>
  );
}

export function TaskHeader({ step, title, children }: { step: string; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-fg-secondary lowercase">{step}</p>
      <h2 className="text-[26px] leading-[1.1] font-medium tracking-[-0.03em] text-balance">{title}</h2>
      <p className="text-ui text-pretty text-fg-secondary">{children}</p>
    </div>
  );
}

export function Waiting({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-1 rounded-3xl border border-dashed border-bar/50 px-6 py-12 text-center">
      <p className="text-ui font-medium">{title}</p>
      <p className="max-w-[44ch] text-[13px] text-pretty text-fg-secondary">{children}</p>
    </div>
  );
}

export function Skeletons({ count = 4 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="grid gap-2 sm:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-44 rounded-2xl bg-surface motion-safe:animate-pulse" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}
