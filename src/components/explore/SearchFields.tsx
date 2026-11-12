"use client";

import { BarSheet } from "@/components/ui/BarSheet";
import { darkMenuClass, darkMenuScroll } from "@/components/ui/DarkMenu";
import { CalendarDays, MapPin, Search, X, Zap } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { MonthName, newYearOf, shortMonth, upcomingMonths } from "@/components/form/MonthChips";
import { Anchored } from "@/components/ui/Anchored";
import { Chip } from "@/components/ui/Chip";
import { placeById } from "@/lib/data/places";
import { cn } from "@/lib/utils";
import { useDismiss } from "./Filters";
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

/** "Short trips" beside the search field: a switch with an orange bolt and a 1.5px orange edge – off transparent with ink text, on ink with white text. 44px. */
export function ShortTripsToggle({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        // Set apart from the rest: an orange edge and bolt. Off: transparent, ink semibold, hover a breath of orange. On: ink, white text,
        // the bolt and edge still orange – the filters' chosen style.
        "short-trips press inline-flex h-(--control-h) shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-accent px-4.5 text-nav-main font-semibold transition-colors duration-150 [&_svg]:size-4 [&_svg]:text-accent",
        active ? "bg-(--pick-bg) text-(--pick-text)" : "bg-transparent text-ink hover:bg-accent/8",
      )}
    >
      <Zap aria-hidden />
      {label}
    </button>
  );
}

/**
 * The filter row's search capsule, 44px (1px ink 12 %, --card-soft): the magnifier and "Where · When" (muted) – a click opens the small popover
 * (the place search on top, the months below); set, it takes the filters' choice (ink, white text, orange edge) with the values
 * ("Bali · Dec") and a small ✕ that clears both.
 * Picking a place keeps the popover open for the month; picking a month closes it.
 */
export function SearchField({
  place: placeId,
  month,
  onChange,
  autoOpen = false,
  className,
}: {
  place: string | null;
  month: string | null;
  onChange: (next: { place?: string | null; month?: string | null }) => void;
  /** Opens itself once when the URL says ?search=open (the bar's "Where to next?" on every other page), then drops the parameter. */
  autoOpen?: boolean;
  className?: string;
}) {
  const t = useTranslations("explore.search");
  const tf = useTranslations("explore.filtersUi");
  const id = useId();
  const monthName = useMonthName();
  const anchor = useRef<HTMLSpanElement>(null);
  const body = useRef<HTMLDivElement>(null);
  // Which half opened the sheet: the same sheet, its part focused – Where's search field, or When's months.
  const [section, setSection] = useState<"where" | "when" | null>(null);
  const open = section !== null;
  useEffect(() => {
    if (!autoOpen) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("search") !== "open") return;
    url.searchParams.delete("search");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    // Not cancelled on cleanup: the parameter is gone after the first run (React's dev double effect would otherwise lose the open).
    requestAnimationFrame(() => setSection("where"));
  }, [autoOpen]);
  useEffect(() => {
    if (!section) return;
    const frame = requestAnimationFrame(() => {
      const root = body.current;
      if (!root) return;
      const target = section === "where" ? root.querySelector<HTMLElement>("input") : (root.querySelector<HTMLElement>('[data-when] [aria-checked="true"]') ?? root.querySelector<HTMLElement>("[data-when] [role=radio]"));
      target?.focus({ preventScroll: true });
      if (section === "when") root.querySelector("[data-when]")?.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [section]);
  const toggle = (part: "where" | "when") => setSection((current) => (current === part ? null : part));
  const place = placeById(placeId);
  const placeName = place?.name.split(",")[0] ?? null;
  const monthLabel = month ? monthName(month, "bare") : null;
  const value = placeName || monthLabel ? [placeName, monthLabel].filter(Boolean).join(" · ") : null;
  const half = "flex h-full min-w-0 items-center gap-2 text-nav-main [&>svg]:size-4 [&>svg]:shrink-0";
  return (
    <>
      {/* "Where | When": one capsule, padding 0 16px, as wide as its words; a 1px × 16px line (30 %) 12px from each half. The left half opens
          the sheet on Where, the right on When. */}
      <span ref={anchor} data-active={value ? "" : undefined} className={cn("search-capsule inline-flex h-(--control-h) min-w-0 shrink-0 items-center rounded-full", className)}>
        <button type="button" onClick={() => toggle("where")} aria-expanded={section === "where"} aria-haspopup="dialog" aria-label={placeName ? `${t("where")} ${placeName}` : t("where")} className={cn(half, "rounded-l-full pl-4 pr-3")}>
          <Search aria-hidden />
          <span className={cn("truncate", placeName && "font-semibold")}>{placeName ?? t("whereShort")}</span>
        </button>
        <span aria-hidden className="h-4 w-px shrink-0 bg-current opacity-30" />
        <button type="button" onClick={() => toggle("when")} aria-expanded={section === "when"} aria-haspopup="dialog" aria-label={monthLabel ? `${t("when")} ${monthLabel}` : t("when")} className={cn(half, "rounded-r-full pl-3", value ? "pr-2" : "pr-4")}>
          <span className={cn("truncate", monthLabel && "font-semibold")}>{monthLabel ?? t("whenShort")}</span>
        </button>
        {value && (
          <button
            type="button"
            onClick={() => {
              setSection(null);
              onChange({ place: null, month: null });
            }}
            aria-label={tf("remove", { label: value })}
            className="mr-2 flex size-7 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-inverse/15"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </span>
      {/* One sheet for both halves: out of the bar (ui/BarSheet), 520px under the capsule. */}
      <BarSheet open={open} onClose={() => setSection(null)} anchor={anchor} label={tf("whereWhen")} className="p-5">
        <div ref={body}>
          <p className="mb-2 px-1 text-nav font-semibold text-ink">{t("where")}</p>
          <PlaceCombobox id={`${id}-place`} label={t("where")} placeholder={t("wherePlaceholder")} onPick={(p) => onChange({ place: p.id })} />
          {place && (
            <button type="button" onClick={() => onChange({ place: null })} className="mt-1 w-full rounded-2xl px-3 py-2 text-left text-body text-muted hover:bg-ink/5 hover:text-ink">
              {t("anywhere")}
            </button>
          )}
          <div data-when>
            <p className="mb-2 mt-4 px-1 text-nav font-semibold text-ink">{t("when")}</p>
            <MonthOptions
              value={month}
              onPick={(next) => {
                setSection(null);
                onChange({ month: next });
              }}
            />
          </div>
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
function MonthOptions({ value, onPick }: { value: string | null; onPick: (month: string | null) => void }) {
  const t = useTranslations("explore.search");
  const monthName = useMonthName();
  const format = useFormatter();
  const [months] = useState(() => upcomingMonths(new Date()));
  return (
    <div role="radiogroup" aria-label={t("when")} className="space-y-1.5">
      <Chip role="radio" aria-checked={value === null} active={value === null} onClick={() => onPick(null)} className="w-full justify-center">
        {t("anyMonth")}
      </Chip>
      <div className="grid grid-cols-3 gap-1.5">
        {months.map((month, i) => (
          <Chip key={month} role="radio" aria-checked={value === month} active={value === month} aria-label={monthName(month, true)} onClick={() => onPick(month)} className="w-full justify-center px-1!">
            <MonthName year={newYearOf(months, i)}>{shortMonth(format, month, false)}</MonthName>
          </Chip>
        ))}
      </div>
    </div>
  );
}
