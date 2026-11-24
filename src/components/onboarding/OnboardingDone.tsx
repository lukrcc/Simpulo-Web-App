"use client";

// /welcome/done – the end of the guest onboarding (CLAUDE.md "Onboarding"): "You're set", the profile's "4 of 6" with the way back to Edit
// profile, and three Houses to start with (what you're in for first, then your themes, then the soonest – lib/onboarding.ts).
import Link from "next/link";
import { useTranslations } from "next-intl";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { HouseCard } from "@/components/HouseCard";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/ActionButton";
import { usePlatformPhase } from "@/config/platform";
import { getVisibleHouses } from "@/lib/data/visibleHouses";
import { profileProgress, startingHouses } from "@/lib/onboarding";
import { findUser, getCrew, getCurrentUser, useStore } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import { firstName } from "@/lib/utils";

export function OnboardingDone() {
  const t = useTranslations("onboarding.done");
  return (
    <RequireLogin title={t("metaTitle")}>
      <DoneContent />
    </RequireLogin>
  );
}

function DoneContent() {
  const t = useTranslations("onboarding.done");
  const store = useStore();
  const me = getCurrentUser(store);
  const phase = usePlatformPhase();
  const now = useNow();
  if (!me || now === null) return null;
  const today = new Date(now).toISOString().slice(0, 10);
  const p = profileProgress(me, today);
  const houses = startingHouses(getVisibleHouses(store.stays, phase), me, store.inFor, today);
  return (
    <Container page className="explore-width pb-(--space-section)">
      <p className="text-eyebrow uppercase text-muted">{t("eyebrow")}</p>
      <h1 className="mt-2 text-h1 text-ink">{t("title", { name: firstName(me) })}</h1>
      <p className="mt-3 max-w-[60ch] text-body-lg text-muted">
        {p.done < p.total ? t("progress", { done: p.done, total: p.total }) : t("complete")}{" "}
        {p.done < p.total && (
          <Link href="/settings/profile" className="font-semibold text-ink underline underline-offset-4">
            {t("finish")}
          </Link>
        )}
      </p>
      {houses.length > 0 && (
        <section aria-labelledby="done-houses" className="mt-10">
          <h2 id="done-houses" className="text-section text-ink">
            {t("housesTitle")}
          </h2>
          <ul data-starting-houses className="mt-6 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
            {houses.map((s) => (
              <li key={s.id}>
                <HouseCard stay={s} host={findUser(store, s.hostId)} crew={getCrew(store, s)} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mt-10 flex flex-wrap gap-3">
        <Button href="/explore">{t("explore")}</Button>
        <Button href="/profile" variant="secondary">
          {t("profile")}
        </Button>
      </div>
    </Container>
  );
}
