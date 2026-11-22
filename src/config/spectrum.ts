// Admin › Analyse › Spektrum: three rows of three equal columns – Länge, Größe, Host – side by side, no ranking, no good/bad colours. The
// bounds here are the ONE definition of the bands: the tabs Länge and Crew group by the same ones (lib/admin/metrics.ts lengthBand,
// crewBand). Admin texts in German; „Wen es anspricht“ is the founders' description – edit it here. The numbers come from metrics.ts.

export type SpectrumRowKey = "length" | "size" | "host";
/** The detail tab a column leads to (Admin › Analyse) */
export type SpectrumDetail = "length" | "crew" | "tier";

export interface SpectrumColumn {
  /** The band's key – the same as the detail tab's group key */
  key: string;
  title: string;
  /** The range in words ("1–5 Nächte") */
  range: string;
  /** „Wen es anspricht“ */
  audience: string;
}

/** Nights: Kurz up to 5, Mittel up to 20, Lang from 21 (3+ weeks). */
export const LENGTH_BOUNDS = { shortMax: 5, midMax: 20 } as const;
/** People in the crew, host included: 2–3, 4–6, 7+. */
export const SIZE_BOUNDS = { smallMax: 3, midMax: 6 } as const;

export const SPECTRUM_ROWS: readonly { key: SpectrumRowKey; label: string; detail: SpectrumDetail; columns: readonly SpectrumColumn[] }[] = [
  {
    key: "length",
    label: "Länge",
    detail: "length",
    columns: [
      { key: "short", title: "Kurz", range: "1–5 Nächte", audience: "Berufstätige mit wenig Urlaub, Studierende, Wochenend-Menschen" },
      { key: "mid", title: "Mittel", range: "1–2 Wochen", audience: "Urlaub mit Sinn, Remote-Wochen, Themen-Reisen, Founder-Sprints" },
      { key: "long", title: "Lang", range: "3+ Wochen", audience: "Remote Worker, Nomads, Auszeit, Neustart, 50+, neue Stadt kennenlernen" },
    ],
  },
  {
    key: "size",
    label: "Größe",
    detail: "crew",
    columns: [
      { key: "2-3", title: "2–3 Personen", range: "klein", audience: "Wer es ruhiger und vertrauter mag" },
      { key: "4-6", title: "4–6 Personen", range: "mittel", audience: "Wer eine echte Crew sucht" },
      { key: "7+", title: "7+ Personen", range: "groß", audience: "Wer Trubel, Community und Events liebt" },
    ],
  },
  {
    key: "host",
    label: "Host",
    detail: "tier",
    columns: [
      { key: "share", title: "Share", range: "ohne Host-Fee", audience: "Wer einfach seinen Ort teilen will" },
      { key: "pro", title: "Pro", range: "mit Host-Fee", audience: "Wer ein Programm anbietet und davon lebt" },
      { key: "anchor", title: "Anchor", range: "große Reichweite", audience: "Wer seine Community zusammenbringt" },
    ],
  },
];

/** A column under this share of the period's Houses gets the one hint „Hier findet eine ganze Gruppe kaum etwas Passendes.“ */
export const SPECTRUM_SPARSE_SHARE = 0.1;
/** „Wer bucht“: the top this many topics and countries. */
export const SPECTRUM_TOP = 3;
