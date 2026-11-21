import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { GuideArticle } from "@/components/seo/GuideArticle";
import { GUIDES } from "@/config/seo";
import { pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) return {};
  const t = await getTranslations(`guides.articles.${guide.id}` as "guides.articles.villaSolo");
  return pageMetadata({ title: t("title"), description: t("description"), path: `/guides/${guide.slug}`, type: "article", image: { url: guide.image, alt: t("title") } });
}

/** /guides/[slug] – one guide (components/seo/GuideArticle.tsx). */
export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) notFound();
  return <GuideArticle guide={guide} />;
}
