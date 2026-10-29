// The host's share tools, drawn on a canvas in the browser: the "Download story image" PNG (1080×1920, Instagram /
// TikTok story) and the "Print QR poster" PDF (A4).

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

const INK = "#1e1e22";
const ACCENT = "#f0633a";
const SIDE = 88;
const QR_SIZE = 300;

export interface StoryContent {
  /** The House's photo (same origin, or a CORS-enabled URL – otherwise the image is left out) */
  photoUrl?: string;
  /** The host's face, round beside "Hosted by …" */
  avatarUrl?: string;
  title: string;
  /** "Feb 12 – 26 · Canggu, Bali" */
  meta: string;
  hostedBy: string;
  join: string;
  scan: string;
  /** The House link the QR code opens (with ref) */
  url: string;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Draws `img` like object-fit: cover into the box (default: the whole story). */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x = 0, y = 0, boxW = STORY_WIDTH, boxH = STORY_HEIGHT) {
  const scale = Math.max(boxW / img.naturalWidth, boxH / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, x + (boxW - w) / 2, y + (boxH - h) / 2, w, h);
}

/** The wordmark: "simpulo" + the orange dot, baseline at y. */
function drawWordmark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, font: string, color: string) {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px ${font}`;
  ctx.fillText("simpulo", x, y);
  const width = ctx.measureText("simpulo").width;
  ctx.fillStyle = ACCENT;
  ctx.fillText(".", x + width, y);
}

/** Splits text into lines that fit `maxWidth`, at most `maxLines` (the last one ellipsised). */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last.trimEnd()}…`;
  return kept;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

/** Renders the story image and resolves with the PNG. */
export async function renderStoryImage(content: StoryContent): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  const font = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";

  // Photo (or a plain ink background), darkened towards the bottom so the text reads.
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  const photo = content.photoUrl ? await loadImage(content.photoUrl) : null;
  if (photo) drawCover(ctx, photo);
  const shade = ctx.createLinearGradient(0, 0, 0, STORY_HEIGHT);
  shade.addColorStop(0, "rgba(0,0,0,0.35)");
  shade.addColorStop(0.3, "rgba(0,0,0,0.05)");
  shade.addColorStop(0.55, "rgba(0,0,0,0.35)");
  shade.addColorStop(1, "rgba(0,0,0,0.88)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  // Wordmark, top left.
  ctx.textBaseline = "alphabetic";
  drawWordmark(ctx, SIDE, 170, 64, font, "#ffffff");

  // From the bottom up: QR row, host line, meta line, title.
  const qrTop = STORY_HEIGHT - 150 - QR_SIZE;
  const { toCanvas } = await import("qrcode");
  const qr = document.createElement("canvas");
  await toCanvas(qr, content.url, { width: QR_SIZE - 40, margin: 0, color: { dark: INK, light: "#ffffff" }, errorCorrectionLevel: "M" });
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, SIDE, qrTop, QR_SIZE, QR_SIZE, 36);
  ctx.drawImage(qr, SIDE + 20, qrTop + 20, QR_SIZE - 40, QR_SIZE - 40);

  const textLeft = SIDE + QR_SIZE + 48;
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 50px ${font}`;
  ctx.fillText(content.join, textLeft, qrTop + QR_SIZE / 2 - 6);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `500 38px ${font}`;
  ctx.fillText(content.scan, textLeft, qrTop + QR_SIZE / 2 + 52);

  // "Hosted by …", with the host's face in a white ring before it.
  let y = qrTop - 96;
  const avatar = content.avatarUrl ? await loadImage(content.avatarUrl) : null;
  let hostLeft = SIDE;
  if (avatar) {
    const size = 76;
    const top = y - 52;
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIDE + size / 2, top + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    drawCover(ctx, avatar, SIDE, top, size, size);
    ctx.restore();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(SIDE + size / 2, top + size / 2, size / 2, 0, Math.PI * 2);
    ctx.stroke();
    hostLeft = SIDE + size + 24;
  }
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `500 38px ${font}`;
  ctx.fillText(content.hostedBy, hostLeft, y);

  ctx.fillStyle = "#ffffff";
  ctx.font = `500 44px ${font}`;
  y -= 72;
  for (const line of wrap(ctx, content.meta, STORY_WIDTH - SIDE * 2, 2).toReversed()) {
    ctx.fillText(line, SIDE, y);
    y -= 58;
  }

  ctx.font = `800 96px ${font}`;
  y -= 40;
  const titleLines = wrap(ctx, content.title, STORY_WIDTH - SIDE * 2, 3);
  for (const line of titleLines.toReversed()) {
    ctx.fillText(line, SIDE, y);
    y -= 108;
  }
  // The accent bar above the title.
  ctx.fillStyle = ACCENT;
  roundRect(ctx, SIDE, y - 10, 120, 14, 7);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))), "image/png"));
}

// ─── QR poster (A4 PDF) ──────────────────────────────────────────────────────────

/** A4 at 300 dpi. */
const POSTER_WIDTH = 2480;
const POSTER_HEIGHT = 3508;
/** A4 in PDF points. */
const A4_PT = { width: 595.28, height: 841.89 };

export interface PosterContent {
  title: string;
  /** "Feb 12 – 26 · Canggu, Bali" */
  meta: string;
  scan: string;
  /** The House link the QR code opens (with ref) */
  url: string;
  /** Printed under the QR code – the link without its tracking parameters */
  shortUrl: string;
}

/**
 * The poster: wordmark, title, dates · place and a large QR code, drawn on an A4 canvas at 300 dpi (in the site's
 * font, so any title prints), then wrapped as a JPEG in a one-page PDF – no PDF library needed.
 */
export async function renderPosterPdf(content: PosterContent): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = POSTER_WIDTH;
  canvas.height = POSTER_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  const font = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  const side = 220;
  const centre = POSTER_WIDTH / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);
  ctx.textBaseline = "alphabetic";
  drawWordmark(ctx, side, 360, 120, font, INK);

  // Title (up to three lines) and dates · place, centred.
  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = `800 170px ${font}`;
  let y = 820;
  for (const line of wrap(ctx, content.title, POSTER_WIDTH - side * 2, 3)) {
    ctx.fillText(line, centre, y);
    y += 190;
  }
  ctx.fillStyle = "#6b6b72";
  ctx.font = `500 76px ${font}`;
  ctx.fillText(wrap(ctx, content.meta, POSTER_WIDTH - side * 2, 1)[0] ?? "", centre, y + 10);

  // The QR code, as large as the rest allows.
  const qrSize = 1500;
  const qrTop = y + 160;
  const { toCanvas } = await import("qrcode");
  const qr = document.createElement("canvas");
  await toCanvas(qr, content.url, { width: qrSize, margin: 0, color: { dark: INK, light: "#ffffff" }, errorCorrectionLevel: "M" });
  ctx.drawImage(qr, centre - qrSize / 2, qrTop, qrSize, qrSize);

  ctx.fillStyle = INK;
  ctx.font = `700 96px ${font}`;
  ctx.fillText(content.scan, centre, qrTop + qrSize + 190);
  ctx.fillStyle = "#6b6b72";
  ctx.font = `500 56px ${font}`;
  ctx.fillText(content.shortUrl, centre, qrTop + qrSize + 290);

  const jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))), "image/jpeg", 0.92));
  return jpegToPdf(new Uint8Array(await jpeg.arrayBuffer()), POSTER_WIDTH, POSTER_HEIGHT);
}

/** One A4 page showing one full-page JPEG: catalog, pages, page, image XObject, content stream, xref. */
function jpegToPdf(jpeg: Uint8Array, width: number, height: number): Blob {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (part: Uint8Array | string) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (n: number, body: string, stream?: Uint8Array) => {
    offsets[n] = length;
    push(`${n} 0 obj\n${body}\n`);
    if (stream) {
      push("stream\n");
      push(stream);
      push("\nendstream\n");
    }
    push("endobj\n");
  };
  const content = encoder.encode(`q ${A4_PT.width} 0 0 ${A4_PT.height} 0 0 cm /Im0 Do Q`);

  push("%PDF-1.4\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_PT.width} ${A4_PT.height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  object(4, `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`, jpeg);
  object(5, `<< /Length ${content.length} >>`, content);
  const xref = length;
  push(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}

/** Saves a blob as a file (a temporary link click). */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
