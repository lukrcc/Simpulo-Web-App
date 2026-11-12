import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CreateEntry } from "@/components/create/CreateEntry";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("createHouse") };
}

export default function CreatePage() {
  // Open a House – before the launch "Apply as a host" (config/platform.ts).
  return <CreateEntry />;
}
