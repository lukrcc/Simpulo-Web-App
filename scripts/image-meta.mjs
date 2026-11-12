// Per House photo, once: its lower third (where a card's words sit) as { tint, lum } – data/image-meta.json, keyed by the photo's public path.
//   tint: the lower third's average colour, kept in hue and saturation, its lightness set to 12 % (HSL) – the card darkens in the photo's own
//         colour, not in grey.
//   lum:  the lower third's mean lightness 0–1 (luma of the sRGB values) – bright photos get a stronger darkening.
// The mock adapter hands these to the cards (getPhotoMeta in src/lib/data); without an entry: tint #1A1614, lum .5.
// TODO(backend): run the same as a Cloud Function on upload and store { tint, lum } with the photo.
// Run: node scripts/image-meta.mjs
import sharp from "sharp";
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "public";
const DIRS = ["public/mock/houses"];
const IMAGE = /\.(webp|jpe?g|png|avif)$/i;

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : IMAGE.test(name) ? [path] : [];
});

const toHsl = ([r, g, b]) => {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [h * 60, s, l];
};
const toRgb = ([h, s, l]) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map((v) => Math.round((v + m) * 255));
};
const hex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;

const meta = {};
for (const file of DIRS.flatMap(walk).sort()) {
  const image = sharp(file);
  const { width, height } = await image.metadata();
  if (!width || !height) continue;
  const top = Math.floor((height * 2) / 3);
  const { data, info } = await sharp(file)
    .extract({ left: 0, top, width, height: height - top })
    .resize(64)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0, luma = 0;
  const n = info.width * info.height;
  for (let i = 0; i < data.length; i += info.channels) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    luma += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  }
  const [h, s] = toHsl([r / n, g / n, b / n]);
  meta[`/${relative(ROOT, file)}`] = { tint: hex(toRgb([h, s, 0.12])), lum: Math.round((luma / n) * 1000) / 1000 };
}
writeFileSync("data/image-meta.json", `${JSON.stringify(meta, null, 2)}\n`);
console.log("data/image-meta.json", Object.keys(meta).length, "photos");
