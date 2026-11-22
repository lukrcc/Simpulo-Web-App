"use client";

// Admin › Geld: Überblick · Gäste · Hosts · Kosten · Auszahlungen · Steuern (?tab=, the period Woche · Monat · Quartal · Jahr right in the
// click row, Standard Woche). Every number from lib/admin/metrics.ts (moneyPeriod, moneyBuckets, guestRevenueBuckets, hostMoney,
// hostPayouts, costEntryDays, runway), the definitions once in admin.money.terms – the same words as the overview's ⓘ. Charts in the one
// violet style (Regel „Admin-Diagramme“). Costs entered here are logged; payouts to hosts are shown only (no payout buttons).
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { FormField } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { Input } from "@/components/ui/Input";
import { Img } from "@/components/ui/Img";
import { Switch } from "@/components/ui/Switch";
import type { ComparePeriod } from "@/config/admin";
import { useAdminActions } from "@/lib/admin/actions";
import { useAdminPeriod } from "@/lib/admin/period";
import { costEntryDays, guestRevenueBuckets, hostMoney, hostPayouts, moneyBuckets, moneyPeriod, runway, type MoneyTerm } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { getBankBalance, type CostCategory } from "@/lib/data";
import { chartTick, day, dec, eur } from "@/lib/i18n/adminFormat";
import { cn, housePhotos } from "@/lib/utils";
import { findUser, useStore } from "@/lib/store";
import { BarList, ComboChart } from "./AdminCharts";
import { KeyNumbers } from "./AdminNumbers";
import { AdminSubTabs, AdminTabs, DirectLink, PeriodTabs } from "./AdminLayout";
import { stripeUrl } from "@/config/tools";
import { AdminSection, AdminShell } from "./AdminShell";
import { AdminTaxes } from "./AdminTaxes";
import { AdminTaxJournal } from "./AdminTaxJournal";
import { PayoutSection, Withdrawals } from "./AdminCockpit";

const TABS = ["overview", "guests", "hosts", "costs", "payouts", "taxes"] as const;
type Tab = (typeof TABS)[number];
const CATEGORIES: readonly CostCategory[] = ["tools", "creator", "marketing", "other"];

export function AdminMoney({ initialView = "overview" }: { initialView?: Tab }) {
  const t = useTranslations("admin.money");
  const router = useRouter();
  const params = useSearchParams();
  const wanted = params.get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(wanted ?? "") ? (wanted as Tab) : initialView;
  // Always on /admin/money (also from /admin/money/taxes), the tab in ?tab= – Überblick without one.
  const setTab = (next: Tab) => router.replace(next === "overview" ? "/admin/money" : `/admin/money?tab=${next}`, { scroll: false });
  const [taxView, setTaxView] = useState<"journal" | "overview">("journal");
  const [period] = useAdminPeriod();
  return (
    <AdminShell
      title={t("title")}
      tabs={<AdminTabs label={t("views.label")} value={tab} onChange={setTab} tabs={TABS.map((value) => ({ value, label: t(`views.${value}`) }))} />}
      subTabs={tab === "taxes" ? <AdminSubTabs label={t("taxViews.label")} value={taxView} onChange={setTaxView} tabs={(["journal", "overview"] as const).map((value) => ({ value, label: t(`taxViews.${value}`) }))} /> : undefined}
      aside={tab === "taxes" ? undefined : <PeriodTabs />}
    >
      {tab === "overview" && <Overview period={period} />}
      {tab === "guests" && <Guests period={period} />}
      {tab === "hosts" && <Hosts period={period} />}
      {tab === "costs" && <Costs period={period} />}
      {tab === "payouts" && <Payouts period={period} />}
      {tab === "taxes" && (taxView === "journal" ? <AdminTaxJournal /> : <AdminTaxes />)}
    </AdminShell>
  );
}

/** One number by its money term: label and ⓘ from admin.money.terms, the comparison span added to the ⓘ. */
function useTerm(period: ComparePeriod) {
  const t = useTranslations("admin.money");
  const tc = useTranslations("admin.cockpit");
  const against = tc(`compare.info.${period}`);
  return (key: MoneyTerm, value: string, change: ReturnType<typeof moneyPeriod>["changes"][keyof ReturnType<typeof moneyPeriod>["changes"]] | null, extra: { target?: { text: string; status: "good" | "warning" | "critical" | null }; sub?: ReactNode } = {}) => ({
    key,
    label: t(`terms.${key}.label`),
    info: `${t(`terms.${key}.info`)} ${against}`,
    value,
    change,
    ...extra,
  });
}

const eurOrDash = (n: number | null) => (n === null ? "–" : eur(n));

// ── Überblick ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Overview({ period }: { period: ComparePeriod }) {
  const t = useTranslations("admin.money");
  const inputs = useAdminInputs();
  const m = moneyPeriod(inputs, period);
  const term = useTerm(period);
  const data = useMemo(() => moneyBuckets(inputs, period).map((b) => ({ label: chartTick(b.from, b.to, b.level).main, revenue: b.revenue, costs: b.costs, profit: b.profit, current: b.current })), [inputs, period]);
  return (
    <>
      <KeyNumbers
        className="lg:grid-cols-5"
        items={[
          term("bookingVolume", eur(m.now.bookingVolume), m.changes.bookingVolume),
          term("revenue", eur(m.now.revenue), m.changes.revenue),
          term("costs", eur(m.now.costs), m.changes.costs),
          term("profit", eur(m.now.profit), m.changes.profit),
          term("takeRate", m.now.takeRate === null ? "–" : `${dec(m.now.takeRate)} %`, m.changes.takeRate),
        ]}
      />
      <AdminSection title={t("chart.title")}>
        <ComboChart
          label={t("chart.title")}
          data={data}
          format={eur}
          height={280}
          series={[
            { key: "revenue", label: t("chart.revenue"), tone: "primary" },
            { key: "costs", label: t("chart.costs"), tone: "chart-2" },
            { key: "profit", label: t("chart.profit"), tone: "chart-3" },
          ]}
        />
      </AdminSection>
      <PayoutSection />
      <Withdrawals />
    </>
  );
}

// ── Gäste ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Guests({ period }: { period: ComparePeriod }) {
  const t = useTranslations("admin.money");
  const inputs = useAdminInputs();
  const m = moneyPeriod(inputs, period);
  const term = useTerm(period);
  const buckets = useMemo(() => guestRevenueBuckets(inputs), [inputs]);
  return (
    <>
      <KeyNumbers
        className="lg:grid-cols-5"
        items={[
          term("serviceFees", eur(m.now.serviceFees), m.changes.serviceFees),
          term("perGuest", eurOrDash(m.now.perGuest), m.changes.perGuest),
          term("bookingPerGuest", eurOrDash(m.now.bookingPerGuest), m.changes.bookingPerGuest),
          term("valuePerGuestYear", eurOrDash(m.valuePerGuestYear), m.changes.valuePerGuestYear),
          term("refunds", eur(m.now.refunds), m.changes.refunds),
        ]}
      />
      <AdminSection title={t("guestsTab.distribution")} aside={<span className="max-w-md text-small text-muted">{t("guestsTab.distributionInfo")}</span>}>
        <BarList
          className="max-w-3xl"
          rows={buckets.map((b) => ({
            key: String(b.from),
            label: b.to === null ? t("guestsTab.bucketOpen", { from: eur(b.from) }) : t("guestsTab.bucket", { from: eur(b.from), to: eur(b.to) }),
            value: b.guests,
            display: `${t("guestsTab.guests", { count: b.guests })} · ${eur(b.revenue)}`,
          }))}
        />
      </AdminSection>
    </>
  );
}

// ── Hosts ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Hosts({ period }: { period: ComparePeriod }) {
  const t = useTranslations("admin.money");
  const inputs = useAdminInputs();
  const m = moneyPeriod(inputs, period);
  const term = useTerm(period);
  const h = useMemo(() => hostMoney(inputs), [inputs]);
  return (
    <>
      <KeyNumbers
        className="lg:grid-cols-4"
        items={[
          term("hostFeeShare", eur(m.now.hostFeeShare), m.changes.hostFeeShare),
          term("perHost", eurOrDash(m.now.revenuePerHost), m.changes.revenuePerHost),
          term("hostFeePerHouse", eurOrDash(m.now.perHost), m.changes.perHost),
          term("valuePerHostYear", eurOrDash(m.valuePerHostYear), m.changes.valuePerHostYear),
        ]}
      />
      <div className="mt-(--adm-section) grid gap-x-16 gap-y-(--adm-section) lg:grid-cols-2 [&>section]:mt-0">
        <AdminSection title={t("hostsTab.byTier")}>
          <BarList rows={h.byTier.map((x) => ({ key: x.tier, label: `${t(`hostsTab.tiers.${x.tier}`)} · ${t("hostsTab.hosts", { count: x.hosts })}`, value: x.valuePerYear, display: eur(x.valuePerYear) }))} />
        </AdminSection>
        <AdminSection title={t("hostsTab.top")}>
          <ul className="divide-y divide-ink/8 border-y border-ink/8">
            {h.top.map((row) => (
              <li key={row.user.id}>
                <Link href={`/admin/hosts?host=${row.user.id}`} className="flex min-h-(--adm-row-h) items-center gap-3 py-1.5 hover:bg-(--adm-block)">
                  {row.user.photos[0] ? <Img src={row.user.photos[0]} alt="" width={32} height={32} className="size-8 shrink-0 rounded-full object-cover" /> : <span className="size-8 shrink-0 rounded-full bg-(--adm-pill)" />}
                  <span className="min-w-0 flex-1 truncate text-body text-ink">{row.user.name}</span>
                  <span className="text-small text-muted">{t(`hostsTab.tiers.${row.tier}`)}</span>
                  <span className="w-28 shrink-0 text-right text-body tabular-nums text-ink">{t("hostsTab.perYear", { value: eur(row.valuePerYear) })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </AdminSection>
      </div>
    </>
  );
}

// ── Kosten ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Costs({ period }: { period: ComparePeriod }) {
  const t = useTranslations("admin.money");
  const tk = useTranslations("admin.money.kpis");
  const inputs = useAdminInputs();
  const actions = useAdminActions();
  const m = moneyPeriod(inputs, period);
  const term = useTerm(period);
  const bank = useMemo(() => getBankBalance(), []);
  const r = runway(inputs, bank?.balance ?? null);
  const entries = inputs.admin.costEntries ?? [];
  const inRange = costEntryDays(entries, inputs.today).filter((c) => c.date >= m.ranges.current.from && c.date <= m.ranges.current.to);
  const byCategory = CATEGORIES.map((category) => ({ category, total: Math.round(inRange.filter((c) => c.category === category).reduce((n, c) => n + c.amount, 0)) }));
  const [date, setDate] = useState(inputs.today);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<CostCategory>("tools");
  const [recurring, setRecurring] = useState(false);
  const [note, setNote] = useState("");
  const value = Number(amount.replace(",", "."));
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && value > 0;
  return (
    <>
      <KeyNumbers
        className="lg:grid-cols-4"
        items={[
          term("costs", eur(m.now.costs), m.changes.costs),
          term("stripeFees", eur(m.now.stripeFees), m.changes.stripeFees),
          term("otherCosts", eur(m.now.otherCosts), m.changes.otherCosts),
          r
            ? { key: "runway", label: tk("runway"), info: tk("info.runway"), value: tk("months", { value: dec(r.value ?? 0) }), change: r.change, target: { text: tk("runwayTarget", { target: r.target }), status: r.status } }
            : { key: "runway", label: tk("runway"), info: tk("info.runway"), value: "–", change: null, sub: tk("noBank") },
        ]}
      />
      <div className="mt-(--adm-section) grid gap-x-16 gap-y-(--adm-section) lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] [&>section]:mt-0">
        <AdminSection title={t("costsTab.byCategory")}>
          <BarList rows={byCategory.map((c) => ({ key: c.category, label: t(`costsTab.categories.${c.category}`), value: c.total, display: eur(c.total) }))} />
        </AdminSection>
        <AdminSection title={t("costsTab.entries")}>
          <form
            className="grid items-end gap-3 sm:grid-cols-[150px_120px_minmax(0,1fr)]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!valid) return;
              actions.addCostEntry({ date, amount: Math.round(value * 100) / 100, category, recurring, note: note.trim() }, t(`costsTab.categories.${category}`));
              setAmount("");
              setNote("");
            }}
          >
            <FormField label={t("date")}>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </FormField>
            <FormField label={t("amount")}>
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="120" />
            </FormField>
            <FormField label={t("costsTab.note")}>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </FormField>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
              {CATEGORIES.map((c) => (
                <button key={c} type="button" aria-pressed={category === c} data-on={category === c || undefined} onClick={() => setCategory(c)} className="adm-cap">
                  {t(`costsTab.categories.${c}`)}
                </button>
              ))}
              <label className="ml-2 flex items-center gap-2 text-small text-ink">
                <Switch on={recurring} label={t("costsTab.recurring")} onChange={setRecurring} />
                {t("costsTab.recurring")}
              </label>
              <Button type="submit" size="sm" variant="secondary" className="ml-auto" disabled={!valid}>
                {t("costsTab.add")}
              </Button>
            </div>
          </form>
          {entries.length === 0 ? (
            <p className="mt-(--adm-inner) text-body text-muted">{t("costsTab.empty")}</p>
          ) : (
            <ul className="mt-(--adm-inner) divide-y divide-ink/8 border-y border-ink/8">
              {entries.toSorted((a, b) => b.date.localeCompare(a.date)).map((e) => (
                <li key={e.id} data-cost-entry={e.id} className="flex min-h-(--adm-row-h) items-center gap-3 py-1">
                  <span className="w-20 shrink-0 text-small tabular-nums text-muted">{day(e.date)}</span>
                  <span className="min-w-0 flex-1 truncate text-body text-ink">{e.note || t(`costsTab.categories.${e.category}`)}</span>
                  <span className="text-small text-muted">
                    {t(`costsTab.categories.${e.category}`)} · {e.recurring ? t("costsTab.monthly") : t("costsTab.once")}
                  </span>
                  <span className="w-20 shrink-0 text-right text-body tabular-nums text-ink">{eur(e.amount)}</span>
                  <button type="button" aria-label={t("costsTab.remove")} onClick={() => actions.deleteCostEntry(e, t(`costsTab.categories.${e.category}`))} className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink">
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      </div>
    </>
  );
}

// ── Auszahlungen ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Payouts({ period }: { period: ComparePeriod }) {
  const t = useTranslations("admin.money");
  const inputs = useAdminInputs();
  const store = useStore();
  const m = moneyPeriod(inputs, period);
  const p = hostPayouts(inputs, m.ranges.current.from, m.ranges.current.to);
  const row = (r: (typeof p.paid)[number], date: string | null) => (
    <li key={r.stay.id} className="flex min-h-(--adm-row-h) items-center gap-3 py-1.5">
      <Img src={housePhotos(r.stay, findUser(store, r.stay.hostId))[0]} alt="" width={32} height={32} className="size-8 shrink-0 rounded-lg object-cover" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body text-ink">{r.stay.title}</span>
        <span className="block truncate text-small text-muted">{[r.host?.name.split(" ")[0], date ? day(date) : null].filter(Boolean).join(" · ")}</span>
      </span>
      <span className="w-24 shrink-0 text-right text-body tabular-nums text-ink">{eur(r.amount)}</span>
      <DirectLink href={stripeUrl("transfer", r.stay.stripeTransferId)} className="shrink-0">
        {t("payoutsTab.openStripe")}
      </DirectLink>
    </li>
  );
  return (
    <>
      <KeyNumbers
        className="lg:grid-cols-3"
        items={[
          { key: "paidOut", label: t("terms.paidOut.label"), info: t("terms.paidOut.info"), value: eur(p.paidTotal), change: null },
          { key: "openPayouts", label: t("terms.openPayouts.label"), info: t("terms.openPayouts.info"), value: eur(p.openTotal), change: null },
        ]}
      />
      <p className="mt-2 text-small text-muted">{t("payoutsTab.note")}</p>
      <div className="mt-(--adm-section) grid gap-x-16 gap-y-(--adm-section) lg:grid-cols-2 [&>section]:mt-0">
        <AdminSection title={t("payoutsTab.paidList")}>
          {p.paid.length === 0 ? <p className="text-body text-muted">{t("payoutsTab.none")}</p> : <ul className={cn("divide-y divide-ink/8 border-y border-ink/8")}>{p.paid.slice(0, 12).map((r) => row(r, r.paidOutAt))}</ul>}
        </AdminSection>
        <AdminSection title={t("payoutsTab.openList")}>
          {p.open.length === 0 ? <p className="text-body text-muted">{t("payoutsTab.none")}</p> : <ul className="divide-y divide-ink/8 border-y border-ink/8">{p.open.slice(0, 12).map((r) => row(r, null))}</ul>}
        </AdminSection>
      </div>
    </>
  );
}
