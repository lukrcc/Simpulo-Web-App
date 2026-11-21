import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/Container";
import { Img } from "@/components/ui/Img";
import { FEE_MODEL, PAYMENT_POLICY } from "@/config/policies";
import { GUIDE_HOUSES, type Guide } from "@/config/seo";
import { getPublicStays } from "@/lib/data/stays";
import { isListedStay } from "@/lib/launch";
import type { Vibe } from "@/lib/types";
import { absoluteUrl, breadcrumbList, SITE_NAME } from "@/lib/seo";
import { JsonLd } from "./JsonLd";
import { GuideEnd } from "./SeoActions";
import { SeoHouses } from "./SeoHouses";

/** The numbers the guides' answers name ({fee}, {hours}) – from config/policies.ts. */
const NUMBERS = { fee: FEE_MODEL.serviceFeePercent, hours: PAYMENT_POLICY.paymentWindowHours };

/** One guide's questions and answers (words guides.articles.<id>.s<n>), paragraphs split at blank lines. */
export async function guideSections(guide: Guide) {
  const t = await getTranslations(`guides.articles.${guide.id}` as "guides.articles.villaSolo");
  return Array.from({ length: guide.sections }, (_, i) => {
    const key = `s${i + 1}` as "s1";
    return { q: t(`${key}.q`), a: t(`${key}.a`, NUMBERS) };
  });
}

/**
 * /guides/[slug] (CLAUDE.md "SEO-Seiten"): a question-and-answer article (about 600 words) – H1, intro, a picture, each question as an H2 –
 * then Houses that fit (config/seo.ts `houses`) and the waitlist (before the launch) or Explore. Article, FAQPage and breadcrumb data.
 */
export async function GuideArticle({ guide }: { guide: Guide }) {
  const t = await getTranslations("guides");
  const tA = await getTranslations(`guides.articles.${guide.id}` as "guides.articles.villaSolo");
  const tSeo = await getTranslations("seo");
  const sections = await guideSections(guide);
  const words = [tA("intro"), ...sections.flatMap((s) => [s.q, s.a])].join(" ").split(/\s+/).length;
  // The candidates (soonest first); the browser keeps the ones that haven't started (SeoHouses – the page is prerendered).
  const listed = (await getPublicStays()).filter(isListedStay);
  const houses = guide.houses as { kind: "category"; vibe: Vibe } | { kind: "soonest" };
  const fitting = houses.kind === "category" ? listed.filter((s) => s.vibe === houses.vibe) : listed;
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: tA("title"),
    description: tA("description"),
    image: absoluteUrl(guide.image),
    datePublished: guide.published,
    dateModified: guide.published,
    author: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
    publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: absoluteUrl("/icon-512.png") } },
    mainEntityOfPage: absoluteUrl(`/guides/${guide.slug}`),
  };
  const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: sections.map((s) => ({ "@type": "Question", name: s.q, acceptedAnswer: { "@type": "Answer", text: s.a } })) };
  return (
    <Container page>
      <JsonLd
        data={[
          article,
          faq,
          breadcrumbList([
            { name: tSeo("breadcrumbs.home"), path: "/" },
            { name: t("title"), path: "/guides" },
            { name: tA("title"), path: `/guides/${guide.slug}` },
          ]),
        ]}
      />
      <article data-guide={guide.slug} className="mx-auto max-w-[720px]">
        <Link href="/guides" className="text-small font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
          ← {t("back")}
        </Link>
        <h1 className="mt-4 text-h1 text-ink">{tA("title")}</h1>
        <p className="mt-2 text-small text-muted">{t("minutes", { count: Math.max(1, Math.round(words / 220)) })}</p>
        <p className="mt-6 text-body-lg text-ink">{tA("intro")}</p>
        <div className="relative mt-8 aspect-16/9 overflow-hidden rounded-[24px] bg-ink/6">
          <Img src={guide.image} alt="" fill sizes="(min-width: 744px) 720px, 100vw" className="object-cover" priority />
        </div>
        {sections.map((s) => (
          <section key={s.q} className="mt-10">
            <h2 className="text-h2 text-ink">{s.q}</h2>
            {s.a.split("\n\n").map((p) => (
              <p key={p.slice(0, 32)} className="mt-3 text-body-lg text-ink">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
      <div className="mx-auto max-w-[min(100%,1440px)]">
        <SeoHouses id="guide-houses" title={t("housesTitle")} ids={fitting.map((s) => s.id)} empty={t("housesNone")} max={GUIDE_HOUSES} />
      </div>
      <div className="mx-auto max-w-[720px] pb-(--space-section)">
        <GuideEnd category={houses.kind === "category" ? houses.vibe : undefined} />
      </div>
    </Container>
  );
}
