"use client";

import { BarSheet } from "@/components/ui/BarSheet";
import { darkMenuClass, darkMenuScroll } from "@/components/ui/DarkMenu";
import { CalendarDays, MapPin, Search, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { MonthName, newYearOf, shortMonth, upcomingMonths } from "@/components/form/MonthChips";
import { Anchored } from "@/components/ui/Anchored";
import { Chip } from "@/components/ui/Chip";
import { placeById } from "@/lib/data/places";
import { cn } from "@/lib/utils";
import { hdrItem } from "@/components/layout/header/headerItem";
import { useDismiss } from "./Filters";
import { HeaderPanel, useHeaderPanel } from "@/components/layout/header/HeaderPanel";
import { PlaceCombobox } from "./PlaceCombobox";

/** "2027-03" → "March", "Mar 2027" with `short`, "Mar" with "bare". */
export function useMonthName() {
  const format = useFormatter();
  return (month: string, short: boolean | "bare" = false) =>
    format.dateTime(new Date(`${month}-01T00:00:00Z`), short === "bare" ? { month: "short", timeZone: "UTC" } : short ? { month: "short", year: "numeric", timeZone: "UTC" } : { month: "long", timeZone: "UTC" });
}

function FieldPopover({ anchor, width, label, onClose, children }: { anchor: RefObject<HTMLElement | null>; width: number; label: string; onClose: () => void; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDismiss(true, onClose, anchor, anchor, panelRef);
  return (
    <Anchored anchor={anchor} ref={panelRef} align="start" width={width}>
      {/* Opened inside All filters (a BarSheet): the sheet's dark glass as a menu. */}
      <div role="dialog" aria-label={label} style={{ width: `min(${width}px, calc(100vw - 32px))` }} className={cn(darkMenuClass, darkMenuScroll)}>
        {children}
      </div>
    </Anchored>
  );
}

/**
 * A compact field that opens a choice: like an input – a 1px edge ink 12 %, icon and placeholder muted. Holding a value: ink with white
 * text (the value instead of the placeholder, "Bali", "Mar 2027") and a small ✕ that takes it away (.filters-capsule in globals.css).
 */
function FieldCapsule({ ref, icon, label, value, open, onClick, onClear, size = "sm", className }: { ref: RefObject<HTMLButtonElement | null>; icon: ReactNode; label: string; value: string | null; open: boolean; onClick: () => void; onClear: () => void; /** sm 32px · md 40px (the filter row) · lg 44px · panel 46px (the filter panel: white, radius 14px, set = 1px orange edge) */ size?: "sm" | "md" | "lg" | "panel"; className?: string }) {
  const t = useTranslations("explore.filtersUi");
  return (
    <span data-active={value ? "" : undefined} className={cn("filters-capsule inline-flex min-w-0 items-center rounded-full", size === "panel" ? "panel-field h-11.5" : size === "lg" ? "filter-control h-11" : size === "md" ? "h-10" : "h-8", className)}>
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={value ? `${label} ${value}` : label}
        className={cn("inline-flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-full pl-3 text-nav [&>svg]:size-4 [&>svg]:shrink-0", value ? "pr-1 font-medium" : "pr-3 text-muted hover:text-ink")}
      >
        {icon}
        <span className="truncate">{value ?? label}</span>
      </button>
      {value && (
        <button type="button" onClick={onClear} aria-label={t("remove", { label: value })} className="mr-1 flex size-6 shrink-0 items-center justify-center rounded-full hover:bg-inverse/15">
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </span>
  );
}

/**
 * Where · When – ONE component, two triggers (CLAUDE.md "Aufräumen – ein Design"):
 *  · "text" – the header from 1100px: "⌕ Search" (chosen: "⌕ Lisbon · March", a missing part keeps its word) opening the header's panel
 *    (HeaderPanel: full width under the bar, hover 200ms or click, stays open once you work in it, only one open) – two columns side by side:
 *    left "Where?" (the place search and four places), right "When?" ("Any month" and the months by year).
 *  · "pill" – the header's one search field below 1100px (CompactSearch): light, across the width, "Where to next? · Any time" or the values,
 *    `trailing` (the filter button) inside on the right; it opens the same content one above the other (a popover from 744px, a sheet on
 *    phones – ui/BarSheet).
 * Picking a place keeps it open for the month; picking a month closes it.
 */
export function SearchField({
  place: placeId,
  month,
  onChange,
  autoOpen = false,
  trigger,
  onClose,
  trailing,
  className,
}: {
  place: string | null;
  month: string | null;
  onChange: (next: { place?: string | null; month?: string | null }) => void;
  /** Opens itself once when the URL says ?open=where, then drops the parameter. */
  autoOpen?: boolean;
  trigger: "text" | "pill";
  /** "pill": what sits inside the field on the right (the filter button) */
  trailing?: ReactNode;
  /** It closed (picked, clicked beside it, Escape) */
  onClose?: () => void;
  className?: string;
}) {
  const t = useTranslations("explore.search");
  const tf = useTranslations("explore.filtersUi");
  const id = useId();
  const monthName = useMonthName();
  const anchor = useRef<HTMLSpanElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [open, setOpenState] = useState(false);
  const setOpen = (next: boolean) => {
    setOpenState(next);
    if (!next) onClose?.();
  };
  // Only the header's panel ("text") claims the one place here – the pill's BarSheet claims it itself (two claims would close each other).
  const handlers = useHeaderPanel(open && trigger === "text", setOpen);
  // A link from elsewhere lands here with ?open=where: once, after the first render, it opens with the place search focused – the page at its
  // top, nothing jumps. The parameter goes at once (replace), so Back or a reload never opens it again.
  useEffect(() => {
    if (!autoOpen) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("open") !== "where") return;
    url.searchParams.delete("open");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    window.scrollTo(0, 0);
    requestAnimationFrame(() => setOpenState(true));
  }, [autoOpen]);
  const place = placeById(placeId);
  const placeName = place?.name.split(",")[0] ?? null;
  const monthLabel = month ? monthName(month, "bare") : null;
  const monthFull = month ? monthName(month) : null;
  const value = placeName || monthLabel ? [placeName, monthLabel].filter(Boolean).join(" · ") : null;
  const close = () => setOpen(false);
  const where = (
    <div>
      <p className="mb-2 px-1 text-nav font-semibold text-ink">{t("where")}</p>
      <PlaceCombobox id={`${id}-place`} label={t("where")} placeholder={t("wherePlaceholder")} limit={trigger === "text" ? 4 : undefined} onPick={(p) => onChange({ place: p.id })} />
      {place && (
        <button type="button" onClick={() => onChange({ place: null })} className="mt-1 w-full rounded-2xl px-3 py-2 text-left text-body text-muted hover:bg-ink/5 hover:text-ink">
          {t("anywhere")}
        </button>
      )}
    </div>
  );
  const when = (
    <div data-when>
      <p className={cn("mb-2 px-1 text-nav font-semibold text-ink", trigger === "pill" && "mt-4")}>{t("when")}</p>
      <MonthOptions
        roomy={trigger === "text"}
        value={month}
        onPick={(next) => {
          onChange({ month: next });
          close();
        }}
      />
    </div>
  );
  if (trigger === "text")
    return (
      <span ref={anchor} data-where-when className={cn("inline-flex min-w-0", className)}>
        <button
          type="button"
          {...handlers.trigger}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={`${t("where")}: ${placeName ?? t("anywhere")} · ${t("when")}: ${monthFull ?? t("anyMonth")}`}
          data-empty={!placeName && !monthFull ? "" : undefined}
          className={hdrItem}
        >
          {!placeName && !monthFull ? (
            <span className="truncate">{t("searchShort")}</span>
          ) : (
            <>
              <span className="truncate">{placeName ?? t("whereShort")}</span>
              <span aria-hidden className="-mx-0.5 text-muted">·</span>
              <span className="truncate">{monthFull ?? t("whenShort")}</span>
            </>
          )}
        </button>
        <HeaderPanel open={open} onClose={close} label={tf("whereWhen")} handlers={handlers.panel} triggerRef={anchor}>
          {/* Two columns side by side: Where? | When? */}
          <div ref={body} className="grid grid-cols-2 gap-12">
            {where}
            {when}
          </div>
        </HeaderPanel>
      </span>
    );
  return (
    <>
      {/* Below 1100px: ONE light field across the header's width – the magnifier, "Where to next? · Any time" (or "Bali · Feb"), and inside
          on the right the round filter button. A tap on the field opens Where/When (a popover from 744px, a sheet on phones). */}
      <span ref={anchor} data-search-pill className={cn("flex h-11 min-w-0 flex-1 items-center rounded-full bg-(--stage-text) pr-1 text-(--text-inverse)", className)}>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog" aria-label={t("pillLabel", { value: value ?? t("whereNext") })} className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-l-full pl-4 pr-2 text-left text-nav-main">
          <Search aria-hidden className="size-4 shrink-0" />
          {value ? (
            <span className="truncate font-semibold">{value}</span>
          ) : (
            <span className="truncate">
              {t("whereNext")} <span className="opacity-60">· {t("anyTime")}</span>
            </span>
          )}
        </button>
        {trailing}
      </span>
      <BarSheet open={open} onClose={close} anchor={anchor} label={tf("whereWhen")} className="p-5">
        <div ref={body}>
          {where}
          {when}
        </div>
      </BarSheet>
    </>
  );
}

/** "Where?": the place search; a place's id goes into the filters. */
export function PlaceField({ value, onChange, size, className }: { value: string | null; onChange: (place: string | null) => void; size?: "sm" | "lg" | "panel"; className?: string }) {
  const t = useTranslations("explore.search");
  const id = useId();
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const place = placeById(value);
  const pick = (next: string | null) => {
    setOpen(false);
    onChange(next);
  };
  return (
    <>
      <FieldCapsule ref={anchor} size={size} icon={<MapPin aria-hidden />} label={t("where")} value={place?.name.split(",")[0] ?? null} open={open} onClick={() => setOpen((o) => !o)} onClear={() => pick(null)} className={cn("max-w-44", className)} />
      {open && (
        <FieldPopover anchor={anchor} width={360} label={t("where")} onClose={() => setOpen(false)}>
          <PlaceCombobox id={`${id}-place`} label={t("where")} placeholder={t("wherePlaceholder")} onPick={(p) => pick(p.id)} />
          {place && (
            <button type="button" onClick={() => pick(null)} className="mt-2 w-full rounded-2xl px-3 py-2 text-left text-body text-muted hover:bg-ink/5 hover:text-ink">
              {t("anywhere")}
            </button>
          )}
        </FieldPopover>
      )}
    </>
  );
}

/** "When?": one month of the next 12, or any. */
export function MonthField({ value, onChange, size, className }: { value: string | null; onChange: (month: string | null) => void; size?: "sm" | "lg" | "panel"; className?: string }) {
  const t = useTranslations("explore.search");
  const monthName = useMonthName();
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const pick = (next: string | null) => {
    setOpen(false);
    onChange(next);
  };
  return (
    <>
      <FieldCapsule ref={anchor} size={size} icon={<CalendarDays aria-hidden />} label={t("when")} value={value ? monthName(value, true) : null} open={open} onClick={() => setOpen((o) => !o)} onClear={() => pick(null)} className={className} />
      {open && (
        <FieldPopover anchor={anchor} width={320} label={t("when")} onClose={() => setOpen(false)}>
          <MonthOptions value={value} onPick={pick} />
        </FieldPopover>
      )}
    </>
  );
}

/** Mounted only while open: it reads today's date. */
export function MonthOptions({ value, onPick, roomy = false }: { value: string | null; onPick: (month: string | null) => void; /** The header's sheet: the months grouped by year, 10px apart */ roomy?: boolean }) {
  const t = useTranslations("explore.search");
  const monthName = useMonthName();
  const format = useFormatter();
  const [months] = useState(() => upcomingMonths(new Date()));
  return (
    <div role="radiogroup" aria-label={t("when")} data-month-options={roomy ? "grouped" : undefined} className="space-y-1.5">
      <Chip role="radio" aria-checked={value === null} active={value === null} onClick={() => onPick(null)} className="w-full justify-center">
        {t("anyMonth")}
      </Chip>
      {roomy ? (
        // The header's sheet (CLAUDE.md "ruhiger Feinschliff"): the months grouped by year – a small grey year over its months, the grid of three
        // starting anew for each year; the capsules only the month's name.
        [...new Set(months.map((m) => m.slice(0, 4)))].map((year) => [year, months.filter((m) => m.startsWith(year))] as const).map(([year, list]) => (
          <div key={year}>
            <p className="mb-1 px-1 text-small text-muted">{year}</p>
            <div className="grid grid-cols-3 gap-2">
              {list.map((month) => (
                <Chip key={month} role="radio" aria-checked={value === month} active={value === month} aria-label={monthName(month, true)} onClick={() => onPick(month)} className="w-full justify-center px-1!">
                  {shortMonth(format, month, false)}
                </Chip>
              ))}
            </div>
          </div>
        ))
      ) : (
      <div className="grid grid-cols-3 gap-1.5">
        {months.map((month, i) => (
          <Chip key={month} role="radio" aria-checked={value === month} active={value === month} aria-label={monthName(month, true)} onClick={() => onPick(month)} className="w-full justify-center px-1!">
            <MonthName year={newYearOf(months, i)}>{shortMonth(format, month, false)}</MonthName>
          </Chip>
        ))}
      </div>
      )}
    </div>
  );
}

/** Short trips' mark: a filled, slim bolt (18px in the bar, --brand-action) – a little larger than the other icons. */
export function SlimBolt() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="slim-bolt">
      <path d="M14.2 1.6 5.6 13.4a.6.6 0 0 0 .5 1h5.2l-1.6 7.5c-.1.6.6.9 1 .4l8.6-11.8a.6.6 0 0 0-.5-1h-5.2l1.6-7.5c.1-.6-.6-.9-1-.4Z" />
    </svg>
  );
}
