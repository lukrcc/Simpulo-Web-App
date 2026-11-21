// Xero – a placeholder. Bei Bedarf umsetzen: through its API (Manual Journals or Bank Transactions), from the same journal (journal.ts).
// DATEV is built: the Buchungsjournal's DATEV-compatible CSV (lib/admin/bookingJournal.ts datevCsv).
import type { Exporter } from "./types";

const notYet = (): Blob => {
  throw new Error("Bei Bedarf umsetzen");
};

export const xeroExporter: Exporter = { id: "xero", ready: false, fileName: (ctx) => `simpulo-xero-${ctx.period.key}.csv`, build: notYet };
