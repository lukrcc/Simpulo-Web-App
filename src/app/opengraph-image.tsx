import { getTranslations } from "next-intl/server";
import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/ogFonts";

export const alt = "Simpulo – Share a place. Find your people.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share card for every page without its own (Houses and profiles have theirs): the wordmark on white. */
export default async function Image() {
  const t = await getTranslations({ locale: "en", namespace: "meta" });
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: 96, background: "#FFFFFF", color: "#1E1E22" }}>
        <div style={{ display: "flex", fontSize: 140, fontWeight: 700, letterSpacing: -6 }}>
          simpulo<span style={{ color: "#F0633A" }}>.</span>
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 44, color: "#6B6B72" }}>{t("siteDescription")}</div>
      </div>
    ),
    { ...size, fonts: await loadOgFonts() },
  );
}
