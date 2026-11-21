import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AboutPage } from "@/components/views/AboutPage";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.pages.about");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/about", type: "article" });
}

/** /about – the mission, why Simpulo, the founder, the values (components/views/AboutPage.tsx). */
export default function About() {
  return <AboutPage />;
}
