// Per House photo, once: its lower third (where a card's words sit) as { tint, lum } – data/image-meta.json, keyed by the photo's public path.
//   tint: the lower third's average colour, kept in hue and saturation, its lightness set to 12 % (HSL) – the card darkens in the photo's own
//         colour, not in grey.
//   lum:  the lower third's mean lightness 0–1 (luma of the sRGB values) – bright photos get a stronger darkening.
//   accent: the whole photo's average colour (hex) – the stage takes a breath of it (lib/stageTint.ts: House page, Your houses, the profile).
//   palette: { main, dark } (hex) like node-vibrant's swatches – the House page's mood: main tints the stage (cover), dark carries the
//            photo tiles' run under their words (host photo, place photo). Our own small quantiser (sharp is here already): the photo at
//            64px, colours bucketed by 4 bits a channel; main = the most common bucket of middle lightness (.25–.75), dark = the most common
//            dark muted bucket (saturation < .45, lightness .08–.30); an empty band takes the average, moved into the band.
// Photos: the House photos, the profile photos and the place images (public/destinations).

// The mock adapter hands these to the cards (getPhotoMeta in src/lib/data); without an entry: tint #1A1614, lum .5.
// TODO(backend): a Cloud Function computes the same on upload and stores { tint, lum, accent, palette } with the photo (House.accentColor,
// House.accentPalette, User.photoAccents).
// Run: node scripts/image-meta.mjs
import sharp from "sharp";
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "public";
const DIRS = ["public/mock/houses", "public/mock/users", "public/destinations"];
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
  // The whole photo's average colour.
  const whole = await sharp(file).resize(64).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let ar = 0, ag = 0, ab = 0;
  const wn = whole.info.width * whole.info.height;
  for (let i = 0; i < whole.data.length; i += whole.info.channels) {
    ar += whole.data[i];
    ag += whole.data[i + 1];
    ab += whole.data[i + 2];
  }
  const avg = [ar / wn, ag / wn, ab / wn];
  // The palette: buckets of 4 bits a channel, counted.
  const buckets = new Map();
  for (let i = 0; i < whole.data.length; i += whole.info.channels) {
    const key = ((whole.data[i] >> 4) << 8) | ((whole.data[i + 1] >> 4) << 4) | (whole.data[i + 2] >> 4);
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    bucket.r += whole.data[i];
    bucket.g += whole.data[i + 1];
    bucket.b += whole.data[i + 2];
    bucket.n += 1;
    buckets.set(key, bucket);
  }
  const swatches = [...buckets.values()].map((bk) => {
    const rgb = [bk.r / bk.n, bk.g / bk.n, bk.b / bk.n];
    const [hh, ss, ll] = toHsl(rgb);
    return { rgb, h: hh, s: ss, l: ll, n: bk.n };
  });
  const pick = (test, score, fallback) => {
    const inBand = swatches.filter(test);
    if (inBand.length === 0) return hex(toRgb(fallback));
    return hex(inBand.toSorted((x, y) => score(y) - score(x))[0].rgb.map(Math.round));
  };
  const [ah, as, al] = toHsl(avg);
  const palette = {
    main: pick((c) => c.l >= 0.25 && c.l <= 0.75, (c) => c.n, [ah, as, Math.min(Math.max(al, 0.35), 0.65)]),
    dark: pick((c) => c.s < 0.45 && c.l >= 0.08 && c.l < 0.3, (c) => c.n, [ah, Math.min(as, 0.3), 0.2]),
  };
  meta[`/${relative(ROOT, file)}`] = { tint: hex(toRgb([h, s, 0.12])), lum: Math.round((luma / n) * 1000) / 1000, accent: hex(avg.map(Math.round)), palette };
}
writeFileSync("data/image-meta.json", `${JSON.stringify(meta, null, 2)}\n`);
console.log("data/image-meta.json", Object.keys(meta).length, "photos");
