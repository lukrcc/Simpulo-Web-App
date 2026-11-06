// "Add to calendar": the stay as one all-day event (.ics), the day after it ends as the exclusive end (RFC 5545).
import type { Stay } from "./types";

const day = (iso: string) => iso.slice(0, 10).replaceAll("-", "");
const escape = (text: string) => text.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

export function stayIcs(stay: Pick<Stay, "id" | "title" | "startDate" | "endDate" | "city" | "region">, url: string): string {
  const end = new Date(`${stay.endDate.slice(0, 10)}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Simpulo//House//EN",
    "BEGIN:VEVENT",
    `UID:${stay.id}@simpulo`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day(stay.startDate)}`,
    `DTEND;VALUE=DATE:${day(end.toISOString())}`,
    `SUMMARY:${escape(stay.title)}`,
    `LOCATION:${escape([stay.city, stay.region].filter(Boolean).join(", "))}`,
    `URL:${url}`,
    `DESCRIPTION:${escape(`Your House on Simpulo: ${url}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(stay: Parameters<typeof stayIcs>[0] & { slug: string }) {
  const blob = new Blob([stayIcs(stay, `${window.location.origin}/house/${stay.slug}`)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${stay.slug}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
