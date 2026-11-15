// The journal as JSON: the period and the lines as they are (field names in English, amounts as numbers).
import type { Exporter } from "./types";
import { fileStem } from "./journal";

export const jsonExporter: Exporter = {
  id: "json",
  ready: true,
  fileName: (ctx) => `${fileStem("journal", ctx.period.key)}.json`,
  build: (ctx) => new Blob([JSON.stringify({ period: { key: ctx.period.key, from: ctx.period.from, to: ctx.period.to }, createdAt: ctx.today, entries: ctx.entries }, null, 2)], { type: "application/json" }),
};
