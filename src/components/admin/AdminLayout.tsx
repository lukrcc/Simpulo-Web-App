"use client";

// The admin's basic order (CLAUDE.md "Admin › Grundordnung"):
//   AdminPageHeader – a short noun as the title ("Übersicht", "Houses", "Posteingang"), under it ONE row: tabs left, controls right (period,
//                     sort as a dropdown, search as an icon). No further capsule rows on the page.
//   AdminTabs       – the tabs of that row (capsules), each with its count; a tab named by a technical term carries one sentence as a tooltip.
//   AdminSubTabs    – the second level, smaller capsules right under the row, only when a tab has sub-items.
//   AdminListDetail – the list left (about 40 %), the detail right. A row: status dot · title · one line of meta · on the right only ✓
//                     (Erledigt) or nothing. Every other action lives in the detail.
import { ArrowUpRight, Check, ChevronDown, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useRef, useState, type ReactNode, createContext, useContext, useLayoutEffect, type CSSProperties } from "react";
import { Badge } from "@/components/ui/Badge";
import { FileText } from "lucide-react";
import type { Status } from "@/lib/admin/metrics";
import { cn } from "@/lib/utils";
import { useTabScroll } from "@/components/ui/useTabScroll";
import { COMPARE_PERIODS } from "@/config/admin";
import { useAdminDay, useAdminFocus, useAdminPeriod } from "@/lib/admin/period";
import { periodEnd, periodStart } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { day as dayLabel } from "@/lib/i18n/adminFormat";
import { InfoTip } from "./AdminNumbers";
import { StatusDot } from "./AdminCharts";

export interface AdminTab<T extends string> {
  value: T;
  label: string;
  count?: number;
  /** One sentence for a technical term – a tooltip on the capsule itself (hover; long press on touch). No ⓘ beside a tab (Regel). */
  tooltip?: string;
  /**
   * A colour of its own (a CSS colour – a unit, config/admin-tiles.ts, or Aufgaben's kinds "var(--adm-kind-safety)"): the capsule softly
   * filled in it (12 %, active 24 % with an edge in the full colour), its words neutral (admin-tokens.css "Unit colour").
   */
  tone?: string;
  /** Not choosable (a day still to come) – shown greyed */
  disabled?: boolean;
  /** Marked (today among the days): a small dot after the name */
  marked?: boolean;
  /** A small colour dot before the name on a neutral capsule (Aufgaben's kinds – CLAUDE.md "Ruhe") */
  dot?: string;
}

/**
 * The page head: no visible title – the side list shows where you are. The title stays as an invisible <h1> (and in the browser tab, the
 * page's metadata "Wachstum · Admin"). The first row is the click row: tabs left (AdminTabs), settings right in the same capsules (period,
 * sort, search). `subTabs`: the second level (AdminSubTabs) right under that row, only when a tab has sub-items. A page without tabs or
 * controls starts straight with its numbers.
 */
export function AdminPageHeader({ title, badge, tabs, controls, center, subTabs }: { title: string; badge?: string; tabs?: ReactNode; controls?: ReactNode; /** Centred in the click row (the overview's period) */ center?: ReactNode; subTabs?: ReactNode }) {
  const row = Boolean(tabs || controls || badge || center);
  const sticky = row || Boolean(subTabs);
  const ref = useRef<HTMLElement>(null);
  const [stuck, setStuck] = useState(false);
  // The bar's height as --adm-bar-h on the admin scope: the detail column (AdminListDetail) and anchors (scroll-margin-top) start under it.
  useLayoutEffect(() => {
    const el = ref.current;
    const scope = el?.closest<HTMLElement>(".admin-scope");
    if (!el || !scope || !sticky) return;
    const set = () => scope.style.setProperty("--adm-bar-h", `${Math.round(el.getBoundingClientRect().height)}px`);
    set();
    const observer = new ResizeObserver(set);
    observer.observe(el);
    return () => {
      observer.disconnect();
      scope.style.removeProperty("--adm-bar-h");
    };
  }, [sticky]);
  // The fine line under the bar only once the page has scrolled.
  useEffect(() => {
    if (!sticky) return;
    const onScroll = () => setStuck(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sticky]);
  return (
    // Sticky right under the header (CLAUDE.md "Admin: Tab-Leiste immer sichtbar"): the page's background, opaque, over the column's side
    // padding too, so what scrolls disappears cleanly under it; it carries the gap under the header itself (pt), so nothing moves at rest.
    <header
      ref={ref}
      data-admin-bar={sticky || undefined}
      data-stuck={stuck || undefined}
      className={cn(
        sticky && "sticky top-(--header-total) z-20 -mx-4 -mt-(--adm-page-top) border-b border-transparent bg-(--bg) px-4 pt-(--adm-page-top) pb-2 transition-colors duration-150 data-stuck:border-ink/8 md:-mx-(--adm-page-inset) md:px-(--adm-page-inset)",
        // ONE gap from the capsule rows to the content on every page (CLAUDE.md "Admin: einheitlicher Kopfbereich"): --adm-header-gap (the bar's
        // own pb-2 counts in).
        sticky && "mb-[calc(var(--adm-header-gap)-0.5rem)]",
      )}
    >
      <h1 className="sr-only">{title}</h1>
      {row && center && (
        <div data-admin-head-row className="grid min-h-(--adm-capsule-h) grid-cols-[1fr_auto_1fr] items-center gap-x-6">
          <div className="flex min-w-0 items-center gap-3">{tabs}</div>
          <div className="flex justify-center">{center}</div>
          <div className="flex justify-end gap-(--adm-cap-gap)">{controls}</div>
        </div>
      )}
      {row && !center && (
        <div data-admin-head-row className="flex min-h-(--adm-capsule-h) items-center justify-between gap-x-6 gap-y-3 max-md:flex-wrap">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {tabs}
            {badge && <Badge icon={<FileText aria-hidden />}>{badge}</Badge>}
          </div>
          {controls && <div className="flex shrink-0 flex-wrap items-center justify-end gap-(--adm-cap-gap)">{controls}</div>}
        </div>
      )}
      {/* The second row (sub-tabs, the days of a week) the same distance under the first on every page. */}
      {subTabs && <div data-admin-head-row2 className={cn(row && "mt-(--adm-header-row-gap)")}>{subTabs}</div>}
    </header>
  );
}

/**
 * The admin's one tab block (CLAUDE.md "Admin › Umschalter"): capsules like the filter capsules in the product's header – inactive a graphite
 * capsule (white 8 %) with muted words, the chosen one filled white with dark words, no underline. A count inside the capsule ("Pro 31"); an
 * explanation is a tooltip on the capsule (`tooltip`: hover, long press on touch) – never an ⓘ beside it. One height (--adm-capsule-h; the second level --adm-subcapsule-h), one gap everywhere. Many tabs: the row scrolls sideways, it
 * never wraps. `level="sub"` is AdminSubTabs.
 */
/**
 * A page shown as a tab of another page (Bewerbungen in Hosts, Warteliste in Wachstum): its own tabs become the second level – AdminShell
 * sets this, AdminTabs without an explicit level follow it.
 */
export const TabLevelContext = createContext<"main" | "sub">("main");

export function AdminTabs<T extends string>({ label, tabs, value, onChange, level: levelProp, className }: { label: string; tabs: readonly AdminTab<T>[]; value: T; onChange: (value: T) => void; level?: "main" | "sub"; className?: string }) {
  const inherited = useContext(TabLevelContext);
  const level = levelProp ?? inherited;
  const ref = useRef<HTMLDivElement>(null);
  useTabScroll(ref, value);
  return (
    <div ref={ref} role="tablist" aria-label={label} data-adm-tabs={level} className={cn("adm-cap-row", className)}>
      {tabs.map((tab) => {
        const on = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(tab.value)}
            disabled={tab.disabled}
            className="adm-cap disabled:opacity-35"
            data-on={on || undefined}
            data-tooltip-info={tab.tooltip}
            style={tab.tone ? ({ "--cap-tone": tab.tone } as CSSProperties) : undefined}
            data-toned={tab.tone ? true : undefined}
          >
            {tab.dot && <span aria-hidden data-kind-dot className="inline-block size-2 shrink-0 rounded-full" style={{ backgroundColor: tab.dot }} />}
            {tab.label}
            {tab.marked && <span aria-hidden data-today className="ml-0.5 inline-block size-1.5 rounded-full bg-current align-middle" />}
            {tab.count !== undefined && <span className="adm-cap-count tabular-nums">{tab.count}</span>}
            {tab.tooltip && <span className="sr-only">. {tab.tooltip}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** The second level: smaller capsules, right under the first row – only when a tab has sub-items. */
export function AdminSubTabs<T extends string>(props: { label: string; tabs: readonly AdminTab<T>[]; value: T; onChange: (value: T) => void; className?: string }) {
  return <AdminTabs {...props} level="sub" />;
}

/**
 * The admin's one period switch – Tag · Woche · Monat · Quartal · Jahr (config/admin.ts COMPARE_PERIODS), each capsule's tooltip says what
 * it compares with; the choice is remembered (lib/admin/period.ts) and the same on every page with a period (Übersicht, Wachstum, Partner).
 */
export function PeriodTabs({ level }: { level?: "main" | "sub" }) {
  const t = useTranslations("admin.cockpit.compare");
  const [period, setPeriod] = useAdminPeriod();
  return (
    <span className="flex items-center gap-3">
      <AdminTabs level={level} label={t("label")} value={period} onChange={setPeriod} tabs={COMPARE_PERIODS.map((value) => ({ value, label: t(value), tooltip: t(`info.${value}`) }))} />
      <PeriodRange />
    </span>
  );
}

/**
 * The period as a menu button right in the click row (CLAUDE.md "Einstellungen als Menü rechts"): "Zeitraum: Woche ▾" – Woche · Monat ·
 * Quartal · Jahr; with Woche the days follow in the same menu (Mo … So · Ganze Woche: today marked, days to come greyed). Beside it, small,
 * what the period covers (PeriodRange). Übersicht keeps its centred capsules (PeriodTabs).
 */
export function PeriodMenu() {
  const t = useTranslations("admin.cockpit.compare");
  const [period, setPeriod] = useAdminPeriod();
  const [day, setDay] = useAdminDay();
  const { today } = useAdminInputs();
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
  const todayIndex = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const chosenDay = period === "week" && day !== null && day <= todayIndex ? day : null;
  const item = "flex h-9 w-full items-center justify-between gap-3 rounded-[10px] px-3 text-left text-nav-main text-ink hover:bg-ink/8 disabled:pointer-events-none disabled:opacity-40";
  return (
    <span className="flex shrink-0 items-center gap-3">
      <div ref={ref} className="relative shrink-0">
        <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="adm-cap" data-open={open || undefined} data-period-menu>
          <span className="adm-cap-count">{t("label")}:</span>
          {t(period)}
          {chosenDay !== null && ` · ${t(`days.d${chosenDay}` as "days.d0")}`}
          <ChevronDown aria-hidden className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div role="menu" aria-label={t("label")} className="bar-menu absolute right-0 top-full z-30 mt-2 w-60">
            {COMPARE_PERIODS.map((value) => (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={value === period}
                data-tooltip-info={t(`info.${value}`)}
                onClick={() => {
                  setPeriod(value);
                  if (value !== "week") setOpen(false);
                }}
                className={item}
              >
                {t(value)}
                {value === period && <Check aria-hidden className="size-4" />}
              </button>
            ))}
            {period === "week" && (
              <>
                <p className="mt-2 border-t border-(--line) px-3 pb-1 pt-2 text-eyebrow uppercase text-muted">{t("days.label")}</p>
                <div role="group" aria-label={t("days.label")} className="grid grid-cols-4 gap-1">
                  {Array.from({ length: 7 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="menuitemradio"
                      aria-checked={chosenDay === i}
                      disabled={i > todayIndex}
                      data-tooltip-info={i > todayIndex ? t("days.future") : i === todayIndex ? t("days.today") : undefined}
                      onClick={() => {
                        setDay(i);
                        setOpen(false);
                      }}
                      className={cn("flex h-9 items-center justify-center gap-1 rounded-[10px] text-nav-main text-ink hover:bg-ink/8 disabled:pointer-events-none disabled:opacity-40", chosenDay === i && "bg-ink/12 font-semibold")}
                    >
                      {t(`days.d${i}` as "days.d0")}
                      {i === todayIndex && <span aria-hidden className="inline-block size-1.5 rounded-full bg-current" />}
                    </button>
                  ))}
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={chosenDay === null}
                    onClick={() => {
                      setDay(null);
                      setOpen(false);
                    }}
                    className={cn("col-span-4 flex h-9 items-center justify-center rounded-[10px] text-nav-main text-ink hover:bg-ink/8", chosenDay === null && "bg-ink/12 font-semibold")}
                  >
                    {t("days.all")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <span data-period-range className="contents"><PeriodRange /></span>
    </span>
  );
}

/**
 * Beside the period: what it covers, small – "KW 48 · 23.–29. Nov" (a day chosen: "Mo 23. Nov."), "1.–23. Nov", "Q4 · 1. Okt – 23. Nov",
 * "1. Jan – 23. Nov"; its ⓘ says what it is compared with and that a missing comparison reads "neu".
 */
export function PeriodRange() {
  const t = useTranslations("admin.cockpit.compare");
  const [period] = useAdminPeriod();
  const { today } = useAdminInputs();
  const focus = useAdminFocus(today);
  const d = (date: string) => dayLabel(date).replace(/\.$/, "");
  const from = periodStart(today, period);
  const text = focus
    ? t("range.day", { weekday: t(`days.d${(new Date(`${focus.from}T00:00:00Z`).getUTCDay() + 6) % 7}` as "days.d0"), date: dayLabel(focus.from) })
    : period === "week"
      ? t("range.week", { kw: isoWeek(today), from: d(from).replace(/ .*/, ""), to: d(periodEnd(from, "week")) })
      : period === "month"
        ? t("range.month", { from: d(from).replace(/ .*/, ""), to: d(today) })
        : period === "quarter"
          ? t("range.quarter", { q: Math.floor(Number(today.slice(5, 7)) / 3.01) + 1, from: d(from), to: d(today) })
          : t("range.year", { from: d(from), to: d(today) });
  return (
    <span data-period-range className="inline-flex items-center gap-1 text-small whitespace-nowrap text-muted tabular-nums">
      {text}
      <InfoTip text={`${t(`info.${focus ? "day" : period}`)} ${t("fresh")}`} />
    </span>
  );
}

/**
 * "Woche" chosen: a second row of small capsules – Mo Di Mi Do Fr Sa So · Ganze Woche (the default). Today marked, days to come greyed; a day
 * makes every tile show that day, compared with the same weekday a week before. Remembered like the period (lib/admin/period.ts).
 */
export function PeriodDays({ level = "sub" }: { level?: "main" | "sub" } = {}) {
  const t = useTranslations("admin.cockpit.compare");
  const [period] = useAdminPeriod();
  const [day, setDay] = useAdminDay();
  const { today } = useAdminInputs();
  if (period !== "week") return null;
  const todayIndex = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  type V = "all" | `${number}`;
  const tabs: AdminTab<V>[] = [
    ...Array.from({ length: 7 }, (_, i): AdminTab<V> => ({ value: `${i}`, label: t(`days.d${i}` as "days.d0"), disabled: i > todayIndex, marked: i === todayIndex, tooltip: i > todayIndex ? t("days.future") : i === todayIndex ? t("days.today") : undefined })),
    { value: "all", label: t("days.all") },
  ];
  const value: V = day === null || day > todayIndex ? "all" : `${day}`;
  return <AdminTabs<V> level={level} label={t("days.label")} value={value} onChange={(v) => setDay(v === "all" ? null : Number(v))} tabs={tabs} />;
}

/**
 * The period as ONE capsule row (CLAUDE.md "Zeitraum als eine Kapsel-Reihe"): Woche · Monat · Quartal · Jahr, and – with Woche – after a
 * fine vertical line the days Mo … So · Ganze Woche (today with a dot, days to come greyed). Neutral capsules (silvery when active). What
 * the period covers (PeriodRange) stands right in the same row, set by the page's head.
 */
export function PeriodRow({ level = "main" }: { level?: "main" | "sub" }) {
  const t = useTranslations("admin.cockpit.compare");
  const [period, setPeriod] = useAdminPeriod();
  return (
    <span data-period-row className="flex min-w-0 items-center gap-3">
      <AdminTabs level={level} label={t("label")} value={period} onChange={setPeriod} tabs={COMPARE_PERIODS.map((value) => ({ value, label: t(value), tooltip: t(`info.${value}`) }))} />
      {period === "week" && (
        <>
          <span aria-hidden className="h-5 w-px shrink-0 bg-(--line)" />
          <PeriodDays level={level} />
        </>
      )}
    </span>
  );
}

/** ISO calendar week of a date (Monday starts the week; the week with the year's first Thursday is week 1). */
function isoWeek(date: string): number {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

/** Sort (or any choice from many): one capsule "Sortieren: Wert pro Jahr ▾" in the tabs' look, a small menu under it. */
export function AdminSort<T extends string>({ label, options, value, onChange, trigger }: { label: string; options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void; /** The capsule's own words instead of "label: chosen" (e.g. "Stufe ändern") */ trigger?: string }) {
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
    <div ref={ref} className="relative shrink-0">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="adm-cap" data-open={open || undefined}>
        {trigger ?? (
          <>
            <span className="adm-cap-count">{label}:</span>
            {current?.label}
          </>
        )}
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
      <button type="button" aria-label={label} disabled={disabled} onClick={() => setOpen(true)} className="adm-cap adm-cap-icon disabled:opacity-35">
        <Search aria-hidden className="size-4" />
      </button>
    );
  return (
    <span className="inline-flex h-(--adm-capsule-h) w-60 items-center gap-2 rounded-full bg-(--adm-cap-hover) pl-3 pr-1">
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
  /** A heading row before this row (Aufgaben › "Später"); with `sectionOnly` the row is only that heading (a collapsed section). */
  section?: ReactNode;
  sectionOnly?: boolean;
}

/**
 * The list left (about 40 %), the detail right (sticky under the header). A row: dot · (image) · title · one meta line · on the right only
 * ✓ (Erledigt) – or nothing. Everything else in the detail. Phones: the list, then the detail with "‹ Liste".
 */
export function AdminListDetail({ rows, selectedId, onSelect, onDone, doneLabel, detail, empty, label, head, rowHeight = "min-h-(--adm-row-h)", listScroll = false, calm = false }: {
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
  /** The list scrolls in its own column (from 1024px) and the page stays put – Aufgaben: only the list moves, the detail stands */
  listScroll?: boolean;
  /** The calm list (CLAUDE.md "Ruhe", Aufgaben): taller rows (76px), the title 17px, the meta a grey line of text, very fine lines, ✓ only on hover */
  calm?: boolean;
}) {
  const t = useTranslations("admin.layout");
  if (rows.length === 0) return <div className="py-6">{empty}</div>;
  return (
    <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div data-list-column className={cn("min-w-0", selectedId && "max-lg:hidden", listScroll && "scroll-pane lg:max-h-[calc(100dvh-var(--header-total)-var(--adm-bar-h,0px)-var(--adm-mini-h,0px)-var(--adm-header-gap)-var(--adm-page-inset))] lg:overflow-y-auto lg:overscroll-contain")}>
      {head}
      <ul aria-label={label} className={calm ? "divide-y divide-ink/5" : "divide-y divide-ink/8 border-y border-ink/8"}>
        {rows.map((row) => {
          const on = row.id === selectedId;
          const heading = row.section !== undefined && (
            <li key={`${row.id}-section`} data-list-section className="px-2 pt-4 pb-2">
              {row.section}
            </li>
          );
          if (row.sectionOnly) return heading;
          return (
            <Fragment key={row.id}>
            {heading}
            <li data-row-on={on || undefined} className={cn("group relative flex items-center gap-3 px-2 transition-colors duration-150", calm ? "min-h-19 rounded-lg px-3" : rowHeight, on ? "bg-(--adm-row-on)" : "hover:bg-ink/3", row.done && "opacity-50")}>
              <button type="button" onClick={() => onSelect(row.id)} aria-current={on || undefined} className="absolute inset-0 rounded-none text-left" aria-label={typeof row.title === "string" ? row.title : undefined} />
              {row.status !== undefined && <StatusDot status={row.status} className="pointer-events-none" />}
              {row.media && <span className="pointer-events-none shrink-0">{row.media}</span>}
              <span className="pointer-events-none min-w-0 flex-1 py-2">
                {/* Chosen: the row a little lighter, its title white and semibold – never underlined. */}
                <span className={cn("block truncate", calm ? "text-body-lg" : "text-body", on ? "font-semibold text-(--adm-active)" : "font-medium text-ink")}>{row.title}</span>
                {row.meta && <span className={cn("block truncate text-small text-muted", calm && "mt-0.5")}>{row.meta}</span>}
              </span>
              {row.aside && <span className="pointer-events-none shrink-0 text-small text-muted tabular-nums">{row.aside}</span>}
              {onDone && !row.done && (
                <button type="button" onClick={() => onDone(row.id)} aria-label={doneLabel ?? t("done")} className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-ink/50 transition-colors duration-150 hover:bg-ink/8 hover:text-adm-good", calm && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100")}>
                  <Check aria-hidden className="size-4" />
                </button>
              )}
            </li>
            </Fragment>
          );
        })}
      </ul>
      </div>
      {/* The detail stands under the sticky bar and scrolls on its own; the list scrolls with the page. */}
      <div className={cn("scroll-pane min-w-0 overscroll-contain lg:sticky lg:top-[calc(var(--header-total)+var(--adm-bar-h,0px)+var(--adm-mini-h,0px)+0.5rem)] lg:max-h-[calc(100dvh-var(--header-total)-var(--adm-bar-h,0px)-var(--adm-mini-h,0px)-var(--adm-page-inset))] lg:self-start lg:overflow-y-auto", !selectedId && "max-lg:hidden")}>{detail}</div>
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

/**
 * A direct link into an external service („In Stripe öffnen“, „Stripe-Konto“, „In Firebase öffnen“, „Protokoll öffnen“, config/tools.ts):
 * a small text link with ↗ in a new tab – nothing at all without an address (mock ids, dev and demo).
 */
export function DirectLink({ href, children, className }: { href: string | null; children: ReactNode; className?: string }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" data-direct-link className={cn("inline-flex items-center gap-1 text-small font-semibold text-ink hover:underline", className)}>
      {children}
      <ArrowUpRight aria-hidden className="size-3.5 text-muted" />
    </a>
  );
}
