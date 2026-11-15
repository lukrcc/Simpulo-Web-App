// CSV for a German tax advisor: semicolon, decimal comma, UTF-8 with BOM (Excel opens it right).
import type { Exporter } from "./types";
import { fileStem, journalHead, journalRow } from "./journal";

const cell = (v: string | number) => {
  const text = typeof v === "number" ? String(v).replace(".", ",") : v;
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Any table as CSV (also DAC7 and the investments). */
export function tableCsv(head: readonly string[], rows: readonly (readonly (string | number)[])[]): Blob {
  const text = [head, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  return new Blob(["﻿", text], { type: "text/csv;charset=utf-8" });
}

export const csvExporter: Exporter = {
  id: "csv",
  ready: true,
  fileName: (ctx) => `${fileStem("journal", ctx.period.key)}.csv`,
  build: (ctx) => tableCsv(journalHead(), ctx.entries.map(journalRow)),
};
