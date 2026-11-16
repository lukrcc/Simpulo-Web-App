"use client";

// The admin's main-number pieces (CLAUDE.md "Admin › Kennzahlen"): the change "like a stock" under a number (computed only by getChange in
// lib/admin/metrics.ts, its colour by better/worse – sage, ember, grey ±0, ink when neither is better) and the ⓘ with one sentence.
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Change } from "@/lib/admin/metrics";
import { dec, eur, num, signed, signedPct } from "@/lib/i18n/adminFormat";
import type { Status } from "@/lib/admin/metrics";
import type { ReactNode } from "react";
import { StatusDot } from "./AdminCharts";
import { cn } from "@/lib/utils";

const TREND_TEXT = { better: "text-adm-good", worse: "text-adm-critical", same: "text-muted", neutral: "text-ink" } as const;

/**
 * "▲ +3 (+8,6 %)" · "▼ −300 € (−6,4 %)" · "▲ +3 Pkt." · "±0" – coloured by better/worse; `against` follows ("ggü. Oktober"). With `target`
 * change and target share one line: "▲ +3 · Ziel 44" (the target with its status dot).
 */
export function ChangeLine({ change, against, target, className }: { change: Change | null; against?: string; target?: { text: string; status: Status | null }; className?: string }) {
  const t = useTranslations("admin.cockpit.change");
  const goal = target && (
    <span className="text-muted">
      {" · "}
      <StatusDot status={target.status} className="mr-1 inline-block align-middle" />
      {target.text}
    </span>
  );
  if (!change)
    return (
      <span className={cn("text-small text-muted", className)}>
        {t("none")}
        {goal}
      </span>
    );
  const arrow = change.delta > 0 ? "▲ " : change.delta < 0 ? "▼ " : "";
  const amount =
    change.delta === 0
      ? t("same")
      : change.unit === "percent"
        ? t("points", { value: signed(change.delta) })
        : `${signed(change.delta, change.unit === "eur" ? eur : change.unit === "ratio" ? dec : num)}${change.relative !== null ? ` (${signedPct(change.relative)})` : ""}`;
  return (
    <span className={cn("text-small", className)}>
      <span className={cn("font-semibold tabular-nums", TREND_TEXT[change.trend])}>
        {arrow}
        {amount}
      </span>
      {(change.trend === "better" || change.trend === "worse") && <span className="sr-only"> ({t(change.trend)})</span>}
      {against && <span className="text-muted"> {against}</span>}
      {goal}
    </span>
  );
}

/** ⓘ beside a main number: one sentence what it means (the tooltip shows the button's aria-label). */
export function InfoTip({ text }: { text: string }) {
  return (
    <button type="button" aria-label={text} className="relative z-10 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-ink/5 hover:text-ink">
      <Info aria-hidden className="size-4" />
    </button>
  );
}


/**
 * A row of main numbers on the page (no cards): each its short label (at most three words, caps) with ⓘ, the number, and ONE line "▲ +3 ·
 * Ziel 44" (the change from getChange, the target with its status dot). An explaining sentence never stands under the number – it goes
 * into the ⓘ (a text `sub` is added to it). Columns split by a 1px line.
 */
export function KeyNumbers({
  items,
  className,
}: {
  items: readonly { key: string; label: string; info: string; value: string; change: Change | null; against?: string; target?: { text: string; status: Status | null }; sub?: ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-2 gap-y-(--adm-inner) lg:grid-cols-3", className)}>
      {items.map((n, i) => (
        <div key={n.key} className={cn("min-w-0 pr-4 lg:px-6 lg:first:pl-0", i > 0 && "lg:border-l lg:border-ink/8", i % 2 === 1 && "max-lg:border-l max-lg:border-ink/8 max-lg:pl-4")}>
          <dt className="flex items-center gap-1 text-eyebrow uppercase text-(--adm-label)">
            {n.label}
            <InfoTip text={typeof n.sub === "string" ? `${n.info} ${n.sub}` : n.info} />
          </dt>
          <dd className="mt-1 text-h1 tabular-nums text-ink">{n.value}</dd>
          <dd className="mt-1">
            <ChangeLine change={n.change} target={n.target} className="block" />
          </dd>
          {n.sub && typeof n.sub !== "string" && <dd className="mt-1 text-small text-muted">{n.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}
