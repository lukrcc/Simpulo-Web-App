import { getTranslations } from "next-intl/server";
import { ImageResponse } from "next/og";
import { stays, users } from "@/lib/mock";
import { firstName } from "@/lib/utils";

export const alt = "Simpulo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAGE = "#F5F4F1";
const INK = "#1E1E22";
const ACCENT = "#F0633A";

type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" };

/**
 * Geist 400 + 700 (next/og only bundles Geist Regular, so titles wouldn't be bold). Google Fonts serves TTF to clients
 * without a modern user agent; if it's unreachable the card falls back to the bundled regular weight.
 */
async function loadFonts(): Promise<OgFont[] | undefined> {
  try {
    const css = await fetch("https://fonts.googleapis.com/css2?family=Geist:wght@400;700", { signal: AbortSignal.timeout(4000) }).then((r) => r.text());
    const faces = [...css.matchAll(/font-weight: (400|700);[^}]*?src: url\((.+?)\) format\('(?:truetype|opentype)'\)/g)];
    const fonts = await Promise.all(
      faces.map(async ([, weight, src]): Promise<OgFont> => {
        const data = await fetch(src, { signal: AbortSignal.timeout(4000) }).then((r) => r.arrayBuffer());
        return { name: "Geist", data, weight: weight === "700" ? 700 : 400, style: "normal" };
      }),
    );
    return fonts.length === 2 ? fonts : undefined;
  } catch {
    return undefined;
  }
}

/** Remote photo as a data URI – null when it's missing or the host is unreachable, so the card shows a solid block. */
async function loadPhoto(url: string | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return null;
    const data = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:${type};base64,${data}`;
  } catch {
    return null;
  }
}

/** "Feb 12 – 26" – stored dates are calendar dates, so format them in UTC. */
function formatDates(start: string, end: string): string {
  const format = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
  return format.formatRange(new Date(start), new Date(end));
}

/** Share card for a House: host photo on the left half, title, host and dates · city on the right. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations({ locale: "en", namespace: "states.og" });
  const stay = stays.find((s) => s.slug === slug);
  const host = stay && users.find((u) => u.id === stay.hostId);
  const [photo, fonts] = await Promise.all([loadPhoto(host?.photos[0]), loadFonts()]);

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: PAGE, color: INK }}>
        <div style={{ display: "flex", width: 600, height: 630, background: "#D6D3CD" }}>
          {photo && (
            <img src={photo} alt="" width={600} height={630} style={{ width: 600, height: 630, objectFit: "cover" }} />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 600, height: 630, padding: "64px 56px 48px" }}>
          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
              {stay?.title ?? "Simpulo"}
            </div>
            {host && <div style={{ display: "flex", marginTop: 24, fontSize: 34 }}>{t("with", { name: firstName(host) })}</div>}
            {stay && (
              <div style={{ display: "flex", marginTop: 12, fontSize: 30, color: "#6B6B72" }}>
                {`${formatDates(stay.startDate, stay.endDate)} · ${stay.city || stay.region}`}
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>
            simpulo<span style={{ color: ACCENT }}>.</span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
