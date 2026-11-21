import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CONTACT_EMAIL } from "@/components/layout/secondaryLinks";
import { JsonLd } from "@/components/seo/JsonLd";
import { HomeEntry } from "@/components/views/HomeEntry";
import { FAQ } from "@/config/faq";
import { LANDING_FAQ } from "@/config/landing";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  // The home page keeps the full site title ("Simpulo – Share a place. Find your people."), not "… · Simpulo".
  return { ...pageMetadata({ title: t("siteTitle"), description: t("siteDescription"), path: "/" }), title: { absolute: t("siteTitle") } };
}

/** /: the start page for visitors (Landing, indexed), Explore once signed in (HomeEntry). */
export default async function HomePage() {
  const t = await getTranslations("meta");
  const tFaq = await getTranslations("faq.items");
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icon-512.png"),
    email: CONTACT_EMAIL,
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: t("siteDescription"),
  };
  // The start page's four questions as FAQPage data (the same words as on the page).
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: LANDING_FAQ.map(({ role, id }) => {
      const values = FAQ[role].find((x) => x.id === id)?.values;
      return { "@type": "Question", name: tFaq(`${id}.question` as "payment.question"), acceptedAnswer: { "@type": "Answer", text: tFaq(`${id}.answer` as "payment.answer", values) } };
    }),
  };
  return (
    <>
      <JsonLd data={[organization, website, faq]} />
      <HomeEntry />
    </>
  );
}
