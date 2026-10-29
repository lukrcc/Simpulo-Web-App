import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MockDelay } from "@/components/MockDelay";
import { CONTACT_EMAIL } from "@/components/layout/secondaryLinks";
import { JsonLd } from "@/components/seo/JsonLd";
import { ExploreSkeleton } from "@/components/skeletons/ExploreSkeleton";
import { ExploreFeed } from "@/components/views/ExploreFeed";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  // The home page keeps the full site title ("Simpulo – Share a place. Find your people."), not "… · Simpulo".
  return { ...pageMetadata({ title: t("siteTitle"), description: t("siteDescription"), path: "/" }), title: { absolute: t("siteTitle") } };
}

export default async function ExplorePage() {
  const t = await getTranslations("meta");
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icon.png"),
    email: CONTACT_EMAIL,
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: t("siteDescription"),
  };
  return (
    <>
      <JsonLd data={[organization, website]} />
      <MockDelay ms={400} fallback={<ExploreSkeleton />}>
        <ExploreFeed />
      </MockDelay>
    </>
  );
}
