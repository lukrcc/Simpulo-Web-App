import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/Container";
import { buttonStyles } from "@/components/ui/ActionButton";
import { ExploreFeed, type FeedScope } from "@/components/views/ExploreFeed";
import { breadcrumbList } from "@/lib/seo";
import type { Stay } from "@/lib/types";
import { JsonLd } from "./JsonLd";

interface LandingPageProps {
  h1: string;
  intro: string;
  stays: Stay[];
  /** The feed's scope: the same Houses as `stays`, filterable like Explore (filters in the URL) */
  scope: FeedScope;
  breadcrumbs: ReadonlyArray<{ name: string; path: string }>;
  /** Link groups at the end ("Also popular", vibes in this city, top cities …); empty groups are left out */
  related: ReadonlyArray<{ title: string; links: ReadonlyArray<{ href: string; label: string }> }>;
}

/**
 * /co-living/[city]: H1, a short intro, the city's open Houses as normal cards with Explore's filters, related links. Only Houses – no place
 * tiles (CLAUDE.md "Ein Objekt"). No House yet: "No House here yet – open the first one".
 */
export async function LandingPage({ h1, intro, stays, scope, breadcrumbs, related, createHref }: LandingPageProps & { /** "Open the first one" with the place filled in */ createHref: string }) {
  const t = await getTranslations("seo");
  return (
    <Container page>
      <JsonLd data={breadcrumbList(breadcrumbs)} />
      <nav aria-label={t("breadcrumbs.label")} className="text-small text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          {breadcrumbs.map((crumb, i) => (
            <li key={crumb.path} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>›</span>}
              {i < breadcrumbs.length - 1 ? (
                <Link href={crumb.path} className="hover:text-ink hover:underline">
                  {crumb.name}
                </Link>
              ) : (
                <span aria-current="page" className="text-ink">
                  {crumb.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <h1 className="mt-4 text-h2 md:text-h1">{h1}</h1>
      <p className="mt-4 max-w-[640px] text-body-lg text-muted">{intro}</p>
      {/* How many Houses: the feed's own count (it follows the filters); the server HTML still lists them all. */}
      <p className="sr-only">{t("count", { count: stays.length })}</p>

      {/* Explore's grid and filters, limited to this page's Houses (rendered on the server too). */}
      {stays.length === 0 ? (
        <div className="mt-(--space-section) flex flex-col items-start gap-4">
          <p className="text-h2 text-ink">{t("emptyTitle")}</p>
          <Link href={createHref} className={buttonStyles("primary", "md")}>
            {t("emptyAction")}
          </Link>
        </div>
      ) : (
        <section aria-label={t("housesLabel")} className="mt-6">
          <ExploreFeed scope={scope} headless />
        </section>
      )}

      {related
        .filter((group) => group.links.length > 0)
        .map((group, i) => (
          <section key={group.title} aria-labelledby={`related-${i}`} className={i === 0 ? "mt-16" : "mt-10"}>
            <h2 id={`related-${i}`} className="text-h3 tracking-tight">
              {group.title}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={buttonStyles("secondary", "md")}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </Container>
  );
}
