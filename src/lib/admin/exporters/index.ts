// Geld › Steuern › Export: every format as an adapter over the bookkeeping journal (lib/admin/ledger.ts). New formats only here.
import { csvExporter } from "./csv";
import { jsonExporter } from "./json";
import { datevExporter, xeroExporter } from "./placeholders";
import { pdfExporter } from "./reportPdf";
import { receiptsZipExporter } from "./receiptsZip";
import type { Exporter } from "./types";
import { xlsxExporter } from "./xlsx";

export const EXPORTERS: readonly Exporter[] = [csvExporter, xlsxExporter, jsonExporter, pdfExporter, receiptsZipExporter, datevExporter, xeroExporter];

export type { ExportContext, Exporter, ExporterId } from "./types";
export { tableCsv } from "./csv";
export { countryName, deadlineLabel, periodLabel, PLAIN } from "./labels";

/** Hands a file to the browser to save. */
export function download(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
