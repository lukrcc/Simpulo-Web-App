import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import type { IconType } from "react-icons";
import { HelpFeedbackLink } from "@/components/help/HelpFeedback";
import { FooterInstallHint } from "@/components/InstallHint";
import { SOCIAL_LINKS, type SocialNetwork } from "@/lib/social";
import { Container } from "./Container";
import { CurrencyPicker } from "./CurrencyPicker";
import { Logo } from "./Logo";
import { FooterPopular } from "./FooterPopular";
import { TabBarSpacer, TabBarSpacerFallback } from "./TabBarSpacer";

/**
 * Site footer below every page: wordmark, claim and socials (top, on the headings' baseline), four plain link columns –
 * Explore, Hosting, Simpulo, Popular – and a bottom row with the copyright and the legal links. On mobile a spacer at its
 * end keeps it clear of the bottom bar for the current mode (pill, docked or none) and of the sticky CTAs on routes
 * without the tab bar. Its own surface, one colour, full width, with a clear edge on top. Only on Explore and How it
 * works; everywhere else SlimFooter, the same surface as one line (FooterByRoute).
 */
const SOCIAL_ICONS: Record<SocialNetwork, IconType> = { instagram: SiInstagram, tiktok: SiTiktok, youtube: SiYoutube };

/** The copyright line's year – a constant, since prerendered pages can't read the clock. Bump it each January. */
const COPYRIGHT_YEAR = 2026;

export async function Footer() {
  const t = await getTranslations("footer");
  const columns = [
    {
      title: t("columns.explore"),
      links: [
        { href: "/", label: t("links.houses") },
        { href: "/create", label: t("links.openHouse") },
      ],
    },
    {
      title: t("columns.hosting"),
      links: [
        { href: "/faq?role=host", label: t("links.hostAHouse") },
        { href: "/safety", label: t("links.safety") },
      ],
    },
    {
      title: t("columns.simpulo"),
      links: [
        { href: "/about", label: t("links.about") },
        { href: "/faq", label: t("links.faq") },
        { href: "/cancellation", label: t("links.cancellation") },
      ],
    },
  ];

  const socials = (Object.entries(SOCIAL_LINKS) as [SocialNetwork, string][]).filter(([, url]) => url.trim() !== "");
  return (
    <footer className="bg-(--footer-surface)">
      <Container className="pt-16 pb-10 text-small text-muted">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-baseline md:gap-6">
          {/* The logo and the socials at the top. Phones: first, above the links. */}
          <div className="md:col-span-4">
            <Logo size="sm" />
            {socials.length > 0 && (
              <ul aria-label={t("social.label")} className="mt-4 flex items-center gap-4">
                {socials.map(([network, url]) => {
                  const Icon = SOCIAL_ICONS[network];
                  return (
                    <li key={network}>
                      <a href={url} target="_blank" rel="noopener" aria-label={t(`social.${network}`)} className="flex text-ink/60 transition-colors hover:text-ink">
                        <Icon className="size-5" aria-hidden />
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title} className="md:col-span-2">
              <h2 className="text-eyebrow uppercase text-ink/55">{column.title}</h2>
              <ul className="mt-3">
                {column.links.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="inline-flex min-h-11 items-center transition-colors hover:text-ink md:min-h-8">
                      {label}
                    </Link>
                  </li>
                ))}
                {/* Simpulo: "Help & feedback" opens the sheet (no page of its own). */}
                {column.title === t("columns.simpulo") && (
                  <li>
                    <HelpFeedbackLink className="min-h-11 md:min-h-8" />
                  </li>
                )}
              </ul>
            </nav>
          ))}
          <FooterPopular />
        </div>

        {/* Bottom row across the full width, under a thin line: the QR block left (desktop only), the copyright and legal links right, both
            centred on each other. Phones: no QR, copyright and links one under the other, centred. */}
        <div className="mt-10 flex flex-col items-center gap-6 border-t border-ink/10 pt-6 md:flex-row md:justify-between">
          <FooterInstallHint id="get-the-app" size={72} className="max-md:hidden" />
          <FooterLegal />
        </div>
      </Container>
      <FooterSpacer />
    </footer>
  );
}

/** The one line of every page but Explore, Host and How it works: 72px, the copyright and legal links left, the socials right. */
export async function SlimFooter() {
  const t = await getTranslations("footer");
  const legal = [
    { href: "/impressum", label: t("links.impressum") },
    { href: "/privacy", label: t("links.privacy") },
    { href: "/terms", label: t("links.terms") },
    { href: "/privacy#cookies", label: t("links.cookies") },
  ];
  const socials = (Object.entries(SOCIAL_LINKS) as [SocialNetwork, string][]).filter(([, url]) => url.trim() !== "");
  return (
    <footer className="bg-(--footer-surface)">
      <Container className="flex min-h-18 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 text-small text-muted">
        <p className="flex flex-wrap items-center gap-x-1.5">
          <span className="mr-3">
            <CurrencyPicker />
          </span>
          <span>{t("copyright", { year: COPYRIGHT_YEAR })}</span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden>·</span>
            <HelpFeedbackLink className="min-h-11 md:min-h-0" />
          </span>
          {legal.map(({ href, label }) => (
            <span key={href} className="flex items-center gap-1.5">
              <span aria-hidden>·</span>
              <Link href={href} className="inline-flex min-h-11 items-center transition-colors hover:text-ink md:min-h-0">
                {label}
              </Link>
            </span>
          ))}
        </p>
        {socials.length > 0 && (
          <ul aria-label={t("social.label")} className="flex items-center gap-4">
            {socials.map(([network, url]) => {
              const Icon = SOCIAL_ICONS[network];
              return (
                <li key={network}>
                  <a href={url} target="_blank" rel="noopener" aria-label={t(`social.${network}`)} className="flex text-ink/60 transition-colors hover:text-ink">
                    <Icon className="size-4" aria-hidden />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </Container>
      <FooterSpacer />
    </footer>
  );
}

async function FooterLegal() {
  const t = await getTranslations("footer");
  const legal = [
    { href: "/impressum", label: t("links.impressum") },
    { href: "/privacy", label: t("links.privacy") },
    { href: "/terms", label: t("links.terms") },
    { href: "/privacy#cookies", label: t("links.cookies") },
  ];
  // One line on desktop ("© 2026 Simpulo · Impressum · Privacy · Terms · Cookies"); on phones the links under the copyright, centred.
  return (
    <div className="flex flex-col items-center gap-1 text-small text-muted md:ml-auto md:flex-row md:gap-1.5">
      {/* The viewer's currency: "€ EUR". */}
      <span className="md:mr-3">
        <CurrencyPicker />
      </span>
      <p>{t("copyright", { year: COPYRIGHT_YEAR })}</p>
      <nav aria-label={t("legalLabel")}>
        <ul className="flex flex-wrap items-center justify-center gap-x-1.5">
          {legal.map(({ href, label }, i) => (
            <li key={href} className="flex items-center gap-1.5">
              <span aria-hidden className={i === 0 ? "max-md:hidden" : undefined}>
                ·
              </span>
              <Link href={href} className="inline-flex min-h-11 items-center transition-colors hover:text-ink md:min-h-0">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/** usePathname suspends on dynamic routes during prerender, so the spacer has its own boundary. */
function FooterSpacer() {
  return (
    <Suspense fallback={<TabBarSpacerFallback />}>
      <TabBarSpacer />
    </Suspense>
  );
}
