"use client";

import { BackLink } from "@/components/ui/BackButton";
import { ArrowLeft, ArrowRight, CalendarClock, Check, Download, Info, MapPin, Trophy, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { againHref } from "@/components/create/model";
import { Container } from "@/components/layout/Container";
import { PayoutSetupSheet, useStartOnboarding } from "@/components/payouts/PayoutSetup";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { IconButton } from "@/components/ui/IconButton";
import { Img } from "@/components/ui/Img";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { FullBleedSection } from "@/components/ui/FullBleedSection";
import { placeImageOf } from "@/config/place-images";
import { cityPlaceIdOf } from "@/lib/data/places";
import { HOST_POLICY } from "@/config/policies";
import { useFormat } from "@/i18n/format";
import { earningsCsv, earningsFor, type EarningRow, type Earnings } from "@/lib/earnings";
import { useFeatureFlag } from "@/lib/featureFlags";
import { hostStatsFor, monthlySeries, trendPercent, type HostStats, type Series } from "@/lib/hostStats";
import { hostManageHref } from "@/lib/houseTasks";
import { usePayoutAccount } from "@/lib/payments/hooks";
import { convertApprox } from "@/lib/rates";
import { shortNameOf } from "@/lib/shortName";
import { useStore } from "@/lib/store";
import type { Currency } from "@/lib/types";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { cn, housePhotos } from "@/lib/utils";

const CHART_HEIGHT = 200;
const COUNT_MS = 800;

/**
 * /your-houses/payouts – a host's dashboard, by host type (lib/hostStats.ts). Payouts (the crew's money for the place, passed on) and host
 * fees (the host's real earnings) are always named apart. Every amount in the viewer's currency; a House in another currency shows its own
 * amount small under it in the table.
 */
export function PayoutsPage() {
  const t = useTranslations("houses.earnings");
  return (
    <RequireLogin title={t("loginTitle")}>
      <PayoutsContent />
    </RequireLogin>
  );
}

/** Counts up from 0 to `target` (800ms, ease-out) once it's known; with reduced motion straight to it. */
function useCountUp(target: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      frame = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(frame);
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

/** Amounts in EUR (the sums) or a House's own currency, shown in the viewer's. */
function useMoney() {
  const f = useFormat();
  const viewer = usePreferredCurrency();
  return useMemo(() => {
    const to = (amount: number, from: Currency) => Math.round(convertApprox(amount, from, viewer));
    return {
      viewer,
      eur: (amount: number) => f.price(to(amount, "EUR"), viewer),
      of: (amount: number, from: Currency) => f.price(to(amount, from), viewer),
      /** The House's own amount, when it isn't the viewer's currency ("IDR 16,800,000") */
      original: (amount: number, from: Currency) => (from === viewer ? null : f.price(Math.round(amount), from)),
    };
  }, [f, viewer]);
}

function PayoutsContent() {
  const t = useTranslations("houses.earnings");
  const tHouses = useTranslations("houses");
  const store = useStore();
  const me = store.currentUserId!;
  const shareScenario = useFeatureFlag("simulateShareHost");
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const earnings = useMemo(() => earningsFor(store, me, today, { withoutHostFees: shareScenario }), [store, me, today, shareScenario]);
  const stats = useMemo(() => hostStatsFor(store, earnings, me, today, shareScenario), [store, earnings, me, today, shareScenario]);
  const pro = stats.type === "pro";
  const { status } = usePayoutAccount();
  const [setup, setSetup] = useState(false);
  return (
    <>
      {/* The way back left, the ONE payout state right (C1). */}
      <Container className="pt-6 md:pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackLink href="/your-houses" className={buttonStyles("tertiary", "sm", "-ml-4")}>
            <ArrowLeft aria-hidden />
            {tHouses("title")}
          </BackLink>
          <AccountState onSetUp={() => setSetup(true)} />
        </div>
        <h1 className="sr-only">{t("title")}</h1>
      </Container>
      <EarningsStrip stats={stats} earnings={earnings} pro={pro} missing={status === "none"} />
      <Container className="pb-(--space-section)">
        {/* A share host: the nudge as one line, no card. */}
        {!pro && (
          <p className="mt-6 text-body text-muted">
            {t("strip.leadQuestion")}{" "}
            <Link href="/create?step=price" className="font-semibold text-ink underline-offset-4 hover:underline">
              {t("strip.leadLink")} →
            </Link>
          </p>
        )}
        {/* Under the strip, right on the page: sections apart by 1px lines ink 8 %, no boxes. */}
        <div className="mt-10 flex flex-col [&>*+*]:border-t [&>*+*]:border-ink/8 [&>*]:py-10 [&>*:first-child]:pt-0">
          <Progress stats={stats} />
          {earnings.rows.length > 0 && <MonthChart earnings={earnings} today={today} pro={pro} />}
          {earnings.rows.length > 0 && (
            <div>
              <PayoutsTable earnings={earnings} pro={pro} />
              {/* C4: a small footnote under the table. */}
              <p className="mt-4 text-small text-muted">{t("taxNote")}</p>
            </div>
          )}
        </div>
      </Container>
      <PayoutSetupSheet open={setup} onClose={() => setSetup(false)} />
    </>
  );
}

/** C1: exactly one payout state, top right – ready: "Bank ••1234 · Edit"; missing: the button "Set up payouts"; action needed: an orange dot and
 *  "Verify identity"; while Stripe checks: one quiet line. */
function AccountState({ onSetUp }: { onSetUp: () => void }) {
  const t = useTranslations("houses.earnings");
  const { status, last4 } = usePayoutAccount();
  const { start, busy } = useStartOnboarding();
  if (status === "none") {
    return (
      <Button variant="primary" size="sm" onClick={onSetUp}>
        {t("accountSetUp")}
      </Button>
    );
  }
  if (status === "action_required") {
    return (
      <button type="button" onClick={start} disabled={busy} className="inline-flex items-center gap-2 text-small font-semibold text-ink underline-offset-4 hover:underline">
        <span aria-hidden className="size-2 rounded-full bg-accent" />
        {t("strip.verify")}
      </button>
    );
  }
  if (status === "pending") return <p className="text-small text-muted">{t("strip.checking")}</p>;
  return (
    <p className="flex items-center gap-2 text-small text-muted">
      <span className="text-ink">{t("bank", { last4: last4 ?? "1234" })}</span>·
      <button type="button" onClick={start} disabled={busy} className="font-semibold text-ink underline-offset-4 hover:underline">
        {t("accountEdit")}
      </button>
    </p>
  );
}

/**
 * The dark strip (`.ember.ember-strip`, the window's full width, hard edges, the content on the grid, as high as its content): left (~45 %)
 * "EARNINGS THIS YEAR" + the trend capsule, the number 72px (text-figure), "€83 per guest · 15 guests" and small "Rent passed on this year:
 * €6,480 ⓘ"; right three figures side by side, 1px cream 12 % between them, no tiles – Next payout (the amount and its date; payouts not set
 * up: "Set up to get €…"), Fill rate, Repeat guests: 40px cream, labels cream 65 %. No sparkline (the chart below says it). A share host or no
 * earnings: "€0 earned · €… rent passed on", without Houses "Your first payout comes the day after check-in" – never "0 people · 0 % full".
 * Phones: one column, the figures 2 × 2.
 */
function EarningsStrip({ stats, earnings, pro, missing }: { stats: HostStats; earnings: Earnings; pro: boolean; missing: boolean }) {
  const t = useTranslations("houses.earnings");
  const tPro = useTranslations("houses.earnings.pro");
  const f = useFormat();
  const money = useMoney();
  const value = useCountUp(pro ? stats.earningsThisYear : 0);
  const trend = pro ? trendPercent(stats.earningsThisYear, stats.earningsLastYear) : null;
  const next = earnings.next;
  const figures: { key: string; value: string; label: string }[] = [
    ...(next
      ? [missing ? { key: "next", value: t("strip.setUpToGet", { amount: money.eur(next.amount) }), label: t("strip.nextPayout") } : { key: "next", value: money.eur(next.amount), label: `${t("strip.nextPayout")} · ${f.day(next.date)}` }]
      : []),
    ...(stats.houses > 0 ? [{ key: "fill", value: `${Math.round(stats.fillRate * 100)} %`, label: tPro("fillRate") }] : []),
    ...(stats.repeatGuests > 0 ? [{ key: "repeat", value: String(stats.repeatGuests), label: tPro("repeatGuests") }] : []),
  ];
  return (
    <FullBleedSection inner="" padding="py-10" className="ember ember-strip mt-6">
      <div className="grid gap-8 split:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] split:items-center">
        <section aria-labelledby="earnings-year" className="min-w-0">
          {pro ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <h2 id="earnings-year" className="text-eyebrow uppercase text-muted">
                  {tPro("earningsThisYear")}
                </h2>
                {trend !== null && (
                  <span className="rounded-full bg-ink/12 px-2.5 py-0.5 text-small font-semibold tabular-nums text-ink">
                    {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)} %
                  </span>
                )}
              </div>
              <p className="mt-2 text-figure tabular-nums text-ink">{money.eur(Math.round(value))}</p>
              {stats.feeGuestsThisYear > 0 && <p className="mt-2 text-body text-ink">{tPro("perGuest", { amount: money.eur(stats.perGuest), guests: stats.feeGuestsThisYear })}</p>}
              <p className="mt-1 flex items-center gap-1 text-small text-muted">
                {tPro("rentPassed", { amount: money.eur(stats.rentThisYear) })}
                <IconButton size="sm" aria-label={tPro("rentPassedInfo")} className="-my-2">
                  <Info aria-hidden className="size-4" />
                </IconButton>
              </p>
            </>
          ) : (
            <>
              <h2 id="earnings-year" className="text-eyebrow uppercase text-muted">
                {tPro("earningsThisYear")}
              </h2>
              <p className="mt-2 text-h1 text-ink">
                {stats.houses > 0 || stats.rentThisYear > 0 ? t("strip.shareLine", { earned: money.eur(0), rent: money.eur(stats.rentThisYear) }) : t("strip.firstPayout")}
              </p>
            </>
          )}
        </section>
        {figures.length > 0 && (
          <dl className="grid grid-cols-2 gap-6 split:flex split:gap-0 split:divide-x split:divide-ink/12">
            {figures.map((fig) => (
              <div key={fig.key} className="min-w-0 split:flex-1 split:px-8 split:first:pl-0 split:last:pr-0">
                <dd className={cn("tabular-nums text-ink", fig.value.length > 12 ? "text-h3" : "text-h1")}>{fig.value}</dd>
                <dt className="mt-1 text-small text-muted">{fig.label}</dt>
              </div>
            ))}
          </dl>
        )}
      </div>
    </FullBleedSection>
  );
}

/**
 * B1: the progress, two columns with a line between them, no cards – left "Top Host" (the dots, "1 more full House to Top Host", "Best House"
 * as a text line, how fast the Houses fill); right "Do it again" (photo 56px, text, arrow) and who joined twice.
 */
function Progress({ stats }: { stats: HostStats }) {
  const t = useTranslations("houses.earnings");
  const tTop = useTranslations("houses.earnings.topHost");
  const tIn = useTranslations("houses.earnings.insights");
  const money = useMoney();
  const goal = HOST_POLICY.topHostFullHouses;
  const done = Math.min(goal, stats.fullThisYear);
  const best = stats.best;
  const again = stats.againStay;
  const photo = again ? housePhotos(again)[0] : undefined;
  return (
    <section aria-labelledby="top-host" className="grid gap-8 md:grid-cols-2 md:gap-0 md:divide-x md:divide-ink/8">
      <div className="flex min-w-0 flex-col gap-2 md:pr-10">
        <h2 id="top-host" className="flex items-center gap-2 text-subhead text-ink">
          <Trophy aria-hidden className="size-5 text-ink/60" />
          {tTop("title")}
        </h2>
        <div className="mt-1 flex gap-1.5" role="img" aria-label={tTop("dots", { done, goal })}>
          {Array.from({ length: goal }, (_, i) => (
            <span key={i} className={cn("size-3 rounded-full", i < done ? "bg-accent" : "bg-ink/12")} />
          ))}
        </div>
        <p className="text-body text-ink">{stats.topHost ? tTop("reached") : done >= goal ? tTop("answerRate", { percent: Math.round(HOST_POLICY.topHostResponseRate * 100) }) : tTop("missing", { count: goal - done })}</p>
        {best && <p className="text-small text-muted">{t("strip.best", { name: best.row.stay ? shortNameOf(best.row.stay) : best.row.title, amount: money.eur(best.amount) })}</p>}
        {stats.daysToFill !== null && (
          <p className="flex items-center gap-2 text-small text-muted">
            <CalendarClock aria-hidden className="size-4" />
            {tIn("daysToFill", { days: stats.daysToFill })}
          </p>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-3 md:pl-10">
        {again && (
          <Link href={againHref(again.id)} className="group flex items-center gap-4 rounded-2xl">
            <span className="relative block size-14 shrink-0 overflow-hidden rounded-2xl bg-ink/6">{photo && <Img src={photo} alt="" fill sizes="56px" className="object-cover" />}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-subhead text-ink">{t("again")}</span>
              <span className="block truncate text-small text-muted">{t("againText", { name: shortNameOf(again) })}</span>
            </span>
            <ArrowRight aria-hidden className="size-4 text-ink/50 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        )}
        {stats.repeatGuests > 0 && (
          <p className="flex items-center gap-2 text-small text-muted">
            <Users aria-hidden className="size-4" />
            {tIn("twice", { count: stats.repeatGuests })}
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * B2: per month, right on the page, the grid's full width. A pro host switches between Earnings (orange) and Rent passed on; a share host only
 * has the rent (neutral). The switches are capsule groups (ui/CapsuleGroup: the chosen one an ink outline capsule, no black fill). Bars with
 * an orange gradient, the current month full, empty months a thin line; they grow in staggered (40ms). 12 months · All time.
 */
function MonthChart({ earnings, today, pro }: { earnings: Earnings; today: string; pro: boolean }) {
  const t = useTranslations("houses.earnings.chart");
  const formatter = useFormatter();
  const money = useMoney();
  const [series, setSeries] = useState<Series>(pro ? "earnings" : "rent");
  const [range, setRange] = useState<"year" | "all">("year");
  const shownSeries: Series = pro ? series : "rent";
  const months = useMemo(() => monthlySeries(earnings, today, shownSeries, range), [earnings, today, shownSeries, range]);
  const max = Math.max(1, ...months.map((m) => m.amount));
  const orange = shownSeries === "earnings";
  return (
    <section aria-labelledby="earnings-months">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="earnings-months" className="text-subhead text-ink">
          {t("title")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {pro && (
            <CapsuleGroup
              label={t("series")}
              size="sm"
              value={series}
              onChange={setSeries}
              options={[
                { value: "earnings", content: t("earnings") },
                { value: "rent", content: t("rent") },
              ]}
            />
          )}
          <CapsuleGroup
            label={t("range")}
            size="sm"
            value={range}
            onChange={setRange}
            options={[
              { value: "year", content: t("year") },
              { value: "all", content: t("all") },
            ]}
          />
        </div>
      </div>
      {/* The key replays the growth when the series or the range changes. */}
      <div key={`${shownSeries}-${range}`} className="mt-6 flex items-end gap-1.5" style={{ height: CHART_HEIGHT }}>
        {months.map(({ month, amount, houses }, i) => {
          const date = new Date(`${month}-01T00:00:00Z`);
          const current = i === months.length - 1;
          const label = [formatter.dateTime(date, { month: "long", year: "numeric", timeZone: "UTC" }), money.eur(amount), houses.join(", ")].filter(Boolean).join(" · ");
          return (
            <button key={month} type="button" aria-label={label} data-tooltip={label} className="group flex h-full min-w-0 flex-1 items-end justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)">
              {amount > 0 ? (
                <span
                  className="bar-grow block w-full max-w-12 origin-bottom rounded-t-md transition-[filter] duration-150 group-hover:brightness-95"
                  style={{
                    height: Math.max(6, Math.round((amount / max) * CHART_HEIGHT)),
                    animationDelay: `${i * 40}ms`,
                    background: orange
                      ? current
                        ? "var(--signal)"
                        : "linear-gradient(to bottom, var(--signal), color-mix(in srgb, var(--signal) 55%, transparent))"
                      : current
                        ? "var(--text)"
                        : "color-mix(in srgb, var(--text) 20%, transparent)",
                  }}
                />
              ) : (
                <span className="block h-0.5 w-full max-w-12 rounded-full bg-ink/12" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5">
        {months.map(({ month }) => {
          const date = new Date(`${month}-01T00:00:00Z`);
          return (
            <span key={month} className="flex min-w-0 flex-1 flex-col items-center text-center">
              <span className="truncate text-small text-muted">{formatter.dateTime(date, { month: "short", timeZone: "UTC" })}</span>
              {month.endsWith("-01") && <span className="text-eyebrow text-ink/40">{month.slice(0, 4)}</span>}
            </span>
          );
        })}
      </div>
    </section>
  );
}

/** B3: the status in words, no capsules – Paid: muted with a check; Pending: an orange dot; Scheduled: muted with a clock. */
function StatusText({ status }: { status: EarningRow["status"] }) {
  const t = useTranslations("houses.earnings.status");
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-small", status === "pending" ? "font-semibold text-ink" : "text-muted")}>
      {status === "paid" && <Check aria-hidden className="size-3.5" strokeWidth={2.5} />}
      {status === "pending" && <span aria-hidden className="size-2 rounded-full bg-accent" />}
      {status === "scheduled" && <CalendarClock aria-hidden className="size-3.5" />}
      {t(status)}
    </span>
  );
}

/** A row's picture: the House's photo; without one the place's photo (config/place-images.ts, from the House's city or the title's place); else a pin. */
function RowPhoto({ row }: { row: EarningRow }) {
  const house = row.stay ? housePhotos(row.stay)[0] : undefined;
  const words = row.title.split(/\s+/);
  const fromTitle = words.map((_, i) => cityPlaceIdOf(words.slice(i).join(" "))).find(Boolean) ?? null;
  const placeId = row.stay ? cityPlaceIdOf(row.stay.location.city || row.stay.city || "") : fromTitle;
  const photo = house ?? (placeId ? placeImageOf(placeId) : null);
  return (
    <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-ink/6 text-muted">
      {photo ? <Img src={photo} alt="" fill sizes="40px" className="object-cover" /> : <MapPin aria-hidden className="size-4" />}
    </span>
  );
}

/**
 * B3: the table right on the page (no card), row lines ink 8 %. Pro host: House · Dates · Guests · Host fee · Simpulo fee · Your earnings ·
 * Rent passed on · Paid on · Status. Share host: House · Dates · Guests · Rent passed on · Paid on · Status. Rows open the House; "Export CSV"
 * top right. Phones: a list instead of the table.
 */
function PayoutsTable({ earnings, pro }: { earnings: Earnings; pro: boolean }) {
  const t = useTranslations("houses.earnings");
  const f = useFormat();
  const money = useMoney();
  const router = useRouter();

  function exportCsv() {
    const blob = new Blob([earningsCsv(earnings)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simpulo-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = pro ? (["house", "dates", "guests", "hostFee", "simpuloFee", "yourEarnings", "rentPassed", "paidOn", "status"] as const) : (["house", "dates", "guests", "rentPassed", "paidOn", "status"] as const);
  const right = new Set<string>(["guests", "hostFee", "simpuloFee", "yourEarnings", "rentPassed"]);
  /** An amount of the row in the viewer's currency – the House's own small under it when that's another one. */
  const amount = (value: number, row: EarningRow, strong = false, sign = "") => {
    const original = money.original(value, row.currency);
    return (
      <>
        <span className={cn("block", strong && "font-semibold")}>{value > 0 ? `${sign}${money.of(value, row.currency)}` : "—"}</span>
        {value > 0 && original && <span className="block text-small text-muted">{`${sign}${original}`}</span>}
      </>
    );
  };
  return (
    <section aria-labelledby="earnings-payouts">
      <div className="flex items-center justify-between gap-4">
        <h2 id="earnings-payouts" className="text-subhead text-ink">
          {t("payouts")}
        </h2>
        <Button variant="secondary" size="sm" onClick={exportCsv}>
          <Download aria-hidden />
          {t("export")}
        </Button>
      </div>
      {/* Phones: a list – photo, title, dates, the amount, the status. */}
      <ul className="mt-4 divide-y divide-ink/8 border-t border-ink/8 md:hidden">
        {earnings.rows.map((row) => {
          const href = row.stay ? hostManageHref(row.stay) : null;
          const body = (
            <span className="flex items-center gap-3 py-3">
              <RowPhoto row={row} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold text-ink">{row.title}</span>
                <span className="block truncate text-small text-muted">{f.stayDatesLong({ startDate: row.startDate, endDate: row.endDate })}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-0.5 text-right tabular-nums">
                <span className="text-body font-semibold text-ink">{money.of(pro ? row.hostEarnings : row.rentPassed, row.currency)}</span>
                <StatusText status={row.status} />
              </span>
            </span>
          );
          return <li key={row.id}>{href ? <Link href={href}>{body}</Link> : body}</li>;
        })}
      </ul>
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className={cn("w-full text-left", pro ? "min-w-[1040px]" : "min-w-[720px]")}>
          <thead>
            <tr className="text-small text-muted">
              {columns.map((key) => (
                <th key={key} scope="col" className={cn("pb-2 pr-4 font-medium last:pr-0", right.has(key) && "text-right")}>
                  {t(`columns.${key}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/8 border-t border-ink/8 text-body text-ink">
            {earnings.rows.map((row) => {
              const href = row.stay ? hostManageHref(row.stay) : null;
              return (
                <tr key={row.id} onClick={href ? () => router.push(href) : undefined} className={cn("align-middle [&>td]:py-3 [&>td]:pr-4 [&>td:last-child]:pr-0", href && "cursor-pointer transition-colors duration-150 hover:bg-ink/3")}>
                  <td className="max-w-72">
                    <span className="flex min-w-0 items-center gap-3">
                      <RowPhoto row={row} />
                      {href ? (
                        <Link href={href} onClick={(e) => e.stopPropagation()} className="truncate font-semibold hover:underline">
                          {row.title}
                        </Link>
                      ) : (
                        <span className="truncate font-semibold">{row.title}</span>
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-muted">{f.stayDatesLong({ startDate: row.startDate, endDate: row.endDate })}</td>
                  <td className="text-right tabular-nums">{row.guests}</td>
                  {pro && <td className="text-right tabular-nums">{amount(row.hostFee, row)}</td>}
                  {pro && <td className="text-right tabular-nums text-muted">{amount(row.fee, row, false, "−")}</td>}
                  {pro && <td className="text-right tabular-nums">{amount(row.hostEarnings, row, true)}</td>}
                  <td className="text-right tabular-nums">{amount(row.rentPassed, row, !pro)}</td>
                  <td className="whitespace-nowrap text-muted">{row.status === "pending" ? "—" : f.day(row.payoutDate)}</td>
                  <td>
                    <StatusText status={row.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
