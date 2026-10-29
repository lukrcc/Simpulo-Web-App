/**
 * Downloads the mock photos from Pixabay into public/mock (WebP) and writes public/mock/credits.json.
 *
 *   npx tsx scripts/fetch-mock-images.ts
 *   npx tsx scripts/fetch-mock-images.ts --redo /mock/users/u3/face.webp /mock/houses/s2/1.webp …
 *
 * --redo replaces the given files with a different photo: their current Pixabay ids go on a reject list
 * (scripts/mock-image-rejects.json) so they're never picked again.
 *
 * One face per person (plus the lifestyle photos of hosts with imageQueries), one photo per theme query of each House
 * (queries in src/lib/mock-images.ts, or the House's imageQueries – src/lib/mock-houses-extra.ts). Pixabay forbids
 * permanent hotlinking, so the app only uses the local files. Re-runnable: existing files are skipped and their
 * Pixabay ids stay reserved, so no photo is ever used twice. The API key comes from PIXABAY_API_KEY (environment or
 * .env.local) and is never printed.
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { stays, users } from "../src/lib/mock";
import { houseThemePath, userFacePath, userPhotoPath } from "../src/lib/mock-images";

const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const CREDITS = path.join(PUBLIC, "mock", "credits.json");
const REJECTS = path.join(ROOT, "scripts", "mock-image-rejects.json");
/** Brightness/colour of candidates, by Pixabay id – measured once from the small preview, then reused. */
const STATS = path.join(ROOT, "scripts", "mock-image-stats.json");
/** Too bright or too grey looks washed out on the cards: a candidate must stay below / above these. */
const MAX_LUMINANCE = 0.75;
const MIN_SATURATION = 0.15;
/** Candidates measured per query before falling back to the best-ranked one. */
const MAX_MEASURED = 10;
const MAX_SIDE = 1200;
const QUALITY = 78;
/** Pixabay allows 100 requests / 60 s – stay well below. */
const RATE = { requests: 90, windowMs: 60_000 };
/** Pages of 30 hits to look through per query before shortening it. */
const MAX_PAGES = 3;
/** Never: text and logos, listings, generated images, children. */
const BAD_TAGS = ["text", "logo", "typography", "lettering", "quote", "banner", "label", "font", "sign", "signage", "mockup", "template", "advertising", "real estate", "bedroom", "hotel room", "ai generated", "generated", "artificial intelligence", "watermark", "child", "children", "kid", "kids", "baby", "toddler", "nude", "naked", "erotic", "bikini", "swimsuit", "swimwear", "topless", "shirtless", "painting", "artwork", "digital art", "fantasy", "surreal", "skull"];
/** Faces only: one adult, in colour, a real portrait – no art shots, groups or costumes. */
const BAD_FACE_TAGS = ["couple", "family", "group", "old", "elderly", "senior", "aged", "wrinkles", "grandfather", "grandmother", "underwater", "painting", "art", "artwork", "fantasy", "sculpture", "statue", "topless", "shirtless", "sexy", "lingerie", "bikini", "black and white", "monochrome", "silhouette", "mask", "costume", "halloween", "skull", "blood", "boy", "teen", "teenager"];
const WOMAN = ["woman", "women", "female", "girl", "lady"];
const MAN = ["man", "men", "male", "guy", "businessman"];

interface Hit {
  id: number;
  pageURL: string;
  tags: string;
  likes: number;
  user: string;
  largeImageURL: string;
  previewURL: string;
}

type Credit =
  | { file: string; source: "pixabay"; pixabayId: number; pageURL: string; user: string; query: string; matched: string }
  | { file: string; source: "picsum"; seed: string; query: string };

function apiKey(): string {
  if (process.env.PIXABAY_API_KEY?.trim()) return process.env.PIXABAY_API_KEY.trim();
  const envFile = path.join(ROOT, ".env.local");
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, "utf8").split("\n")) {
      const match = line.trim().match(/^PIXABAY_API_KEY\s*=\s*(.*)$/);
      if (match) return match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  throw new Error("PIXABAY_API_KEY is missing (set it in .env.local)");
}

const KEY = apiKey();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sliding-window throttle for API calls (image downloads come from the CDN and aren't counted). */
const recent: number[] = [];
async function throttle() {
  for (;;) {
    const now = Date.now();
    while (recent.length && now - recent[0] > RATE.windowMs) recent.shift();
    if (recent.length < RATE.requests) break;
    await sleep(RATE.windowMs - (now - recent[0]) + 50);
  }
  recent.push(Date.now());
}

/** A hit's tags as whole words ("young woman, portrait" → young, woman, portrait). */
const tagWords = (hit: Hit) => new Set(hit.tags.toLowerCase().split(/[,\s]+/).filter(Boolean));
const hasAny = (words: Set<string>, list: string[]) => list.some((w) => words.has(w));
/** Any listed tag – single words as whole words ("art" never hits "party"), phrases as text. */
const hasBadTag = (hit: Hit, list: string[]) => {
  const words = tagWords(hit);
  const tags = hit.tags.toLowerCase();
  return list.some((t) => (t.includes(" ") ? tags.includes(t) : words.has(t)));
};
/** "skiing" → "ski", "surfers" → "surf": a loose stem so tags like "ski" or "surfer" count. */
const stem = (word: string) => (word.length > 4 ? word.replace(/(ing|ers|er|es|s)$/, "") : word);

/** Theme photos: every query word must show up in the tags – Pixabay's own matching is loose. */
function fitsTheme(hit: Hit, query: string): boolean {
  const tags = hit.tags.toLowerCase();
  return query.split(/\s+/).every((word) => tags.includes(stem(word)));
}

/** Faces: the query's gender in the tags (and not the other one), a portrait, one adult. */
function fitsFace(hit: Hit, query: string): boolean {
  const words = tagWords(hit);
  const woman = /\bwoman\b/.test(query);
  const genderOk = woman ? hasAny(words, WOMAN) && !hasAny(words, MAN) : hasAny(words, MAN) && !hasAny(words, WOMAN);
  return genderOk && (words.has("portrait") || words.has("face")) && !hasBadTag(hit, BAD_FACE_TAGS);
}

/** How many of the query's words a hit's tags mention – faces rank by this first, then by likes. */
const overlap = (hit: Hit, query: string) => query.split(/\s+/).filter((w) => hit.tags.toLowerCase().includes(stem(w))).length;

const searchCache = new Map<string, Hit[]>();
let apiCalls = 0;

async function search(query: string, people: boolean, page = 1, orientation = "vertical"): Promise<Hit[]> {
  const cacheKey = `${people}:${page}:${orientation}:${query}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;
  const params = new URLSearchParams({ key: KEY, q: query, image_type: "photo", orientation, safesearch: "true", min_width: "1080", per_page: "30", page: String(page) });
  if (people) params.set("category", "people");
  for (let attempt = 0; attempt < 6; attempt++) {
    await throttle();
    apiCalls++;
    // The URL holds the key – never log it.
    const res = await fetch(`https://pixabay.com/api/?${params}`).catch(() => null);
    if (res?.ok) {
      const hits = ((await res.json()) as { hits: Hit[] }).hits;
      searchCache.set(cacheKey, hits);
      return hits;
    }
    // Asking past the last page answers 400 – that's simply "no more hits".
    if (res?.status === 400 && page > 1) return [];
    if (res && res.status !== 429 && res.status < 500) throw new Error(`Pixabay ${res.status} for "${query}"`);
    const wait = 2 ** attempt * 2000;
    console.warn(`  ${res ? res.status : "network error"} for "${query}" – retrying in ${wait / 1000}s`);
    await sleep(wait);
  }
  throw new Error(`Pixabay kept failing for "${query}"`);
}

type ImageStats = { luminance: number; saturation: number };
const statsCache: Record<number, ImageStats> = existsSync(STATS) ? JSON.parse(readFileSync(STATS, "utf8")) : {};

/** Average luminance and saturation (0–1) of a hit, from its 150px preview scaled down to 32×32. */
async function statsOf(hit: Hit): Promise<ImageStats | null> {
  if (statsCache[hit.id]) return statsCache[hit.id];
  const res = await fetch(hit.previewURL).catch(() => null);
  if (!res?.ok) return null;
  const { data, info } = await sharp(Buffer.from(await res.arrayBuffer())).resize(32, 32, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let luminance = 0;
  let saturation = 0;
  const pixels = data.length / info.channels;
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b] = [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255];
    const max = Math.max(r, g, b);
    luminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    saturation += max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
  }
  const stats = { luminance: luminance / pixels, saturation: saturation / pixels };
  statsCache[hit.id] = stats;
  await writeFile(STATS, JSON.stringify(statsCache) + "\n");
  return stats;
}

const isVivid = (stats: ImageStats | null) => stats !== null && stats.luminance < MAX_LUMINANCE && stats.saturation > MIN_SATURATION;

/**
 * Of the fitting hits (best first), the first that isn't washed out – too bright or too grey (see isVivid). Only
 * the first MAX_MEASURED are measured; if none qualifies, the best-ranked one after all.
 */
async function firstVivid(fitting: Hit[]): Promise<Hit> {
  for (const hit of fitting.slice(0, MAX_MEASURED)) {
    if (isVivid(await statsOf(hit))) return hit;
  }
  return fitting[0];
}

/**
 * The best unused hit that really shows the query: clean tags, plus the theme or face rules above. Ranked by likes
 * (faces: by how many query words they match first), skipping washed-out ones. Looks through a few pages, then tries shorter queries
 * (dropping the last word – faces keep at least "… man/woman") before giving up.
 */
async function pick(query: string, people: boolean, used: Set<number>, orientation = "vertical"): Promise<{ hit: Hit; query: string } | null> {
  const words = query.split(/\s+/);
  const minWords = people ? Math.max(1, words.findIndex((w) => w === "man" || w === "woman") + 1) : 1;
  for (let n = words.length; n >= minWords; n--) {
    const q = words.slice(0, n).join(" ");
    for (let page = 1; page <= MAX_PAGES; page++) {
      const hits = await search(q, people, page, orientation);
      const fitting = hits
        .filter((h) => !used.has(h.id) && !hasBadTag(h, BAD_TAGS) && (people ? fitsFace(h, query) : fitsTheme(h, q)))
        .sort((a, b) => (people ? overlap(b, query) - overlap(a, query) : 0) || b.likes - a.likes);
      if (fitting[0]) return { hit: await firstVivid(fitting), query: q };
      if (hits.length < 30) break;
    }
  }
  return null;
}

async function save(url: string, file: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  const target = path.join(PUBLIC, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, await sharp(input).rotate().resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer());
}

async function main() {
  const credits: Credit[] = existsSync(CREDITS) ? JSON.parse(await readFile(CREDITS, "utf8")) : [];
  const byFile = new Map(credits.map((c) => [c.file, c]));
  const rejects: number[] = existsSync(REJECTS) ? JSON.parse(await readFile(REJECTS, "utf8")) : [];

  // --redo: reject the current photo of each given file and drop it, so the loop below fetches another one.
  const redoAt = process.argv.indexOf("--redo");
  for (const file of redoAt >= 0 ? process.argv.slice(redoAt + 1) : []) {
    const credit = byFile.get(file);
    if (credit?.source === "pixabay" && !rejects.includes(credit.pixabayId)) rejects.push(credit.pixabayId);
    byFile.delete(file);
  }
  await writeFile(REJECTS, JSON.stringify(rejects) + "\n");
  const used = new Set([...rejects, ...[...byFile.values()].flatMap((c) => (c.source === "pixabay" ? [c.pixabayId] : []))]);

  const jobs = [
    ...users.map((u) => ({ file: userFacePath(u.id), query: u.facePhotoQuery ?? "portrait", people: true, seed: `face-${u.id}` })),
    ...users.flatMap((u) => (u.imageQueries ?? []).slice(1).map((query, i) => ({ file: userPhotoPath(u.id, i + 2), query, people: false, seed: `${u.id}-${i + 2}` }))),
    ...stays.flatMap((s) => (s.themeQueries ?? []).map((query, i) => ({ file: houseThemePath(s.id, i + 1), query, people: false, seed: `${s.id}-${i + 1}` }))),
  ];

  let downloaded = 0;
  let skipped = 0;
  const fallbacks: string[] = [];
  for (const job of jobs) {
    if (existsSync(path.join(PUBLIC, job.file)) && byFile.has(job.file) && byFile.get(job.file)?.query === job.query) {
      skipped++;
      continue;
    }
    // Some themes (padel, Railay) only exist as landscape shots – fine, the cards crop to 4:5 anyway. Faces stay portrait.
    const found = (await pick(job.query, job.people, used)) ?? (job.people ? null : await pick(job.query, false, used, "all"));
    if (found) {
      used.add(found.hit.id);
      await save(found.hit.largeImageURL, job.file);
      byFile.set(job.file, { file: job.file, source: "pixabay", pixabayId: found.hit.id, pageURL: found.hit.pageURL, user: found.hit.user, query: job.query, matched: found.query });
      const shortened = found.query !== job.query ? ` (shortened to "${found.query}")` : "";
      console.log(`✓ ${job.file} ← #${found.hit.id} "${job.query}"${shortened}`);
    } else {
      // Nothing usable on Pixabay: a neutral placeholder, still stored locally.
      await save(`https://picsum.photos/seed/${job.seed}/1080/1350`, job.file);
      byFile.set(job.file, { file: job.file, source: "picsum", seed: job.seed, query: job.query });
      fallbacks.push(`${job.file} ("${job.query}")`);
      console.log(`! ${job.file} – no Pixabay hit for "${job.query}", used picsum`);
    }
    downloaded++;
    // Keep progress on disk, so an interrupted run resumes where it stopped.
    await writeFile(CREDITS, JSON.stringify([...byFile.values()], null, 2) + "\n");
  }

  await writeFile(CREDITS, JSON.stringify([...byFile.values()], null, 2) + "\n");
  console.log(`\n${downloaded} downloaded, ${skipped} already there, ${apiCalls} API calls, ${fallbacks.length} fallbacks`);
  for (const f of fallbacks) console.log(`  fallback: ${f}`);
}

main().catch((error: Error) => {
  // Error messages never contain the key (only status codes and queries).
  console.error(error.message);
  process.exit(1);
});
