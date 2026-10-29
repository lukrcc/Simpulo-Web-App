import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { ContentPage } from "@/components/layout/ContentPage";
import { CONTACT_EMAIL } from "@/components/layout/secondaryLinks";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.pages.contact");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/contact", type: "article" });
}

export default async function ContactPage() {
  const t = await getTranslations("footer.pages.contact");
  return (
    <ContentPage title={t("title")}>
      <p>
        {t.rich("text", {
          email: CONTACT_EMAIL,
          mail: (chunks) => (
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-accent hover:underline">
              {chunks}
            </a>
          ),
        })}
      </p>
    </ContentPage>
  );
}
