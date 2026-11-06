// Open Graph preview of a listing link (og:title, og:image, a price if the page states one), for the accommodation tile
// on the House page. 3s per request, at most 3 redirects, 512 KB read; the result is cached for a day. Only public
// http(s) hosts: names that resolve to private, loopback or link-local addresses are refused.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse, type NextRequest } from "next/server";

export interface OgPreview {
  title: string;
  imageUrl: string;
  siteName: string;
  price: { amount: number; currency: string } | null;
}

const TIMEOUT_MS = 3000;
const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const TTL_MS = 24 * 3_600_000;
const MAX_ENTRIES = 500;
const cache = new Map<string, { at: number; preview: OgPreview | null }>();

function privateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase();
    if (a.startsWith("::ffff:")) return privateAddress(a.slice(7));
    return a === "::1" || a === "::" || a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe8") || a.startsWith("fe9") || a.startsWith("fea") || a.startsWith("feb");
  }
  const [a, b] = address.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function publicUrl(raw: string): Promise<URL | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return null;
  try {
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    if (addresses.length === 0 || addresses.some((a) => privateAddress(a.address))) return null;
  } catch {
    return null;
  }
  return url;
}

function decode(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/** <meta property|name="key" content="…"> in either attribute order. */
function meta(html: string, keys: string[]): string {
  for (const key of keys) {
    const k = key.replace(/[.:]/g, "\\$&");
    const match =
      new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]*content=["']([^"']*)["']`, "i").exec(html) ??
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${k}["']`, "i").exec(html);
    if (match?.[1]) return decode(match[1]);
  }
  return "";
}

async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  void reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, MAX_BYTES));
}

async function fetchPreview(start: URL): Promise<OgPreview | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let url: URL | null = start;
    for (let hop = 0; url && hop <= MAX_REDIRECTS; hop++) {
      const response: Response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": "SimpuloLinkPreview/1.0", accept: "text/html" },
      });
      if (response.status >= 300 && response.status < 400) {
        const next = response.headers.get("location");
        url = next ? await publicUrl(new URL(next, url).toString()) : null;
        continue;
      }
      if (!response.ok || !(response.headers.get("content-type") ?? "").includes("html")) return null;
      const html = await readCapped(response);
      const title = meta(html, ["og:title", "twitter:title"]) || decode(/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? "");
      const image = meta(html, ["og:image:secure_url", "og:image", "twitter:image"]);
      const amount = Number(meta(html, ["og:price:amount", "product:price:amount"]));
      const currency = meta(html, ["og:price:currency", "product:price:currency"]);
      let imageUrl = "";
      if (image) {
        try {
          const absolute = new URL(image, url);
          if (absolute.protocol === "https:") imageUrl = absolute.toString();
        } catch {
          // no picture
        }
      }
      if (!title && !imageUrl) return null;
      return { title, imageUrl, siteName: meta(html, ["og:site_name"]), price: amount > 0 && currency ? { amount, currency } : null };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url") ?? "";
  const hit = cache.get(raw);
  let preview: OgPreview | null;
  if (hit && Date.now() - hit.at < TTL_MS) {
    preview = hit.preview;
  } else {
    const url = await publicUrl(raw);
    if (!url) return NextResponse.json({ preview: null }, { status: 400 });
    preview = await fetchPreview(url);
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!);
    cache.set(raw, { at: Date.now(), preview });
  }
  return NextResponse.json({ preview }, { headers: { "cache-control": "public, max-age=3600, s-maxage=86400" } });
}
