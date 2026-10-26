"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useFormat } from "@/i18n/format";
import { addDays, addMonths, cn, nightsBetween } from "@/lib/utils";

interface DateRangePickerProps {
  id?: string;
  /** YYYY-MM-DD or "" */
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  /** Earliest selectable day (YYYY-MM-DD); "" = no limit yet (before hydration) */
  min: string;
  maxNights: number;
  invalid?: boolean;
  onClose?: () => void;
}

const QUICK = [
  { key: "week", apply: (start: string) => addDays(start, 7) },
  { key: "twoWeeks", apply: (start: string) => addDays(start, 14) },
  { key: "month", apply: (start: string) => addMonths(start, 1) },
] as const;

/** "2026-10" → the days of that month as YYYY-MM-DD, padded with nulls so weeks start on Monday. */
function monthGrid(month: string): Array<string | null> {
  const first = `${month}-01`;
  const weekday = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const days = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  return [...Array<null>(weekday).fill(null), ...Array.from({ length: days }, (_, i) => addDays(first, i))];
}

/**
 * One control for both dates: the field shows "Oct 25 – Nov 1 · 7 nights"; it opens two months side by side
 * (one on phones). First tap = start, second = end; quick chips set the end from the start.
 */
export function DateRangePicker({ id, start, end, onChange, min, maxNights, invalid, onClose }: DateRangePickerProps) {
  const t = useTranslations("common.ui.dateRange");
  const format = useFormat();
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [month, setMonth] = useState(() => (start || min || "").slice(0, 7));
  const nights = start && end ? nightsBetween(start, end) : 0;
  /** Choosing the end: a start without an end */
  const pickingEnd = Boolean(start) && !end;
  const lastEnd = start ? addDays(start, maxNights) : "";

  // Opening near the bottom of the window: scroll the calendar fully into view, clear of the sticky footer bar.
  useEffect(() => {
    if (open) popoverRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);

  // Close on a click outside or Escape (both count as leaving the field).
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  });

  function close() {
    setOpen(false);
    onClose?.();
  }

  function toggle() {
    if (open) return close();
    setMonth((start || min || new Date().toISOString()).slice(0, 7));
    setOpen(true);
  }

  function pick(day: string) {
    if (pickingEnd && day > start) {
      onChange(start, day);
      close();
    } else {
      onChange(day, "");
    }
  }

  function disabled(day: string): boolean {
    if (min && day < min) return true;
    return pickingEnd && day > lastEnd;
  }

  const rangeEnd = end || (pickingEnd && hovered && hovered > start && hovered <= lastEnd ? hovered : "");
  const monthName = (m: string) =>
    new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 1 + i))),
  );
  const months = month ? [month, addMonths(`${month}-01`, 1).slice(0, 7)] : [];
  const canGoBack = Boolean(month) && (!min || month > min.slice(0, 7));

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "flex h-11 w-full items-center gap-2.5 rounded-xl border bg-[#FAFAF9] px-4 text-left text-[15px] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ink/20",
          invalid ? "border-red-300" : "border-[#E7E5E4]",
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-zinc-500" aria-hidden />
        {start ? (
          <span className="min-w-0 flex-1 truncate">
            {end ? format.shortRange(start, end) : t("from", { date: format.day(start) })}
            {nights > 0 && <span className="text-zinc-500"> · {format.nights(nights)}</span>}
          </span>
        ) : (
          <span className="flex-1 text-neutral-400">{t("placeholder")}</span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={t("dialog")}
          className="absolute left-0 top-full z-30 mt-1.5 scroll-mb-28 w-full rounded-[24px] bg-white p-4 shadow-xl ring-1 ring-black/5 sm:w-[min(100%,36rem)] sm:p-5"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {QUICK.map(({ key, apply }) => {
              const target = start ? apply(start) : "";
              const active = Boolean(start) && end === target;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!start || nightsBetween(start, target) > maxNights}
                  onClick={() => {
                    onChange(start, target);
                    close();
                  }}
                  className={cn(
                    "h-8 rounded-full border px-3 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    active ? "border-ink bg-ink text-white" : "border-[#E7E5E4] bg-[#FAFAF9] hover:border-neutral-400",
                  )}
                >
                  {t(`quick.${key}`)}
                </button>
              );
            })}
            <span className="ml-auto text-[13px] text-zinc-500">{pickingEnd ? t("pickEnd") : t("pickStart")}</span>
          </div>

          <div className="relative grid gap-6 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMonth(addMonths(`${month}-01`, -1).slice(0, 7))}
              disabled={!canGoBack}
              aria-label={t("previousMonth")}
              className="absolute left-0 top-0 flex size-8 items-center justify-center rounded-full hover:bg-black/5 disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setMonth(addMonths(`${month}-01`, 1).slice(0, 7))}
              aria-label={t("nextMonth")}
              className="absolute right-0 top-0 flex size-8 items-center justify-center rounded-full hover:bg-black/5"
            >
              <ChevronRight className="size-4" />
            </button>
            {months.map((m, i) => (
              // Phones show one month; the arrows step through.
              <div key={m} className={cn(i === 1 && "max-sm:hidden")}>
                <p className="mb-2 flex h-8 items-center justify-center text-sm font-semibold">{monthName(m)}</p>
                <div className="grid grid-cols-7 text-center text-[11px] font-medium text-zinc-400">
                  {weekdays.map((d, j) => (
                    <span key={j} className="py-1">
                      {d}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7" onMouseLeave={() => setHovered(null)}>
                  {monthGrid(m).map((day, j) => {
                    if (!day) return <span key={`pad-${j}`} />;
                    const isStart = day === start;
                    const isEnd = day === rangeEnd;
                    const inRange = Boolean(start && rangeEnd) && day > start && day < rangeEnd;
                    return (
                      <div
                        key={day}
                        className={cn(
                          "py-0.5",
                          inRange && "bg-black/5",
                          isStart && rangeEnd && "rounded-l-full bg-linear-to-r from-transparent from-50% to-black/5 to-50%",
                          isEnd && "rounded-r-full bg-linear-to-l from-transparent from-50% to-black/5 to-50%",
                        )}
                      >
                        <button
                          type="button"
                          disabled={disabled(day)}
                          onClick={() => pick(day)}
                          onMouseEnter={() => setHovered(day)}
                          aria-pressed={isStart || isEnd}
                          aria-label={format.day(day)}
                          data-tap="none"
                          className={cn(
                            "mx-auto flex size-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors disabled:cursor-not-allowed disabled:text-zinc-300",
                            isStart || isEnd ? "bg-ink font-semibold text-white" : "enabled:hover:bg-black/10",
                          )}
                        >
                          {Number(day.slice(8))}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-zinc-500">{t("maxNights", { max: maxNights })}</p>
        </div>
      )}
    </div>
  );
}
