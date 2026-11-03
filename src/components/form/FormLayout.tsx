"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cardClass } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/*
 * Shared building blocks of the form pages (Open a House, Edit profile, Settings) so they look and behave the same:
 * a 1120px container, a form column + 360px sticky preview column, section cards (cardClass), fields with a 14px
 * muted label above, a muted "Optional", one 44px input style, 13px helper text below, a thin progress bar and a
 * sticky footer bar inside the form column (one primary button in it).
 */

/**
 * Narrower than the 1680px feed container – forms read better at this width. The header stays full width.
 * "wide" (Open a House): 1280px, for the 400px preview column.
 */
export function FormContainer({ children, className, wide = false }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn("mx-auto pt-6 md:pt-8", wide ? "w-[min(100%-2*var(--page-margin),1280px)]" : "w-[min(100%-2*var(--page-margin),1120px)]", className)}>{children}</div>;
}

/**
 * Form left; preview right from lg up (360px, sticky 32px under the header). Without a preview the form spans.
 * "wide": a 400px column, sticky 24px under the header and never taller than the viewport, so it never scrolls away.
 */
export function FormGrid({ form, preview, wide = false }: { form: ReactNode; preview?: ReactNode; wide?: boolean }) {
  return (
    <div className={cn("split:grid split:items-start split:gap-10", wide ? "split:grid-cols-[minmax(0,1fr)_400px]" : "split:grid-cols-[minmax(0,1fr)_360px]")}>
      <div className="min-w-0 max-w-[720px]">{form}</div>
      {preview && (
        // Starts level with the form's first card; sticky 32px under the header.
        <aside className={cn("hidden self-start split:sticky split:top-[calc(var(--header-h)+32px)] split:block", wide && "split:max-h-[calc(100dvh-var(--header-h)-64px)]")}>
          {preview}
        </aside>
      )}
    </div>
  );
}

/** Page header inside the FormContainer: optional back arrow + title (text-h2) on one row, extra content on the right. */
export function FormHeader({ title, back, aside }: { title: string; back?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      {back}
      <h1 className="min-w-0 flex-1 truncate text-h2">{title}</h1>
      {aside}
    </div>
  );
}

/** A section card (cardClass) with a 16px/500 heading. `id` lets checklists jump to it. Never nest cards inside. */
export function FormCard({ title, description, id, children, className }: { title?: string; description?: ReactNode; id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("scroll-mt-[calc(var(--header-h)+32px)] space-y-4", cardClass, className)}>
      {(title || description) && (
        <div>
          {title && <h2 className="text-body font-medium text-ink">{title}</h2>}
          {description && <p className="mt-0.5 text-small text-muted">{description}</p>}
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
  /** The label in ink 15px/500 (one-question steps) instead of 14px muted */
  prominent?: boolean;
  id?: string;
  children: ReactNode;
}

export function FormField({ label, optional = false, helper, error, group = false, aside, prominent = false, id, children }: FormFieldProps) {
  const t = useTranslations("common.ui.form");
  const Wrapper = group ? "div" : "label";
  return (
    <Wrapper id={id} className="block scroll-mt-[calc(var(--header-h)+32px)]" {...(group ? { role: "group", "aria-label": label } : {})}>
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className={prominent ? "text-body font-medium text-ink" : "text-small text-muted"}>{label}</span>
        {aside ?? (optional && <span className="text-small text-muted">{t("optional")}</span>)}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-1.5 block text-small text-red-600">
          {error}
        </span>
      ) : (
        helper && <span className="mt-1.5 block text-small text-muted">{helper}</span>
      )}
    </Wrapper>
  );
}

/**
 * The one field style of the app: 44px, rounded-xl, a soft warm tint without a frame, accent focus ring, ink 15px
 * text (red ring when aria-invalid). For inputs, native selects and field-like triggers (Combobox, date range).
 * Numbers are typed (inputMode="numeric") – never steppers; the global CSS hides number spinners.
 */
export const formInput =
  "h-11 w-full rounded-xl bg-ink/5 px-4 text-body text-ink outline-none transition-shadow placeholder:text-muted focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:text-muted aria-invalid:ring-2 aria-invalid:ring-red-300";
/** Textarea variant: grows from `rows` (auto-grow is up to the caller). */
export const formTextarea = cn(formInput, "h-auto resize-none py-2.5 leading-relaxed");

/** A thin progress bar (accent fill) with "Step N of 9" above it – no step labels. */
export function FlowProgress({ value, label, className }: { /** 0–1 */ value: number; label: string; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-2 text-small text-muted" aria-live="polite">
        {label}
      </p>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label} className="h-1 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

/**
 * Sticky footer bar inside the form column (above the safe area on phones, 16px off the bottom on desktop): Back /
 * Cancel as tertiary on the left, the form's one primary (Next, Publish, Save) on the right.
 */
export function StickyFormBar({ children, slideIn = false }: { children: ReactNode; /** Slides up when mounted (shown only while there's something to save) */ slideIn?: boolean }) {
  return (
    <div
      className={cn(
        "sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 mt-4 flex items-center gap-3 rounded-xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.08)]/90 px-4 py-3 shadow-sm backdrop-blur md:bottom-4",
        slideIn && "animate-slide-up",
      )}
    >
      {children}
    </div>
  );
}

/** Right column: "PREVIEW" as an eyebrow (12px/600, accent, upper case) above the preview content. */
export function PreviewColumn({ label, children }: { label?: string; children: ReactNode }) {
  const t = useTranslations("common.ui.form");
  return (
    <div>
      <p className="mb-2 text-eyebrow uppercase text-accent">{label ?? t("preview")}</p>
      {children}
    </div>
  );
}
