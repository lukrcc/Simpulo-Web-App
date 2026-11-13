"use client";

// Admin › Data & Algorithm – "What do we learn from our data?": the five models as rows (data → model → result, with stage and success
// measure), the hypotheses with their verdict, then every data point (config/data-points.ts), filterable; at the bottom the network today.
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { DATA_POINT_STATUSES, DATA_POINTS, inputsOf, MOMENTS, type DataPointStatus, type Moment } from "@/config/data-points";
import { HYPOTHESES } from "@/config/hypotheses";
import { MODEL_IDS, MODELS, type Model, type ModelId, type ModelStage } from "@/config/models";
import { hypothesisStatus, modelMeasures } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { getHypothesisResults } from "@/lib/data";
import { cn } from "@/lib/utils";
import { STATUS_SOFT, StatusDot } from "./AdminCharts";
import { NetworkToday } from "./AdminDashboard";
import { AdminSection, AdminShell } from "./AdminShell";

const STAGES: readonly ModelStage[] = ["idea", "rules", "trained"];
const MODEL_NAME = Object.fromEntries(MODELS.map((m) => [m.id, m.name])) as Record<ModelId, string>;

export function AdminData() {
  const t = useTranslations("admin.data");
  const measures = modelMeasures(useAdminInputs());

  return (
    <AdminShell title={t("title")}>
      <AdminSection title={t("models")} aside={<span className="text-small text-muted">{t("stageHint")}</span>}>
        <ul className="divide-y divide-ink/8 border-y border-ink/8">
          {MODELS.map((model) => (
            <ModelRow key={model.id} model={model} measure={measures[model.id]} />
          ))}
        </ul>
      </AdminSection>
      <AdminSection title={t("hypotheses")}>
        <Hypotheses />
      </AdminSection>
      <AdminSection title={t("dataPoints")}>
        <DataPoints />
      </AdminSection>
      <NetworkToday />
    </AdminShell>
  );
}

/** Data → model → result, in one row (stacked on phones). */
function ModelRow({ model, measure }: { model: Model; measure: string | null }) {
  const t = useTranslations("admin.data");
  const inputs = inputsOf(model.id);
  const shown = inputs.slice(0, 4);
  return (
    <li className="grid gap-4 py-6 lg:grid-cols-[minmax(0,1fr)_16px_minmax(0,1.1fr)_16px_minmax(0,1fr)] lg:gap-6">
      <div className="min-w-0">
        <p className="text-small text-muted">{t("inputs", { count: inputs.length })}</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {shown.map((d) => (
            <li key={d.id} className="rounded-full bg-ink/5 px-2.5 py-1 text-small text-ink">
              {d.captures.split(/[(:,]/)[0].trim()}
            </li>
          ))}
          {inputs.length > shown.length && <li className="px-1 py-1 text-small text-muted">+{inputs.length - shown.length}</li>}
        </ul>
      </div>
      <ArrowRight aria-hidden className="mt-7 size-4 text-muted max-lg:hidden" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-h3 text-ink">{model.name}</h3>
          <StageMeter stage={model.stage} />
        </div>
        <p className="mt-2 text-small text-muted">{t("measure")}</p>
        <p className="text-body text-ink">{model.measure}</p>
        <p className="mt-1 text-small text-muted">{measure ? t("now", { value: measure }) : t("notMeasured")}</p>
      </div>
      <ArrowRight aria-hidden className="mt-7 size-4 text-muted max-lg:hidden" />
      <div className="min-w-0">
        <p className="text-small text-muted">{t("output")}</p>
        <p className="text-body text-ink">{model.output}</p>
        <p className="mt-2 text-small text-muted">{t("feeds")}</p>
        <p className="text-body text-ink">{model.feeds}</p>
      </div>
    </li>
  );
}

/** idea · rules · trained as three short segments, the reached ones filled (chart-1), the word beside them. */
function StageMeter({ stage }: { stage: ModelStage }) {
  const t = useTranslations("admin.data.stage");
  const reached = STAGES.indexOf(stage);
  return (
    <span className="inline-flex items-center gap-2 text-small text-muted">
      <span aria-hidden className="flex gap-0.5">
        {STAGES.map((s, i) => (
          <span key={s} className={cn("h-1.5 w-4 rounded-full", i <= reached ? "bg-adm-chart-1" : "bg-ink/10")} />
        ))}
      </span>
      {t(stage)}
    </span>
  );
}

/** Each hypothesis: the statement, how it's measured, target and value now; the verdict as a soft capsule in its status colour. */
function Hypotheses() {
  const t = useTranslations("admin.data.hyp");
  const results = useMemo(() => getHypothesisResults(), []);
  return (
    <ul className="divide-y divide-ink/8 border-y border-ink/8">
      {HYPOTHESES.map((h) => {
        const result = results[h.id];
        const verdict = result?.status ?? "open";
        const status = hypothesisStatus(verdict);
        return (
          <li key={h.id} className="grid gap-x-6 gap-y-2 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <p className="text-body font-semibold text-ink">{h.statement}</p>
              <p className="mt-1 text-small text-muted">
                {t("metric")}: {h.metric} · {t("target")} {h.target} · {t("current")} <span className="font-semibold text-ink">{result?.current ?? "–"}</span>
              </p>
            </div>
            <span className={cn("inline-flex h-7 items-center gap-2 justify-self-start rounded-full px-3 text-small font-medium text-ink", STATUS_SOFT[status])}>
              <StatusDot status={status} />
              {t(`status.${verdict}`)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

type ModelFilter = "all" | ModelId | "none";

/** Every data point, filterable by moment, model and status. */
function DataPoints() {
  const t = useTranslations("admin.data");
  const [moment, setMoment] = useState<"all" | Moment>("all");
  const [model, setModel] = useState<ModelFilter>("all");
  const [status, setStatus] = useState<"all" | DataPointStatus>("all");
  const shown = DATA_POINTS.filter(
    (d) => (moment === "all" || d.moment === moment) && (model === "all" || (model === "none" ? d.models.length === 0 : d.models.includes(model))) && (status === "all" || d.status === status),
  );

  return (
    <>
      <div className="flex flex-col gap-3">
        <FilterRow label={t("filter.moment")}>
          <CapsuleGroup size="sm" label={t("filter.moment")} value={moment} onChange={setMoment} options={(["all", ...MOMENTS] as const).map((value) => ({ value, content: value === "all" ? t("filter.all") : t(`moment.${value}`) }))} />
        </FilterRow>
        <FilterRow label={t("filter.model")}>
          <CapsuleGroup
            size="sm"
            label={t("filter.model")}
            value={model}
            onChange={setModel}
            options={(["all", ...MODEL_IDS, "none"] as const).map((value) => ({ value, content: value === "all" ? t("filter.all") : value === "none" ? t("filter.none") : MODEL_NAME[value] }))}
          />
        </FilterRow>
        <FilterRow label={t("filter.status")}>
          <CapsuleGroup size="sm" label={t("filter.status")} value={status} onChange={setStatus} options={(["all", ...DATA_POINT_STATUSES] as const).map((value) => ({ value, content: value === "all" ? t("filter.all") : t(`dpStatus.${value}`) }))} />
        </FilterRow>
      </div>
      <p className="mb-2 mt-6 text-small text-muted">{t("count", { shown: shown.length, all: DATA_POINTS.length })}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-body">
          <thead className="text-small text-muted">
            <tr className="border-b border-ink/8">
              <th className="py-3 pr-4 font-medium">{t("col.captures")}</th>
              <th className="py-3 pr-4 font-medium">{t("col.moment")}</th>
              <th className="py-3 pr-4 font-medium">{t("col.purpose")}</th>
              <th className="py-3 pr-4 font-medium">{t("col.models")}</th>
              <th className="py-3 pr-4 font-medium">{t("col.basis")}</th>
              <th className="py-3 font-medium">{t("col.status")}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((d) => (
              <tr key={d.id} className="border-b border-ink/8 align-top">
                <td className="max-w-80 py-3 pr-4">
                  <span className="block text-ink">{d.captures}</span>
                  <span className="block text-small text-muted">{d.id}</span>
                </td>
                <td className="whitespace-nowrap py-3 pr-4 text-ink">{t(`moment.${d.moment}`)}</td>
                <td className="max-w-72 py-3 pr-4 text-muted">{d.purpose}</td>
                <td className="py-3 pr-4 text-ink">{d.models.length ? d.models.map((m) => MODEL_NAME[m]).join(", ") : <span className="text-muted">–</span>}</td>
                <td className="whitespace-nowrap py-3 pr-4 text-ink">{t(`basis.${d.legalBasis}`)}</td>
                <td className={cn("whitespace-nowrap py-3", d.status === "planned" ? "text-muted" : "text-ink", d.status === "used" && "font-semibold")}>{t(`dpStatus.${d.status}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-2xl text-small text-muted">{t("never")}</p>
    </>
  );
}

/** A filter: its small label, then the capsules in one scrolling row. */
function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-16 shrink-0 text-small text-muted">{label}</span>
      <ScrollRow label={label} className="min-w-0 flex-1">
        {children}
      </ScrollRow>
    </div>
  );
}
