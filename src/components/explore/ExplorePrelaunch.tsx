"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DestinationInterestForm } from "@/components/explore/DestinationInterestForm";
import { AddPlaceCard, AddPlaceSheet, DemandCard, ROW_CARD } from "@/components/explore/InterestRow";
import { RowHeader, ScrollRow } from "@/components/explore/CollectionRow";
import { Container } from "@/components/layout/Container";
import { buttonStyles } from "@/components/ui/ActionButton";
import { cardClass } from "@/components/ui/Card";
import { StageBand } from "@/components/ui/StageBand";
import { useDemandSpots } from "@/lib/destinations";

/**
 * Explore before the launch: no Spotlight, no grid, no filters, no example Houses. The stage with the opening date and the
 * form for where people want to go; below it what others picked (real counts, only places with 3 or more people), and the
 * way to open the first House. Houses that exist already work through their own link.
 */
export function ExplorePrelaunch() {
  const t = useTranslations("explore.prelaunch");
  const tRow = useTranslations("explore.interests");
  const spots = useDemandSpots();
  const [adding, setAdding] = useState(false);

  return (
    <div data-explore-blocks className="pb-24">
      <StageBand from="md" className="pb-16">
        <Container className="grid items-center gap-10 pt-12 md:pt-16 lg:grid-cols-[minmax(0,1fr)_480px] lg:gap-16">
          <div>
            <p className="text-eyebrow uppercase text-accent">{t("eyebrow")}</p>
            <h1 className="mt-3 text-h1 tracking-tight text-ink md:text-display">{t("title")}</h1>
            <p className="mt-4 max-w-xl text-body-lg text-muted">{t("text")}</p>
          </div>
          <div className={cardClass}>
            <DestinationInterestForm title={t("formTitle")} />
          </div>
        </Container>
      </StageBand>

      {spots.length > 0 && (
        <Container className="pt-24">
          <section aria-labelledby="interests-title">
            <RowHeader id="interests-title" eyebrow={tRow("eyebrow")} title={tRow("title")} subline={tRow("subline")} />
            <ScrollRow>
              {spots.map((spot) => (
                <div key={spot.destinationId} className={ROW_CARD}>
                  <DemandCard spot={spot} />
                </div>
              ))}
              <div className={ROW_CARD}>
                <AddPlaceCard onAdd={() => setAdding(true)} />
              </div>
            </ScrollRow>
            <AddPlaceSheet open={adding} onClose={() => setAdding(false)} />
          </section>
        </Container>
      )}

      <Container className="pt-24">
        <h2 className="text-h2 tracking-tight text-ink">{t("hostTitle")}</h2>
        <Link href="/create" className={buttonStyles("secondary", "lg", "mt-6")}>
          {t("hostAction")}
        </Link>
      </Container>
    </div>
  );
}
