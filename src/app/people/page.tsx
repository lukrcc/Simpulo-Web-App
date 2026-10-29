import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PeoplePage } from "@/components/people/PeoplePage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("people") };
}

export default function People() {
  return <PeoplePage />;
}
