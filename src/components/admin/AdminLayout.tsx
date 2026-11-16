"use client";

// The admin's basic order (CLAUDE.md "Admin › Grundordnung"):
//   AdminPageHeader – a short noun as the title ("Übersicht", "Houses", "Posteingang"), under it ONE row: tabs left, controls right (period,
//                     sort as a dropdown, search as an icon). No further capsule rows on the page.
//   AdminTabs       – the tabs of that row, each with its count; a tab named by a technical term gets an ⓘ with one sentence.
//   AdminListDetail – the list left (about 40 %), the detail right. A row: status dot · title · one line of meta · on the right only ✓
//                     (Erledigt) or nothing. Every other action lives in the detail.
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { FileText } from "lucide-react";
import type { Status } from "@/lib/admin/metrics";
import { cn } from "@/lib/utils";
import { StatusDot } from "./AdminCharts";
import { InfoTip } from "./AdminNumbers";

export interface AdminTab<T extends string> {
  value: T;
  label: string;
  count?: number;
  /** One sentence for a technical term (an ⓘ beside the tab) */
  info?: string;
}

/**
 * The page head: no visible title – the side list shows where you are. The title stays as an invisible <h1> (and in the browser tab, the
 * page's metadata "Wachstum · Admin"). The first row is the click row: tabs left, controls right (a small badge like "Demo-Daten" with the
 * tabs). A page without tabs or controls starts straight with its numbers.
 */
export function AdminPageHeader({ title, badge, tabs, controls }: { title: string; badge?: string; tabs?: ReactNode; controls?: ReactNode }) {
  const row = Boolean(tabs || controls || badge);
  return (
    <header className={cn(row && "mb-(--adm-section)")}>
      <h1 className="sr-only">{title}</h1>
      {row && (
        <div data-admin-head-row className="flex min-h-(--adm-capsule-h,32px) flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {tabs}
            {badge && <Badge icon={<FileText aria-hidden />}>{badge}</Badge>}
          </div>
          {controls && <div className="flex flex-wrap items-center justify-end gap-3">{controls}</div>}
        </div>
      )}
    </header>
  );
}

/** The tabs: words with their count – the chosen one bold, white, underlined (2px), no surface; the others white 60 %; an ⓘ after a technical term. */
export function AdminTabs<T extends string>({ label, tabs, value, onChange }: { label: string; tabs: readonly AdminTab<T>[]; value: T; onChange: (value: T) => void }) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap items-center gap-1">
      {tabs.map((tab) => {
        const on = tab.value === value;
        return (
          <span key={tab.value} className="inline-flex items-center">
            <button
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(tab.value)}
              className={cn(
                "inline-flex h-(--adm-capsule-h,32px) items-center gap-1.5 px-2 text-nav-main transition-colors duration-150 first:pl-0",
                on ? "font-semibold text-(--adm-active) underline decoration-2 underline-offset-4" : "text-(--adm-idle) hover:text-(--adm-hover)",
              )}
            >
              {tab.label}
              {tab.count !== undefined && <span className={cn("tabular-nums no-underline", on ? "text-ink/70" : "text-ink/45")}>{tab.count}</span>}
            </button>
            {tab.info && <InfoTip text={tab.info} />}
          </span>
        );
      })}
    </div>
  );
}

/** Sort as a dropdown: "Sortieren: Wert pro Jahr ▾" – a small menu under it. */
export function AdminSort<T extends string>({ label, options, value, onChange }: { label: string; options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    window.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", key);
    };
  }, [open]);
  const current = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="inline-flex h-(--adm-capsule-h,32px) items-center gap-1.5 rounded-full px-3 text-nav-main text-ink/80 transition-colors duration-150 hover:bg-ink/6 hover:text-ink">
        <span className="text-ink/50">{label}:</span>
        {current?.label}
        <ChevronDown aria-hidden className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul role="listbox" aria-label={label} className="bar-menu absolute right-0 top-full z-30 mt-2 min-w-48">
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="flex h-9 w-full items-center justify-between gap-3 rounded-[10px] px-3 text-left text-nav-main text-ink hover:bg-ink/8"
              >
                {o.label}
                {o.value === value && <Check aria-hidden className="size-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Search as an icon; a click opens the field in place (Escape or ✕ closes and clears). `disabled`: shown, not usable (e.g. only in "Alle"). */
export function AdminSearch({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(value !== "");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  if (!open)
    return (
      <button type="button" aria-label={label} disabled={disabled} onClick={() => setOpen(true)} className="inline-flex size-(--adm-capsule-h,32px) items-center justify-center rounded-full text-ink/70 transition-colors duration-150 hover:bg-ink/6 hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent">
        <Search aria-hidden className="size-4" />
      </button>
    );
  return (
    <span className="inline-flex h-(--adm-capsule-h,32px) w-60 items-center gap-2 rounded-full bg-ink/6 pl-3 pr-1">
      <Search aria-hidden className="size-4 shrink-0 text-ink/60" />
      <input
        ref={input}
        type="text"
        inputMode="search"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          onChange("");
          setOpen(false);
        }}
        className="min-w-0 flex-1 bg-transparent text-nav-main text-ink outline-none placeholder:text-ink/45"
      />
      <button
        type="button"
        aria-label="✕"
        onClick={() => {
          onChange("");
          setOpen(false);
        }}
        className="flex size-6 items-center justify-center rounded-full text-ink/60 hover:bg-ink/8 hover:text-ink"
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </span>
  );
}

export interface ListDetailRow {
  id: string;
  /** The dot: a status (getStatus), "critical" for needs-you, null for a quiet one; undefined – no dot */
  status?: Status | null;
  /** An image before the title (Houses, hosts) */
  media?: ReactNode;
  title: ReactNode;
  /** One line */
  meta?: ReactNode;
  /** A short value on the right, before ✓ (a date, "voll in 6 Tagen") */
  aside?: ReactNode;
  /** Shown as done (grey) */
  done?: boolean;
}

/**
 * The list left (about 40 %), the detail right (sticky under the header). A row: dot · (image) · title · one meta line · on the right only
 * ✓ (Erledigt) – or nothing. Everything else in the detail. Phones: the list, then the detail with "‹ Liste".
 */
export function AdminListDetail({ rows, selectedId, onSelect, onDone, doneLabel, detail, empty, label, head, rowHeight = "min-h-(--adm-row-h)" }: {
  rows: readonly ListDetailRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** The one button a row may have: ✓ */
  onDone?: (id: string) => void;
  doneLabel?: string;
  detail: ReactNode;
  empty: ReactNode;
  label: string;
  /** A row's height class (Hosts: 52px) */
  rowHeight?: string;
  /** Column heads over the list (Hosts) */
  head?: ReactNode;
}) {
  const t = useTranslations("admin.layout");
  if (rows.length === 0) return <div className="py-6">{empty}</div>;
  return (
    <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className={cn("min-w-0", selectedId && "max-lg:hidden")}>
      {head}
      <ul aria-label={label} className="divide-y divide-ink/8 border-y border-ink/8">
        {rows.map((row) => {
          const on = row.id === selectedId;
          return (
            <li key={row.id} className={cn("group relative flex items-center gap-3 px-2", rowHeight, row.done && "opacity-50")}>
              <button type="button" onClick={() => onSelect(row.id)} aria-current={on || undefined} className="absolute inset-0 rounded-none text-left" aria-label={typeof row.title === "string" ? row.title : undefined} />
              {row.status !== undefined && <StatusDot status={row.status} className="pointer-events-none" />}
              {row.media && <span className="pointer-events-none shrink-0">{row.media}</span>}
              <span className="pointer-events-none min-w-0 flex-1 py-2">
                {/* Chosen: bold, white, underlined – no surface. */}
                <span className={cn("block truncate text-body", on ? "font-semibold text-(--adm-active) underline decoration-2 underline-offset-4" : "font-medium text-ink")}>{row.title}</span>
                {row.meta && <span className="block truncate text-small text-muted">{row.meta}</span>}
              </span>
              {row.aside && <span className="pointer-events-none shrink-0 text-small text-muted tabular-nums">{row.aside}</span>}
              {onDone && !row.done && (
                <button type="button" onClick={() => onDone(row.id)} aria-label={doneLabel ?? t("done")} className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-ink/50 transition-colors duration-150 hover:bg-ink/8 hover:text-adm-good">
                  <Check aria-hidden className="size-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      </div>
      <div className={cn("min-w-0 lg:sticky lg:top-[calc(var(--header-h)+var(--adm-page))] lg:self-start", !selectedId && "max-lg:hidden")}>{detail}</div>
    </div>
  );
}

/** "‹ Liste" on phones, above the detail. */
export function BackToList({ onBack }: { onBack: () => void }) {
  const t = useTranslations("admin.layout");
  return (
    <button type="button" onClick={onBack} className="mb-4 text-body text-ink lg:hidden">
      ‹ {t("list")}
    </button>
  );
}
