import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { ContentPage } from "@/components/layout/ContentPage";
import { Button } from "@/components/ui/ActionButton";

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
        <Button variant="tertiary" size="md" href="/faq">
          {t("cta")}
        </Button>
      </p>
    </ContentPage>
  );
}
