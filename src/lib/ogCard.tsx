/* eslint-disable @next/next/no-img-element -- next/og renders plain <img>, not next/image */
// Share cards (Open Graph / X), 1200×630, rendered on the server with next/og: the House's cover left, its facts right, the wordmark.
import { COLORS } from "./colors";
import type { Stay, User } from "./types";
import { housePhotos } from "./utils";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * An image as a data URI – null when missing or unreachable. Local files (/mock/…) are read from public/ and turned into JPEG (the renderer
 * doesn't take WebP); `width` keeps avatars small.
 */
export async function loadOgImage(url: string | undefined, width?: number): Promise<string | null> {
  if (!url) return null;
  try {
    if (url.startsWith("/")) {
      const { readFile } = await import("node:fs/promises");
      const { default: sharp } = await import("sharp");
      const file = await readFile(`${process.cwd()}/public${url}`);
      const image = sharp(file);
      return `data:image/jpeg;base64,${(await (width ? image.resize(width, width, { fit: "cover" }) : image).jpeg({ quality: 82 }).toBuffer()).toString("base64")}`;
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

const money = (amount: number, currency: string) => new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

/** "€480 pp", "€500–700 pp", "Price set with crew" – in the House's currency (the card has no viewer). */
export function ogPrice(stay: Pick<Stay, "pricePerPerson" | "budgetPerPerson" | "currency">): string {
  if (stay.pricePerPerson) return `${money(stay.pricePerPerson, stay.currency)} pp`;
  if (stay.budgetPerPerson) return `${money(stay.budgetPerPerson.min, stay.currency)}–${money(stay.budgetPerPerson.max, stay.currency).replace(/^[^\d]+/, "")} pp`;
  return "Price set with crew";
}

/** "Feb 12 – 26" – stored dates are calendar dates, so in UTC. */
export function ogDates(start: string, end: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).formatRange(new Date(start), new Date(end));
}

/** The pictures a card needs, loaded in parallel: the cover and up to five crew faces. */
export async function ogPictures(stay: Stay, crew: User[]): Promise<{ cover: string | null; faces: string[] }> {
  const [cover, ...faces] = await Promise.all([loadOgImage(housePhotos(stay)[0]), ...crew.slice(0, 5).map((u) => loadOgImage(u.photos[0], 96))]);
  return { cover, faces: faces.filter((f): f is string => Boolean(f)) };
}

const Wordmark = () => (
  <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: -1, color: COLORS.ink }}>
    simpulo<span style={{ color: COLORS.accent }}>.</span>
  </div>
);

/** Cover left; eyebrow, title, a line, a strong line, the crew; the wordmark bottom right. Warm surfaces, no white. */
export function OgCard({ cover, eyebrow, title, line, strong, faces, crewLine }: { cover: string | null; eyebrow?: string; title: string; line?: string; strong?: string; faces?: string[]; crewLine?: string }) {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background: COLORS.bg, color: COLORS.ink }}>
      <div style={{ display: "flex", width: 520, height: 630, background: COLORS.surface }}>
        {cover && <img src={cover} alt="" width={520} height={630} style={{ width: 520, height: 630, objectFit: "cover" }} />}
      </div>
      <div style={{ display: "flex", flexDirection: "column", width: 680, height: 630, padding: "60px 64px 48px" }}>
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
          {eyebrow && <div style={{ display: "flex", fontSize: 22, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: COLORS.muted }}>{eyebrow}</div>}
          <div style={{ display: "flex", marginTop: eyebrow ? 16 : 0, fontSize: 60, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>{title}</div>
          {line && <div style={{ display: "flex", marginTop: 22, fontSize: 30, color: COLORS.muted }}>{line}</div>}
          {strong && <div style={{ display: "flex", marginTop: 14, fontSize: 34, fontWeight: 700 }}>{strong}</div>}
          {(faces?.length || crewLine) && (
            <div style={{ display: "flex", alignItems: "center", marginTop: 30 }}>
              {faces?.map((src, i) => (
                <img key={src} src={src} alt="" width={52} height={52} style={{ width: 52, height: 52, borderRadius: 26, objectFit: "cover", border: `3px solid ${COLORS.bg}`, marginLeft: i === 0 ? 0 : -14 }} />
              ))}
              {crewLine && <div style={{ display: "flex", marginLeft: faces?.length ? 16 : 0, fontSize: 28, color: COLORS.muted }}>{crewLine}</div>}
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Wordmark />
        </div>
      </div>
    </div>
  );
}
