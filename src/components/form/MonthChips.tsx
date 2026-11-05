"use client";

import { useFormatter } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/ui/Chip";

/** Months to choose from, starting with this one. */
const MONTH_COUNT = 12;

/** The next MONTH_COUNT months as YYYY-MM, this one first. */
export function upcomingMonths(now: Date): string[] {
  return Array.from({ length: MONTH_COUNT }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1)).toISOString().slice(0, 7));
}

/** "2027-02" → "Feb", or "Feb 27" with the year. */
export function shortMonth(format: ReturnType<typeof useFormatter>, month: string, withYear: boolean): string {
  const name = format.dateTime(new Date(`${month}-01T00:00:00Z`), { month: "short", timeZone: "UTC" });
  return withYear ? `${name} ${month.slice(2, 4)}` : name;
}

/** The year, for the first month of a new one in a list of months ("2027" before "Jan"); null for the others. */
export function newYearOf(months: readonly string[], i: number): string | null {
  return i > 0 && months[i].slice(0, 4) !== months[i - 1].slice(0, 4) ? months[i].slice(0, 4) : null;
}

/** A month's name, with the new year as a small label before it. */
export function MonthName({ year, children }: { year: string | null; children: string }) {
  return (
    <>
      {year && <span className="mr-1 text-small text-muted">{year}</span>}
      {children}
    </>
  );
}

/**
 * Chip grid of the next 12 months (multi-select). Only the first month of a new year says so: "Nov", "Dec", "2027 Jan".
 * Mount it on the client only (in a dialog or popover): it reads today's date.
 */
export function MonthChips({ value, onChange, label, columns = "responsive" }: { value: string[]; onChange: (months: string[]) => void; label: string; /** "three": always three per row (narrow popovers) */ columns?: "responsive" | "three" }) {
  const format = useFormatter();
  const [months] = useState(() => upcomingMonths(new Date()));

  function toggle(month: string) {
    onChange(value.includes(month) ? value.filter((m) => m !== month) : [...value, month].toSorted());
  }

  return (
    <div role="group" aria-label={label} className={cn("grid grid-cols-3 gap-2", columns === "responsive" && "md:grid-cols-4")}>
      {months.map((month, i) => {
        const active = value.includes(month);
        return (
          <Chip key={month} active={active} className="justify-center px-2!" onClick={() => toggle(month)}>
            <MonthName year={newYearOf(months, i)}>{shortMonth(format, month, false)}</MonthName>
          </Chip>
        );
      })}
    </div>
  );
}
