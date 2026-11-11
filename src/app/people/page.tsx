import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { YourPeople } from "@/components/views/YourPeople";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("people.page");
  return { title: t("title") };
}

/** Your people: everyone you lived with, both confirmed (avatar menu). Never indexed (layout). */
export default function PeoplePage() {
  return <YourPeople />;
}
