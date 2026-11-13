"use client";

// /admin – the Cockpit: the move target on top (with the last 12 months), then Supply · Demand · Quality · Money (three numbers each, a
// status dot where there is a target), the launch criteria and the top topics. Every number from lib/admin/metrics.ts (cockpit); status colours only
// from getStatus. Bento tiles (radius 24) on the page – nothing boxed inside them.
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { FormField } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { Input } from "@/components/ui/Input";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { VIBE_ICONS } from "@/config/explore";
import { useFormat } from "@/i18n/format";
import { cockpit, companyBalance, getStatus, money, profitPerMonth, type CockpitNumber, type Status } from "@/lib/admin/metrics";
import { useAdminActions } from "@/lib/admin/actions";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { getPlatformPayouts } from "@/lib/data";
import { cn } from "@/lib/utils";
import { BarList, ColumnChart, ProgressBar, STATUS_SOFT, StatusDot } from "./AdminCharts";
import { AdminSection, AdminShell, StatRow } from "./AdminShell";

const num = (n: number) => n.toLocaleString("en-US");
const eur = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const dayLabel = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const monthLabel = (month: string) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });

/** Where each tile leads. */
const GROUP_HREF = { supply: "/admin/houses", demand: "/admin/waitlist", quality: "/admin/data", money: "/admin/money" } as const;
type Group = keyof typeof GROUP_HREF;

function valueText(n: CockpitNumber): string {
  if (n.value === null) return "–";
  if (n.format === "text") return n.text ?? "–";
  if (n.format === "percent") return `${n.value} %`;
  if (n.format === "days") return `${n.value} d`;
  if (n.format === "eur") return eur(n.value);
  return num(n.value);
}

export function AdminCockpit() {
  const t = useTranslations("admin.cockpit");
  const tAdmin = useTranslations("admin");
  const c = cockpit(useAdminInputs());
  const { move } = c;

  return (
    <AdminShell title={t("title")}>
      {/* The move target, full width – the tile takes its status's soft surface; the last 12 months beside it (the old Overview's chart). */}
      <section
        className={cn("grid gap-8 rounded-[24px] p-6 md:p-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)] xl:items-end", move.status ? STATUS_SOFT[move.status] : "bg-surface")}
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-eyebrow uppercase text-muted">
            <StatusDot status={move.status} />
            {t("move")}
            <span className="sr-only">· {tAdmin(`status.${move.status ?? "none"}`)}</span>
          </p>
          <p className="mt-3 flex items-baseline gap-3">
            <span className="text-display tabular-nums text-ink">{num(move.current)}</span>
            <span className="text-h3 text-muted">{t("moveTarget", { target: move.target })}</span>
            <span className="text-small text-muted">· {tAdmin(`status.${move.status ?? "none"}`)}</span>
          </p>
          <div className="mt-5 max-w-xl">
            <ProgressBar ratio={move.progress.ratio} label={t("move")} status={move.status} />
          </div>
          <p className="mt-3 text-body text-ink">{t("streak", { streak: move.streak, of: move.streakOf })}</p>
        </div>
        <ColumnChart
          label={t("move")}
          data={move.rows.map((r) => ({ label: monthLabel(r.month), value: r.full }))}
          target={move.target}
          statusOf={(value) => getStatus("fullHousesPerMonth", value)}
          height={170}
        />
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2 min-[90rem]:grid-cols-4">
        {(Object.keys(c.groups) as Group[]).map((group) => (
          <GroupTile key={group} group={group} numbers={c.groups[group]} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-[24px] bg-surface p-6">
          <h2 className="text-eyebrow uppercase text-muted">{t("launch")}</h2>
          <LaunchList items={c.launch} />
        </section>
        <section className="rounded-[24px] bg-surface p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-eyebrow uppercase text-muted">{t("topics")}</h2>
            <Link href="/admin/topics" className="text-small font-semibold text-ink hover:underline">
              {t("allTopics")}
            </Link>
          </div>
          <TopicBars topics={c.topics} />
        </section>
      </div>
    </AdminShell>
  );
}

/** One area as a tile (the whole tile leads into its tab): its name, then three numbers – status dot, value, change, the last 8 weeks. */
function GroupTile({ group, numbers }: { group: Group; numbers: readonly CockpitNumber[] }) {
  const t = useTranslations("admin.cockpit");
  const tAdmin = useTranslations("admin");
  return (
    <Link
      href={GROUP_HREF[group]}
      aria-label={t("open", { area: t(`group.${group}`) })}
      className="group flex flex-col rounded-[24px] bg-surface p-6 transition-colors duration-150 hover:bg-surface-2"
    >
      <span className="flex items-center justify-between">
        <span className="text-h3 text-ink">{t(`group.${group}`)}</span>
        <ArrowRight aria-hidden className="size-4 text-muted transition-transform duration-150 group-hover:translate-x-0.5" />
      </span>
      <span className="mt-5 flex flex-col gap-5">
        {numbers.map((n) => (
          // The label across the tile (never cut), below it the value and its change, the last 8 weeks beside them.
          <span key={n.key} className="block">
            <span className="flex items-center gap-2 text-small text-muted">
              <StatusDot status={n.status} />
              <span>{t(`metric.${n.key}`)}</span>
              <span className="sr-only">· {tAdmin(`status.${n.status ?? "none"}`)}</span>
            </span>
            {/* A word (the best source) one step smaller than a number. */}
            <span className={cn("mt-1 block truncate tabular-nums text-ink", n.format === "text" ? "text-h3" : "text-h2")}>{valueText(n)}</span>
            {n.format === "text" && n.value !== null && <span className="mt-0.5 block text-small text-muted">{t("signups", { count: n.value })}</span>}
          </span>
        ))}
      </span>
    </Link>
  );
}

function LaunchList({ items }: { items: ReturnType<typeof cockpit>["launch"] }) {
  const t = useTranslations("admin.overview");
  const label = (key: string) =>
    key === "houses"
      ? t("criteria.houses")
      : key === "hubs"
        ? t("criteria.hubs", { min: 5 })
        : key === "reservedShare"
          ? t("criteria.reservedShare", { min: 2 })
          : t("criteria.waitlist");
  const text = (item: (typeof items)[number]) =>
    item.key === "reservedShare"
      ? t("ofTargetPercent", { value: item.progress.value, target: item.progress.target })
      : t("ofTarget", { value: num(item.progress.value), target: num(item.progress.target) });
  return (
    <ul className="mt-5 flex flex-col gap-5">
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-2 flex items-baseline justify-between gap-3 text-body">
            <span className="flex min-w-0 items-center gap-2 text-ink">
              <StatusDot status={item.status as Status | null} />
              <span>{label(item.key)}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted">{text(item)}</span>
          </div>
          <ProgressBar ratio={item.progress.ratio} label={label(item.key)} status={item.status} />
        </li>
      ))}
    </ul>
  );
}

function TopicBars({ topics }: { topics: ReturnType<typeof cockpit>["topics"] }) {
  const f = useFormat();
  return (
    <BarList
      className="mt-5"
      tone="chart-1"
      rows={topics.map((topic) => {
        const Icon = VIBE_ICONS[topic.vibe];
        return {
          key: topic.vibe,
          value: topic.score,
          label: (
            <>
              <Icon aria-hidden className="size-4 shrink-0 text-ink/60" strokeWidth={1.75} />
              <span className="truncate">{f.vibe(topic.vibe)}</span>
            </>
          ),
        };
      })}
    />
  );
}

// ── Money ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** /admin/money – what Simpulo keeps: this month against the target, per full House, in all; the last 12 months in their status colours. */
export function AdminMoney() {
  const t = useTranslations("admin.money");
  const tc = useTranslations("admin.cockpit");
  const inputs = useAdminInputs();
  const m = money(inputs);
  const months = profitPerMonth(inputs);
  return (
    <AdminShell title={t("title")}>
      <StatRow
        stats={[
          { label: tc("metric.profit"), value: eur(m.profitThisMonth), status: m.status, sub: tc("profitTarget", { target: eur(m.target) }) },
          { label: tc("metric.perHouse"), value: m.perHouse === null ? "–" : eur(m.perHouse) },
          { label: tc("metric.revenueTotal"), value: eur(m.total) },
        ]}
      />
      <AdminSection title={t("perMonth")} aside={<span className="text-small text-muted">{t("target", { target: eur(m.target) })}</span>}>
        <ColumnChart
          label={t("perMonth")}
          data={months.map((r) => ({ label: monthLabel(r.month), value: r.profit }))}
          target={m.target}
          statusOf={(value) => getStatus("profitPerMonth", value)}
          unit="€"
          height={260}
        />
      </AdminSection>
      <p className="mt-6 max-w-2xl text-small text-muted">{t("note")}</p>
      <PayoutSection />
      <Withdrawals />
    </AdminShell>
  );
}

/**
 * Simpulo's own payouts at Stripe: schedule, the account on file, the next payout – read only; changed in Stripe ("Manage in Stripe").
 * "Pay out now" only ever to that account (confirmed in a dialog, logged; the real call from phase 5).
 */
function PayoutSection() {
  const t = useTranslations("admin.money");
  const showToast = useToast();
  const { payOutNow } = useAdminActions();
  const payouts = useMemo(() => getPlatformPayouts(), []);
  const [confirming, setConfirming] = useState(false);
  if (!payouts) {
    return (
      <AdminSection title={t("payouts")}>
        <p className="text-body text-muted">{t("noPayouts")}</p>
      </AdminSection>
    );
  }
  const amount = eur(payouts.available);
  return (
    <AdminSection
      title={t("payouts")}
      aside={
        <a href={payouts.manageUrl} target="_blank" rel="noreferrer noopener" className="text-small font-semibold text-ink hover:underline">
          {t("manage")}
        </a>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 flex-1 basis-[560px]">
          <StatRow
            size="md"
            stats={[
              { label: t("schedule"), value: payouts.schedule.charAt(0).toUpperCase() + payouts.schedule.slice(1) },
              { label: t("account"), value: payouts.account },
              { label: t("nextPayout"), value: payouts.next ? eur(payouts.next.amount) : "–", sub: payouts.next ? dayLabel(payouts.next.date) : undefined },
              { label: t("available"), value: amount },
            ]}
          />
        </div>
        <Button variant="secondary" disabled={payouts.available <= 0} onClick={() => setConfirming(true)}>
          {t("payNow")}
        </Button>
      </div>
      <Sheet open={confirming} onClose={() => setConfirming(false)} title={t("payTitle", { amount })}>
        <p className="text-body text-muted">{t("payText", { amount, account: payouts.account })}</p>
        <ModalFooter onCancel={() => setConfirming(false)} className="mt-6">
          <Button
            onClick={() => {
              payOutNow(payouts.available, payouts.account);
              setConfirming(false);
              showToast(t("paid", { amount, account: payouts.account }));
            }}
          >
            {t("payConfirm", { amount })}
          </Button>
        </ModalFooter>
      </Sheet>
    </AdminSection>
  );
}

/** "My withdrawals": private withdrawals from Qonto entered by hand, and this year's profit − tax reserve − withdrawals = left in the company. */
function Withdrawals() {
  const t = useTranslations("admin.money");
  const f = useFormat();
  const showToast = useToast();
  const inputs = useAdminInputs();
  const { addWithdrawal } = useAdminActions();
  const b = companyBalance(inputs);
  const [date, setDate] = useState(inputs.today);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const value = Number(amount.replace(",", "."));
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && value > 0;
  const list = inputs.admin.withdrawals.toSorted((a, z) => z.date.localeCompare(a.date));

  return (
    <AdminSection title={t("withdrawals")}>
      <p className="mb-3 text-small text-muted">{t("balanceYear", { year: b.year })}</p>
      <StatRow
        stats={[
          { label: t("profitYear"), value: eur(b.profit) },
          { label: t("taxReserve", { percent: b.taxPercent }), value: `− ${eur(b.taxReserve)}` },
          { label: t("withdrawn"), value: `− ${eur(b.withdrawals)}` },
          { label: t("left"), value: eur(b.left) },
        ]}
      />
      <p className="mt-3 text-small text-muted">{t("taxNote")}</p>

      <form
        className="mt-8 grid items-end gap-3 sm:grid-cols-[180px_160px_minmax(0,1fr)_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          addWithdrawal(date, Math.round(value * 100) / 100, note.trim() || undefined);
          setAmount("");
          setNote("");
          showToast(t("added"));
        }}
      >
        <FormField label={t("date")}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField label={t("amount")}>
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1500" />
        </FormField>
        <FormField label={t("noteLabel")}>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        <Button type="submit" variant="secondary" disabled={!valid}>
          {t("addWithdrawal")}
        </Button>
      </form>

      {list.length === 0 ? (
        <p className="mt-6 text-body text-muted">{t("none")}</p>
      ) : (
        <ul className="mt-6 divide-y divide-ink/8 border-y border-ink/8">
          {list.map((w) => (
            <li key={w.id} className="flex items-baseline justify-between gap-4 py-3 text-body">
              <span className="text-ink">
                {f.day(w.date)}
                {w.note && <span className="text-muted"> · {w.note}</span>}
              </span>
              <span className="tabular-nums text-ink">{eur(w.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </AdminSection>
  );
}
