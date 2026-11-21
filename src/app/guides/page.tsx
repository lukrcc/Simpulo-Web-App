import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { Img } from "@/components/ui/Img";
import { GUIDES } from "@/config/seo";
import { absoluteUrl, pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guides");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/guides" });
}

/** /guides – the guides as a list: picture, title, one line (config/seo.ts GUIDES). */
export default async function GuidesPage() {
  const t = await getTranslations("guides");
  const tAll = await getTranslations("guides.articles");
  const list = { "@context": "https://schema.org", "@type": "ItemList", itemListElement: GUIDES.map((g, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(`/guides/${g.slug}`), name: tAll(`${g.id}.title` as "villaSolo.title") })) };
  return (
    <Container page>
      <JsonLd data={list} />
      <h1 className="text-h1 text-ink">{t("title")}</h1>
      <p className="mt-2 max-w-[56ch] text-body-lg text-muted">{t("intro")}</p>
      <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="group flex flex-col gap-3">
              <span className="relative block aspect-16/10 overflow-hidden rounded-[24px] bg-ink/6">
                <Img src={g.image} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
              </span>
              <span className="text-h3 text-ink group-hover:underline">{tAll(`${g.id}.title` as "villaSolo.title")}</span>
              <span className="text-body text-muted">{tAll(`${g.id}.description` as "villaSolo.description")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
