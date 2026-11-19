import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import type { IconType } from "react-icons";
import { SupportLink } from "@/components/help/HelpFeedback";
import { FooterInstallHint } from "@/components/InstallHint";
import { FOOTER_PLACES, FOOTER_THEMES } from "@/config/footer";
import { SOCIAL_LINKS, type SocialNetwork } from "@/lib/social";
import { Container } from "./Container";
import { CurrencyPicker } from "./CurrencyPicker";
import { FooterWaitlist, FoundingHostsLink } from "./FooterPhase";
import { Logo } from "./Logo";
import { TabBarSpacer, TabBarSpacerFallback } from "./TabBarSpacer";
import { cn } from "@/lib/utils";

/*
 * The footer system (config/footer.ts picks one per route): large · slim · none.
 * Large – dark (.footer-dark: the strips' graphite with a warm run, no Ember picture), always 64px of the light page before it (so a dark last
 * section never runs into it). Brand (logo, "Find your people.", socials, the QR "Get Simpulo on your phone") · Discover (places → their
 * pages, themes → Explore filtered) · Host (Open a House · How hosting works · Founding Hosts in pre-launch/beta · Host safety) · Simpulo
 * (About · How it works · Safety · Help · Share an idea); the last line small: currency · © · Impressum · Privacy · Terms · Cookies.
 * Pre-launch: "Join the waitlist" on top.
 * Slim – one line on the light ground: logo small · Help · Share an idea · right Impressum · Privacy · Terms · Cookies · socials.
 */
const SOCIAL_ICONS: Record<SocialNetwork, IconType> = { instagram: SiInstagram, tiktok: SiTiktok, youtube: SiYoutube };

/** The copyright line's year – a constant, since prerendered pages can't read the clock. Bump it each January. */
const COPYRIGHT_YEAR = 2026;

const LINK = "inline-flex min-h-11 items-center text-muted transition-colors hover:text-ink md:min-h-8";
const HEAD = "text-eyebrow uppercase text-muted";

async function legalLinks() {
  const t = await getTranslations("footer");
  return [
    { href: "/impressum", label: t("links.impressum") },
    { href: "/privacy", label: t("links.privacy") },
    { href: "/terms", label: t("links.terms") },
    { href: "/privacy#cookies", label: t("links.cookies") },
  ];
}

function Socials({ label, size }: { label: (network: SocialNetwork) => string; size: "sm" | "md" }) {
  const socials = (Object.entries(SOCIAL_LINKS) as [SocialNetwork, string][]).filter(([, url]) => url.trim() !== "");
  if (socials.length === 0) return null;
  return (
    <ul className="flex items-center gap-4">
      {socials.map(([network, url]) => {
        const Icon = SOCIAL_ICONS[network];
        return (
          <li key={network}>
            <a href={url} target="_blank" rel="noopener" aria-label={label(network)} className="flex text-muted transition-colors hover:text-ink">
              <Icon className={size === "md" ? "size-5" : "size-4"} aria-hidden />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export async function Footer() {
  const t = await getTranslations("footer");
  const tl = await getTranslations("footer.large");
  const legal = await legalLinks();
  const host = [
    { href: "/create", label: t("links.openHouse") },
    { href: "/faq?role=host", label: tl("howHosting") },
  ];
  const simpulo = [
    { href: "/about", label: t("links.about") },
    { href: "/faq", label: t("links.howItWorks") },
    { href: "/safety", label: t("links.safety") },
  ];
  return (
    // The room above it is --footer-gap (main's padding); after a dark last section it keeps 64px of light (globals.css).
    <footer className="footer-dark text-small">
      <Container className="pb-10 pt-16">
        <FooterWaitlist />
        {/* Tablet (768–1099px): two columns (sm:grid-cols-2); the 12-column row from Desktop. */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 split:grid-cols-12 split:gap-6">
          {/* Brand: logo, the line, socials, the QR to the app (desktop). */}
          <div className="flex flex-col items-start gap-4 split:col-span-4">
            {/* Phones: left like the column (the Logo centres itself – in bars that is vertical, here it pulled it to the middle). */}
            <Logo size="sm" className="max-md:self-start" />
            <p className="text-body-lg text-ink">{tl("tagline")}</p>
            <nav aria-label={t("social.label")}>
              <Socials label={(n) => t(`social.${n}`)} size="md" />
            </nav>
            <FooterInstallHint id="get-the-app" size={72} className="mt-2 max-md:hidden" />
          </div>
          {/* Discover: places and themes. */}
          <nav aria-label={tl("discover")} className="split:col-span-4">
            <h2 className={HEAD}>{tl("discover")}</h2>
            <div className="mt-3 grid grid-cols-2 gap-6">
              <div>
                <p className="text-small font-semibold text-ink">{tl("places")}</p>
                <ul className="mt-1">
                  {FOOTER_PLACES.map((place) => (
                    <li key={place.slug}>
                      <Link href={`/co-living/${place.slug}`} className={LINK}>
                        {place.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-small font-semibold text-ink">{tl("themes")}</p>
                <ul className="mt-1">
                  {FOOTER_THEMES.map((theme) => (
                    <li key={theme}>
                      <Link href={`/explore?category=${theme}`} className={LINK}>
                        {tl(`theme.${theme}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </nav>
          <nav aria-label={tl("host")} className="split:col-span-2">
            <h2 className={HEAD}>{tl("host")}</h2>
            <ul className="mt-3">
              {host.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className={LINK}>
                    {label}
                  </Link>
                </li>
              ))}
              <FoundingHostsLink className={LINK} />
              <li>
                <Link href="/safety#safety-hosts" className={LINK}>
                  {tl("hostSafety")}
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label={t("columns.simpulo")} className="split:col-span-2">
            <h2 className={HEAD}>{t("columns.simpulo")}</h2>
            <ul className="mt-3">
              {simpulo.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className={LINK}>
                    {label}
                  </Link>
                </li>
              ))}
              {/* "Help" and "Share an idea" open their windows (no pages of their own). */}
              <li>
                <SupportLink kind="help" className={LINK} />
              </li>
              <li>
                <SupportLink kind="idea" className={LINK} />
              </li>
            </ul>
          </nav>
        </div>

        {/* The last line, small, under a thin line: currency · © · Impressum · Privacy · Terms · Cookies. */}
        <div className="mt-12 flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-line pt-6 text-small text-muted">
          <span className="mr-3">
            <CurrencyPicker />
          </span>
          <span>{t("copyright", { year: COPYRIGHT_YEAR })}</span>
          {/* Phones: the legal links on a line of their own (no "·" at its start). */}
          <nav aria-label={t("legalLabel")} className="contents max-md:flex max-md:w-full max-md:flex-wrap max-md:items-center max-md:gap-x-1.5">
            {legal.map(({ href, label }, i) => (
              <span key={href} className="flex items-center gap-1.5">
                <span aria-hidden className={cn(i === 0 && "max-md:hidden")}>·</span>
                <Link href={href} className="inline-flex min-h-11 items-center transition-colors hover:text-ink md:min-h-0">
                  {label}
                </Link>
              </span>
            ))}
          </nav>
        </div>
      </Container>
      <FooterSpacer />
    </footer>
  );
}

/** The slim footer: one line on the light ground – logo small · Help · Share an idea · right Impressum · Privacy · Terms · Cookies · socials. */
export async function SlimFooter() {
  const t = await getTranslations("footer");
  const legal = await legalLinks();
  return (
    <footer className="bg-(--footer-surface)">
      <Container className="flex min-h-(--footer-slim-h) flex-wrap items-center justify-between gap-x-6 gap-y-2 py-(--footer-slim-pad) text-small text-muted">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Logo size="sm" />
          <SupportLink kind="help" className="min-h-11 md:min-h-0" />
          <SupportLink kind="idea" className="min-h-11 md:min-h-0" />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <nav aria-label={t("legalLabel")} className="flex flex-wrap items-center gap-x-1.5">
            {legal.map(({ href, label }, i) => (
              <span key={href} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden>·</span>}
                <Link href={href} className="inline-flex min-h-11 items-center transition-colors hover:text-ink md:min-h-0">
                  {label}
                </Link>
              </span>
            ))}
          </nav>
          <nav aria-label={t("social.label")}>
            <Socials label={(n) => t(`social.${n}`)} size="sm" />
          </nav>
        </div>
      </Container>
      <FooterSpacer />
    </footer>
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
