"use client";

// Admin › Finanzierung ("Wann und wofür holen wir Geld?") – Wachstum, after Vision. Four parts as capsules: Bereitschaft (the checklist with
// live values, lib/admin/metrics.ts fundingReadiness) · These (where the first money goes) · Runden (the ladder, the share calculator, the
// investor list as a greyed placeholder) · Unterlagen (the data room checklist, "Kennzahlen als PDF"). Every text in config/funding.ts. The
// note on top on every part. Deliberately no field for a company valuation. Graphics before text, no cards.
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/ActionButton";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import {
  ALLOCATION,
  DOC_STATUSES,
  DOCUMENTS,
  DOCUMENTS_TEXT,
  FUNDING_NOTE,
  FUNDING_TABS,
  FUNDING_TITLE,
  OPEN,
  READINESS,
  READINESS_TEXT,
  ROUND_NOW,
  ROUNDS,
  ROUNDS_TEXT,
  THESIS_TEXT,
  VALUATION,
  YOU_ARE_HERE,
  type FundingTab,
} from "@/config/funding";
import { useAdminActions } from "@/lib/admin/actions";
import { download } from "@/lib/admin/exporters";
import { kpiPdf } from "@/lib/admin/exporters/kpiPdf";
import { algorithmMetrics, fullHousesPerMonth, fundingReadiness, money, profitPerMonth, revenueLast12, valuationRange, type AdminInputs } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { dec, eur, pct } from "@/lib/i18n/adminFormat";
import { InfoTip } from "./AdminNumbers";
import { cn } from "@/lib/utils";
import { AdminSection, AdminShell } from "./AdminShell";
import { AdminTabs } from "./AdminLayout";
import { CompanyStructure, CompanyStructureTabs } from "./finance/CompanyStructure";
import type { StructureView } from "@/lib/admin/finance/structure";

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

export function AdminFunding() {
  const inputs = useAdminInputs();
  // ?tab=structure opens Firmenstruktur (a link from Vision › Der Hof › Eigentum) – Next's search params are current on a client navigation too.
  const opened = useSearchParams().get("tab") === "structure";
  const [tab, setTab] = useState<FundingTab>(opened ? "structure" : "readiness");
  // Firmenstruktur's second level: AdminSubTabs right under the head's row.
  const [structure, setStructure] = useState<StructureView>("group");
  return (
    // The tabs in the head's one click row (Grundordnung); the note under it ("Bewertung & Anteile" its own, Firmenstruktur its own at the end).
    <AdminShell
      title={FUNDING_TITLE}
      tabs={<AdminTabs label={FUNDING_TITLE} value={tab} onChange={setTab} tabs={FUNDING_TABS.map((t) => ({ value: t.key, label: t.label }))} />}
      subTabs={tab === "structure" ? <CompanyStructureTabs view={structure} onChange={setStructure} /> : undefined}
    >
      {tab !== "structure" && <p className="mb-(--adm-section) text-body text-muted">{tab === "valuation" ? VALUATION.note : FUNDING_NOTE}</p>}
      {tab === "readiness" && <Readiness inputs={inputs} />}
      {tab === "thesis" && <Thesis />}
      {tab === "rounds" && <Rounds />}
      {tab === "documents" && <Documents inputs={inputs} />}
      {tab === "valuation" && <Valuation inputs={inputs} />}
      {tab === "structure" && <CompanyStructure view={structure} />}
    </AdminShell>
  );
}

// ── Bereitschaft ────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** A point met: a sage circle with a check; open: an empty ring (ink, the status is the word beside it too). */
function MetMark({ met }: { met: boolean }) {
  return met ? (
    <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-adm-good text-inverse">
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  ) : (
    <span aria-hidden className="size-6 shrink-0 rounded-full border-[1.5px] border-ink/25" />
  );
}

function Readiness({ inputs }: { inputs: AdminInputs }) {
  const r = fundingReadiness(inputs);
  const actions = useAdminActions();
  const v = r.values;
  const t = READINESS_TEXT.value;
  const valueOf = {
    moved: v.moved.met ? t.moved.yes : t.moved.no,
    profitStreak: fill(t.profitStreak, { streak: v.profitStreak.streak, months: READINESS.profit.months, current: eur(v.profitStreak.current) }),
    repeatRate: v.repeatRate.value === null ? t.none : fill(t.repeatRate, { value: pct(v.repeatRate.value) }),
    fullHousesGrowth: v.fullHousesGrowth.value === null ? t.none : fill(t.fullHousesGrowth, { value: `${(v.fullHousesGrowth.value * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`, from: v.fullHousesGrowth.from, to: v.fullHousesGrowth.to }),
    hubsFill: v.hubsFill.hubs.length === 0 ? t.hubsNone : fill(t.hubsFill, { count: v.hubsFill.hubs.length, hubs: v.hubsFill.hubs.map((h) => `${h.hub} ${pct(Math.round(h.fill * 100))}`).join(" · ") }),
    contribution: v.contribution.value === null ? t.none : fill(t.contribution, { value: eur(v.contribution.value) }),
  };
  return (
    <>
      {/* "Bereit: X von 6" large, the six as segments under it; without the move the one sentence that matters. */}
      <p className="text-display tabular-nums text-ink">{fill(READINESS_TEXT.ready, { met: r.met, total: r.total })}</p>
      <div role="meter" aria-label={fill(READINESS_TEXT.ready, { met: r.met, total: r.total })} aria-valuemin={0} aria-valuemax={r.total} aria-valuenow={r.met} className="mt-4 flex max-w-md gap-1.5">
        {r.items.map((item) => (
          <span key={item.key} className={cn("h-1.5 flex-1 rounded-full", item.met ? "bg-adm-good" : "bg-ink/10")} />
        ))}
      </div>
      {!r.moved && <p className="mt-(--adm-inner) text-h3 text-ink">{READINESS_TEXT.moveFirst}</p>}

      <ol className="mt-(--adm-section) divide-y divide-ink/8 border-y border-ink/8">
        {r.items.map((item) => (
          <li key={item.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
            <MetMark met={item.met} />
            <span className="min-w-0 flex-1 basis-72">
              <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
                {item.label}
                {item.required && <span className="rounded-full border border-ink/15 px-2 text-small font-medium text-muted">{READINESS_TEXT.required}</span>}
                <span className="sr-only">· {item.met ? READINESS_TEXT.met : READINESS_TEXT.notMet}</span>
              </span>
              <span className="mt-0.5 block text-small text-muted">{valueOf[item.key]}</span>
            </span>
            {item.key === "moved" && (
              <span className="flex items-center gap-1 text-small text-muted">
                {READINESS_TEXT.manual}
                <Switch on={v.moved.met} label={READINESS_TEXT.movedSwitch} onChange={(on) => actions.setMoved(on)} />
              </span>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}

// ── These ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Thesis() {
  const sum = ALLOCATION.reduce((n, a) => n + a.percent, 0);
  const max = Math.max(...ALLOCATION.map((a) => a.percent), 1);
  return (
    <AdminSection title={THESIS_TEXT.title}>
      {sum !== 100 && <p className="mb-(--adm-inner) text-body font-semibold text-adm-critical">{fill(THESIS_TEXT.sumWarning, { sum })}</p>}
      <ul className="flex flex-col gap-5">
        {ALLOCATION.map((a) => (
          <li key={a.key} className="grid items-center gap-x-6 gap-y-1 sm:grid-cols-[200px_minmax(0,1fr)_56px]">
            <span className="text-body font-semibold text-ink">{a.label}</span>
            <span className="order-3 sm:order-none">
              <span aria-hidden className="block h-3 overflow-hidden rounded-full bg-ink/6">
                <span className="block h-full rounded-full bg-ink/70" style={{ width: `${(a.percent / max) * 100}%` }} />
              </span>
              <span className={cn("mt-1.5 block text-small", a.reason ? "text-muted" : "text-ink/40")}>{a.reason ?? THESIS_TEXT.reasonOpen}</span>
            </span>
            <span className="text-h3 tabular-nums text-ink sm:text-right">{pct(a.percent)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-(--adm-section) flex flex-col gap-2">
        {THESIS_TEXT.rules.map((rule) => (
          <p key={rule} className="text-body-lg text-ink">
            {rule}
          </p>
        ))}
      </div>
    </AdminSection>
  );
}

// ── Runden ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Rounds() {
  return (
    <>
      {/* The ladder: each step higher than the last; the one Simpulo stands on in ocean with "Du bist hier". */}
      <ol className="grid gap-y-8 lg:grid-cols-4 lg:items-end lg:gap-x-3">
        {ROUNDS.map((round, i) => {
          const here = round.key === ROUND_NOW;
          return (
            <li key={round.key} className="flex min-w-0 flex-col">
              <div className="pb-4">
                {here && <span className="mb-1 block text-eyebrow uppercase text-adm-chart-1">{YOU_ARE_HERE}</span>}
                <p className="text-h3 text-ink">
                  {round.label}
                  {round.optional && <span className="ml-2 text-small font-normal text-muted">{ROUNDS_TEXT.optional}</span>}
                </p>
                {round.amount && <p className="mt-0.5 text-body tabular-nums text-ink">{round.amount}</p>}
                <p className="mt-3 text-eyebrow uppercase text-(--adm-label)">{ROUNDS_TEXT.proof}</p>
                <p className={cn("mt-0.5 text-small", round.proof ? "text-ink" : "text-ink/40")}>{round.proof ?? OPEN}</p>
                <p className="mt-3 text-eyebrow uppercase text-(--adm-label)">{ROUNDS_TEXT.use}</p>
                <p className={cn("mt-0.5 text-small", round.use ? "text-ink" : "text-ink/40")}>{round.use ?? OPEN}</p>
              </div>
              <span aria-hidden className={cn("block rounded-t-[12px] max-lg:hidden", here ? "bg-adm-chart-1-soft" : "bg-ink/8")} style={{ height: 24 + i * 32 }} />
            </li>
          );
        })}
      </ol>
      <ShareCalculator />
      <InvestorsPlaceholder />
    </>
  );
}

/** The share calculator: what each round gives away (default 20 %) and the founders' share after each – no valuation, only shares. */
function ShareCalculator() {
  const dilutive = ROUNDS.filter((r) => r.dilutes);
  const [withPreSeed, setWithPreSeed] = useState(true);
  const [dilution, setDilution] = useState<Record<string, string>>(() => Object.fromEntries(dilutive.map((r) => [r.key, String(ROUNDS_TEXT.defaultDilutionPercent)])));
  const rounds = dilutive.filter((r) => withPreSeed || !r.optional);
  // After each round: what's left times (1 − what the round gives away).
  const steps = rounds.reduce<{ key: string; label: string; founders: number }[]>(
    (list, r) => {
      const d = Math.min(90, Math.max(0, Number(dilution[r.key]?.replace(",", ".")) || 0));
      return [...list, { key: r.key, label: fill(ROUNDS_TEXT.after, { round: r.label }), founders: list[list.length - 1].founders * (1 - d / 100) }];
    },
    [{ key: "start", label: ROUNDS_TEXT.start, founders: 100 }],
  );
  return (
    <AdminSection title={ROUNDS_TEXT.calculator} className="mt-(--adm-section)" aside={<span className="text-small text-muted">{ROUNDS_TEXT.calculatorNote}</span>}>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        {dilutive.map((r) => {
          const off = r.optional && !withPreSeed;
          return (
            <label key={r.key} className={cn("flex w-40 flex-col gap-1.5 text-small text-muted", off && "opacity-40")}>
              {fill(ROUNDS_TEXT.dilution, { round: r.label })}
              <Input inputMode="decimal" disabled={off} value={dilution[r.key]} onChange={(e) => setDilution((d) => ({ ...d, [r.key]: e.target.value }))} />
            </label>
          );
        })}
        <span className="flex items-center gap-1 text-small text-muted">
          {ROUNDS_TEXT.withPreSeed}
          <Switch on={withPreSeed} label={ROUNDS_TEXT.withPreSeed} onChange={setWithPreSeed} />
        </span>
      </div>
      {/* One bar per step: the founders' share ink, the investors' the rest. */}
      <ul className="mt-8 flex flex-col gap-4">
        {steps.map((s) => (
          <li key={s.key} className="grid items-center gap-x-6 gap-y-1 sm:grid-cols-[160px_minmax(0,1fr)_120px]">
            <span className="text-body text-ink">{s.label}</span>
            <span aria-hidden className="flex h-3 overflow-hidden rounded-full bg-ink/8">
              <span className="block h-full rounded-full bg-ink/70" style={{ width: `${s.founders}%` }} />
            </span>
            <span className="text-body tabular-nums text-ink sm:text-right">
              {ROUNDS_TEXT.founders} <span className="font-semibold">{pct(Math.round(s.founders * 10) / 10)}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-(--adm-section) text-h3 text-ink">{ROUNDS_TEXT.question}</p>
    </AdminSection>
  );
}

/** Later, after the move: the investor list – greyed, not usable yet (Name · Fonds · Stufe · Letzter Kontakt · Notiz). */
function InvestorsPlaceholder() {
  return (
    <AdminSection title={ROUNDS_TEXT.investorsTitle} className="mt-(--adm-section)" aside={<span className="text-small text-muted">{ROUNDS_TEXT.later}</span>}>
      <div aria-disabled className="pointer-events-none select-none overflow-x-auto opacity-40">
        <table className="w-full min-w-[560px] border-collapse text-left text-body">
          <thead>
            <tr className="border-b border-ink/8">
              {ROUNDS_TEXT.investorColumns.map((c) => (
                <th key={c} scope="col" className="py-2 pr-6 text-small font-normal text-muted">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1].map((row) => (
              <tr key={row} className="border-b border-ink/8">
                {ROUNDS_TEXT.investorColumns.map((c) => (
                  <td key={c} className="py-3 pr-6">
                    <span className="block h-2.5 w-20 rounded-full bg-ink/8" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminSection>
  );
}

// ── Unterlagen ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Documents({ inputs }: { inputs: AdminInputs }) {
  const actions = useAdminActions();
  const showToast = useToast();
  const statusOf = (key: string) => inputs.admin.fundingDocs[key] ?? "missing";
  const done = DOCUMENTS.filter((d) => statusOf(d.key) === "done").length;
  const kpis = () => {
    const full = fullHousesPerMonth(inputs).rows;
    const profit = profitPerMonth(inputs);
    const network = algorithmMetrics(inputs);
    const readiness = fundingReadiness(inputs);
    const bytes = kpiPdf({
      today: inputs.today,
      months: profit.map((p, i) => ({ month: p.month, profit: p.profit, full: full[i]?.full ?? 0 })),
      revenue12: revenueLast12(inputs),
      repeatRatePercent: network.repeatRate === null ? null : Math.round(network.repeatRate * 100),
      perFullHouse: money(inputs).perHouse,
      medianDaysToFull: network.medianDaysToFull,
      realHouses: inputs.stays.filter((s) => !s.isExample && (s.status === "published" || s.status === "booked" || s.status === "completed")).length,
      readiness: { met: readiness.met, total: readiness.total },
    });
    download(`simpulo-kennzahlen-${inputs.today}.pdf`, new Blob([bytes], { type: "application/pdf" }));
    actions.logExport(`Kennzahlen als PDF · ${inputs.today}`);
    showToast(DOCUMENTS_TEXT.downloaded);
  };
  return (
    <>
      <AdminSection title={DOCUMENTS_TEXT.title} aside={<span className="text-small text-muted">{fill(DOCUMENTS_TEXT.done, { done, total: DOCUMENTS.length })}</span>}>
        <div className="mb-(--adm-inner) flex max-w-md gap-1.5" aria-hidden>
          {DOCUMENTS.map((d) => (
            <span key={d.key} className={cn("h-1.5 flex-1 rounded-full", statusOf(d.key) === "done" ? "bg-ink/70" : statusOf(d.key) === "inProgress" ? "bg-ink/30" : "bg-ink/10")} />
          ))}
        </div>
        <ul className="divide-y divide-ink/8 border-y border-ink/8">
          {DOCUMENTS.map((d) => (
            <li key={d.key} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
              <span className="min-w-0 text-body text-ink">
                {d.label}
                {d.source && <span className="text-muted"> · {d.source}</span>}
              </span>
              <CapsuleGroup
                size="sm"
                label={`${DOCUMENTS_TEXT.status} · ${d.label}`}
                value={statusOf(d.key)}
                onChange={(status) => actions.setFundingDocStatus(d.key, d.label, status)}
                options={DOC_STATUSES.map((s) => ({ value: s.key, content: s.label }))}
              />
            </li>
          ))}
        </ul>
      </AdminSection>
      <div className="mt-(--adm-section) flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button variant="secondary" onClick={kpis}>
          {DOCUMENTS_TEXT.kpiPdf}
        </Button>
        <p className="max-w-xl text-small text-muted">{DOCUMENTS_TEXT.kpiPdfNote}</p>
      </div>
    </>
  );
}

// ── Bewertung & Anteile ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** "8 Mio. €" from 8.000.000; below a million the euro amount. */
const mio = (n: number) => (Math.abs(n) >= 1_000_000 ? `${dec(Math.round(n / 100_000) / 10)} Mio. €` : eur(Math.round(n)));

/**
 * A private orientation (config/funding.ts VALUATION): the valuation only as two ranges (never one number) and the three drivers – greyed
 * with "Vor dem Umzug: keine Bewertung nach außen." until the move is set –, private vs. stock exchange, the cap table calculator (not
 * saved) and the terms. No export, no PDF.
 */
function Valuation({ inputs }: { inputs: AdminInputs }) {
  const v = valuationRange(inputs);
  const t = VALUATION.text;
  const moved = inputs.admin.fundingMoved;
  const max = Math.max(v.revenue.high, v.profit?.high ?? 0, 1);
  const ranges = [
    { key: "a", title: t.methodA, detail: fill(t.methodADetail, { revenue: eur(v.revenue.runRate), low: v.revenue.band.low, high: v.revenue.band.high, band: v.revenue.band.label }), low: v.revenue.low, high: v.revenue.high },
    v.profit
      ? { key: "b", title: t.methodB, detail: fill(t.methodBDetail, { profit: eur(v.profit.profit), low: VALUATION.profitMultiple.low, high: VALUATION.profitMultiple.high }), low: v.profit.low, high: v.profit.high }
      : { key: "b", title: t.methodB, detail: t.noProfit, low: null, high: null },
  ];
  const drivers = [
    { key: "growth", value: v.drivers.growth === null ? "–" : pct(v.drivers.growth) },
    { key: "repeat", value: v.drivers.repeat === null ? "–" : pct(v.drivers.repeat) },
    { key: "margin", value: v.drivers.margin === null ? "–" : pct(v.drivers.margin) },
  ] as const;
  return (
    <>
      <AdminSection title={t.rangeTitle}>
        {!moved && <p className="mb-(--adm-inner) text-h3 text-ink">{VALUATION.beforeMove}</p>}
        {/* Two range bars on one scale: the span from low to high, the two ends written under it. */}
        <ul className={cn("flex flex-col gap-8", !moved && "opacity-40")} aria-disabled={!moved || undefined}>
          {ranges.map((r) => (
            <li key={r.key}>
              <p className="text-body font-semibold text-ink">{r.title}</p>
              <p className="mt-0.5 text-small text-muted">{r.detail}</p>
              {r.low !== null && r.high !== null && (
                <div className="mt-3 max-w-3xl">
                  <span aria-hidden className="relative block h-3 rounded-full bg-ink/6">
                    <span className="absolute inset-y-0 rounded-full bg-ink/60" style={{ left: `${(r.low / max) * 100}%`, width: `${Math.max(1, ((r.high - r.low) / max) * 100)}%` }} />
                  </span>
                  <p className="mt-2 text-body tabular-nums text-ink">
                    <span className="text-small text-muted">{t.low}</span> {mio(r.low)} – {mio(r.high)} <span className="text-small text-muted">{t.high}</span>
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </AdminSection>

      <AdminSection title={t.driversTitle} className="mt-(--adm-section)">
        <dl className="grid grid-cols-3 gap-y-6">
          {drivers.map((d, i) => (
            <div key={d.key} className={cn("min-w-0 pr-4", i > 0 && "border-l border-ink/8 pl-4 lg:pl-6")}>
              <dt className="flex items-center gap-1 text-small text-muted">
                {t.drivers[d.key]}
                <InfoTip text={t.driversInfo[d.key]} />
              </dt>
              <dd className="mt-1 text-h1 tabular-nums text-ink">{d.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-(--adm-inner) text-body-lg text-ink">{t.driversSentence}</p>
      </AdminSection>

      <AdminSection title={t.compareTitle} className="mt-(--adm-section)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-body">
            <thead>
              <tr className="border-b border-ink/8 text-small text-muted">
                <th scope="col" className="w-40 py-2 pr-6 font-normal">{t.compareColumns.topic}</th>
                <th scope="col" className="py-2 pr-6 font-normal">{t.compareColumns.private}</th>
                <th scope="col" className="py-2 font-normal">{t.compareColumns.public}</th>
              </tr>
            </thead>
            <tbody>
              {VALUATION.privateVsPublic.map((row) => (
                <tr key={row.topic} className="border-b border-ink/8 align-top">
                  <th scope="row" className="py-3 pr-6 font-semibold text-ink">{row.topic}</th>
                  <td className="py-3 pr-6 text-ink">{row.private}</td>
                  <td className="py-3 text-ink">{row.public}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-body text-muted">{t.compareNote}</p>
      </AdminSection>

      <CapTable />

      <AdminSection title={t.glossaryTitle} className="mt-(--adm-section)">
        <ul className="divide-y divide-ink/8 border-y border-ink/8">
          {VALUATION.glossary.map((g) => (
            <li key={g.term}>
              <details className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-body font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {g.term}
                  <span aria-hidden className="text-muted transition-transform duration-150 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 max-w-2xl text-body text-ink">{g.text}</p>
              </details>
            </li>
          ))}
        </ul>
      </AdminSection>
    </>
  );
}

const CAP_COLORS = { founders: "bg-ink/70", investors: "bg-adm-chart-1", pool: "bg-adm-chart-2" } as const;

/**
 * The cap table: from 100 % founders, up to three rounds with pre-money and amount (Mio. €) and an optional employee pool (% of post-money).
 * Each round: post-money = pre + amount; the new investors get amount ÷ post; a new pool its share; everyone before is diluted by the rest.
 * Shows post-money, investors, pool, founders and the founders' stake in euros, and a bar per round. Nothing is saved.
 */
function CapTable() {
  const t = VALUATION.text;
  const [rounds, setRounds] = useState(() => [
    { pre: String(VALUATION.example.preMoney / 1_000_000), amount: String(VALUATION.example.amount / 1_000_000), pool: "" },
    { pre: "", amount: "", pool: "" },
    { pre: "", amount: "", pool: "" },
  ]);
  const toNum = (v: string) => Number(v.replace(",", ".")) || 0;
  const steps = rounds.reduce<{ key: string; label: string; post: number | null; founders: number; investors: number; pool: number }[]>(
    (list, r, i) => {
      const pre = toNum(r.pre) * 1_000_000;
      const amount = toNum(r.amount) * 1_000_000;
      if (pre <= 0 || amount <= 0) return list;
      const prev = list[list.length - 1];
      const post = pre + amount;
      const inv = amount / post;
      const poolNew = Math.min(0.5, Math.max(0, toNum(r.pool) / 100));
      const keep = Math.max(0, 1 - inv - poolNew);
      return [...list, { key: `r${i}`, label: fill(t.round, { n: i + 1 }), post, founders: prev.founders * keep, investors: prev.investors * keep + inv, pool: prev.pool * keep + poolNew }];
    },
    [{ key: "start", label: t.start, post: null, founders: 1, investors: 0, pool: 0 }],
  );
  const set = (i: number, field: "pre" | "amount" | "pool", value: string) => setRounds((list) => list.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
  const share = (x: number) => pct(Math.round(x * 1000) / 10);
  return (
    <AdminSection title={t.capTitle} className="mt-(--adm-section)" aside={<span className="text-small text-muted">{t.capNote}</span>}>
      <div className="grid gap-x-8 gap-y-6 md:grid-cols-3">
        {rounds.map((r, i) => (
          <fieldset key={i} className="flex min-w-0 flex-col gap-3">
            <legend className="mb-1 text-body font-semibold text-ink">{fill(t.round, { n: i + 1 })}</legend>
            <label className="flex flex-col gap-1.5 text-small text-muted">
              {t.preMoney}
              <Input inputMode="decimal" value={r.pre} onChange={(e) => set(i, "pre", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-small text-muted">
              {t.amount}
              <Input inputMode="decimal" value={r.amount} onChange={(e) => set(i, "amount", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-small text-muted">
              {t.pool}
              <Input inputMode="decimal" value={r.pool} onChange={(e) => set(i, "pool", e.target.value)} />
            </label>
          </fieldset>
        ))}
      </div>

      <ul className="mt-(--adm-section) flex flex-col gap-5">
        {steps.map((s) => (
          <li key={s.key} className="grid items-center gap-x-6 gap-y-2 lg:grid-cols-[120px_minmax(0,1fr)_minmax(0,420px)]">
            <span className="text-body font-semibold text-ink">{s.label}</span>
            <span aria-hidden className="flex h-3 overflow-hidden rounded-full bg-ink/6">
              <span className={CAP_COLORS.founders} style={{ width: `${s.founders * 100}%` }} />
              <span className={CAP_COLORS.investors} style={{ width: `${s.investors * 100}%` }} />
              <span className={CAP_COLORS.pool} style={{ width: `${s.pool * 100}%` }} />
            </span>
            <span className="flex flex-wrap gap-x-4 gap-y-1 text-small tabular-nums text-muted">
              {s.post !== null && (
                <span>
                  {t.postMoney} <span className="font-semibold text-ink">{mio(s.post)}</span>
                </span>
              )}
              <span>
                {t.founders} <span className="font-semibold text-ink">{share(s.founders)}</span>
              </span>
              {s.investors > 0 && (
                <span>
                  {t.investors} <span className="font-semibold text-ink">{share(s.investors)}</span>
                </span>
              )}
              {s.pool > 0 && (
                <span>
                  {t.poolShort} <span className="font-semibold text-ink">{share(s.pool)}</span>
                </span>
              )}
              {s.post !== null && (
                <span>
                  {t.founderValue} <span className="font-semibold text-ink">{mio(s.founders * s.post)}</span>
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-small text-ink">
        {(["founders", "investors", "pool"] as const).map((k) => (
          <li key={k} className="flex items-center gap-2">
            <span aria-hidden className={cn("size-2.5 rounded-sm", CAP_COLORS[k])} />
            {k === "founders" ? t.founders : k === "investors" ? t.investors : t.poolShort}
          </li>
        ))}
      </ul>
    </AdminSection>
  );
}
