// The Ember ground as a pre-rendered picture (public/glow/ember-band.png): a CSS gradient over a dark ground shows rings and steps in 8-bit
// colour; this one is computed in float, dithered down to 8 bit and stored losslessly, so it shows neither.
//   3840 × 1600 (Retina). Deepest black top left (#151210 – behind the titles), through #221E1B in the middle, to a warm #4A2E22 bottom right,
//   every transition a smoothstep (no hard stops); over it a very soft warm glow bottom right (rgba(240,99,58,.14), radius ~60 % of the width).
//   Written to 8 bit with Floyd–Steinberg error diffusion per channel (the error ±0.5 of a level – no visible grain), PNG, lossless.
// Run once: node scripts/make-glow.mjs – the picture is committed.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const WIDTH = 3840;
const HEIGHT = 1600;
const OUT = "public/glow/ember-band.png";

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const DEEP = hex("#151210");
const MID = hex("#221E1B");
const WARM = hex("#4A2E22");
const GLOW = [240, 99, 58];
const GLOW_ALPHA = 0.14;
const GLOW_RADIUS = 0.6 * WIDTH;

const smoothstep = (t) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
const mix = (a, b, t) => a + (b - a) * t;

// 1. The picture in float (0–255 per channel, fractions kept).
const pixels = new Float32Array(WIDTH * HEIGHT * 3);
const diagonal = Math.hypot(WIDTH, HEIGHT);
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    // Position along the diagonal top left → bottom right (0 … 1), measured in the picture's own proportions.
    const t = Math.min(1, Math.max(0, (x * WIDTH + y * HEIGHT) / (diagonal * diagonal)));
    // Two smoothstepped halves: deep → mid, mid → warm.
    const half = t < 0.5 ? smoothstep(t / 0.5) : smoothstep((t - 0.5) / 0.5);
    const from = t < 0.5 ? DEEP : MID;
    const to = t < 0.5 ? MID : WARM;
    // The warm glow bottom right: full at the corner, smoothstepped to nothing at its radius.
    const g = GLOW_ALPHA * (1 - smoothstep(Math.hypot(WIDTH - x, HEIGHT - y) / GLOW_RADIUS));
    const i = (y * WIDTH + x) * 3;
    for (let c = 0; c < 3; c++) pixels[i + c] = mix(mix(from[c], to[c], half), GLOW[c], g);
  }
}

// 2. Down to 8 bit with Floyd–Steinberg per channel: each pixel rounds, its error (at most ±0.5) goes on to its neighbours (7/16 right,
//    3/16 bottom left, 5/16 below, 1/16 bottom right) – the average stays exact, no bands, no visible grain. Serpentine rows against drift.
const bytes = Buffer.alloc(WIDTH * HEIGHT * 3);
for (let y = 0; y < HEIGHT; y++) {
  const ltr = y % 2 === 0;
  for (let k = 0; k < WIDTH; k++) {
    const x = ltr ? k : WIDTH - 1 - k;
    const dir = ltr ? 1 : -1;
    for (let c = 0; c < 3; c++) {
      const i = (y * WIDTH + x) * 3 + c;
      const value = pixels[i];
      const rounded = Math.max(0, Math.min(255, Math.round(value)));
      bytes[i] = rounded;
      const error = value - rounded;
      const spread = (dx, dy, w) => {
        const nx = x + dx * dir;
        const ny = y + dy;
        if (nx < 0 || nx >= WIDTH || ny >= HEIGHT) return;
        pixels[(ny * WIDTH + nx) * 3 + c] += error * w;
      };
      spread(1, 0, 7 / 16);
      spread(-1, 1, 3 / 16);
      spread(0, 1, 5 / 16);
      spread(1, 1, 1 / 16);
    }
  }
}

mkdirSync("public/glow", { recursive: true });
await sharp(bytes, { raw: { width: WIDTH, height: HEIGHT, channels: 3 } })
  .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
  .toFile(OUT);
console.log(OUT, WIDTH, "×", HEIGHT);
