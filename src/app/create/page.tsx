import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CreateStayForm } from "@/components/views/CreateStayForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.pages");
  return { title: t("createHouse") };
}

export default function CreatePage() {
  return <CreateStayForm />;
}
