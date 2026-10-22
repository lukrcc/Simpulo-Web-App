import Link from "next/link";
import { useTranslations } from "next-intl";
import { Container } from "./Container";
import { FOOTER_LINKS } from "./secondaryLinks";

/**
 * Site footer below every page: one row on desktop (wordmark left, links right), stacked on mobile. On mobile its
 * bottom padding keeps it clear of the floating tab bar (64px + 12px + safe area) and the House page's sticky CTA.
 */
export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t border-neutral-100 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-0">
      <Container className="flex flex-col gap-4 py-10 text-sm text-zinc-500 md:flex-row md:items-start md:justify-between md:gap-8">
        <div>
          <p className="text-base font-bold tracking-tight text-ink">
            simpulo<span className="text-accent">.</span>
          </p>
          <p className="mt-1 text-xs">{t("tagline")}</p>
        </div>
        <nav aria-label={t("label")} className="flex flex-wrap gap-x-6 gap-y-2 md:justify-end">
          {FOOTER_LINKS.map(({ href, labelKey }) => (
            <Link key={href} href={href} className="transition-colors hover:text-ink">
              {t(`links.${labelKey}`)}
            </Link>
          ))}
        </nav>
      </Container>
    </footer>
  );
}
