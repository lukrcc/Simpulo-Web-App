// A small PDF writer – A4 pages, the standard fonts Helvetica and Helvetica-Bold (WinAnsi: German umlauts, €, dashes and quotes), text,
// thin lines and filled circles. Enough for a calm one- or two-page report and mock receipts; no library, no images.

export type Rgb = readonly [number, number, number];

const WIDTH = 595.28;
const HEIGHT = 841.89;

/** Unicode → WinAnsi (cp1252) for the characters the reports use; anything else becomes "?". */
const CP1252: Record<string, number> = { "€": 0x80, "‚": 0x82, "„": 0x84, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "‹": 0x8b, "›": 0x9b, "−": 0x2d, " ": 0x20, " ": 0x20 };
function winAnsi(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    const mapped = CP1252[ch] ?? (code < 0x80 || (code >= 0xa0 && code <= 0xff) ? code : 0x3f);
    const c = String.fromCharCode(mapped);
    out += c === "(" || c === ")" || c === "\\" ? `\\${c}` : c;
  }
  return out;
}

/** Helvetica's and Helvetica-Bold's widths (per 1000, from the standard font metrics) for letters, digits and what reports use. */
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const REGULAR_LOWER = [556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500];
const BOLD_LOWER = [556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500];
const REGULAR_UPPER = [667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611];
const BOLD_UPPER = [722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611];
const SHARED: Record<string, number> = { " ": 278, ".": 278, ",": 278, ":": 278, "-": 333, "−": 333, "–": 556, "%": 889, "€": 556, "\u00a0": 278, "+": 584, "(": 333, ")": 333, "/": 278, "·": 278, "•": 350, "ä": 556, "ö": 556, "ü": 556, "ß": 611 };
function charWidth(ch: string, bold: boolean): number {
  if (/[0-9]/.test(ch)) return 556;
  const lower = LOWER.indexOf(ch);
  if (lower >= 0) return (bold ? BOLD_LOWER : REGULAR_LOWER)[lower];
  const upper = UPPER.indexOf(ch);
  if (upper >= 0) return (bold ? BOLD_UPPER : REGULAR_UPPER)[upper];
  return SHARED[ch] ?? 556;
}
export const textWidth = (text: string, size: number, bold = false) => ([...text].reduce((n, ch) => n + charWidth(ch, bold), 0) / 1000) * size;

export class PdfDoc {
  private pages: string[] = [];
  private ops: string[] = [];
  readonly width = WIDTH;
  readonly height = HEIGHT;

  constructor() {
    this.addPage();
  }

  addPage() {
    if (this.ops.length) this.pages.push(this.ops.join("\n"));
    this.ops = [];
  }

  /** Text with its baseline at y (from the top of the page). */
  text(x: number, y: number, text: string, opts: { size?: number; bold?: boolean; color?: Rgb; align?: "left" | "right" } = {}) {
    const size = opts.size ?? 10;
    const [r, g, b] = opts.color ?? [0.133, 0.118, 0.106];
    const left = opts.align === "right" ? x - textWidth(text, size, opts.bold) : x;
    this.ops.push(`BT /${opts.bold ? "F2" : "F1"} ${size} Tf ${r} ${g} ${b} rg ${left.toFixed(2)} ${(HEIGHT - y).toFixed(2)} Td (${winAnsi(text)}) Tj ET`);
    return left + textWidth(text, size, opts.bold);
  }

  line(x1: number, y1: number, x2: number, y2: number, color: Rgb = [0.85, 0.83, 0.8], width = 0.6) {
    const [r, g, b] = color;
    this.ops.push(`${r} ${g} ${b} RG ${width} w ${x1.toFixed(2)} ${(HEIGHT - y1).toFixed(2)} m ${x2.toFixed(2)} ${(HEIGHT - y2).toFixed(2)} l S`);
  }

  dot(x: number, y: number, radius: number, color: Rgb) {
    const [r, g, b] = color;
    const k = radius * 0.5523;
    const cy = HEIGHT - y;
    this.ops.push(
      `${r} ${g} ${b} rg ${x + radius} ${cy} m ${x + radius} ${cy + k} ${x + k} ${cy + radius} ${x} ${cy + radius} c ${x - k} ${cy + radius} ${x - radius} ${cy + k} ${x - radius} ${cy} c ${x - radius} ${cy - k} ${x - k} ${cy - radius} ${x} ${cy - radius} c ${x + k} ${cy - radius} ${x + radius} ${cy - k} ${x + radius} ${cy} c f`,
    );
  }

  /** The finished file. */
  bytes(): Uint8Array<ArrayBuffer> {
    const pages = [...this.pages, this.ops.join("\n")];
    const objects: string[] = [];
    // 1 catalog · 2 pages · 3 F1 · 4 F2 · then per page: content, page
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    const kids: string[] = [];
    pages.forEach((content, i) => {
      const contentId = 5 + i * 2;
      const pageId = contentId + 1;
      objects[contentId] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
      objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${WIDTH} ${HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
      kids.push(`${pageId} 0 R`);
    });
    objects[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;
    let out = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
    const offsets: number[] = [];
    for (let id = 1; id < objects.length; id++) {
      offsets[id] = out.length;
      out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }
    const xref = out.length;
    out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objects.length; id++) out += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    // Every character is one byte (WinAnsi), so the string's length is the file's.
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
    return bytes;
  }
}
