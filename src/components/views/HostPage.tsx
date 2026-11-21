"use client";

// /host – the page for hosts (CLAUDE.md "Host-Werbeseite"), top to bottom (config/pages.ts): the stage ("Open a House. Bring your
// people.") · how hosting works in four steps · Share or Pro as a table · the example as a numbers strip (config/policies.ts – no number in
// here) · host from your place · Founding Hosts (pre-launch and beta) · safety and support · six host questions · the call: "Apply to host"
// before the launch, otherwise "Open a House". Light page, one dark strip (the numbers).
import { BadgeCheck, CalendarRange, Flag, KeyRound, LifeBuoy, Plus, Sparkles, Sun, UserCheck, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FullBleedSection } from "@/components/ui/FullBleedSection";
import { Container } from "@/components/layout/Container";
import { HOST_APPLY_HREF } from "@/components/platform/useJoinWaitlist";
import { StripFig, StripRow } from "@/components/StripFig";
import { buttonStyles } from "@/components/ui/ActionButton";
import { Img } from "@/components/ui/Img";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FAQ } from "@/config/faq";
import { FOUNDING_PERKS, HOST_PAGE_FAQ, HOST_PAGE_IMAGES, HOST_SAFETY, HOST_STEPS, HOST_TYPE_ROWS } from "@/config/pages";
import { canApplyAsHost, showsFoundingHosts, usePlatformPhase } from "@/config/platform";
import { FEE_MODEL, hostFeeExample, stayExample } from "@/config/policies";
import { useFormat } from "@/i18n/format";

const ICONS: Record<string, LucideIcon> = { Plus, CalendarRange, UserCheck, Sun, BadgeCheck, Sparkles, KeyRound, Wallet, LifeBuoy, Flag };

/** A list of icon + title + sentence (steps, perks, safety). */
function IconList({ items, base, numbered = false, cols = "lg:grid-cols-4" }: { items: readonly { id: string; icon: string }[]; base: (id: string, part: "title" | "text") => string; numbered?: boolean; cols?: string }) {
  return (
    <ol className={`mt-6 grid gap-8 sm:grid-cols-2 ${cols}`}>
      {items.map((item, i) => {
        const Icon = ICONS[item.icon];
        return (
          <li key={item.id} className="flex flex-col gap-2">
            <span className="flex items-center gap-3">
              <Icon aria-hidden className="size-6 text-ink" strokeWidth={1.75} />
              {numbered && <span className="text-small tabular-nums text-muted">{i + 1}</span>}
            </span>
            <h3 className="text-h3 text-ink">{base(item.id, "title")}</h3>
            <p className="text-body text-muted">{base(item.id, "text")}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function HostPage() {
  const t = useTranslations("hostPage");
  const tFaq = useTranslations("faq.items");
  const f = useFormat();
  const phase = usePlatformPhase();
  // Before the launch: apply; afterwards open (logged out, Open a House asks for a login first).
  const cta = canApplyAsHost(phase) ? { href: HOST_APPLY_HREF, label: t("apply") } : { href: "/create", label: t("open") };
  const stay = stayExample();
  const pro = hostFeeExample();
  const eur = (n: number) => f.price(n, "EUR");
  const percent = FEE_MODEL.hostFeeCommissionPercent;

  return (
    <div data-host-page={phase}>
      {/* ── Stage ── */}
      <section aria-labelledby="host-title" className="pt-[clamp(32px,6vw,80px)]">
        <Container className="explore-width">
          <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
            <div className="flex flex-col items-start">
              <p className="text-eyebrow uppercase text-muted">{t(`eyebrow.${phase}`)}</p>
              <h1 id="host-title" className="stage-title mt-3 max-w-[14ch] text-ink">
                {t("title")}
              </h1>
              <p className="mt-4 max-w-[46ch] text-body-lg text-muted">{t("sentence")}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={cta.href} className={buttonStyles("primary", "md")}>
                  {cta.label}
                </Link>
                <a href="#host-how" className={buttonStyles("secondary", "md")}>
                  {t("howLink")}
                </a>
              </div>
            </div>
            <div className="relative aspect-4/5 w-full overflow-hidden rounded-[24px] bg-ink/6 max-md:aspect-4/3">
              <Img src={HOST_PAGE_IMAGES.stage} alt="" fill sizes="(min-width: 744px) 40vw, 100vw" className="object-cover" priority />
            </div>
          </div>
        </Container>
      </section>

      {/* ── How hosting works ── */}
      <section aria-labelledby="host-how" id="host-how" className="mt-(--space-section) scroll-mt-[calc(var(--header-total)+24px)]">
        <Container className="explore-width">
          <SectionHeader variant="explore" id="host-how-title" eyebrow={t("how.eyebrow")} title={t("how.title")} />
          <IconList items={HOST_STEPS} numbered base={(id, part) => t(`how.steps.${id}.${part}` as "how.steps.open.title")} />
        </Container>
      </section>

      {/* ── Share or Pro ── */}
      <section aria-labelledby="host-types" className="mt-(--space-section)">
        <Container className="explore-width">
          <SectionHeader variant="explore" id="host-types" eyebrow={t("types.eyebrow")} title={t("types.title")} />
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[min(100%,560px)] table-fixed border-collapse text-left text-body">
              <thead>
                <tr className="border-b border-ink/10 align-bottom">
                  <th className="w-[28%] py-3 pr-4 font-normal" />
                  <th className="py-3 pr-4">
                    <span className="block text-h3 text-ink">{t("types.share")}</span>
                    <span className="block text-small font-normal text-muted">{t("types.shareSub")}</span>
                  </th>
                  <th className="py-3">
                    <span className="block text-h3 text-ink">{t("types.pro")}</span>
                    <span className="block text-small font-normal text-muted">{t("types.proSub")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {HOST_TYPE_ROWS.map((row) => (
                  <tr key={row} className="border-b border-ink/10 align-top">
                    <th scope="row" className="py-3 pr-4 text-small font-semibold text-muted">
                      {t(`types.rows.${row}.label`)}
                    </th>
                    <td className="py-3 pr-4 text-ink">{t(`types.rows.${row}.share`, { percent })}</td>
                    <td className="py-3 text-ink">{t(`types.rows.${row}.pro`, { percent })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {/* ── The example as a numbers strip (config/policies.ts STAY_EXAMPLE, HOST_FEE_EXAMPLE, FEE_MODEL) ── */}
      <section aria-labelledby="host-example" className="mt-(--space-section)">
        <Container className="explore-width">
          <SectionHeader variant="explore" id="host-example" eyebrow={t("example.eyebrow")} title={t("example.title")} />
        </Container>
        <FullBleedSection inner="explore-width" padding="py-8 md:py-10" className="ember ember-strip mt-6">
          <StripRow className="gap-y-4">
            <StripFig value={eur(stay.total)} label={t("example.place", { place: stay.place, nights: stay.nights })} />
            <StripFig value={stay.people} label={t("example.people")} />
            <StripFig value={eur(stay.share)} label={t("example.share")} />
            <StripFig value={`+${eur(stay.serviceFee)}`} label={t("example.fee")} />
          </StripRow>
          <StripRow className="mt-6 gap-y-4 border-t border-ink/12 pt-6">
            <StripFig value={eur(pro.total)} label={t("example.pro", { perGuest: eur(pro.perGuest), guests: pro.guests })} />
            <StripFig value={`−${eur(pro.kept)}`} label={t("example.simpulo", { percent: pro.percent })} />
            <StripFig value={eur(pro.earned)} label={t("example.earn")} />
          </StripRow>
        </FullBleedSection>
      </section>

      {/* ── Host from your place ── */}
      <section aria-labelledby="host-home" className="mt-(--space-section)">
        <Container className="explore-width">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="flex flex-col items-start md:order-2">
              <p className="text-eyebrow uppercase text-muted">{t("home.eyebrow")}</p>
              <h2 id="host-home" className="mt-2 text-section text-ink">
                {t("home.title")}
              </h2>
              <p className="mt-3 max-w-[48ch] text-body-lg text-muted">{t("home.text")}</p>
              <Link href="/help#host-at-home" className="mt-4 text-body font-semibold text-ink underline-offset-4 hover:underline">
                {t("home.link")} →
              </Link>
            </div>
            <div className="relative aspect-4/3 overflow-hidden rounded-[24px] bg-ink/6">
              <Img src={HOST_PAGE_IMAGES.home} alt="" fill sizes="(min-width: 744px) 50vw, 100vw" className="object-cover" />
            </div>
          </div>
        </Container>
      </section>

      {/* ── Founding Hosts (pre-launch and beta) ── */}
      {showsFoundingHosts(phase) && (
        <section aria-labelledby="host-founding" className="mt-(--space-section)">
          <Container className="explore-width">
            <SectionHeader variant="explore" id="host-founding" eyebrow={t("founding.eyebrow")} title={t("founding.title")} subline={t("founding.text")} />
            <IconList items={FOUNDING_PERKS} cols="lg:grid-cols-3" base={(id, part) => t(`founding.perks.${id}.${part}` as "founding.perks.badge.title")} />
          </Container>
        </section>
      )}

      {/* ── Safety and support ── */}
      <section aria-labelledby="host-safety" className="mt-(--space-section)">
        <Container className="explore-width">
          <SectionHeader variant="explore" id="host-safety" eyebrow={t("safety.eyebrow")} title={t("safety.title")} />
          <IconList items={HOST_SAFETY} base={(id, part) => t(`safety.items.${id}.${part}` as "safety.items.decide.title")} />
          <Link href="/safety#safety-hosts" className="mt-6 inline-block text-body font-semibold text-ink underline-offset-4 hover:underline">
            {t("safety.link")} →
          </Link>
        </Container>
      </section>

      {/* ── Six host questions ── */}
      <section aria-labelledby="host-faq" className="mt-(--space-section)">
        <Container className="explore-width">
          <div className="max-w-[720px]">
            <h2 id="host-faq" className="text-section text-ink">
              {t("faq.title")}
            </h2>
            <ul className="mt-6 border-t border-ink/10">
              {HOST_PAGE_FAQ.map(({ role, id }) => {
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
            <Link href="/help?cat=hosting" className="mt-6 inline-block text-body font-semibold text-ink underline-offset-4 hover:underline">
              {t("faq.all")} →
            </Link>
          </div>
        </Container>
      </section>

      {/* ── The call ── */}
      <section aria-labelledby="host-cta" className="mt-(--space-section)">
        <Container className="explore-width">
          <div className="flex flex-col items-center text-center">
            <h2 id="host-cta" className="text-section text-ink">
              {t(`cta.title.${phase}`)}
            </h2>
            <p className="mt-3 max-w-[48ch] text-body-lg text-muted">{t(`cta.text.${phase}`)}</p>
            <Link href={cta.href} className={`${buttonStyles("primary", "md")} mt-8`}>
              {cta.label}
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
