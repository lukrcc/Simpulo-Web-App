// The exports' plain German texts (no ICU) from lib/i18n/admin.de.ts – used by the exporters and the Steuern view alike.
import { ADMIN_DE } from "@/lib/i18n/admin.de";
import { monthLong } from "@/lib/i18n/adminFormat";
import type { Period, TaxDeadline } from "../ledger";

export const PLAIN = ADMIN_DE.money.taxes.plain;

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

/** "KW 47 2026" · "Oktober 2026" · "Q4 2026" · "2026" */
export function periodLabel(p: Pick<Period, "kind" | "year" | "index" | "from">): string {
  if (p.kind === "year") return String(p.year);
  if (p.kind === "week") return fill(PLAIN.week, { index: p.index, year: p.year });
  if (p.kind === "quarter") return fill(PLAIN.quarter, { index: p.index, year: p.year });
  return `${monthLong(p.from)} ${p.year}`;
}

/** "USt-Voranmeldung Oktober 2026" · "Gewerbesteuer-Vorauszahlung Q4 2026" · "DAC7-Meldung 2026" · "Steuerberater: Jahresgespräch …" */
export function deadlineLabel(d: TaxDeadline): string {
  const about =
    d.kind === "vatReturn"
      ? `${monthLong(`${d.about}-01`)} ${d.about.slice(0, 4)}`
      : d.kind === "incomeTaxPrepayment" || d.kind === "tradeTaxPrepayment"
        ? fill(PLAIN.quarter, { index: d.about.slice(6), year: d.about.slice(0, 4) })
        : d.about;
  return fill(PLAIN.deadline[d.kind], { about });
}

const countryNames = new Intl.DisplayNames(["de"], { type: "region" });
/** "Deutschland" from "DE" */
export const countryName = (code: string) => {
  try {
    return countryNames.of(code) ?? code;
  } catch {
    return code;
  }
};

export { fill };
