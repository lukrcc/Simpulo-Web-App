// DATEV and Xero – placeholders. Bei Bedarf umsetzen: DATEV as the "DATEV-Format" booking batch (EXTF, Buchungsstapel, SKR03/04 accounts
// from the tax advisor), Xero through its API (Manual Journals or Bank Transactions). Both build from the same journal (journal.ts).
import type { Exporter } from "./types";

const notYet = (): Blob => {
  throw new Error("Bei Bedarf umsetzen");
};

export const datevExporter: Exporter = { id: "datev", ready: false, fileName: (ctx) => `simpulo-datev-${ctx.period.key}.csv`, build: notYet };
export const xeroExporter: Exporter = { id: "xero", ready: false, fileName: (ctx) => `simpulo-xero-${ctx.period.key}.csv`, build: notYet };
