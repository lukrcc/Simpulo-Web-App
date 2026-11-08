"use client";

import QRCode from "qrcode";
import { useMemo, type Ref } from "react";
import { cn } from "@/lib/utils";

const INK = "#221E1B";
const CREAM = "#F4EEE7";
const QUIET = 2;

interface SimpuloQRProps {
  /** Where the code leads (absolute) */
  url: string;
  /** Edge length in px */
  size: number;
  /** Appended as ?ref= – where the code was seen ("footer", "get", "house-qr"). Not `ref`: React reserves that name. */
  refParam?: string;
  /** The <svg> itself, e.g. to export it as a PNG (downloadQrPng) */
  svgRef?: Ref<SVGSVGElement>;
  className?: string;
}

/** The URL with ?ref= added (keeps any query it has). */
export function withRefParam(url: string, ref?: string): string {
  if (!ref) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("ref", ref);
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Simpulo's QR code, made in the browser: rounded ink modules on cream, plain – no logo in the middle (the app icon never shows inside the
 * pages). Error correction M: nothing covers it, so the modules can stay larger.
 */
export function SimpuloQR({ url, size, refParam, svgRef, className }: SimpuloQRProps) {
  const target = withRefParam(url, refParam);
  const qr = useMemo(() => QRCode.create(target, { errorCorrectionLevel: "M" }), [target]);
  const n = qr.modules.size;
  const total = n + QUIET * 2;
  // The three finder patterns (7×7 in three corners) are drawn whole, as rounded squares – scanners find them more reliably than dots.
  const finders = [
    [0, 0],
    [n - 7, 0],
    [0, n - 7],
  ];
  const inFinder = (x: number, y: number) => finders.some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
  const dots: string[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!qr.modules.get(y, x) || inFinder(x, y)) continue;
      dots.push(`M${x + QUIET + 0.1},${y + QUIET + 0.5}a0.4,0.4 0 0 1 0.4,-0.4h0a0.4,0.4 0 0 1 0.4,0.4v0a0.4,0.4 0 0 1 -0.4,0.4h0a0.4,0.4 0 0 1 -0.4,-0.4z`);
    }
  }
  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${total} ${total}`} width={size} height={size} role="img" aria-label={target} className={cn("block", className)} shapeRendering="geometricPrecision">
      <rect width={total} height={total} rx={total * 0.08} fill={CREAM} />
      <path d={dots.join("")} fill={INK} />
      {finders.map(([fx, fy]) => (
        <g key={`${fx}-${fy}`} transform={`translate(${fx + QUIET} ${fy + QUIET})`}>
          <rect x={0.5} y={0.5} width={6} height={6} rx={1.8} fill="none" stroke={INK} strokeWidth={1} />
          <rect x={2} y={2} width={3} height={3} rx={0.9} fill={INK} />
        </g>
      ))}
    </svg>
  );
}

/**
 * Saves a SimpuloQR as a PNG (2× its size, for print): on a full cream square with a wider margin, so the code keeps a proper quiet zone
 * wherever it is placed (on screen the page around it gives that room).
 */
export async function downloadQrPng(svg: SVGSVGElement, fileName: string, size: number) {
  const data = new XMLSerializer().serializeToString(svg);
  const image = new Image();
  image.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(data)))}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  const edge = size * 2;
  const margin = Math.round(edge * 0.08);
  canvas.width = canvas.height = edge + margin * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, margin, margin, edge, edge);
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = fileName;
  a.click();
}
