"use client";

import { ChevronRight, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { Children, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Settings' grouped lists, in the manner of Apple's System Settings: a small uppercase heading (12px, muted) over a group; the group the
 * one light surface (--card, radius 20px, no shadow – the page and this, two levels, never a panel in a panel); rows 52px with 16px padding, a thin line between them (ink 8 %) that starts where
 * the text starts. Each child is one row.
 */
export function SettingsGroup({ title, footer, children, className }: { title?: string; /** A small note under the group */ footer?: ReactNode; children: ReactNode; className?: string }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <section className={className}>
      {title && <h3 className="mb-2 px-4 text-eyebrow uppercase text-muted">{title}</h3>}
      <ul className="settings-list overflow-hidden rounded-[20px] bg-(--surface)">
        {rows.map((row, i) => (
          <li key={i}>{row}</li>
        ))}
      </ul>
      {footer && <p className="mt-2 px-4 text-small text-muted">{footer}</p>}
    </section>
  );
}

/** The same surface for a form instead of rows (Edit profile): heading above, the fields inside with 16px padding. */
export function SettingsPanel({ id, title, description, children, className }: { id?: string; title?: string; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("scroll-mt-[calc(var(--header-h)+32px)]", className)}>
      {title && <h3 className="mb-2 px-4 text-eyebrow uppercase text-muted">{title}</h3>}
      <div className="space-y-5 rounded-[20px] bg-(--surface) p-6">
        {description && <p className="text-small text-muted">{description}</p>}
        {children}
      </div>
    </section>
  );
}

/** The small symbol of a navigation entry: a 28px square, radius 8px, ink 6 %, the icon ink. */
export function IconTile({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg bg-ink/6 text-ink [&_svg]:size-4", className)}>{children}</span>;
}

type RowProps = {
  /** A leading symbol (IconTile) or avatar */
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right, muted: the current value */
  value?: ReactNode;
  /** Right: a switch, a menu, a button */
  control?: ReactNode;
  /** A page behind it: › */
  chevron?: boolean;
  /** Red title (Delete account) */
  danger?: boolean;
  href?: string;
  onClick?: () => void;
  /** Where the line above starts when the leading element isn't a 28px tile (an avatar): px from the row's left */
  inset?: number;
};

/** One row: title (15px) and optional subtitle (13px muted) on the left, value and/or control on the right, › for a page behind it. */
export function SettingsRow({ icon, title, subtitle, value, control, chevron = false, danger = false, href, onClick, inset }: RowProps) {
  const style = { "--row-inset": `${inset ?? (icon ? 56 : 16)}px` } as CSSProperties;
  const body = (
    <>
      {icon}
      <span className="min-w-0 flex-1 py-3">
        <span className={cn("block text-body", danger ? "text-danger" : "text-ink")}>{title}</span>
        {subtitle && <span className="mt-0.5 block text-small text-muted">{subtitle}</span>}
      </span>
      {value !== undefined && value !== null && <span className="min-w-0 shrink truncate text-right text-body text-muted">{value}</span>}
      {control}
      {chevron && <ChevronRight aria-hidden className="size-4 shrink-0 text-ink/30" />}
    </>
  );
  const base = "settings-row relative flex min-h-13 w-full items-center gap-3 px-4 text-left";
  const pressable = "transition-colors duration-150 hover:bg-ink/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--focus-ring)";
  if (href) {
    return (
      <Link href={href} style={style} className={cn(base, pressable)}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={style} className={cn(base, pressable)}>
        {body}
      </button>
    );
  }
  return (
    <div style={style} className={base}>
      {body}
    </div>
  );
}

/**
 * One choice out of a few, as a menu on the row's right ("Push only ⌃⌄"): the system's own menu, the value in muted text. Picking saves
 * right away (the caller's onChange).
 */
export function RowSelect<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: ReadonlyArray<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <label className="relative flex shrink-0 items-center text-body text-muted transition-colors hover:text-ink">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="min-h-11 cursor-pointer appearance-none bg-transparent pr-5 text-right focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronsUpDown aria-hidden className="pointer-events-none absolute right-0 size-3.5" />
    </label>
  );
}
