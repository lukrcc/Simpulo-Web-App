"use client";

import { ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useSyncExternalStore } from "react";
import { HouseCard } from "@/components/HouseCard";
import { FullBleedSection } from "@/components/ui/FullBleedSection";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Shelf } from "@/components/ui/Shelf";
import { CONTACT_EMAIL } from "@/config/contact";
import { FAQ } from "@/config/faq";
import { stayExample } from "@/config/policies";
import { isListedStay } from "@/lib/launch";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StepScene, type Role } from "./StepScenes";

/** Text and content at most 1120px, flush left with the header logo; only the shelf runs the full width. */
const CONTENT = "max-w-[1120px]";
const noSubscribe = () => () => {};
/** The shelf: one House per vibe first, in this order, then any other open ones. */
const ROW_VIBES = ["party", "founder", "surf-water", "social", "culture", "fitness", "creator", "remote-work"];
const ROW_SIZE = 8;
const MIN_ROW = 3;

/**
 * /how-it-works – compact, the same for visitors (nav) and members (footer): "I want to join · I want to host" (?role=host picks host,
 * read after hydration), three steps in one row, each under a small scene built from the real pieces (one under the other below 768px),
 * "What it costs" as the page's one dark block (config/policies.ts), "Houses people opened" (a shelf of HouseCards, the only full-width
 * part) and Questions in two columns (config/faq.ts). Everything else at most 1120px, flush left with the logo.
 */
export function HowItWorks() {
  const t = useTranslations("howItWorks");
  const params = useSearchParams();
  const router = useRouter();
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const [picked, setPicked] = useState<Role | null>(null);
  const role: Role = picked ?? (hydrated && params.get("role") === "host" ? "host" : "join");
  const store = useStore();
  const stays = useMemo(() => {
    const open = store.stays.filter((s) => isListedStay(s) && s.acceptingRequests);
    const picked = ROW_VIBES.map((vibe) => open.find((s) => s.vibe === vibe)).filter((s): s is Stay => !!s);
    return [...picked, ...open.filter((s) => !picked.includes(s))].slice(0, ROW_SIZE);
  }, [store.stays]);
  // The scenes' Houses: ones with a cover that aren't in the shelf's first cards.
  const sceneStays = stays.slice(-2);

  function choose(next: Role) {
    setPicked(next);
    router.replace(next === "host" ? "/how-it-works?role=host" : "/how-it-works", { scroll: false });
  }

  const steps = role === "join" ? (["join1", "join2", "join3"] as const) : (["host1", "host2", "host3"] as const);

  return (
    <>
      <div className={cn(CONTENT, "mt-8")}>
        <div className="max-w-sm">
          <SegmentedControl
            label={t("roleLabel")}
            value={role}
            onChange={choose}
            options={[
              { value: "join", label: t("roleJoin") },
              { value: "host", label: t("roleHost") },
            ]}
          />
        </div>

        {/* Three steps in one row: a small scene over each (real pieces in miniature), a large muted number, the title, one sentence. */}
        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((key, i) => (
            <li key={i}>
              <StepScene step={i as 0 | 1 | 2} role={role} stays={sceneStays} />
              <p className="mt-6 text-h1 tabular-nums text-ink/30">{i + 1}</p>
              <h2 className="mt-4 text-h3 text-ink">{t(`${key}Title`)}</h2>
              <p className="mt-2 max-w-[360px] text-body text-muted">{t(`${key}Text`)}</p>
            </li>
          ))}
        </ol>
      </div>

      <section aria-labelledby="hiw-costs" className={cn(CONTENT, "mt-(--space-section)")}>
        <SectionHeader id="hiw-costs" title={t("costsTitle")} />
        <CostBlock role={role} />
      </section>

      <HousesRow stays={stays} className="mt-(--space-section)" />

      {/* Questions: the title and a way to write us on the left (1/3), the answers on the right (2/3), no panel around them. */}
      <section aria-labelledby="hiw-faq" className={cn(CONTENT, "mt-(--space-section) grid gap-8 md:grid-cols-3 md:gap-10")}>
        <div>
          <h2 id="hiw-faq" className="text-h2 text-ink">
            {t("faqTitle")}
          </h2>
          <a href={`mailto:${CONTACT_EMAIL}`} className="mt-3 inline-block text-body font-semibold text-ink transition-colors hover:text-ink/70">
            {t("faqContact")}
          </a>
        </div>
        <div className="md:col-span-2">
          {FAQ[role].map((item) => (
            <details key={`${role}-${item.question}`} className="group border-b border-ink/10 first:border-t">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 text-body font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="max-w-[640px] pb-5 text-body text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

/**
 * "What it costs", the page's one dark block: the villa as a bar of equal shares (each with a small avatar) and a thin orange piece for
 * the service fee; on the right the share large, the fee muted, the example below. Numbers from config/policies.
 */
function CostBlock({ role }: { role: Role }) {
  const t = useTranslations("howItWorks");
  const store = useStore();
  const example = stayExample();
  const eur = (amount: number) => `€${amount.toLocaleString("en-US")}`;
  const faces = store.users.filter((u) => u.photos[0]).slice(0, example.people);
  const values = { place: example.place, total: eur(example.total), nights: example.nights, people: example.people, share: eur(example.share), fee: eur(example.serviceFee) };
  return (
    <div className="mt-6 rounded-3xl bg-ink px-8 py-10 text-bg md:px-12 md:py-12">
      <div className="grid items-center gap-8 md:grid-cols-[1fr_auto] md:gap-12">
        <div role="img" aria-label={t("costsBar", values)} className="flex h-14 gap-0.5">
          {Array.from({ length: example.people }, (_, i) => (
            <span key={i} className="flex min-w-0 items-center rounded-sm bg-bg/14 px-2 first:rounded-l-xl" style={{ flexGrow: example.share, flexBasis: 0 }}>
              {faces[i] && <PersonPhoto src={faces[i].photos[0]} alt="" size={28} className="size-7 rounded-full" />}
            </span>
          ))}
          <span className="rounded-sm rounded-r-xl bg-accent" style={{ flexGrow: example.serviceFee, flexBasis: 0 }} />
        </div>
        <div className="md:text-right">
          <p className="tabular-nums">
            <span className="text-display text-bg">{eur(example.share)}</span>
            <span className="ml-3 text-body-lg text-bg/60">{t("costsFee", values)}</span>
          </p>
          <p className="mt-2 text-body text-bg/60">{t("costsMeta", values)}</p>
        </div>
      </div>
      <p className="mt-8 text-small text-bg/60">{role === "join" ? t("costsJoinNote") : t("costsHostNote")}</p>
    </div>
  );
}

/** "Houses people opened": up to 8 open Houses across vibes, a shelf of the one HouseCard – all the same size, no focus curve. */
function HousesRow({ stays, className }: { stays: Stay[]; className?: string }) {
  const t = useTranslations("howItWorks");
  const store = useStore();
  if (stays.length < MIN_ROW) return null;
  return (
    <FullBleedSection className={className}>
      <section aria-labelledby="hiw-houses">
        <SectionHeader id="hiw-houses" title={t("housesTitle")} seeAll={{ href: "/", label: t("seeAll"), ariaLabel: t("seeAllLabel") }} />
        <Shelf>
          {stays.map((stay) => (
            <div key={stay.id} className="w-90 shrink-0">
              <HouseCard stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} />
            </div>
          ))}
        </Shelf>
      </section>
    </FullBleedSection>
  );
}
