import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

const buttonVariants = {
  primary: "bg-accent text-on-accent hover:bg-[oklch(from_var(--color-accent)_calc(l+0.04)_c_h)]",
  secondary: "bg-raised text-fg ring-1 ring-line hover:ring-line-strong",
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
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium whitespace-nowrap transition-[scale,background-color,box-shadow] duration-150 ease-out active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100",
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
      className="size-4 shrink-0 rounded-full border-2 border-current border-t-transparent opacity-80 motion-safe:animate-spin"
    />
  );
}

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      {...props}
      className={clsx(
        "rounded-[28px] bg-surface p-5 shadow-[inset_0_1px_0_0_oklch(1_0_0/0.06),0_24px_48px_-24px_oklch(0_0_0/0.7)] ring-1 ring-line backdrop-blur-xl",
        className,
      )}
    />
  );
}

export function PanelHeading({ id, title, description }: { id?: string; title: string; description?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 id={id} className="text-lg font-semibold tracking-tight text-balance">{title}</h2>
      {description && <p className="text-sm text-pretty text-fg-secondary">{description}</p>}
    </div>
  );
}

export const fieldClass =
  "w-full rounded-lg bg-raised px-3 py-2.5 text-base text-fg ring-1 ring-line placeholder:text-fg-tertiary hover:ring-line-strong sm:text-sm";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label {...props} className={clsx("text-sm font-medium text-fg-secondary", className)} />;
}

export function Chip({ selected, className, ...props }: ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...props}
      className={clsx(
        "min-h-9 rounded-full px-3.5 text-sm transition-[scale,background-color,box-shadow] duration-150 ease-out active:scale-[0.96]",
        selected ? "bg-accent-soft text-fg ring-1 ring-accent" : "bg-raised text-fg-secondary ring-1 ring-line hover:text-fg hover:ring-line-strong",
        className,
      )}
    />
  );
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-1 rounded-2xl px-6 py-10 text-center ring-1 ring-line ring-inset">
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-pretty text-fg-secondary">{children}</p>
    </div>
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
