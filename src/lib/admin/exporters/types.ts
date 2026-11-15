// An export adapter (Geld › Steuern › Export): one format, built from the bookkeeping journal (lib/admin/ledger.ts) for one period. New
// formats are new adapters here – never a second way to read the money.
import type { BankBalance, LedgerEntry } from "@/lib/data";
import type { LedgerSummary, Period, TaxDeadline, revenueByCountry, taxReserve } from "../ledger";

export interface ExportContext {
  period: Period;
  /** "Oktober 2026" */
  periodLabel: string;
  /** The period's lines, with the receipts attached by hand */
  entries: readonly LedgerEntry[];
  summary: LedgerSummary;
  reserve: ReturnType<typeof taxReserve>;
  byCountry: ReturnType<typeof revenueByCountry>;
  deadlines: readonly TaxDeadline[];
  bank: BankBalance | null;
  /** YYYY-MM-DD */
  today: string;
}

export type ExporterId = "csv" | "xlsx" | "json" | "pdf" | "zip" | "datev" | "xero";

export interface Exporter {
  id: ExporterId;
  /** false: a placeholder ("bei Bedarf umsetzen") – shown, not usable */
  ready: boolean;
  fileName(ctx: ExportContext): string;
  build(ctx: ExportContext): Blob;
}
