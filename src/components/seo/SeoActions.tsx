"use client";

// The calls on SEO pages. An empty city / theme: "Open the first one" (Open a House with the place or theme filled in) and "Join the
// waitlist" for this place / theme. A guide's end: the waitlist before the launch and in the beta, Explore when Houses are open.
import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonStyles } from "@/components/ui/ActionButton";
import { showsWaitlist, usePlatformPhase } from "@/config/platform";
import { GUIDES } from "@/config/seo";
import type { Vibe } from "@/lib/types";
import { openWaitlist } from "@/lib/waitlistSignup";

/**
 * A city or theme page without open Houses: "Opening soon" – the waitlist for this place / theme first, "Open the first one" beside it, and
 * the guides to read while waiting (config/seo.ts GUIDES). Such a page has no content of its own: it stays out of the index (the page's
 * metadata, under MIN_INDEXABLE_HOUSES).
 */
export function SeoEmpty({ title, text, createHref, where, category }: { title: string; text: string; createHref: string; where?: string; category?: Vibe }) {
  const t = useTranslations("seo");
  const tGuides = useTranslations("guides.articles");
  return (
    <div data-seo-empty className="mt-(--space-inner) flex flex-col items-start gap-4">
      <h2 className="text-h2 text-ink">{title}</h2>
      <p className="max-w-[56ch] text-body-lg text-muted">{text}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => openWaitlist({ where: where ?? null, category: category ?? null, from: "seoEmpty" })} className={buttonStyles("primary", "md")}>
          {t("joinWaitlist")}
        </button>
        <Link href={createHref} className={buttonStyles("secondary", "md")}>
          {t("openFirst")}
        </Link>
      </div>
      <nav aria-labelledby="seo-empty-guides" className="mt-4">
        <h3 id="seo-empty-guides" className="text-small font-semibold text-ink">
          {t("guidesWhileWaiting")}
        </h3>
        <ul className="mt-2 flex flex-col gap-1">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="inline-flex min-h-11 items-center text-body text-ink underline-offset-4 hover:underline md:min-h-8">
                {tGuides(`${g.id}.title`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function GuideEnd({ category }: { category?: Vibe }) {
  const t = useTranslations("guides");
  const waitlist = showsWaitlist(usePlatformPhase());
  return (
    <section aria-labelledby="guide-end" className="mt-(--space-section) flex flex-col items-start gap-3 border-t border-ink/10 pt-8">
      <h2 id="guide-end" className="text-h2 text-ink">
        {waitlist ? t("waitlistTitle") : t("exploreTitle")}
      </h2>
      <p className="text-body-lg text-muted">{waitlist ? t("waitlistText") : t("exploreText")}</p>
      {waitlist ? (
        <button type="button" onClick={() => openWaitlist({ category: category ?? null, from: "guide" })} className={buttonStyles("primary", "md")}>
          {t("joinWaitlist")}
        </button>
      ) : (
        <Link href={category ? `/explore?category=${category}` : "/explore"} className={buttonStyles("primary", "md")}>
          {t("explore")}
        </Link>
      )}
    </section>
  );
}
