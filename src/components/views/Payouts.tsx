"use client";

import { ArrowLeft, ArrowRight, CalendarClock, Download, Gauge, Info, Repeat, Sparkles, Trophy, Users, type LucideIcon } from "lucide-react";
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
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { HOST_POLICY } from "@/config/policies";
import { useFormat } from "@/i18n/format";
import { earningsCsv, earningsFor, type EarningRow, type Earnings } from "@/lib/earnings";
import { useFeatureFlag } from "@/lib/featureFlags";
import { hostStatsFor, monthlySeries, trendPercent, type HostStats, type Series } from "@/lib/hostStats";
import { hostManageHref } from "@/lib/houseTasks";
import { usePayoutAccount } from "@/lib/payments/hooks";
import { useBalance } from "@/lib/payments/usePayouts";
import { convertApprox } from "@/lib/rates";
import { shortNameOf } from "@/lib/shortName";
import { useStore } from "@/lib/store";
import type { Currency, Stay } from "@/lib/types";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { cn, housePhotos } from "@/lib/utils";

const SECTION_TITLE = "text-eyebrow uppercase text-ink/55";
/** Every surface on this page: the one light card (rule 8). */
const CARD = "rounded-[20px] bg-(--card) p-6";
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
  return (
    <Container className="pb-(--space-section) pt-6 md:pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/your-houses" className={buttonStyles("tertiary", "sm", "-ml-4")}>
          <ArrowLeft aria-hidden />
          {tHouses("title")}
        </Link>
        <AccountLine earnings={earnings} />
      </div>
      <h1 className="sr-only">{t("title")}</h1>
      <div className="mt-6 flex flex-col gap-5">
        {pro ? <ProHead stats={stats} earnings={earnings} today={today} /> : <ShareHead stats={stats} />}
        <div className="grid gap-5 lg:grid-cols-2">
          <TopHostCard stats={stats} />
          {stats.againStay && <AgainCard stay={stats.againStay} />}
        </div>
        <Insights stats={stats} />
        {earnings.rows.length > 0 && <ChartCard earnings={earnings} today={today} pro={pro} />}
        <PayoutsTable earnings={earnings} pro={pro} />
      </div>
      <p className="mt-4 text-small text-muted">{t("taxNote")}</p>
    </Container>
  );
}

/** E1: the payout account as one small line top right ("Next payout €480 · Feb 13 · Bank ••1234 · Edit"), instead of a card. */
function AccountLine({ earnings }: { earnings: Earnings }) {
  const t = useTranslations("houses.earnings");
  const tPayouts = useTranslations("payouts");
  const f = useFormat();
  const money = useMoney();
  const me = useStore().currentUserId;
  const balance = useBalance(me, earnings);
  const { status, last4 } = usePayoutAccount();
  const { start, busy } = useStartOnboarding();
  const [setup, setSetup] = useState(false);
  const next = balance?.next;
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-small text-muted">
      {next && <span>{t("nextLine", { amount: money.eur(next.amount), date: f.day(next.date) })} ·</span>}
      {status === "active" && (
        <>
          <span className="text-ink">{t("bank", { last4: last4 ?? "1234" })}</span>·
          <button type="button" onClick={start} disabled={busy} className="font-semibold text-ink underline-offset-4 hover:underline">
            {t("accountEdit")}
          </button>
        </>
      )}
      {status === "pending" && <span>{tPayouts("pendingTitle")}</span>}
      {status === "action_required" && (
        <button type="button" onClick={start} disabled={busy} className="font-semibold text-ink underline-offset-4 hover:underline">
          {tPayouts("actionTitle")}
        </button>
      )}
      {status === "none" && (
        <button type="button" onClick={() => setSetup(true)} className="font-semibold text-ink underline-offset-4 hover:underline">
          {t("accountSetUp")}
        </button>
      )}
      <PayoutSetupSheet open={setup} onClose={() => setSetup(false)} />
    </p>
  );
}

/** C: a pro host's head – the Ember card "Earnings this year" (1/2) and four light tiles (1/2); under it, small and apart, the rent passed on. */
function ProHead({ stats, earnings, today }: { stats: HostStats; earnings: Earnings; today: string }) {
  const t = useTranslations("houses.earnings.pro");
  const money = useMoney();
  const value = useCountUp(stats.earningsThisYear);
  const trend = trendPercent(stats.earningsThisYear, stats.earningsLastYear);
  const spark = useMemo(() => monthlySeries(earnings, today, "earnings", "year"), [earnings, today]);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="earnings-year" className="ember flex flex-col rounded-[20px] p-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <h2 id="earnings-year" className="text-eyebrow uppercase text-white/70">
              {t("earningsThisYear")}
            </h2>
            {trend !== null && (
              <span className="rounded-full bg-white/12 px-2.5 py-1 text-small font-semibold tabular-nums text-white">
                {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)} %
              </span>
            )}
          </div>
          <p className="mt-3 text-display tabular-nums">{money.eur(Math.round(value))}</p>
          <Sparkline values={spark.map((m) => m.amount)} />
          {/* The guests line sits at the card's foot when the tiles beside it make the card taller. */}
          {stats.feeGuestsThisYear > 0 && <p className="mt-auto pt-3 text-small text-white/75">{t("perGuest", { amount: money.eur(stats.perGuest), guests: stats.feeGuestsThisYear })}</p>}
        </section>
        <div className="grid grid-cols-2 gap-5">
          <StatTile icon={CalendarClock} label={t("comingUp")} value={stats.comingUp} format={money.eur} />
          <StatTile icon={Gauge} label={t("fillRate")} value={Math.round(stats.fillRate * 100)} format={(n) => `${n} %`} />
          <BestTile stats={stats} />
          <StatTile icon={Repeat} label={t("repeatGuests")} value={stats.repeatGuests} format={(n) => String(n)} />
        </div>
      </div>
      <p className="flex items-center gap-1 text-small text-muted">
        {t("rentPassed", { amount: money.eur(stats.rentThisYear) })}
        <IconButton size="sm" aria-label={t("rentPassedInfo")} className="-my-2">
          <Info aria-hidden className="size-4" />
        </IconButton>
      </p>
    </div>
  );
}

/** 12 months as a line (cream) over an area (orange 20 %) – on the Ember card. */
export function Sparkline({ values, className = "mt-4 h-12 w-full" }: { values: number[]; className?: string }) {
  const w = 240;
  const h = 48;
  const max = Math.max(1, ...values);
  const points = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * w, h - 2 - (v / max) * (h - 6)] as const);
  const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg aria-hidden viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className}>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="rgba(240, 99, 58, 0.2)" />
      <path d={line} fill="none" stroke="rgba(255, 248, 240, 0.9)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** A light tile: icon, a large number that counts up, one or two words. */
function StatTile({ icon: Icon, label, value, format }: { icon: LucideIcon; label: string; value: number; format: (n: number) => string }) {
  const shown = useCountUp(value);
  return (
    <div className={cn(CARD, "flex flex-col justify-between gap-4")}>
      <Icon aria-hidden className="size-5 text-ink/55" />
      <div>
        <p className="text-h2 tabular-nums text-ink">{format(Math.round(shown))}</p>
        <p className="mt-0.5 text-small text-muted">{label}</p>
      </div>
    </div>
  );
}

/** "Best House": its photo, short name and what it brought in. */
function BestTile({ stats }: { stats: HostStats }) {
  const t = useTranslations("houses.earnings.pro");
  const money = useMoney();
  const best = stats.best;
  const shown = useCountUp(best?.amount ?? 0);
  const photo = best?.row.stay ? housePhotos(best.row.stay)[0] : undefined;
  return (
    <div className={cn(CARD, "flex flex-col justify-between gap-4")}>
      <span className="relative block size-10 overflow-hidden rounded-xl bg-ink/6">{photo ? <Img src={photo} alt="" fill sizes="40px" className="object-cover" /> : <Trophy aria-hidden className="m-2.5 size-5 text-ink/55" />}</span>
      <div className="min-w-0">
        <p className="text-h2 tabular-nums text-ink">{best ? money.eur(Math.round(shown)) : "—"}</p>
        <p className="mt-0.5 truncate text-small text-muted">{best ? `${t("bestHouse")} · ${best.row.stay ? shortNameOf(best.row.stay) : best.row.title}` : t("bestHouse")}</p>
      </div>
    </div>
  );
}

/** D: a share host's head – the Ember card "Your Houses" and the nudge to lead the next one with a host fee. */
function ShareHead({ stats }: { stats: HostStats }) {
  const t = useTranslations("houses.earnings.share");
  const houses = useCountUp(stats.houses);
  const people = useCountUp(stats.people);
  const full = useCountUp(Math.round(stats.fullShare * 100));
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section aria-labelledby="your-houses-stats" className="ember flex flex-col justify-between gap-6 rounded-[20px] p-6 text-white">
        <h2 id="your-houses-stats" className="text-eyebrow uppercase text-white/70">
          {t("title")}
        </h2>
        <p className="text-h2 tabular-nums">
          {t("line", { houses: Math.round(houses), people: Math.round(people), full: Math.round(full) })}
        </p>
      </section>
      <section aria-labelledby="lead-next" className={cn(CARD, "flex flex-col items-start gap-3")}>
        <Sparkles aria-hidden className="size-5 text-ink/55" />
        <h2 id="lead-next" className="text-h3 text-ink">
          {t("leadTitle")}
        </h2>
        <p className="text-body text-muted">{t("leadText")}</p>
        <Button href="/create?step=price" variant="secondary" size="md" className="mt-2">
          {t("leadAction")}
        </Button>
      </section>
    </div>
  );
}

/** E2: the badge "Top Host" with five dots (orange per full House this year) and how many are still missing. */
function TopHostCard({ stats }: { stats: HostStats }) {
  const t = useTranslations("houses.earnings.topHost");
  const goal = HOST_POLICY.topHostFullHouses;
  const done = Math.min(goal, stats.fullThisYear);
  return (
    <section aria-labelledby="top-host" className={cn(CARD, "flex items-center gap-5")}>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ink/6 text-ink">
        <Trophy aria-hidden className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="top-host" className="text-body font-semibold text-ink">
          {t("title")}
        </h2>
        <div className="mt-2 flex gap-1.5" role="img" aria-label={t("dots", { done, goal })}>
          {Array.from({ length: goal }, (_, i) => (
            <span key={i} className={cn("size-3 rounded-full", i < done ? "bg-accent" : "bg-ink/12")} />
          ))}
        </div>
        <p className="mt-2 text-small text-muted">{stats.topHost ? t("reached") : done >= goal ? t("answerRate", { percent: Math.round(HOST_POLICY.topHostResponseRate * 100) }) : t("missing", { count: goal - done })}</p>
      </div>
    </section>
  );
}

/** E2: "Do it again" with the photo of the best-filled past House → the Do it again flow. */
function AgainCard({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.earnings");
  const photo = housePhotos(stay)[0];
  return (
    <Link href={againHref(stay.id)} className={cn(CARD, "group flex items-center gap-4 transition-colors duration-150 hover:bg-ink/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)")}>
      <span className="relative block size-14 shrink-0 overflow-hidden rounded-2xl bg-ink/6">{photo && <Img src={photo} alt="" fill sizes="56px" className="object-cover" />}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold text-ink">{t("again")}</span>
        <span className="block truncate text-small text-muted">{t("againText", { name: shortNameOf(stay) })}</span>
      </span>
      <ArrowRight aria-hidden className="size-4 text-ink/40 transition-transform duration-150 group-hover:translate-x-0.5" />
    </Link>
  );
}

/** E3: at most two, only what's true – one line each with an icon. */
function Insights({ stats }: { stats: HostStats }) {
  const t = useTranslations("houses.earnings.insights");
  const lines: { icon: LucideIcon; text: string }[] = [];
  if (stats.daysToFill !== null) lines.push({ icon: CalendarClock, text: t("daysToFill", { days: stats.daysToFill }) });
  if (stats.repeatGuests > 0) lines.push({ icon: Users, text: t("twice", { count: stats.repeatGuests }) });
  if (lines.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {lines.slice(0, 2).map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2.5 text-body text-ink">
          <Icon aria-hidden className="size-4 text-ink/55" />
          {text}
        </li>
      ))}
    </ul>
  );
}

/**
 * F: per month. A pro host switches between Earnings (orange) and Rent passed on; a share host only has the rent (neutral). Bars with an
 * orange gradient, the current month full, empty months a thin line; they grow in staggered (40ms) on showing. 12 months · All time.
 */
function ChartCard({ earnings, today, pro }: { earnings: Earnings; today: string; pro: boolean }) {
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
    <section aria-labelledby="earnings-months" className={CARD}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="earnings-months" className={SECTION_TITLE}>
          {t("title")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {pro && (
            <SegmentedControl
              label={t("series")}
              className="w-68"
              value={series}
              onChange={setSeries}
              options={[
                { value: "earnings", label: t("earnings") },
                { value: "rent", label: t("rent") },
              ]}
            />
          )}
          <SegmentedControl
            label={t("range")}
            className="w-56"
            value={range}
            onChange={setRange}
            options={[
              { value: "year", label: t("year") },
              { value: "all", label: t("all") },
            ]}
          />
        </div>
      </div>
      {/* The key replays the growth when the series or the range changes. */}
      <div key={`${shownSeries}-${range}`} className="mt-5 flex items-end gap-1.5" style={{ height: CHART_HEIGHT }}>
        {months.map(({ month, amount, houses }, i) => {
          const date = new Date(`${month}-01T00:00:00Z`);
          const current = i === months.length - 1;
          const label = [formatter.dateTime(date, { month: "long", year: "numeric", timeZone: "UTC" }), money.eur(amount), houses.join(", ")].filter(Boolean).join(" · ");
          return (
            <button key={month} type="button" aria-label={label} data-tooltip={label} className="group flex h-full min-w-0 flex-1 items-end justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)">
              {amount > 0 ? (
                <span
                  className="bar-grow block w-full max-w-10 origin-bottom rounded-t-md transition-[filter] duration-150 group-hover:brightness-95"
                  style={{
                    height: Math.max(6, Math.round((amount / max) * CHART_HEIGHT)),
                    animationDelay: `${i * 40}ms`,
                    background: orange
                      ? current
                        ? "#F0633A"
                        : "linear-gradient(to bottom, #F0633A, rgba(240, 99, 58, 0.55))"
                      : current
                        ? "var(--color-ink, #221E1B)"
                        : "rgba(34, 30, 27, 0.2)",
                  }}
                />
              ) : (
                <span className="block h-0.5 w-full max-w-10 rounded-full bg-ink/12" />
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

/** G2: Paid = ink with white text, Pending = an orange edge, Scheduled = light. */
function StatusChip({ status }: { status: EarningRow["status"] }) {
  const t = useTranslations("houses.earnings.status");
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-3 text-small",
        status === "paid" ? "bg-ink font-semibold text-white" : status === "pending" ? "text-ink shadow-[inset_0_0_0_1.5px_#F0633A]" : "bg-ink/6 text-ink",
      )}
    >
      {t(status)}
    </span>
  );
}

/**
 * G1: one table. Pro host: House · Dates · Guests · Host fee · Simpulo fee · Your earnings · Rent passed on · Paid on · Status. Share host:
 * House · Dates · Guests · Rent passed on · Paid on · Status. Rows open the House's detail page; "Export CSV" top right.
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
    <section aria-labelledby="earnings-payouts" className={CARD}>
      <div className="flex items-center justify-between gap-4">
        <h2 id="earnings-payouts" className={SECTION_TITLE}>
          {t("payouts")}
        </h2>
        <Button variant="secondary" size="sm" onClick={exportCsv} disabled={earnings.rows.length === 0}>
          <Download aria-hidden />
          {t("export")}
        </Button>
      </div>
      {earnings.rows.length === 0 ? (
        <p className="pt-4 text-body text-muted">{t("noPayouts")}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
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
                const photo = row.stay ? housePhotos(row.stay)[0] : undefined;
                return (
                  <tr key={row.id} onClick={href ? () => router.push(href) : undefined} className={cn("align-middle [&>td]:py-3 [&>td]:pr-4 [&>td:last-child]:pr-0", href && "cursor-pointer transition-colors duration-150 hover:bg-ink/3")}>
                    <td className="max-w-72">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="relative block size-10 shrink-0 overflow-hidden rounded-[10px] bg-ink/6">{photo && <Img src={photo} alt="" fill sizes="40px" className="object-cover" />}</span>
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
                      <StatusChip status={row.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
