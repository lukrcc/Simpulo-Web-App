// The journal as rows with German column heads – shared by CSV, Excel and the DATEV/Xero placeholders.
import type { LedgerEntry } from "@/lib/data";
import { PLAIN } from "./labels";

export const JOURNAL_COLUMNS = ["date", "receiptNo", "kind", "net", "taxRate", "tax", "gross", "currency", "fxRate", "category", "country", "customerType", "description", "stripeRef", "receipt"] as const;
export type JournalColumn = (typeof JOURNAL_COLUMNS)[number];

export const journalHead = () => JOURNAL_COLUMNS.map((c) => PLAIN.columns[c]);

/** One line as cells: numbers stay numbers (the format decides how they look), texts in German. */
export function journalRow(e: LedgerEntry): (string | number)[] {
  return JOURNAL_COLUMNS.map((c) => {
    if (c === "kind") return PLAIN.kind[e.kind];
    if (c === "customerType") return e.customerType ? PLAIN.customer[e.customerType] : "";
    const v = e[c];
    return v === null ? "" : v;
  });
}

/** "2026-10" etc. for file names */
export const fileStem = (kind: string, key: string) => `simpulo-${kind}-${key}`;
