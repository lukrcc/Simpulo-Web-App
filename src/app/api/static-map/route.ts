// The House page's "Where you'll be": a static map image, 560 × 320 (2× for sharp screens), with the approximate circle drawn in – never the
// interactive Google map. With GOOGLE_MAPS_STATIC_KEY (server-only env, never in the repo, never sent to the browser) Google's Static Maps
// API draws it; without a key (local, demo) a calm mock map in the house style. Cached: in memory here and for a day in browsers and the CDN.
import { NextResponse, type NextRequest } from "next/server";

const WIDTH = 560;
const HEIGHT = 320;
const TTL_MS = 24 * 3_600_000;
const MAX_ENTRIES = 300;
const CACHE_HEADER = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";
const cache = new Map<string, { at: number; body: ArrayBuffer; type: string }>();

/** A circle of `radius` metres around the centre as a closed path of 36 points – Static Maps has no circle of its own. */
function circlePath(lat: number, lng: number, radius: number): string {
  const earth = 6_378_137;
  const points: string[] = [];
  for (let i = 0; i <= 36; i++) {
    const angle = (i / 36) * 2 * Math.PI;
    const dLat = ((radius * Math.cos(angle)) / earth) * (180 / Math.PI);
    const dLng = ((radius * Math.sin(angle)) / (earth * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);
    points.push(`${(lat + dLat).toFixed(5)},${(lng + dLng).toFixed(5)}`);
  }
  return points.join("|");
}

/** Metres per pixel at this zoom and latitude (the mock draws its circle to the same scale). */
const metresPerPx = (lat: number, zoom: number) => (156_543.03 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;

/** Without a key: warm land, a calm street grid (its own per place), maybe a bit of water, the circle – the house style, no labels. */
function mockMap(lat: number, lng: number, zoom: number, radius: number | null): string {
  const r = radius ? Math.min(120, Math.max(24, radius / metresPerPx(lat || 40, zoom))) : 0;
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  // A small deterministic random from the coordinates (LCG), so every House has its own pattern and it never changes.
  let seed = (Math.abs(Math.round(lat * 7919 + lng * 104729)) % 2_147_483_647) || 12345;
  const next = () => (seed = (seed * 48271) % 2_147_483_647) / 2_147_483_647;
  const roads: string[] = [];
  for (let x = 30 + next() * 40; x < WIDTH; x += 60 + next() * 70) {
    const bend = (next() - 0.5) * 50;
    roads.push(`<path d="M${x.toFixed(0)} -10 C ${(x + bend).toFixed(0)} ${HEIGHT * 0.35} ${(x - bend).toFixed(0)} ${HEIGHT * 0.65} ${(x + bend / 2).toFixed(0)} ${HEIGHT + 10}"/>`);
  }
  for (let y = 25 + next() * 30; y < HEIGHT; y += 50 + next() * 60) {
    const bend = (next() - 0.5) * 40;
    roads.push(`<path d="M-10 ${y.toFixed(0)} C ${WIDTH * 0.35} ${(y + bend).toFixed(0)} ${WIDTH * 0.65} ${(y - bend).toFixed(0)} ${WIDTH + 10} ${(y + bend / 2).toFixed(0)}"/>`);
  }
  const main = `<path d="M-10 ${(HEIGHT * (0.3 + next() * 0.4)).toFixed(0)} C ${WIDTH * 0.3} ${(HEIGHT * next()).toFixed(0)} ${WIDTH * 0.7} ${(HEIGHT * next()).toFixed(0)} ${WIDTH + 10} ${(HEIGHT * (0.3 + next() * 0.4)).toFixed(0)}"/>`;
  const water = next() < 0.4 ? `<path d="M${WIDTH} ${(HEIGHT * 0.45).toFixed(0)} C ${WIDTH * 0.82} ${HEIGHT * 0.55} ${WIDTH * 0.78} ${HEIGHT * 0.9} ${WIDTH * 0.72} ${HEIGHT} L ${WIDTH} ${HEIGHT} Z" fill="#D8E1E3"/>` : "";
  const park = `<rect x="${(next() * (WIDTH - 120)).toFixed(0)}" y="${(next() * (HEIGHT - 80)).toFixed(0)}" width="${(60 + next() * 60).toFixed(0)}" height="${(40 + next() * 40).toFixed(0)}" rx="10" fill="#E2E6D6"/>`;
  const mark = r
    ? `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="rgba(34,30,27,0.10)" stroke="rgba(34,30,27,0.25)" stroke-width="1.5"/>`
    : `<circle cx="${cx}" cy="${cy}" r="6" fill="#F0633A" stroke="#fff" stroke-width="2"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH * 2}" height="${HEIGHT * 2}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><rect width="${WIDTH}" height="${HEIGHT}" fill="#EDE7DF"/>${park}${water}<g fill="none" stroke="#F8F5F0" stroke-width="5" stroke-linecap="round">${roads.join("")}</g><g fill="none" stroke="#FBF8F3" stroke-width="9" stroke-linecap="round">${main}</g>${mark}</svg>`;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const query = params.get("q")?.slice(0, 120) ?? "";
  const zoom = Math.min(18, Math.max(2, Math.round(Number(params.get("zoom")) || 13)));
  const radius = params.get("r") ? Math.min(20_000, Math.max(50, Number(params.get("r")) || 0)) : null;
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
  const key = `${hasPoint ? `${lat.toFixed(4)},${lng.toFixed(4)}` : query}|${zoom}|${radius ?? ""}`;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return new NextResponse(hit.body, { headers: { "Content-Type": hit.type, "Cache-Control": CACHE_HEADER } });

  const apiKey = process.env.GOOGLE_MAPS_STATIC_KEY;
  if (apiKey && (hasPoint || query)) {
    const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
    url.searchParams.set("size", `${WIDTH}x${HEIGHT}`);
    url.searchParams.set("scale", "2");
    url.searchParams.set("zoom", String(zoom));
    url.searchParams.set("center", hasPoint ? `${lat},${lng}` : query);
    url.searchParams.append("style", "feature:poi|visibility:off");
    url.searchParams.append("style", "feature:transit|visibility:off");
    if (hasPoint && radius) url.searchParams.set("path", `fillcolor:0x221E1B1A|color:0x221E1B38|weight:1|${circlePath(lat, lng, radius)}`);
    else if (hasPoint) url.searchParams.set("markers", `color:0xF0633A|${lat},${lng}`);
    url.searchParams.set("key", apiKey);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (response.ok) {
        const body = await response.arrayBuffer();
        const type = response.headers.get("content-type") ?? "image/png";
        if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!);
        cache.set(key, { at: Date.now(), body, type });
        return new NextResponse(body, { headers: { "Content-Type": type, "Cache-Control": CACHE_HEADER } });
      }
    } catch {
      // Google not reachable: the mock below.
    }
  }
  const body = new TextEncoder().encode(mockMap(hasPoint ? lat : 40, hasPoint ? lng : query.length, zoom, radius)).buffer as ArrayBuffer;
  return new NextResponse(body, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": CACHE_HEADER } });
}
