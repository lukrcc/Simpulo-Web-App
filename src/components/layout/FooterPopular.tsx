"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useFormat } from "@/i18n/format";
import { citySlugOf } from "@/lib/data/stays";
import { VIBES } from "@/lib/catalog";
import { isListedStay } from "@/lib/launch";
import { useStore } from "@/lib/store";

/** A city or vibe is linked from this many public Houses on. */
const MIN_HOUSES_PER_LINK = 3;
/** The column shows only once at least this many cities qualify. */
const MIN_CITIES = 3;
/** Links in the column at most: the cities first, vibes fill the rest. */
const MAX_LINKS = 8;

/** The footer's fourth column: the cities and vibes with the most public Houses. Counts come from the store, so the mock's data presets apply. */
export function FooterPopular() {
  const t = useTranslations("footer");
  const format = useFormat();
  const { stays } = useStore();
  const { cities, vibes } = useMemo(() => {
    const listed = stays.filter(isListedStay);
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
  const links = [
    ...cities.map((c) => ({ href: `/co-living/${c.slug}`, label: t("coLivingIn", { city: c.name }) })),
    ...vibes.map((v) => ({ href: `/houses/${v.vibe}`, label: t("vibeHouses", { vibe: format.vibe(v.vibe) }) })),
  ].slice(0, MAX_LINKS);
  return (
    <nav aria-label={t("columns.popular")} className="md:col-span-2">
      <h2 className="text-eyebrow uppercase text-ink">{t("columns.popular")}</h2>
      <ul className="mt-3">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} className="inline-flex min-h-11 items-center transition-colors hover:text-ink md:min-h-8">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
