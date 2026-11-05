"use client";

import { CalendarDays, MapPin, X } from "lucide-react";
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

/** "2027-03" → "March", "Mar 2027" with `short`. */
export function useMonthName() {
  const format = useFormatter();
  return (month: string, short = false) => format.dateTime(new Date(`${month}-01T00:00:00Z`), short ? { month: "short", year: "numeric", timeZone: "UTC" } : { month: "long", timeZone: "UTC" });
}

function FieldPopover({ anchor, width, label, onClose, children }: { anchor: RefObject<HTMLElement | null>; width: number; label: string; onClose: () => void; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDismiss(true, onClose, anchor, anchor, panelRef);
  return (
    <Anchored anchor={anchor} ref={panelRef} align="start" width={width}>
      <GlassPanel role="dialog" aria-label={label} style={{ width: `min(${width}px, calc(100vw - 32px))` }} className="animate-fade-in rounded-[20px]! p-3">
        {children}
      </GlassPanel>
    </Anchored>
  );
}

/** A compact glass capsule; peach once it holds a value, like everything chosen, with an ✕ that takes the value away. */
function FieldCapsule({ ref, icon, label, value, open, onClick, onClear, className }: { ref: RefObject<HTMLButtonElement | null>; icon: ReactNode; label: string; value: string | null; open: boolean; onClick: () => void; onClear: () => void; className?: string }) {
  const t = useTranslations("explore.filtersUi");
  return (
    <span data-active={value ? "" : undefined} className={cn("filters-capsule inline-flex h-9 min-w-0 items-center rounded-full", className)}>
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={value ? `${label} ${value}` : label}
        className={cn("inline-flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-full pl-3.5 text-body font-semibold text-ink [&>svg]:size-4 [&>svg]:shrink-0", value ? "pr-1" : "pr-3.5")}
      >
        {icon}
        <span className="truncate">{value ?? label}</span>
      </button>
      {value && (
        <button type="button" onClick={onClear} aria-label={t("remove", { label: value })} className="mr-1.5 flex size-6 shrink-0 items-center justify-center rounded-full text-ink hover:bg-white/50">
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </span>
  );
}

/** A switch beside Where? and When?, in their capsule: peach and with an ✕ while on. */
export function ToggleCapsule({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button type="button" aria-pressed={active} onClick={onToggle} data-active={active ? "" : undefined} className="filters-capsule inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-body font-semibold text-ink">
      {label}
      {active && <X className="size-3.5" aria-hidden />}
    </button>
  );
}

/** "Where?": the place search; a place's id goes into the filters. */
export function PlaceField({ value, onChange, className }: { value: string | null; onChange: (place: string | null) => void; className?: string }) {
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
      <FieldCapsule ref={anchor} icon={<MapPin aria-hidden />} label={t("where")} value={place?.name.split(",")[0] ?? null} open={open} onClick={() => setOpen((o) => !o)} onClear={() => pick(null)} className={cn("max-w-44", className)} />
      {open && (
        <FieldPopover anchor={anchor} width={360} label={t("where")} onClose={() => setOpen(false)}>
          <PlaceCombobox id={`${id}-place`} label={t("where")} placeholder={t("wherePlaceholder")} onPick={(p) => pick(p.id)} />
          {place && (
            <button type="button" onClick={() => pick(null)} className="mt-2 w-full rounded-2xl px-3 py-2 text-left text-body text-muted hover:bg-white/50 hover:text-ink">
              {t("anywhere")}
            </button>
          )}
        </FieldPopover>
      )}
    </>
  );
}

/** "When?": one month of the next 12, or any. */
export function MonthField({ value, onChange, className }: { value: string | null; onChange: (month: string | null) => void; className?: string }) {
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
      <FieldCapsule ref={anchor} icon={<CalendarDays aria-hidden />} label={t("when")} value={value ? monthName(value, true) : null} open={open} onClick={() => setOpen((o) => !o)} onClear={() => pick(null)} className={className} />
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
