"use client";

// The calls on SEO pages. An empty city / theme: "Open the first one" (Open a House with the place or theme filled in) and "Join the
// waitlist" for this place / theme. A guide's end: the waitlist before the launch and in the beta, Explore when Houses are open.
import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonStyles } from "@/components/ui/ActionButton";
import { showsWaitlist, usePlatformPhase } from "@/config/platform";
import type { Vibe } from "@/lib/types";
import { openWaitlist } from "@/lib/waitlistSignup";

export function SeoEmpty({ title, text, createHref, where, category }: { title: string; text: string; createHref: string; where?: string; category?: Vibe }) {
  const t = useTranslations("seo");
  return (
    <div data-seo-empty className="mt-(--space-inner) flex flex-col items-start gap-4">
      <h2 className="text-h2 text-ink">{title}</h2>
      <p className="max-w-[56ch] text-body-lg text-muted">{text}</p>
      <div className="flex flex-wrap gap-3">
        <Link href={createHref} className={buttonStyles("primary", "md")}>
          {t("openFirst")}
        </Link>
        <button type="button" onClick={() => openWaitlist({ where: where ?? null, category: category ?? null, from: "seoEmpty" })} className={buttonStyles("secondary", "md")}>
          {t("joinWaitlist")}
        </button>
      </div>
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
