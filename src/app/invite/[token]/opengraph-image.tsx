import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/ogFonts";
import { OG_SIZE, OgCard } from "@/lib/ogCard";

export const alt = "You're invited to a House on Simpulo";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Share card for an invite link. The invite lives with the data source (mock: in the inviting browser), so the server can't see which House –
 * a general card until the backend knows its tokens; then it shows the House like /house/[slug].
 */
export default async function Image() {
  return new ImageResponse(<OgCard cover={null} eyebrow="Invite" title="You're invited to a House" line="Your spot is held for 48 hours." strong="Accept on Simpulo" />, { ...size, fonts: await loadOgFonts() });
}
