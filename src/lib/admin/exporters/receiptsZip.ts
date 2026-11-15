// "Belege als ZIP": every receipt of the period's costs and fees, named "2026-10-03_K-2026-0142.pdf" (date and receipt number), and a list of
// the missing ones. ⚠ MOCK: the mock keeps only file names, so each file is a one-page example receipt; the real source puts the uploaded
// files here (TODO(backend): from storage).
import { eur } from "@/lib/i18n/adminFormat";
import { eurOf, needsReceipt } from "../ledger";
import { fileStem } from "./journal";
import { fill, PLAIN } from "./labels";
import { PdfDoc } from "./pdf";
import { wordmark } from "./reportPdf";
import type { Exporter } from "./types";
import { zip, type ZipFile } from "./zip";

function exampleReceipt(lines: readonly string[]): Uint8Array {
  const pdf = new PdfDoc();
  wordmark(pdf, 56, 64, 16);
  lines.forEach((line, i) => pdf.text(56, 120 + i * 18, line, { size: i === 0 ? 14 : 10, bold: i === 0 }));
  pdf.text(56, 120 + lines.length * 18 + 16, PLAIN.mockReceipt, { size: 9, color: [0.45, 0.42, 0.4] });
  return pdf.bytes();
}

export const receiptsZipExporter: Exporter = {
  id: "zip",
  ready: true,
  fileName: (ctx) => `${fileStem("belege", ctx.period.key)}.zip`,
  build: (ctx) => {
    const withReceipt = ctx.entries.filter((e) => needsReceipt(e) && e.receipt);
    const missing = ctx.entries.filter((e) => needsReceipt(e) && !e.receipt);
    const files: ZipFile[] = withReceipt.map((e) => ({
      name: `${e.date}_${e.receiptNo}.pdf`,
      data: exampleReceipt([e.description, `${PLAIN.columns.receiptNo}: ${e.receiptNo}`, `${PLAIN.columns.date}: ${e.date}`, `${PLAIN.columns.gross}: ${eur(eurOf(e, "gross"))}`, `${PLAIN.columns.receipt}: ${e.receipt}`]),
    }));
    if (missing.length) {
      files.push({
        name: PLAIN.missingFile,
        data: [`${PLAIN.missingHead} – ${ctx.periodLabel}`, "", ...missing.map((e) => `${e.date}  ${e.receiptNo}  ${e.description}  ${eur(eurOf(e, "gross"))}`), "", fill(PLAIN.missingReceipts, { count: missing.length })].join("\r\n"),
      });
    }
    return new Blob([zip(files)], { type: "application/zip" });
  },
};
