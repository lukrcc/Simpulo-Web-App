"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { FLEXIBLE } from "@/lib/interests";
import { cn } from "@/lib/utils";
import { chipActiveClass, chipClass, chipInactiveClass } from "./chips";

/** Months to choose from, starting with this one. */
const MONTH_COUNT = 12;

/** The next MONTH_COUNT months as YYYY-MM, this one first. */
function upcomingMonths(now: Date): string[] {
  return Array.from({ length: MONTH_COUNT }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1)).toISOString().slice(0, 7));
}

/** "2027-02" → "Feb", or "Feb 27" with the year. */
export function shortMonth(format: ReturnType<typeof useFormatter>, month: string, withYear: boolean): string {
  const name = format.dateTime(new Date(`${month}-01T00:00:00Z`), { month: "short", timeZone: "UTC" });
  return withYear ? `${name} ${month.slice(2, 4)}` : name;
}

/**
 * Chip grid of the next 12 months (multi-select) plus "Flexible", which clears the others (and is cleared by them).
 * Labels show the year only where it changes: "Nov", "Dec", "Jan 27". Used by "Add a place" and the Month filter.
 * Mount it on the client only (in a dialog or popover): it reads today's date.
 */
export function MonthChips({ value, onChange, label, columns = "responsive" }: { value: string[]; onChange: (months: string[]) => void; label: string; /** "three": always three per row (narrow popovers) */ columns?: "responsive" | "three" }) {
  const t = useTranslations("common.ui.months");
  const format = useFormatter();
  const [months] = useState(() => upcomingMonths(new Date()));
  const flexible = value.includes(FLEXIBLE);

  function toggle(month: string) {
    if (month === FLEXIBLE) return onChange(flexible ? [] : [FLEXIBLE]);
    const dated = value.filter((m) => m !== FLEXIBLE);
    onChange(dated.includes(month) ? dated.filter((m) => m !== month) : [...dated, month].toSorted());
  }

  return (
    <div role="group" aria-label={label} className={cn("grid grid-cols-3 gap-2", columns === "responsive" && "md:grid-cols-4")}>
      {months.map((month, i) => {
        const active = value.includes(month);
        const withYear = i > 0 && month.slice(0, 4) !== months[i - 1].slice(0, 4);
        return (
          <button key={month} type="button" aria-pressed={active} onClick={() => toggle(month)} className={cn(chipClass, "whitespace-nowrap px-2", active ? chipActiveClass : chipInactiveClass)}>
            {shortMonth(format, month, withYear)}
          </button>
        );
      })}
      <button type="button" aria-pressed={flexible} onClick={() => toggle(FLEXIBLE)} className={cn(chipClass, "px-2", flexible ? chipActiveClass : chipInactiveClass)}>
        {t("flexible")}
      </button>
    </div>
  );
}
