import { getTranslations } from "next-intl/server";
import { ImageResponse } from "next/og";
import { stays, users } from "@/lib/mock";

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

/**
 * Photo as a data URI – null when it's missing or unreachable, so the card shows a solid block. Local files
 * (/mock/…) are read from public/ and turned into JPEG, since the image renderer doesn't take WebP.
 */
async function loadPhoto(url: string | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    if (url.startsWith("/")) {
      const { readFile } = await import("node:fs/promises");
      const { default: sharp } = await import("sharp");
      const file = await readFile(`${process.cwd()}/public${url}`);
      return `data:image/jpeg;base64,${(await sharp(file).jpeg({ quality: 85 }).toBuffer()).toString("base64")}`;
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return null;
    const data = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:${type};base64,${data}`;
  } catch {
    return null;
  }
}

/** Share card for a profile: photo on the left half, name and the number of Houses hosted on the right. */
export default async function Image({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const t = await getTranslations({ locale: "en", namespace: "states.og" });
  const user = users.find((u) => u.id === userId && !u.deletedAt);
  const hosted = user ? stays.filter((s) => s.hostId === user.id && s.status !== "draft").length : 0;
  const [photo, fonts] = await Promise.all([loadPhoto(user?.photos[0]), loadFonts()]);

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
            <div style={{ display: "flex", fontSize: 72, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
              {user?.name ?? "Simpulo"}
            </div>
            {user && (
              <div style={{ display: "flex", marginTop: 20, fontSize: 30, color: "#6B6B72" }}>{t("hosted", { count: hosted })}</div>
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
