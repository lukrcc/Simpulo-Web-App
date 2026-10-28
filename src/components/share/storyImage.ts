// The "Download story image" PNG: 1080×1920 (Instagram/TikTok story), drawn on a canvas in the browser.

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

const INK = "#1e1e22";
const ACCENT = "#f0633a";
const SIDE = 88;
const QR_SIZE = 300;

export interface StoryContent {
  /** Host face photo (same origin, or a CORS-enabled URL – otherwise the image is left out) */
  photoUrl?: string;
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

/** Draws `img` like object-fit: cover over the whole canvas. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const scale = Math.max(STORY_WIDTH / img.naturalWidth, STORY_HEIGHT / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (STORY_WIDTH - w) / 2, (STORY_HEIGHT - h) / 2, w, h);
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

  // Wordmark, top left: "simpulo" + the orange dot.
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 64px ${font}`;
  ctx.fillText("simpulo", SIDE, 170);
  const markWidth = ctx.measureText("simpulo").width;
  ctx.fillStyle = ACCENT;
  ctx.fillText(".", SIDE + markWidth, 170);

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

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `500 38px ${font}`;
  let y = qrTop - 96;
  ctx.fillText(content.hostedBy, SIDE, y);

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
