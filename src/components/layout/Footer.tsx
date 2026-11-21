import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import type { IconType } from "react-icons";
import { SupportLink } from "@/components/help/HelpFeedback";
import { FooterInstallHint } from "@/components/InstallHint";
import { FOOTER_COLUMNS, FOOTER_LEGAL, type FooterLink } from "@/config/footer";
import { SOCIAL_LINKS, type SocialNetwork } from "@/lib/social";
import { Container } from "./Container";
import { CurrencyPicker } from "./CurrencyPicker";
import { FooterColumn } from "./FooterColumn";
import { FooterDiscover } from "./FooterDiscover";
import { FooterWaitlist } from "./FooterPhase";
import { Logo } from "./Logo";
import { TabBarSpacer, TabBarSpacerFallback } from "./TabBarSpacer";

/*
 * The footer system (config/footer.ts picks one per route): large · slim · none.
 * Large – the header's colour (.footer-dark: --footer-surface = --header-surface, neutral graphite, no warm run), always 64px of the light page
 * before it. Brand (logo, claim, socials, the QR) · Places · Themes (computed – FooterDiscover) · Explore · Host · Simpulo · Help (config/
 * footer.ts), every heading the same; the last line small: © · Impressum · Privacy · Terms · Cookies · currency. Pre-launch: the waitlist on top.
 * Slim – one line on the page's surface with a fine line on top (--footer-slim-line).
 */
const SOCIAL_ICONS: Record<SocialNetwork, IconType> = { instagram: SiInstagram, tiktok: SiTiktok, youtube: SiYoutube };

/** The copyright line's year – a constant, since prerendered pages can't read the clock. Bump it each January. */
const COPYRIGHT_YEAR = 2026;

const LINK = "inline-flex min-h-11 items-center text-muted transition-colors hover:text-ink md:min-h-8";

/** The legal line – the one list in config/footer.ts (FOOTER_LEGAL). */
async function legalLinks() {
  const t = await getTranslations("footer");
  return FOOTER_LEGAL.flatMap((l) => (l.href && !l.hidden ? [{ href: l.href, label: t(`links.${l.key}` as "links.privacy") }] : []));
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
  const link = (l: FooterLink) =>
    l.hidden ? null : (
      <li key={l.key}>
        {l.action ? (
          <SupportLink kind={l.action} className={LINK} label={tl(`links.${l.key}` as "links.getHelp")} />
        ) : (
          <Link href={l.href!} className={LINK}>
            {tl(`links.${l.key}` as "links.about")}
          </Link>
        )}
      </li>
    );
  return (
    // The room above it is --footer-gap (main's padding); after a dark last section it keeps 64px of light (globals.css).
    <footer className="footer-dark text-small">
      <Container className="pb-10 pt-16">
        <FooterWaitlist />
        {/* Brand and six columns: phones one column, the six as groups that open (FooterColumn); tablets three columns under the brand;
            Desktop one row – the brand wider, the six equal (fluid, no fixed widths). */}
        <div className="grid grid-cols-1 gap-x-10 gap-y-0 sm:grid-cols-2 md:grid-cols-3 md:gap-y-10 split:grid-cols-[minmax(0,2fr)_repeat(6,minmax(0,1fr))] split:gap-x-6">
          <div className="flex flex-col items-start gap-4 pb-8 sm:col-span-2 md:col-span-3 md:pb-0 split:col-span-1">
            <Logo size="sm" className="self-start" />
            <p className="text-body-lg text-ink">{tl("tagline")}</p>
            <nav aria-label={t("social.label")}>
              <Socials label={(n) => t(`social.${n}`)} size="md" />
            </nav>
            <FooterInstallHint id="get-the-app" size={72} className="mt-2 max-md:hidden" />
          </div>
          <FooterDiscover linkClass={LINK} />
          {FOOTER_COLUMNS.map((column) => (
            <FooterColumn key={column.id} title={tl(`columns.${column.id}`)}>
              <ul>{column.links.map(link)}</ul>
            </FooterColumn>
          ))}
        </div>

        {/* The last line, small, under a thin line: © Simpulo · Impressum · Privacy · Terms · Cookies – the currency on the right. */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-6 text-small text-muted">
          {/* Phones: © on a line of its own, the legal links after it without a "·" at the line's start. */}
          <nav aria-label={t("legalLabel")} className="flex flex-wrap items-center gap-x-1.5">
            <span className="max-md:w-full">{t("copyright", { year: COPYRIGHT_YEAR })}</span>
            {legal.map(({ href, label }, i) => (
              <span key={href} className="flex items-center gap-1.5">
                <span aria-hidden className={i === 0 ? "max-md:hidden" : undefined}>·</span>
                <Link href={href} className="inline-flex min-h-11 items-center transition-colors hover:text-ink md:min-h-0">
                  {label}
                </Link>
              </span>
            ))}
          </nav>
          <CurrencyPicker />
        </div>
      </Container>
      <FooterSpacer />
    </footer>
  );
}

/** The slim footer: one line on the light ground – Get help · Report content · Impressum · Privacy · Terms · Cookies. */
export async function SlimFooter() {
  const t = await getTranslations("footer");
  const tl = await getTranslations("footer.large");
  const legal = await legalLinks();
  return (
    <footer data-footer-slim className="border-t border-(--footer-slim-line) bg-(--footer-slim-surface)">
      <Container className="flex min-h-(--footer-slim-h) items-center py-(--footer-slim-pad) text-small text-muted">
        <nav aria-label={t("legalLabel")} className="flex flex-wrap items-center gap-x-1.5">
          <SupportLink kind="help" className="min-h-11 md:min-h-0" label={tl("links.getHelp")} />
          {[{ href: "/report-content", label: tl("links.reportContent") }, ...legal].map(({ href, label }) => (
            <span key={href} className="flex items-center gap-1.5">
              <span aria-hidden>·</span>
              <Link href={href} className="inline-flex min-h-11 items-center transition-colors hover:text-ink md:min-h-0">
                {label}
              </Link>
            </span>
          ))}
        </nav>
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
