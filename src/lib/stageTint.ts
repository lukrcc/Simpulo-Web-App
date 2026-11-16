// The stage's colours (House page, Your houses, the profile):
// 1. The light surface right of the photo takes a soft run of the photo's colour – House.accentColor (the cover), User.photoAccents[0] (the
//    first profile photo); the mock reads both from data/image-meta.json (scripts/image-meta.mjs). In CSS (tokens.css .stage-tinted):
//    --stage-tint = color-mix(in oklab, var(--band) {100 − t}%, accent t%), t at most 16 – the run's top-left end, into the cream.
//    The share is lowered (in steps of 1) until ink and ink 64 % keep 4.5 : 1 on it. The dark strip never takes the colour.
// 2. The House page's cards don't take the photo's colours any more: they carry colours with a meaning (tokens.css .card-host / .card-spots
//    / .card-place). The palette (House.accentPalette) stays in the data.
// OKLab rather than OKLCH: a nearly grey photo has no hue, and Chromium's OKLCH mix then takes 0° – the cream turned pink (measured).
import type { CSSProperties } from "react";
import { photoMetaOf } from "@/lib/data";
import type { Stay, User } from "@/lib/types";

const TINT_MAX = 16;
const MIN_CONTRAST = 4.5;

// The base tokens (tokens.css) – here only to check the contrast before CSS mixes them.
const BAND = "#eae4dd";
const SURFACE = "#fbf8f4";
const INK = "#221e1b";
const INK_MUTED = 0.64;

type Rgb = [number, number, number];
const rgbOf = (hex: string): Rgb | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) => Math.round(255 * Math.min(1, Math.max(0, v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)));

// OKLab (Björn Ottosson) – the same space the CSS mixes in, so the check sees what the browser paints.
function toOklab([r, g, b]: Rgb): Rgb {
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function fromOklab([L, A, B]: Rgb): Rgb {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(fromLinear) as Rgb;
}
const mix = (base: Rgb, accent: Rgb, share: number): Rgb => {
  const a = toOklab(base);
  const b = toOklab(accent);
  return fromOklab([0, 1, 2].map((i) => a[i] * (1 - share) + b[i] * share) as Rgb);
};
/** A colour with alpha over a ground (what the browser paints). */
const over = (fg: Rgb, alpha: number, ground: Rgb): Rgb => [0, 1, 2].map((i) => Math.round(fg[i] * alpha + ground[i] * (1 - alpha))) as Rgb;
const luminance = (c: Rgb) => 0.2126 * toLinear(c[0]) + 0.7152 * toLinear(c[1]) + 0.0722 * toLinear(c[2]);
export const contrast = (a: Rgb, b: Rgb) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** The largest share (%) at or under `max` that keeps every text on the mixed ground at 4.5 : 1. */
function safeShare(base: Rgb, accent: Rgb, max: number, texts: { color: Rgb; alpha: number }[]): number {
  for (let share = max; share > 0; share -= 1) {
    const ground = mix(base, accent, share / 100);
    if (texts.every(({ color, alpha }) => contrast(over(color, alpha, ground), ground) >= MIN_CONTRAST)) return share;
  }
  return 0;
}

/** The stage's CSS variables for an accent colour (hex); none, or not a colour: no tint (the plain tokens). */
export function stageTintStyle(accent: string | undefined | null): CSSProperties | undefined {
  const rgb = accent ? rgbOf(accent) : null;
  if (!rgb) return undefined;
  const ink = rgbOf(INK)!;
  const tint = safeShare(rgbOf(BAND)!, rgb, TINT_MAX, [{ color: ink, alpha: 1 }, { color: ink, alpha: INK_MUTED }]);
  return { "--stage-accent": accent, "--stage-tint-share": `${tint}%` } as CSSProperties;
}

/** A House's colour: its own field, else (mock) the cover photo's from the precomputed metadata. */
export const stayAccentOf = (stay: Stay, cover?: string) => stay.accentColor ?? (cover ? photoMetaOf(cover).accent : undefined);

/** A person's colour: their first photo's. */
export const userAccentOf = (user: User) => user.photoAccents?.[0] ?? (user.photos[0] ? photoMetaOf(user.photos[0]).accent : undefined);

/** Messages' chosen chat: a soft fill of its House's colour on the list (about 14 %, hover half), lowered until the muted line keeps 4.5 : 1. */
const ROW_MAX = 14;
export function listFillStyle(accent: string | undefined | null): CSSProperties {
  const rgb = (accent && rgbOf(accent)) || rgbOf(INK)!;
  const ink = rgbOf(INK)!;
  const share = safeShare(rgbOf(SURFACE)!, rgb, ROW_MAX, [{ color: ink, alpha: 1 }, { color: ink, alpha: INK_MUTED }]);
  return { "--row-accent": `rgb(${rgb.join(" ")})`, "--row-share": `${share}%`, "--row-hover-share": `${share / 2}%` } as CSSProperties;
}

/* ───────────── The House page's mood from its photos (palette.main / palette.dark, data/image-meta.json) ───────────── */

const WHITE: Rgb = [255, 255, 255];
const GRAPHITE: Rgb = [72, 66, 62];
const TILE_MUTED = 0.85;
const STAGE_CREAM = "#f9f4ed";

/** A photo's palette: { main, dark } – the House's own field for its cover, else (mock) the photo's precomputed metadata. */
export const paletteOf = (src: string | undefined | null) => (src ? photoMetaOf(src).palette : undefined);

/**
 * The run under a photo tile's words (host photo, place photo): the photo's own dark colour (palette.dark; without one graphite), as
 * opaque as white words – and their 85 % line – need for 4.5 : 1 even if the photo under it were white (the worst case). Returns the
 * colour for `--tile-shade` (rgb with alpha).
 */
export function tileShade(src: string | undefined | null): string {
  const dark = (paletteOf(src)?.dark && rgbOf(paletteOf(src)!.dark)) || GRAPHITE;
  for (let a = 0.7; a <= 0.98; a += 0.01) {
    const ground = over(dark, a, WHITE);
    if (contrast(WHITE, ground) >= MIN_CONTRAST && contrast(over(WHITE, TILE_MUTED, ground), ground) >= MIN_CONTRAST) return `rgb(${dark.join(" ")} / ${a.toFixed(2)})`;
  }
  return `rgb(${dark.join(" ")} / 0.98)`;
}

/** The stage's breath of the cover: about 5 % of its palette.main over the cream – lowered until ink 64 % keeps 4.5 : 1. */
export function stageMoodStyle(cover: string | undefined | null): CSSProperties | undefined {
  const main = paletteOf(cover)?.main;
  const rgb = main ? rgbOf(main) : null;
  if (!rgb) return undefined;
  const share = safeShare(rgbOf(STAGE_CREAM)!, rgb, 5, [{ color: rgbOf(INK)!, alpha: 1 }, { color: rgbOf(INK)!, alpha: INK_MUTED }]);
  return { "--stage-main": main, "--stage-main-share": `${share}%` } as CSSProperties;
}

/** The "house" chat background: how much of the House's colour (at most 6 %) goes over the cream so the times (ink 66 %) keep 4.5 : 1. */
export function chatHouseShare(accent: string | undefined | null): number {
  const rgb = accent ? rgbOf(accent) : null;
  if (!rgb) return 0;
  return safeShare(rgbOf("#f3efea")!, rgb, 6, [{ color: rgbOf(INK)!, alpha: 1 }, { color: rgbOf(INK)!, alpha: 0.66 }]);
}
