import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SavedHouses } from "@/components/views/SavedHouses";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("saved"), robots: PRIVATE_ROBOTS };
}

export default function SavedPage() {
  return <SavedHouses />;
}
