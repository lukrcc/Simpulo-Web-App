"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useId, useMemo, useState } from "react";
import { useFormat } from "@/i18n/format";
import { citySlugOf } from "@/lib/data/stays";
import { VIBES } from "@/lib/mock";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Container } from "./Container";

/** A city or vibe is linked from this many public Houses on. */
export const MIN_HOUSES_PER_LINK = 3;
/** The block shows only once at least this many cities qualify. */
const MIN_CITIES = 3;
/** Links visible while collapsed (the top cities). */
const COLLAPSED_LINKS = 8;

/** Logged-in areas and flows – no index there (matches robots.ts). */
const PRIVATE_PREFIXES = ["/inbox", "/notifications", "/my-stays", "/profile", "/settings", "/create", "/welcome", "/admin", "/claim"];

/**
 * "Explore by city and vibe" above the footer, on public pages: the top cities as plain links, "Show all" for every
 * qualifying city and vibe. Everything is in the HTML from the start (collapsed by CSS), so crawlers follow all of it.
 * Counts come from the store – so the mock's data presets apply – and the block hides with fewer than 3 cities.
 */
export function ExploreIndex() {
  return (
    // usePathname suspends on dynamic routes during prerender: the fallback is the block itself, so those pages
    // still ship every link; the browser then drops it on private routes.
    <Suspense fallback={<ExploreIndexBlock />}>
      <PublicOnly />
    </Suspense>
  );
}

function PublicOnly() {
  const pathname = usePathname();
  if (PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  return <ExploreIndexBlock />;
}

function ExploreIndexBlock() {
  const t = useTranslations("footer.index");
  const format = useFormat();
  const { stays } = useStore();
  const [open, setOpen] = useState(false);
  const id = useId();

  const { cities, vibes } = useMemo(() => {
    const listed = stays.filter((s) => s.status === "published" && s.hostId !== "");
    const byCity = new Map<string, { slug: string; name: string; count: number }>();
    for (const stay of listed) {
      const slug = citySlugOf(stay);
      if (!slug) continue;
      const entry = byCity.get(slug) ?? { slug, name: stay.city, count: 0 };
      entry.count++;
      byCity.set(slug, entry);
    }
    return {
      cities: [...byCity.values()].filter((c) => c.count >= MIN_HOUSES_PER_LINK).toSorted((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      vibes: VIBES.map((v) => ({ vibe: v.key, count: listed.filter((s) => s.vibe === v.key).length }))
        .filter((v) => v.count >= MIN_HOUSES_PER_LINK)
        .toSorted((a, b) => b.count - a.count),
    };
  }, [stays]);

  if (cities.length < MIN_CITIES) return null;
  const canExpand = cities.length > COLLAPSED_LINKS || vibes.length > 0;
  const link = "inline-flex min-h-9 items-center text-[13px] text-zinc-500 transition-colors hover:text-ink md:min-h-7";

  return (
    <section aria-labelledby={`${id}-title`} className="border-t border-neutral-100">
      <Container className="py-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id={`${id}-title`} className="text-sm font-semibold text-ink">
            {t("title")}
          </h2>
          {canExpand && (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`${id}-list`}
              onClick={() => setOpen((o) => !o)}
              className="text-[13px] font-medium text-zinc-600 underline-offset-4 hover:text-ink hover:underline"
            >
              {open ? t("showLess") : t("showAll")}
            </button>
          )}
        </div>
        {/* All links always rendered; collapsed, only the top cities show. */}
        <div id={`${id}-list`} className="mt-3 space-y-4">
          <div>
            <h3 className={cn("mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400", !open && "sr-only")}>{t("cities")}</h3>
            <ul className="flex flex-wrap gap-x-5">
              {cities.map((city, i) => (
                <li key={city.slug} className={cn(!open && i >= COLLAPSED_LINKS && "hidden")}>
                  <Link href={`/co-living/${city.slug}`} className={link}>
                    {t("coLivingIn", { city: city.name })}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {vibes.length > 0 && (
            <div className={cn(!open && "hidden")}>
              <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">{t("vibes")}</h3>
              <ul className="flex flex-wrap gap-x-5">
                {vibes.map(({ vibe }) => (
                  <li key={vibe}>
                    <Link href={`/houses/${vibe}`} className={link}>
                      {t("vibeHouses", { vibe: format.vibe(vibe) })}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
