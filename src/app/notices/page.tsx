import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Notices } from "@/components/views/Notices";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notices");
  return { title: t("title"), robots: PRIVATE_ROBOTS };
}

/** /notices – Simpulo's decisions about you, with the reasons and "Appeal" (CLAUDE.md "Plattform-Pflichten"). Never indexed. */
export default function NoticesPage() {
  return <Notices />;
}
