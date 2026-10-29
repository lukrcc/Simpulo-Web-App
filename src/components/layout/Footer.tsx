import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import type { IconType } from "react-icons";
import { IfHostPremium } from "@/components/host/ProHostSection";
import { SOCIAL_LINKS, type SocialNetwork } from "@/lib/social";
import { Container } from "./Container";
import { TabBarSpacer, TabBarSpacerFallback } from "./TabBarSpacer";

/**
 * Site footer below every page: wordmark, claim and socials (top, on the headings' baseline), three plain link columns – Explore,
 * Hosting, Simpulo – and a bottom row with the copyright and the legal links. The city and
 * vibe index lives in its own block above it (ExploreIndex). On mobile a spacer at its end keeps it clear of the
 * bottom bar for the current mode (pill, docked or none) and of the sticky CTAs on routes without the tab bar.
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
        { href: "/how-it-works", label: t("links.howItWorks") },
        { href: "/create", label: t("links.openHouse") },
      ],
    },
    {
      title: t("columns.hosting"),
      links: [
        { href: "/host", label: t("links.hostAHouse") },
        { href: "/host#pro-hosts", label: t("links.proHosts"), premium: true },
        { href: "/safety", label: t("links.safety") },
      ],
    },
    {
      title: t("columns.simpulo"),
      links: [
        { href: "/about", label: t("links.about") },
        { href: "/faq", label: t("links.faq") },
        { href: "/impressum", label: t("links.impressum") },
        { href: "/privacy", label: t("links.privacy") },
        { href: "/terms", label: t("links.terms") },
      ],
    },
  ];

  const socials = (Object.entries(SOCIAL_LINKS) as [SocialNetwork, string][]).filter(([, url]) => url.trim() !== "");
  const legal = [
    { href: "/impressum", label: t("links.impressum") },
    { href: "/privacy", label: t("links.privacy") },
    { href: "/terms", label: t("links.terms") },
  ];

  return (
    <footer className="border-t border-neutral-100">
      <Container className="py-10 text-sm text-zinc-500">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-baseline md:gap-6">
          {/* Wordmark, claim and socials at the top: the grid aligns first baselines, so the wordmark sits on the
              column headings' baseline. Phones: first, above the links. */}
          <div className="md:col-span-6">
            <p className="text-base font-bold tracking-tight text-ink">
              simpulo<span className="text-accent">.</span>
            </p>
            <p className="mt-1 text-xs">{t("tagline")}</p>
            {socials.length > 0 && (
              <ul aria-label={t("social.label")} className="mt-4 flex items-center gap-4">
                {socials.map(([network, url]) => {
                  const Icon = SOCIAL_ICONS[network];
                  return (
                    <li key={network}>
                      <a href={url} target="_blank" rel="noopener" aria-label={t(`social.${network}`)} className="flex text-[#8A8A8E] transition-colors hover:text-ink">
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
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink">{column.title}</h2>
              <ul className="mt-3">
                {column.links.map(({ href, label, premium }) => {
                  const item = (
                    <li key={href}>
                      <Link href={href} className="inline-flex min-h-11 items-center transition-colors hover:text-ink md:min-h-8">
                        {label}
                      </Link>
                    </li>
                  );
                  // The pro section on /host only exists with the flag – so does its link.
                  return premium ? <IfHostPremium key={href}>{item}</IfHostPremium> : item;
                })}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom row across the full width. */}
        <div className="mt-8 flex flex-col gap-3 border-t border-[#E8E6E1] pt-6 text-xs md:flex-row md:items-center md:justify-between">
          <p>{t("copyright", { year: COPYRIGHT_YEAR })}</p>
          <nav aria-label={t("legalLabel")}>
            <ul className="flex flex-wrap items-center gap-x-1.5">
              {legal.map(({ href, label }, i) => (
                <li key={href} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden>·</span>}
                  <Link href={href} className="inline-flex min-h-11 items-center transition-colors hover:text-ink md:min-h-0">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Container>
      {/* usePathname suspends on dynamic routes during prerender, so the spacer has its own boundary. */}
      <Suspense fallback={<TabBarSpacerFallback />}>
        <TabBarSpacer />
      </Suspense>
    </footer>
  );
}
