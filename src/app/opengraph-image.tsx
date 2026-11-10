import { getTranslations } from "next-intl/server";
import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/ogFonts";
import { COLORS } from "@/lib/colors";
import { OgLogo } from "@/lib/ogCard";

export const alt = "Simpulo – Share a place. Find your people.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share card for every page without its own (Houses and profiles have theirs): the wordmark on the warm surface. */
export default async function Image() {
  const t = await getTranslations({ locale: "en", namespace: "meta" });
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: 96, background: COLORS.surface, color: COLORS.ink }}>
        <OgLogo size={140} />
        <div style={{ display: "flex", marginTop: 24, fontSize: 44, color: COLORS.muted }}>{t("siteDescription")}</div>
      </div>
    ),
    { ...size, fonts: await loadOgFonts() },
  );
}
