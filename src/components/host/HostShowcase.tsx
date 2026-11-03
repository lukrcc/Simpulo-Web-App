"use client";

import { Sparkles, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo } from "react";
import { Shelf } from "@/components/ui/Shelf";
import { StayCard } from "@/components/StayCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FullBleedSection } from "@/components/ui/FullBleedSection";
import { useFeatureFlag } from "@/lib/featureFlags";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isListedStay } from "@/lib/launch";

/** The row's vibes, in this order – one House each, the rest filled with any other open Houses. */
const ROW_VIBES = ["party", "founder", "surf-water", "social", "culture", "fitness", "creator", "remote-work"];
const ROW_SIZE = 8;
/** Fewer than this and the row isn't worth showing (sparse datasets). */
const MIN_ROW = 3;

/** The page's one worked example (per guest): what a guest pays, Simpulo's 10 %, what reaches the host. */
const EXAMPLE = { guestPays: 650, fee: 65, youReceive: 585 };

function useOpenHouses(): Stay[] {
  const store = useStore();
  return useMemo(() => store.stays.filter((s) => isListedStay(s) && s.acceptingRequests), [store.stays]);
}

/**
 * /host hero: one real House as the Explore card – the host's face in the notch tab and their crew's avatars. Picks
 * the open House with the biggest crew (ties by id, so it's stable). Nothing when no House is open.
 */
export function HostHeroCard({ className }: { className?: string }) {
  const t = useTranslations("growth.host");
  const store = useStore();
  const open = useOpenHouses();
  const pick = useMemo(() => {
    const withCrew = open
      .map((stay) => ({ stay, host: findUser(store, stay.hostId), crew: getCrew(store, stay) }))
      .filter((c) => c.host && c.host.photos.length > 0);
    return withCrew.toSorted((a, b) => b.crew.length - a.crew.length || a.stay.id.localeCompare(b.stay.id))[0];
  }, [open, store]);
  if (!pick) return null;
  return (
    <figure aria-label={t("heroCardLabel")} className={className}>
      <StayCard stay={pick.stay} host={pick.host} crew={pick.crew} />
    </figure>
  );
}

/**
 * "Two ways to host": share the cost, or add a host experience on top – two equal cards (surface, line, 24px radius,
 * 40px padding), the right one with the page's only sum. Only with featureFlags.hostPremium – off, there is one way,
 * and the section isn't shown.
 */
export function HostWays({ className }: { className?: string }) {
  const t = useTranslations("growth.host");
  const format = useFormatter();
  const premium = useFeatureFlag("hostPremium");
  if (!premium) return null;

  const eur = (amount: number) => format.number(amount, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const rows: Array<{ label: string; value: string; strong?: boolean }> = [
    { label: t("calc.guestPays"), value: eur(EXAMPLE.guestPays) },
    { label: t("calc.fee"), value: eur(EXAMPLE.fee) },
    { label: t("calc.youReceive"), value: eur(EXAMPLE.youReceive), strong: true },
  ];
  const card = "flex flex-col rounded-3xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-10";

  return (
    <section data-glow-section aria-labelledby="host-ways" className={className}>
      <SectionHeader id="host-ways" title={t("waysTitle")} subline={t("waysSubline")} />
      <div className="card-grid mt-6 [--card-cols:2] [--card-min:360px]">
        <article className={card}>
          <Users className="size-6 text-ink" aria-hidden />
          <h3 className="mt-5 text-h3 tracking-tight text-ink">{t("shareTitle")}</h3>
          <p className="mt-2 text-body leading-relaxed text-muted">{t("shareText")}</p>
          <p className="mt-auto pt-8 text-body text-muted">{t("shareLine")}</p>
        </article>
        <article className={card}>
          <Sparkles className="size-6 text-ink" aria-hidden />
          <h3 className="mt-5 text-h3 tracking-tight text-ink">{t("proTitle")}</h3>
          <p className="mt-2 text-body leading-relaxed text-muted">{t("addText")}</p>
          {/* The sum: three 44px rows split by lines, the last one weighted. */}
          <dl className="mt-auto pt-8">
            {rows.map(({ label, value, strong }) => (
              <div key={label} className={cn("flex min-h-11 items-center justify-between gap-4 text-body", strong ? "font-semibold text-ink" : "text-ink")}>
                <dt className={strong ? undefined : "text-muted"}>{label}</dt>
                <dd className="tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </article>
      </div>
    </section>
  );
}

/** "Houses people opened": up to 8 open Houses across different vibes, as an Explore collection row. */
export function HostHousesRow({ className }: { className?: string }) {
  const t = useTranslations("growth.host");
  const store = useStore();
  const open = useOpenHouses();
  const stays = useMemo(() => {
    const picked = ROW_VIBES.map((vibe) => open.find((s) => s.vibe === vibe)).filter((s): s is Stay => !!s);
    const rest = open.filter((s) => !picked.includes(s));
    return [...picked, ...rest].slice(0, ROW_SIZE);
  }, [open]);
  if (stays.length < MIN_ROW) return null;
  return (
    <FullBleedSection className={className}>
      <section aria-labelledby="host-houses">
        <SectionHeader
          id="host-houses"
          title={t("housesTitle")}
          subline={t("housesSubline")}
          seeAll={{ href: "/explore", label: t("housesSeeAll"), ariaLabel: t("housesSeeAllLabel") }}
        />
        <Shelf>
          {stays.map((stay) => (
            <div key={stay.id} className="w-90 shrink-0">
              <StayCard stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} compact />
            </div>
          ))}
        </Shelf>
      </section>
    </FullBleedSection>
  );
}
