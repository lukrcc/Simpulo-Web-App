import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { ContentPage } from "@/components/layout/ContentPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.pages.about");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/about", type: "article" });
}

export default async function AboutPage() {
  const t = await getTranslations("footer.pages.about");
  return (
    <ContentPage title={t("title")} intro={t("intro")}>
      <p>{t("houses")}</p>
      <p>{t("people")}</p>
      <p>
        <Link href="/how-it-works" className="font-medium text-accent hover:underline">
          {t("cta")}
        </Link>
      </p>
    </ContentPage>
  );
}
