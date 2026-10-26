"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Shared building blocks of the form pages (Open a House, Edit profile, Settings) so they look and behave the same:
 * a 1120px container, a form column + 360px sticky preview column, white section cards, labelled fields with a
 * muted "Optional", one input style, a segmented step bar and a sticky footer bar inside the form column.
 */

/**
 * Narrower than the 1600px feed container – forms read better at this width. The header stays full width.
 * "wide" (Open a House): 1280px, for the 400px preview column.
 */
export function FormContainer({ children, className, wide = false }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn("mx-auto w-full px-4 pt-6 md:px-8 md:pt-10", wide ? "max-w-[1280px]" : "max-w-[1120px]", className)}>{children}</div>;
}

/**
 * Form left; preview right from lg up (360px, sticky 32px under the header). Without a preview the form spans.
 * "wide": a 400px column, sticky 24px under the header and never taller than the viewport, so it never scrolls away.
 */
export function FormGrid({ form, preview, wide = false }: { form: ReactNode; preview?: ReactNode; wide?: boolean }) {
  return (
    <div className={cn("lg:grid lg:gap-10", wide ? "lg:grid-cols-[minmax(0,1fr)_400px]" : "lg:grid-cols-[minmax(0,1fr)_360px]")}>
      <div className="min-w-0">{form}</div>
      {preview && (
        <aside
          className={cn(
            "hidden self-start lg:sticky lg:block",
            wide ? "lg:top-[calc(var(--header-h)+24px)] lg:max-h-[calc(100dvh-var(--header-h)-48px)]" : "lg:top-[calc(var(--header-h)+32px)]",
          )}
        >
          {preview}
        </aside>
      )}
    </div>
  );
}

/** Page header inside the FormContainer: optional back arrow + title (text-3xl) on one row, extra content on the right. */
export function FormHeader({ title, back, aside }: { title: string; back?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      {back}
      <h1 className="min-w-0 flex-1 truncate text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
      {aside}
    </div>
  );
}

/** A white section card with a small heading. `id` lets checklists jump to it. */
export function FormCard({ title, description, id, children, className }: { title?: string; description?: ReactNode; id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("scroll-mt-[calc(var(--header-h)+32px)] space-y-4 rounded-[24px] bg-white p-6", className)}>
      {(title || description) && (
        <div>
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {description && <p className="mt-0.5 text-[13px] text-zinc-500">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Stack of FormCards with the standard 16px gap. */
export function FormCards({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

interface FormFieldProps {
  label: string;
  /** Shows a small muted "Optional" on the right of the label (never "(optional)" in the label itself). */
  optional?: boolean;
  helper?: ReactNode;
  error?: string | null;
  /** Renders a div (role=group) instead of a <label>, for groups of buttons or composite inputs. */
  group?: boolean;
  /** Content right of the label row (e.g. a counter) */
  aside?: ReactNode;
  id?: string;
  children: ReactNode;
}

export function FormField({ label, optional = false, helper, error, group = false, aside, id, children }: FormFieldProps) {
  const t = useTranslations("common.ui.form");
  const Wrapper = group ? "div" : "label";
  return (
    <Wrapper id={id} className="block scroll-mt-[calc(var(--header-h)+32px)]" {...(group ? { role: "group", "aria-label": label } : {})}>
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-ink">{label}</span>
        {aside ?? (optional && <span className="text-xs text-zinc-400">{t("optional")}</span>)}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-1.5 block text-[13px] text-red-600">
          {error}
        </span>
      ) : (
        helper && <span className="mt-1.5 block text-[13px] text-zinc-500">{helper}</span>
      )}
    </Wrapper>
  );
}

/** The one input style of the form pages: h-11, rounded-xl, warm grey fill, soft focus ring. */
export const formInput =
  "h-11 w-full rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] px-4 text-[15px] outline-none transition-shadow placeholder:text-neutral-400 focus:ring-2 focus:ring-ink/20 disabled:cursor-not-allowed disabled:text-zinc-400 aria-invalid:border-red-300";
/** Textarea variant (auto-grow is up to the caller). */
export const formTextarea = cn(formInput, "h-auto resize-none py-2.5 leading-relaxed");

/** Segmented progress: equal segments, filled dark up to the current step, 13px labels underneath. */
export function StepProgress({ steps, current, reachable = current, onSelect }: { steps: string[]; current: number; reachable?: number; onSelect?: (step: number) => void }) {
  return (
    <ol className="mb-6 grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((label, i) => {
        const done = i <= current;
        const canJump = Boolean(onSelect) && i <= reachable && i !== current;
        return (
          <li key={label}>
            <button
              type="button"
              disabled={!canJump}
              onClick={() => onSelect?.(i)}
              aria-current={i === current ? "step" : undefined}
              className="block w-full text-left disabled:cursor-default"
            >
              <span className={cn("block h-1.5 rounded-full transition-colors", done ? "bg-ink" : "bg-black/10")} />
              <span className={cn("mt-2 block truncate text-[13px]", i === current ? "font-semibold text-ink" : "text-zinc-500")}>{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Sticky footer bar inside the form column (above the safe area on phones, 16px off the bottom on desktop). */
export function StickyFormBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 mt-4 flex items-center gap-3 rounded-2xl border-t border-black/5 bg-white/90 px-4 py-3 shadow-sm backdrop-blur md:bottom-4">
      {children}
    </div>
  );
}

/** Right column: "Preview" label (12px uppercase muted) above the preview content. */
export function PreviewColumn({ label, children }: { label?: string; children: ReactNode }) {
  const t = useTranslations("common.ui.form");
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">{label ?? t("preview")}</p>
      {children}
    </div>
  );
}
