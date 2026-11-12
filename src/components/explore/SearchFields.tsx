"use client";

import { CalendarDays, MapPin, Search, X, Zap } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { MonthName, newYearOf, shortMonth, upcomingMonths } from "@/components/form/MonthChips";
import { Anchored } from "@/components/ui/Anchored";
import { Chip } from "@/components/ui/Chip";
import { GlassPanel } from "@/components/ui/GlassPanel";
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
      <GlassPanel role="dialog" aria-label={label} style={{ width: `min(${width}px, calc(100vw - 32px))` }} className="animate-fade-in max-h-80 overflow-y-auto overscroll-contain rounded-[20px]! p-3">
        {children}
      </GlassPanel>
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
        "press inline-flex h-(--control-h) shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-accent px-4.5 text-nav-main font-semibold transition-colors duration-150 [&_svg]:size-4 [&_svg]:text-accent",
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
  className,
}: {
  place: string | null;
  month: string | null;
  onChange: (next: { place?: string | null; month?: string | null }) => void;
  className?: string;
}) {
  const t = useTranslations("explore.search");
  const tf = useTranslations("explore.filtersUi");
  const id = useId();
  const monthName = useMonthName();
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const place = placeById(placeId);
  const parts = [place?.name.split(",")[0], month ? monthName(month, "bare") : null].filter(Boolean);
  const value = parts.length > 0 ? parts.join(" · ") : null;
  return (
    <>
      <span data-active={value ? "" : undefined} className={cn("search-capsule inline-flex h-(--control-h) min-w-0 max-w-72 items-center rounded-full pr-2", className)}>
        <button
          ref={anchor}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={value ? `${tf("whereWhen")}: ${value}` : tf("whereWhen")}
          className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-full pl-4.5 pr-2 text-nav-main [&>svg]:size-4 [&>svg]:shrink-0"
        >
          <Search aria-hidden className={value ? "text-(--pick-text)" : "text-muted"} />
          <span className={cn("truncate", value ? "font-semibold text-(--pick-text)" : "text-muted")}>{value ?? tf("whereWhen")}</span>
        </button>
        {value && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onChange({ place: null, month: null });
            }}
            aria-label={tf("remove", { label: value })}
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-(--pick-text) transition-colors duration-150 hover:bg-inverse/15"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </span>
      {open && (
        <FieldPopover anchor={anchor} width={360} label={tf("whereWhen")} onClose={() => setOpen(false)}>
          <p className="mb-2 px-1 text-nav font-semibold text-ink">{t("where")}</p>
          <PlaceCombobox id={`${id}-place`} label={t("where")} placeholder={t("wherePlaceholder")} onPick={(p) => onChange({ place: p.id })} />
          {place && (
            <button type="button" onClick={() => onChange({ place: null })} className="mt-1 w-full rounded-2xl px-3 py-2 text-left text-body text-muted hover:bg-ink/5 hover:text-ink">
              {t("anywhere")}
            </button>
          )}
          <p className="mb-2 mt-4 px-1 text-nav font-semibold text-ink">{t("when")}</p>
          <MonthOptions
            value={month}
            onPick={(next) => {
              setOpen(false);
              onChange({ month: next });
            }}
          />
        </FieldPopover>
      )}
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
