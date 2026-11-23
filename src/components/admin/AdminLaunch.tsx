"use client";

// Admin › System › Launch-Vorbereitung › Launch: the checklist before the launch (config/launch.ts) in four groups – Kriterien, Technik,
// Recht, Inhalte. Each point checked automatically where the code or the data can tell: the criteria from lib/admin/metrics.ts
// launchProgress, the server's facts (lib/launchChecks.ts: legal drafts, Impressum, preview gate, Stripe key set, DEMO_ALWAYS_ON in the
// source, the width test's report), the rest from the config (delivery, duties, founder, help, guides). Manual points can be confirmed by
// hand (AdminData.launchChecks, logged).
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ADDRESS_FIELDS } from "@/config/company";
import { HELP } from "@/config/help";
import { LAUNCH_GROUPS, LAUNCH_POINTS, type LaunchPoint } from "@/config/launch";
import { DELIVERY } from "@/config/notifications";
import { DUTIES, dutyStatus } from "@/config/obligations";
import { FOUNDER } from "@/config/pages";
import { GUIDES } from "@/config/seo";
import { useAdminActions } from "@/lib/admin/actions";
import { launchProgress } from "@/lib/admin/metrics";
import { useAdminData } from "@/lib/admin/store";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { day, num } from "@/lib/i18n/adminFormat";
import type { LaunchFacts } from "@/lib/launchChecks";
import { StatusDot } from "./AdminCharts";
import { roadmapTodos } from "@/lib/roadmap";

interface Check {
  ok: boolean;
  /** The values for its line (admin.de.ts platform.launch.items.<id>.text) */
  values: Record<string, string | number>;
}

export function AdminLaunch({ facts }: { facts: LaunchFacts | null }) {
  const t = useTranslations("admin.platform.launch");
  const inputs = useAdminInputs();
  const data = useAdminData();
  const { confirmLaunchCheck } = useAdminActions();
  const progress = launchProgress(inputs);
  const met = (p: { value: number; target: number }) => p.value >= p.target;
  const helpCount = Object.values(HELP).reduce((n, items) => n + items.length, 0);
  const reviewed = DUTIES.filter((d) => dutyStatus(d) === "reviewed").length;

  const checks: Record<string, Check> = {
    houses: { ok: met(progress.houses), values: { value: num(progress.houses.value), target: num(progress.houses.target) } },
    hubs: { ok: met(progress.hubs), values: { value: num(progress.hubs.value), target: num(progress.hubs.target) } },
    reserved: { ok: met(progress.reservedShare), values: { value: num(progress.reservedShare.value), target: num(progress.reservedShare.target) } },
    waitlist: { ok: met(progress.waitlist), values: { value: num(progress.waitlist.value), target: num(progress.waitlist.target) } },
    demoOff: {
      ok: facts ? facts.appMode !== "demo" && facts.demoAlwaysOn === false : false,
      values: { mode: facts?.appMode ?? "–", found: facts?.demoAlwaysOn === null || !facts ? t("unknown") : facts.demoAlwaysOn ? t("found") : t("notFound") },
    },
    previewOff: { ok: facts ? !facts.previewGate : false, values: { state: facts?.previewGate ? t("on") : t("off") } },
    stripeLive: { ok: facts ? facts.stripe.provider === "stripe" && facts.stripe.keySet : false, values: { provider: facts?.stripe.provider ?? "–", key: facts?.stripe.keySet ? t("keySet") : t("keyMissing") } },
    emailActive: { ok: DELIVERY.email !== "mock", values: { mode: DELIVERY.email === "mock" ? t("mock") : DELIVERY.email } },
    pushActive: { ok: DELIVERY.push !== "mock", values: { mode: DELIVERY.push === "mock" ? t("mock") : DELIVERY.push } },
    widthTest: { ok: facts?.widthTest ? facts.widthTest.errors === 0 : false, values: { state: facts?.widthTest ? t("widthResult", { errors: facts.widthTest.errors, at: facts.widthTest.at ?? "–" }) : t("widthNever") } },
    noDrafts: { ok: facts ? facts.legal.drafts.length === 0 : false, values: { state: facts ? (facts.legal.drafts.length ? t("drafts", { list: facts.legal.drafts.join(", ") }) : t("noDraftsOk")) : "–" } },
    impressum: { ok: facts ? facts.legal.companyGaps.length === 0 : false, values: { state: facts ? (facts.legal.companyGaps.length ? t("gaps", { list: facts.legal.companyGaps.join(", ") }) : t("gapsNone")) : "–" } },
    duties: { ok: reviewed === DUTIES.length, values: { reviewed, total: DUTIES.length } },
    impressumAddress: { ok: facts ? !facts.legal.companyGaps.some((g) => (ADDRESS_FIELDS as readonly string[]).includes(g)) : false, values: { state: facts && !facts.legal.companyGaps.some((g) => (ADDRESS_FIELDS as readonly string[]).includes(g)) ? t("addressOk") : t("addressMissing") } },
    founder: { ok: FOUNDER.name !== null, values: { state: FOUNDER.name ? t("founderOk") : t("founderMissing") } },
    help: { ok: helpCount > 0, values: { count: helpCount, topics: Object.keys(HELP).length } },
    guides: { ok: GUIDES.length > 0, values: { count: GUIDES.length } },
  };

  const confirmed = data.launchChecks ?? {};
  const stateOf = (p: LaunchPoint): "ok" | "manual" | "open" => (checks[p.id]?.ok ? "ok" : p.manual && confirmed[p.id] ? "manual" : "open");
  // The to-dos due "vor Launch" (System › Zeitplan & Vorbereitung) belong to the checklist too – their status comes from there.
  const prepTodos = roadmapTodos(data).filter((x) => x.due === "beforeLaunch");
  const done = LAUNCH_POINTS.filter((p) => stateOf(p) !== "open").length + prepTodos.filter((x) => x.status === "done").length;
  const total = LAUNCH_POINTS.length + prepTodos.length;

  return (
    <>
      <p data-launch-count className="text-h3 tabular-nums text-ink">
        {t("count", { done, total })}
      </p>
      <p className="mt-2 max-w-3xl text-small text-muted">{t("note")}</p>
      {/* Compact (CLAUDE.md "Admin › System": detail tabs without scrolling at 1440 × 900): the groups in two columns, one line per point –
          the status as a dot (its word in the tooltip and for screen readers), the explanation muted after the title. */}
      <div className="mt-(--adm-inner) grid gap-x-10 gap-y-5 xl:grid-cols-2">
        {[...LAUNCH_GROUPS, ...(prepTodos.length > 0 ? (["prep"] as const) : [])].map((group) => (
          <section key={group} aria-labelledby={`launch-${group}`} className="min-w-0">
            <h2 id={`launch-${group}`} className="mb-1 text-eyebrow uppercase text-(--adm-label)">
              {t(`groups.${group}`)}
            </h2>
            <ul className="divide-y divide-ink/8 border-y border-ink/8">
              {group === "prep"
                ? prepTodos.map((x) => (
                    <Row key={x.id} id={`todo-${x.id}`} ok={x.status === "done"} statusLabel={t(`todoStatus.${x.status}`)} title={x.title} text={x.text} action={<Link href="/admin/zeitplan?tab=prep&focus=beforeLaunch" className="text-small font-semibold text-ink hover:underline">{t("open")} →</Link>} />
                  ))
                : LAUNCH_POINTS.filter((p) => p.group === group).map((p) => {
                    const state = stateOf(p);
                    const title = t(`items.${p.id}.title` as "items.houses.title");
                    const text = t(`items.${p.id}.text` as "items.houses.text", checks[p.id]?.values ?? {}) + (state === "manual" ? ` · ${t("confirmedAt", { date: day(confirmed[p.id]) })}` : "");
                    return (
                      <Row
                        key={p.id}
                        id={p.id}
                        ok={state !== "open"}
                        statusLabel={t(`status.${state}`)}
                        title={title}
                        text={text}
                        action={
                          <>
                            {p.manual && state !== "ok" && (
                              <button type="button" onClick={() => confirmLaunchCheck(p.id, title, state !== "manual")} className="adm-press rounded-full px-2 text-small font-semibold text-ink hover:bg-ink/6">
                                {state === "manual" ? t("undo") : t("confirm")}
                              </button>
                            )}
                            {p.href && (
                              <Link href={p.href} className="text-small font-semibold text-ink hover:underline">
                                {t("open")} →
                              </Link>
                            )}
                          </>
                        }
                      />
                    );
                  })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

/** One point of the checklist on one line: the status dot (its word as tooltip), title, the explanation muted, the action right. */
function Row({ id, ok, statusLabel, title, text, action }: { id: string; ok: boolean; statusLabel: string; title: string; text: string; action: React.ReactNode }) {
  return (
    <li data-launch-point={id} data-launch-state={ok ? "ok" : "open"} className="flex min-h-9 items-center gap-3 py-1">
      <span data-tooltip-info={statusLabel} className="flex shrink-0 items-center">
        <StatusDot status={ok ? "good" : "warning"} />
        <span className="sr-only">{statusLabel}</span>
      </span>
      <p className="min-w-0 flex-1 truncate text-body">
        <span className="font-semibold text-ink">{title}</span>
        <span className="text-small text-muted"> · {text}</span>
      </p>
      <span className="flex shrink-0 items-center gap-3">{action}</span>
    </li>
  );
}
