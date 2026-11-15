// "Bericht als PDF": one to two calm A4 pages for the tax advisor – the wordmark, the period, income, costs, profit, the tax reserve split,
// revenue by country and customer type, missing receipts and the next deadlines. German, from the journal only.
import { dec, eur, num, pct } from "@/lib/i18n/adminFormat";
import { countryName, deadlineLabel, fill, PLAIN } from "./labels";
import { fileStem } from "./journal";
import { PdfDoc, type Rgb } from "./pdf";
import type { ExportContext, Exporter } from "./types";

const INK: Rgb = [0.133, 0.118, 0.106];
const MUTED: Rgb = [0.45, 0.42, 0.4];
const SIGNAL: Rgb = [0.941, 0.388, 0.227];
const LINE: Rgb = [0.88, 0.86, 0.83];
const LEFT = 56;
const RIGHT = 539;
const TOP = 64;
const BOTTOM = 790;

const germanDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

/** The wordmark: "simpulo" bold, the full stop orange (as everywhere). */
export function wordmark(pdf: PdfDoc, x: number, y: number, size = 20) {
  const end = pdf.text(x, y, "simpulo", { size, bold: true });
  pdf.text(end, y, ".", { size, bold: true, color: SIGNAL });
}

export function reportPdf(ctx: ExportContext): Uint8Array<ArrayBuffer> {
  const pdf = new PdfDoc();
  let y = TOP;
  const ensure = (needed: number) => {
    if (y + needed <= BOTTOM) return;
    pdf.addPage();
    y = TOP;
  };
  const section = (title: string) => {
    ensure(48);
    y += 26;
    pdf.text(LEFT, y, title.toUpperCase(), { size: 8, bold: true, color: MUTED });
    y += 7;
    pdf.line(LEFT, y, RIGHT, y, LINE);
    y += 16;
  };
  const row = (label: string, value: string, opts: { bold?: boolean; muted?: boolean; note?: string } = {}) => {
    ensure(18);
    pdf.text(LEFT, y, label, { size: 10, bold: opts.bold, color: opts.muted ? MUTED : INK });
    if (opts.note) pdf.text(LEFT + 190, y, opts.note, { size: 8.5, color: MUTED });
    pdf.text(RIGHT, y, value, { size: 10, bold: opts.bold, color: opts.muted ? MUTED : INK, align: "right" });
    y += 17;
  };

  // Head: the wordmark, the title, when and from what, the disclaimer.
  wordmark(pdf, LEFT, y);
  y += 40;
  pdf.text(LEFT, y, fill(PLAIN.reportTitle, { period: ctx.periodLabel }), { size: 18, bold: true });
  y += 18;
  pdf.text(LEFT, y, fill(PLAIN.reportCreated, { date: germanDate(ctx.today) }), { size: 9, color: MUTED });
  y += 13;
  pdf.text(LEFT, y, "Orientierung, keine Steuerberatung. Sätze vom Steuerberater.", { size: 9, color: MUTED });

  const s = ctx.summary;
  section(PLAIN.overview);
  row(PLAIN.revenue, eur(s.revenue));
  row(PLAIN.fees, `− ${eur(s.fees)}`);
  row(PLAIN.costs, `− ${eur(s.costs)}`);
  row(PLAIN.profit, eur(s.profit), { bold: true });
  row(PLAIN.payouts, eur(s.payouts), { muted: true });

  const r = ctx.reserve;
  section(PLAIN.reserve);
  row("Einkommensteuer", eur(r.incomeTax), { note: `${r.rates.incomeTaxPercent} % vom Gewinn · Platzhalter` });
  row("Gewerbesteuer", eur(r.tradeTax), { note: `${r.rates.tradeTaxPercent} % vom Gewinn · Platzhalter` });
  row("Umsatzsteuer", eur(r.vat), { note: `Umsatzsteuer ${eur(s.vatOut)} − Vorsteuer ${eur(s.vatIn)}` });
  row(PLAIN.reserveTotal, eur(r.total), { bold: true });
  if (ctx.bank) row(fill(PLAIN.bank, { account: ctx.bank.account }), eur(ctx.bank.balance), { muted: true });

  section(PLAIN.byCountry);
  const cols = [LEFT, 300, 380, 460, RIGHT];
  ensure(18);
  ["Land", "Privat", "Firma", "Gesamt", "Anteil"].forEach((h, i) => pdf.text(cols[i] + (i === 0 ? 0 : i === 4 ? 0 : 0), y, h, { size: 8.5, bold: true, color: MUTED, align: i === 0 ? "left" : "right" }));
  y += 15;
  const shown = ctx.byCountry.rows.slice(0, 14);
  for (const c of shown) {
    ensure(16);
    pdf.text(cols[0], y, countryName(c.country), { size: 9.5 });
    pdf.text(cols[1], y, eur(c.private), { size: 9.5, align: "right" });
    pdf.text(cols[2], y, eur(c.business), { size: 9.5, align: "right" });
    pdf.text(cols[3], y, eur(c.total), { size: 9.5, align: "right" });
    pdf.text(cols[4], y, pct(Math.round(c.share * 100)), { size: 9.5, align: "right", color: MUTED });
    y += 15;
  }
  if (ctx.byCountry.rows.length > shown.length) {
    pdf.text(cols[0], y, fill(PLAIN.more, { count: ctx.byCountry.rows.length - shown.length }), { size: 9, color: MUTED });
    y += 15;
  }
  pdf.line(LEFT, y - 9, RIGHT, y - 9, LINE);
  y += 4;
  const t = ctx.byCountry.total;
  pdf.text(cols[0], y, "Summe", { size: 9.5, bold: true });
  pdf.text(cols[1], y, eur(t.private), { size: 9.5, bold: true, align: "right" });
  pdf.text(cols[2], y, eur(t.business), { size: 9.5, bold: true, align: "right" });
  pdf.text(cols[3], y, eur(t.total), { size: 9.5, bold: true, align: "right" });
  y += 15;

  section(PLAIN.receipts);
  ensure(18);
  if (s.missingReceipts > 0) {
    pdf.dot(LEFT + 3, y - 3.5, 3, SIGNAL);
    pdf.text(LEFT + 12, y, fill(PLAIN.missingReceipts, { count: num(s.missingReceipts) }), { size: 10 });
  } else pdf.text(LEFT, y, PLAIN.allReceipts, { size: 10 });
  y += 17;

  section(PLAIN.deadlines);
  ctx.deadlines.slice(0, 6).forEach((d, i) => {
    ensure(17);
    if (i === 0) pdf.dot(LEFT + 3, y - 3.5, 3, SIGNAL);
    pdf.text(LEFT + 12, y, germanDate(d.date), { size: 10, bold: i === 0 });
    pdf.text(LEFT + 90, y, deadlineLabel(d), { size: 10 });
    y += 17;
  });

  // Foot on the last page: the fixed rates, plainly.
  pdf.text(LEFT, 812, `Rücklage-Sätze (Platzhalter): Einkommensteuer ${dec(r.rates.incomeTaxPercent)} %, Gewerbesteuer ${dec(r.rates.tradeTaxPercent)} % – mit Steuerberater festlegen.`, { size: 7.5, color: MUTED });
  return pdf.bytes();
}

export const pdfExporter: Exporter = {
  id: "pdf",
  ready: true,
  fileName: (ctx) => `${fileStem("steuerbericht", ctx.period.key)}.pdf`,
  build: (ctx) => new Blob([reportPdf(ctx)], { type: "application/pdf" }),
};
