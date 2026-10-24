import Link from "next/link";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Container } from "./Container";
import { FOOTER_LINKS } from "./secondaryLinks";
import { TabBarSpacer, TabBarSpacerFallback } from "./TabBarSpacer";

/**
 * Site footer below every page: one row on desktop (wordmark left, links right), stacked on mobile. On mobile a
 * spacer at its end keeps it clear of the bottom bar for the current mode (pill, docked or none) and of the sticky
 * CTAs on routes without the tab bar.
 */
export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t border-neutral-100">
      <Container className="flex flex-col gap-4 py-10 text-sm text-zinc-500 md:flex-row md:items-start md:justify-between md:gap-8">
        <div>
          <p className="text-base font-bold tracking-tight text-ink">
            simpulo<span className="text-accent">.</span>
          </p>
          <p className="mt-1 text-xs">{t("tagline")}</p>
        </div>
        <nav aria-label={t("label")} className="flex flex-wrap gap-x-6 md:justify-end md:gap-y-2">
          {FOOTER_LINKS.map(({ href, labelKey }) => (
            <Link key={href} href={href} className="inline-flex min-h-11 items-center transition-colors hover:text-ink md:min-h-0">
              {t(`links.${labelKey}`)}
            </Link>
          ))}
        </nav>
      </Container>
      {/* usePathname suspends on dynamic routes during prerender, so the spacer has its own boundary. */}
      <Suspense fallback={<TabBarSpacerFallback />}>
        <TabBarSpacer />
      </Suspense>
    </footer>
  );
}
