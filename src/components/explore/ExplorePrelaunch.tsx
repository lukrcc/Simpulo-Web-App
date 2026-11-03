"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { DestinationInterestForm } from "@/components/explore/DestinationInterestForm";
import { WhereNextContent } from "@/components/explore/WhereNextView";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Container } from "@/components/layout/Container";
import { buttonStyles } from "@/components/ui/ActionButton";
import { cardClass } from "@/components/ui/Card";
import { StageBand } from "@/components/ui/StageBand";

/**
 * Explore before the launch: no Spotlight, no grid, no filters, no example Houses. The stage with the opening date and the
 * form for where people want to go; below it Where next (the map and the places: real counts, only places with 3 or more people), and the
 * way to open the first House. Houses that exist already work through their own link.
 */
export function ExplorePrelaunch() {
  const t = useTranslations("explore.prelaunch");
  const tRow = useTranslations("explore.interests");

  return (
    <div data-explore-blocks className="pb-(--space-section)">
      <StageBand from="md" className="pb-16">
        <Container className="grid items-center gap-10 pt-12 md:pt-16 split:grid-cols-[minmax(0,1fr)_480px] split:gap-16">
          <div>
            <p className="text-eyebrow uppercase text-accent">{t("eyebrow")}</p>
            <h1 className="mt-3 text-h1 text-ink md:text-display">{t("title")}</h1>
            <p className="mt-4 max-w-xl text-body-lg text-muted">{t("text")}</p>
          </div>
          <div className={cardClass}>
            <DestinationInterestForm title={t("formTitle")} />
          </div>
        </Container>
      </StageBand>

      <Container className="pt-(--space-section)">
        <SectionHeader eyebrow={tRow("eyebrow")} title={tRow("title")} subline={tRow("subline")} />
        <WhereNextContent />
      </Container>

      <Container className="pt-(--space-section)">
        <h2 className="text-h2 text-ink">{t("hostTitle")}</h2>
        <Link href="/create" className={buttonStyles("secondary", "lg", "mt-6")}>
          {t("hostAction")}
        </Link>
      </Container>
    </div>
  );
}
