// Finanzierung › Unterlagen › "Kennzahlen als PDF": the most important numbers of the last 12 months on one calm A4 page – the wordmark,
// the key figures, profit and full Houses per month. Built from the same sources as the overview and Analyse (the caller passes them in,
// computed in lib/admin/metrics.ts). German, no valuation.
import { eur, month as monthShort, num, pct } from "@/lib/i18n/adminFormat";
import { PdfDoc, type Rgb } from "./pdf";
import { wordmark } from "./reportPdf";

const MUTED: Rgb = [0.45, 0.42, 0.4];
const LINE: Rgb = [0.88, 0.86, 0.83];
const LEFT = 56;
const RIGHT = 539;

export interface KpiReport {
  /** YYYY-MM-DD */
  today: string;
  months: readonly { month: string; profit: number; full: number }[];
  revenue12: number;
  repeatRatePercent: number | null;
  perFullHouse: number | null;
  medianDaysToFull: number | null;
  realHouses: number;
  readiness: { met: number; total: number };
}

const germanDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

export function kpiPdf(r: KpiReport): Uint8Array<ArrayBuffer> {
  const pdf = new PdfDoc();
  wordmark(pdf, LEFT, 64);
  pdf.text(LEFT, 104, "Kennzahlen – letzte 12 Monate", { size: 18, bold: true });
  pdf.text(LEFT, 122, `Stand ${germanDate(r.today)} · Thesen zur Orientierung, keine Finanzberatung.`, { size: 9, color: MUTED });

  // Key figures in two columns.
  const figures: [string, string][] = [
    ["Umsatz (12 Monate)", eur(r.revenue12)],
    ["Gewinn diesen Monat", eur(r.months.at(-1)?.profit ?? 0)],
    ["Volle Houses diesen Monat", num(r.months.at(-1)?.full ?? 0)],
    ["Wiederkehrer", r.repeatRatePercent === null ? "–" : pct(r.repeatRatePercent)],
    ["Einnahme pro vollem House", r.perFullHouse === null ? "–" : eur(r.perFullHouse)],
    ["Tage bis voll (Median)", r.medianDaysToFull === null ? "–" : num(r.medianDaysToFull)],
    ["Echte Houses", num(r.realHouses)],
    ["Bereitschaft", `${r.readiness.met} von ${r.readiness.total}`],
  ];
  let y = 160;
  pdf.text(LEFT, y, "ÜBERBLICK", { size: 8, bold: true, color: MUTED });
  y += 7;
  pdf.line(LEFT, y, RIGHT, y, LINE);
  y += 22;
  figures.forEach(([label, value], i) => {
    const x = i % 2 === 0 ? LEFT : 310;
    const rowY = y + Math.floor(i / 2) * 42;
    pdf.text(x, rowY, label, { size: 9, color: MUTED });
    pdf.text(x, rowY + 18, value, { size: 15, bold: true });
  });
  y += Math.ceil(figures.length / 2) * 42 + 18;

  pdf.text(LEFT, y, "PRO MONAT", { size: 8, bold: true, color: MUTED });
  y += 7;
  pdf.line(LEFT, y, RIGHT, y, LINE);
  y += 18;
  pdf.text(LEFT, y, "Monat", { size: 8.5, bold: true, color: MUTED });
  pdf.text(400, y, "Gewinn", { size: 8.5, bold: true, color: MUTED, align: "right" });
  pdf.text(RIGHT, y, "Volle Houses", { size: 8.5, bold: true, color: MUTED, align: "right" });
  y += 16;
  for (const m of r.months) {
    pdf.text(LEFT, y, `${monthShort(m.month)} ${m.month.slice(0, 4)}`, { size: 10 });
    pdf.text(400, y, eur(m.profit), { size: 10, align: "right" });
    pdf.text(RIGHT, y, num(m.full), { size: 10, align: "right" });
    y += 16;
  }
  pdf.line(LEFT, y - 8, RIGHT, y - 8, LINE);
  pdf.text(LEFT, 812, "Aus Admin › Übersicht und Analyse. Keine Bewertung des Unternehmens.", { size: 7.5, color: MUTED });
  return pdf.bytes();
}
