import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { InviteFriends } from "@/components/views/InviteFriends";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("invite"), robots: PRIVATE_ROBOTS };
}

/** /invite – your link to Simpulo, to copy or share (CLAUDE.md "Profilseite neu"). Not /invite/[token] (a House's saved spot). */
export default function InvitePage() {
  return <InviteFriends />;
}
