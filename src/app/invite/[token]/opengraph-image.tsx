import { tEn } from "@/lib/i18n/translate";
import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/ogFonts";
import { OG_SIZE, OgCard } from "@/lib/ogCard";

export const alt = tEn("og.invite.alt");
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Share card for an invite link. The invite lives with the data source (mock: in the inviting browser), so the server can't see which House –
 * a general card until the backend knows its tokens; then it shows the House like /house/[slug].
 */
export default async function Image() {
  return new ImageResponse(<OgCard cover={null} eyebrow={tEn("og.invite.eyebrow")} title={tEn("og.invite.title")} line={tEn("og.invite.line")} strong={tEn("og.invite.strong")} />, { ...size, fonts: await loadOgFonts() });
}
