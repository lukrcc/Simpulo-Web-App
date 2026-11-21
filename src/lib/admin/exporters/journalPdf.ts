// Geld › Steuern › Buchungsjournal: the readable PDF overview of a period for the tax advisor (the summary, the reserve suggestion, every
// booking) and the receipt of one booking. German, from the booking journal only (lib/admin/bookingJournal.ts); the PDF writer of pdf.ts.
import type { JournalLine, JournalPeriod, JournalSummary, journalReserve } from "../bookingJournal";
import { eurCents } from "@/lib/i18n/adminFormat";
import { fill, PLAIN } from "./labels";
import { PdfDoc, type Rgb } from "./pdf";
import { wordmark } from "./reportPdf";

const INK: Rgb = [0.133, 0.118, 0.106];
const MUTED: Rgb = [0.45, 0.42, 0.4];
const LINE: Rgb = [0.88, 0.86, 0.83];
const LEFT = 48;
const RIGHT = 547;
const TOP = 64;
const BOTTOM = 800;
const J = PLAIN.journal;
const germanDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export interface JournalPdfInput {
  period: JournalPeriod;
  periodLabel: string;
  lines: readonly JournalLine[];
  summary: JournalSummary;
  reserve: ReturnType<typeof journalReserve>;
  /** YYYY-MM-DD */
  today: string;
}

export function journalPdf(input: JournalPdfInput): Uint8Array<ArrayBuffer> {
  const pdf = new PdfDoc();
  let y = TOP;
  const row = (label: string, value: string, bold = false) => {
    pdf.text(LEFT, y, label, { size: 10, bold, color: INK });
    pdf.text(RIGHT, y, value, { size: 10, bold, color: INK, align: "right" });
    y += 18;
  };
  const section = (title: string) => {
    y += 22;
    pdf.text(LEFT, y, title.toUpperCase(), { size: 8, bold: true, color: MUTED });
    y += 7;
    pdf.line(LEFT, y, RIGHT, y, LINE);
    y += 16;
  };
  wordmark(pdf, LEFT, y);
  y += 34;
  pdf.text(LEFT, y, fill(J.title, { period: input.periodLabel }), { size: 18, bold: true });
  y += 18;
  pdf.text(LEFT, y, fill(J.created, { date: germanDate(input.today) }), { size: 9, color: MUTED });
  y += 13;
  pdf.text(LEFT, y, J.note, { size: 9, color: MUTED });

  section(J.summary);
  row(J.income, eurCents(input.summary.income));
  row(J.refunds, eurCents(input.summary.refunds));
  row(J.fees, eurCents(input.summary.fees));
  row(J.profit, eurCents(input.summary.profit), true);
  if (input.summary.vat === null) {
    pdf.text(LEFT, y, J.vatOff, { size: 9, color: MUTED });
    y += 16;
  } else row(J.vat, eurCents(input.summary.vat));
  row(fill(J.reserve, { percent: input.reserve.percent }), eurCents(input.reserve.total), true);

  section(J.lines);
  // Columns: date · receipt · kind · House · gross · tax · net · status
  const X = { date: LEFT, receipt: LEFT + 52, kind: LEFT + 122, house: LEFT + 212, gross: LEFT + 372, tax: LEFT + 418, net: LEFT + 464, status: RIGHT };
  const head = () => {
    const c = J.columns;
    pdf.text(X.date, y, c.date, { size: 8, bold: true, color: MUTED });
    pdf.text(X.receipt, y, c.receipt, { size: 8, bold: true, color: MUTED });
    pdf.text(X.kind, y, c.kind, { size: 8, bold: true, color: MUTED });
    pdf.text(X.house, y, c.house, { size: 8, bold: true, color: MUTED });
    pdf.text(X.gross, y, c.gross, { size: 8, bold: true, color: MUTED, align: "right" });
    pdf.text(X.tax, y, c.tax, { size: 8, bold: true, color: MUTED, align: "right" });
    pdf.text(X.net, y, c.net, { size: 8, bold: true, color: MUTED, align: "right" });
    pdf.text(X.status, y, c.status, { size: 8, bold: true, color: MUTED, align: "right" });
    y += 14;
  };
  if (input.lines.length === 0) pdf.text(LEFT, y, J.none, { size: 10, color: MUTED });
  else head();
  for (const l of input.lines) {
    if (y > BOTTOM) {
      pdf.addPage();
      y = TOP;
      head();
    }
    pdf.text(X.date, y, germanDate(l.date).slice(0, 6), { size: 8.5 });
    pdf.text(X.receipt, y, l.receiptNo, { size: 8.5 });
    pdf.text(X.kind, y, clip(J.kind[l.kind], 18), { size: 8.5 });
    pdf.text(X.house, y, clip(l.house, 30), { size: 8.5 });
    pdf.text(X.gross, y, eurCents(l.gross), { size: 8.5, align: "right" });
    pdf.text(X.tax, y, eurCents(l.tax), { size: 8.5, align: "right" });
    pdf.text(X.net, y, eurCents(l.net), { size: 8.5, align: "right" });
    pdf.text(X.status, y, J.status[l.status], { size: 8.5, color: MUTED, align: "right" });
    y += 13;
  }
  return pdf.bytes();
}

/** One booking's receipt: number, date, kind, House, gross, rate, tax, net, the guest's payment it belongs to. */
export function journalReceiptPdf(line: JournalLine, today: string): Uint8Array<ArrayBuffer> {
  const pdf = new PdfDoc();
  let y = TOP;
  wordmark(pdf, LEFT, y);
  y += 34;
  pdf.text(LEFT, y, fill(J.receiptTitle, { no: line.receiptNo }), { size: 18, bold: true });
  y += 18;
  pdf.text(LEFT, y, fill(J.created, { date: germanDate(today) }), { size: 9, color: MUTED });
  y += 13;
  pdf.text(LEFT, y, J.note, { size: 9, color: MUTED });
  y += 30;
  const c = J.columns;
  const rows: [string, string][] = [
    [c.date, germanDate(line.date)],
    [c.kind, J.kind[line.kind]],
    [c.house, line.house],
    [c.gross, eurCents(line.gross)],
    [c.rate, `${line.taxRate} %`],
    [c.tax, eurCents(line.tax)],
    [c.net, eurCents(line.net)],
    [c.status, J.status[line.status]],
  ];
  for (const [label, value] of rows) {
    pdf.text(LEFT, y, label, { size: 10, color: MUTED });
    pdf.text(LEFT + 120, y, value, { size: 10 });
    y += 18;
  }
  y += 12;
  pdf.line(LEFT, y, RIGHT, y, LINE);
  y += 18;
  pdf.text(LEFT, y, fill(J.receiptFor, { payment: line.paymentId, house: line.house }), { size: 9, color: MUTED });
  y += 13;
  pdf.text(LEFT, y, fill(J.receiptOriginal, { amount: line.original.amount.toLocaleString("de-DE"), currency: line.original.currency }), { size: 9, color: MUTED });
  if (line.kind === "stripeFee") {
    y += 13;
    pdf.text(LEFT, y, J.receiptStripe, { size: 9, color: MUTED });
  }
  return pdf.bytes();
}
