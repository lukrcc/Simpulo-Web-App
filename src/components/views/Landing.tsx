"use client";

// The start page for visitors (/ logged out – CLAUDE.md "Landing"). Top to bottom (config/landing.ts): the stage ("Share a place. Find your
// people." + one sentence; before the launch "Opening {month}" and the waitlist, otherwise "Where to next?" and the spotlight of real
// Houses) · how it works in three steps · the arc in short · Houses as a shelf (before the launch the examples, marked "Example") · trust ·
// for hosts · four questions · the end (the waitlist or Explore). Light page, one dark band (the arc), Houses as HouseCards. Logged in, /
// is Explore (app/page.tsx).
import { BadgeCheck, Flag, LifeBuoy, Search, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState, type FormEvent } from "react";
import { HouseCard } from "@/components/HouseCard";
import { Container } from "@/components/layout/Container";
import { HOST_APPLY_HREF } from "@/components/platform/useJoinWaitlist";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { DarkBand } from "@/components/ui/DarkBand";
import { Img } from "@/components/ui/Img";
import { Input } from "@/components/ui/Input";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Shelf } from "@/components/ui/Shelf";
import { ARC_PHASES } from "@/config/arc";
import { EXPLORE_SPACING } from "@/config/explore";
import { FAQ } from "@/config/faq";
import { GUIDES } from "@/config/seo";
import { LANDING_FAQ, LANDING_HOUSES, LANDING_IMAGES, LANDING_PHASE, LANDING_STEPS, LANDING_TRUST } from "@/config/landing";
import { launch, usePlatformPhase } from "@/config/platform";
import { getVisibleHouses } from "@/lib/data/visibleHouses";
import { onePerHost } from "@/lib/heroRotation";
import { isListedStay } from "@/lib/launch";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { openSpots } from "@/lib/utils";
import { useNow } from "@/lib/useNow";
import { openWaitlist } from "@/lib/waitlistSignup";

const TRUST_ICONS: Record<(typeof LANDING_TRUST)[number]["icon"], LucideIcon> = { BadgeCheck, Wallet, LifeBuoy, Flag };

/** A row of HouseCards, the shelf's size (.explore-slide). */
function HouseShelf({ stays }: { stays: readonly Stay[] }) {
  const store = useStore();
  return (
    <Shelf variant="flat" top={EXPLORE_SPACING.headContent}>
      {stays.map((stay) => (
        <div key={stay.id} className="explore-slide shrink-0">
          <HouseCard variant="shelf" stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} />
        </div>
      ))}
    </Shelf>
  );
}

/** The waitlist as one field: the email, then the sheet with the rest (where, theme, when, the consent – lib/waitlistSignup.ts). */
function WaitlistField({ from }: { from: string }) {
  const t = useTranslations("landing");
  const id = useId();
  const [email, setEmail] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    openWaitlist({ email: email.trim() || undefined, from });
  };
  return (
    <form onSubmit={submit} className="flex w-full max-w-[520px] flex-col gap-3 sm:flex-row">
      <label htmlFor={id} className="sr-only">
        {t("emailLabel")}
      </label>
      <Input id={id} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("emailPlaceholder")} className="min-w-0 sm:flex-1" />
      <Button type="submit" size="md" className="shrink-0">
        {t("join")}
      </Button>
    </form>
  );
}

export function Landing() {
  const t = useTranslations("landing");
  const tFaq = useTranslations("faq.items");
  const tGuides = useTranslations("guides.articles");
  const phase = usePlatformPhase();
  const rules = LANDING_PHASE[phase];
  const tPhase = (key: "eyebrow" | "stageNote" | "closingTitle" | "closingText") => t(`phase.${rules.copy}.${key}`, { month: launch.targetMonth });
  const store = useStore();

  // The Houses anyone may see in this phase (lib/data/visibleHouses.ts): open, listed, starting later, a spot free; one per host first.
  const visible = useMemo(() => getVisibleHouses(store.stays, phase), [store.stays, phase]);
  // The shared browser clock (null while prerendering – then every listed House counts, the browser narrows it right after).
  const now = useNow();
  const today = now === null ? "" : new Date(now).toISOString().slice(0, 10);
  const open = useMemo(() => visible.filter((s) => isListedStay(s) && s.startDate > today && openSpots(s) > 0).toSorted((a, b) => a.startDate.localeCompare(b.startDate)), [visible, today]);
  const real = useMemo(() => open.filter((s) => !s.isExample), [open]);
  const spotlight = useMemo(() => onePerHost(real).slice(0, LANDING_HOUSES.spotlight), [real]);
  const shelf = useMemo(() => {
    if (rules.shelf === "examples") return onePerHost(open.filter((s) => s.isExample)).slice(0, LANDING_HOUSES.shelf);
    const shown = new Set(spotlight.map((s) => s.id));
    return real.filter((s) => !shown.has(s.id)).slice(0, LANDING_HOUSES.shelf);
  }, [rules.shelf, open, real, spotlight]);

  return (
    <div data-landing={phase}>
      {/* ── Stage ─────────────────────────────────────────────────────────── */}
      <section aria-labelledby="landing-title" className="pt-[clamp(32px,6vw,80px)]">
        <Container className="explore-width">
          <div className={rules.stage === "waitlist" ? "grid items-center gap-10 split:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]" : undefined}>
            <div className="flex flex-col items-start">
              <p className="text-eyebrow uppercase text-muted">{tPhase("eyebrow")}</p>
              <h1 id="landing-title" className="stage-title mt-3 max-w-[16ch] text-ink">
                {t("title")}
              </h1>
              <p className="mt-4 max-w-[46ch] text-body-lg text-muted">{t("sentence")}</p>
              <div className="mt-8 w-full">
                {rules.stage === "waitlist" ? (
                  <WaitlistField from="landing" />
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {/* The search: Explore's "Where to next?" sheet opens there (?open=where). */}
                    <Link href="/explore?open=where" className={buttonStyles("primary", "md")}>
                      <Search aria-hidden />
                      {t("whereNext")}
                    </Link>
                    <Link href="/explore" className={buttonStyles("secondary", "md")}>
                      {t("exploreAll")}
                    </Link>
                  </div>
                )}
                <p className="mt-3 text-small text-muted">{tPhase("stageNote")}</p>
              </div>
            </div>
            {rules.stage === "waitlist" && (
              <div className="relative aspect-4/5 w-full max-w-[520px] overflow-hidden rounded-[24px] bg-ink/6 max-split:hidden justify-self-end">
                <Img src={LANDING_IMAGES.prelaunchStage} alt="" fill sizes="(min-width: 1100px) 40vw, 100vw" className="object-cover" priority />
              </div>
            )}
          </div>
        </Container>
        {/* Live and beta: the spotlight – real Houses open now. */}
        {rules.stage === "search" && spotlight.length > 0 && (
          <Container className="explore-width mt-10">
            <HouseShelf stays={spotlight} />
          </Container>
        )}
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section aria-labelledby="landing-how" className="mt-(--space-section)">
        <Container className="explore-width">
          <SectionHeader variant="explore" id="landing-how" eyebrow={t("how.eyebrow")} title={t("how.title")} />
          <ol className="mt-6 grid gap-8 md:grid-cols-3">
            {LANDING_STEPS.map((step, i) => (
              <li key={step.id} className="flex flex-col gap-4">
                <div className="relative aspect-4/3 overflow-hidden rounded-[24px] bg-ink/6">
                  <Img src={step.image} alt="" fill sizes="(min-width: 744px) 33vw, 100vw" className="object-cover" />
                </div>
                <div>
                  <p className="text-eyebrow uppercase text-muted">{i + 1}</p>
                  <h3 className="mt-1 text-h3 text-ink">{t(`how.steps.${step.id}.title`)}</h3>
                  <p className="mt-1 text-body text-muted">{t(`how.steps.${step.id}.text`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ── The arc, in short (the one dark band) ─────────────────────────── */}
      <DarkBand className="mt-(--space-section) mb-0">
        <section aria-labelledby="landing-arc">
          <p className="text-eyebrow uppercase text-muted">{t("arc.eyebrow")}</p>
          <h2 id="landing-arc" className="mt-2 text-section text-ink">
            {t("arc.title")}
          </h2>
          <p className="mt-2 max-w-[56ch] text-body-lg text-muted">{t("arc.text")}</p>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {ARC_PHASES.map((p, i) => (
              <li key={p} className="flex flex-col gap-2 border-t border-ink/15 pt-4">
                <span className="text-small tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-body text-ink">{t(`arc.phases.${p}`)}</span>
              </li>
            ))}
          </ol>
        </section>
      </DarkBand>

      {/* ── Houses ────────────────────────────────────────────────────────── */}
      {shelf.length > 0 && (
        <section aria-labelledby="landing-houses" className="mt-(--space-section)">
          <Container className="explore-width">
            <SectionHeader
              variant="explore"
              id="landing-houses"
              title={rules.shelf === "examples" ? t("houses.examplesTitle") : t("houses.openTitle")}
              subline={rules.shelf === "examples" ? t("houses.examplesText") : t("houses.openText")}
              seeAll={{ href: "/explore", label: t("houses.seeAll") }}
            />
            <HouseShelf stays={shelf} />
          </Container>
        </section>
      )}

      {/* ── Trust ─────────────────────────────────────────────────────────── */}
      <section aria-labelledby="landing-trust" className="mt-(--space-section)">
        <Container className="explore-width">
          <SectionHeader variant="explore" id="landing-trust" eyebrow={t("trust.eyebrow")} title={t("trust.title")} />
          <ul className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {LANDING_TRUST.map((item) => {
              const Icon = TRUST_ICONS[item.icon];
              return (
                <li key={item.id} className="flex flex-col gap-2">
                  <Icon aria-hidden className="size-6 text-ink" strokeWidth={1.75} />
                  <h3 className="text-h3 text-ink">{t(`trust.items.${item.id}.title`)}</h3>
                  <p className="text-body text-muted">{t(`trust.items.${item.id}.text`)}</p>
                </li>
              );
            })}
          </ul>
          <Link href="/safety" className="mt-6 inline-block text-body font-semibold text-ink underline-offset-4 hover:underline">
            {t("trust.safety")} →
          </Link>
        </Container>
      </section>

      {/* ── For hosts ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="landing-hosts" className="mt-(--space-section)">
        <Container className="explore-width">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="relative aspect-4/3 overflow-hidden rounded-[24px] bg-ink/6">
              <Img src={LANDING_IMAGES.hosts} alt="" fill sizes="(min-width: 744px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="flex flex-col items-start">
              <p className="text-eyebrow uppercase text-muted">{t("hosts.eyebrow")}</p>
              <h2 id="landing-hosts" className="mt-2 text-section text-ink">
                {t("hosts.title")}
              </h2>
              <p className="mt-3 max-w-[48ch] text-body-lg text-muted">{t("hosts.text")}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {/* Before the launch the application; afterwards Open a House (logged out it asks for a login first). */}
                <Link href={rules.stage === "waitlist" ? HOST_APPLY_HREF : "/create"} className={buttonStyles("primary", "md")}>
                  {t("hosts.become")}
                </Link>
                <Link href="/help?cat=hosting" className={buttonStyles("tertiary", "md")}>
                  {t("hosts.howHosting")}
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Four questions ────────────────────────────────────────────────── */}
      <section aria-labelledby="landing-faq" className="mt-(--space-section)">
        <Container className="explore-width">
          <div className="max-w-[720px]">
            <h2 id="landing-faq" className="text-section text-ink">
              {t("faq.title")}
            </h2>
            <ul className="mt-6 border-t border-ink/10">
              {LANDING_FAQ.map(({ role, id }) => {
                const item = FAQ[role].find((x) => x.id === id);
                return (
                  <li key={id} className="border-b border-ink/10">
                    <details className="group py-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-body-lg font-semibold text-ink">
                        {tFaq(`${id}.question` as "payment.question")}
                        <span aria-hidden className="text-muted transition-transform group-open:rotate-45">
                          +
                        </span>
                      </summary>
                      <p className="mt-2 max-w-[640px] text-body text-muted">{tFaq(`${id}.answer` as "payment.answer", item?.values)}</p>
                    </details>
                  </li>
                );
              })}
            </ul>
            <Link href="/help" className="mt-6 inline-block text-body font-semibold text-ink underline-offset-4 hover:underline">
              {t("faq.all")} →
            </Link>
          </div>
        </Container>
      </section>

      {/* ── Guides (config/seo.ts GUIDES) ─────────────────────────────────── */}
      <section aria-labelledby="landing-guides" className="mt-(--space-section)">
        <Container className="explore-width">
          <div className="max-w-[720px]">
            <h2 id="landing-guides" className="text-section text-ink">
              {t("guides.title")}
            </h2>
            <ul className="mt-6 border-t border-ink/10">
              {GUIDES.map((g) => (
                <li key={g.slug} className="border-b border-ink/10">
                  <Link href={`/guides/${g.slug}`} className="flex min-h-11 items-center justify-between gap-4 py-3 text-body-lg font-semibold text-ink hover:underline">
                    {tGuides(`${g.id}.title` as "villaSolo.title")}
                    <span aria-hidden className="text-muted">→</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/guides" className="mt-6 inline-block text-body font-semibold text-ink underline-offset-4 hover:underline">
              {t("guides.all")} →
            </Link>
          </div>
        </Container>
      </section>

      {/* ── The end ───────────────────────────────────────────────────────── */}
      <section aria-labelledby="landing-closing" className="mt-(--space-section)">
        <Container className="explore-width">
          <div className="flex flex-col items-center text-center">
            <h2 id="landing-closing" className="text-section text-ink">
              {tPhase("closingTitle")}
            </h2>
            <p className="mt-3 max-w-[48ch] text-body-lg text-muted">{tPhase("closingText")}</p>
            <div className="mt-8 flex w-full justify-center">
              {rules.closing === "waitlist" ? (
                <WaitlistField from="landingEnd" />
              ) : (
                <Link href="/explore" className={buttonStyles("primary", "md")}>
                  {t("exploreAll")}
                </Link>
              )}
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
