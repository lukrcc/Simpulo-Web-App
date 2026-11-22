"use client";

import Link from "next/link";

// The admin's main-number pieces (CLAUDE.md "Admin › Kennzahlen"): the change "like a stock" under a number (computed only by getChange in
// lib/admin/metrics.ts, its colour by better/worse – sage, ember, grey ±0, ink when neither is better) and the ⓘ with one sentence.
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Change } from "@/lib/admin/metrics";
import { dec, eur, num, signed, signedPct } from "@/lib/i18n/adminFormat";
import type { Status } from "@/lib/admin/metrics";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** The ⓘ's sentence on touch: this wide at most. */
const TIP_WIDTH = 320;
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
  // Hover (mouse): the one Tooltip shows the aria-label. Touch has no hover: a tap opens the sentence in the tooltip's glass under the ⓘ
  // (kept inside the window), a tap anywhere or 6s later closes it.
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!at) return;
    const close = () => setAt(null);
    // A tap on the ⓘ itself toggles it (its click); anywhere else closes.
    const onDown = (e: PointerEvent) => !button.current?.contains(e.target as Node) && close();
    const timer = window.setTimeout(close, 6000);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", close, { passive: true, capture: true });
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", close, { capture: true });
    };
  }, [at]);
  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={text}
        aria-expanded={at ? true : undefined}
        onClick={(e) => {
          if (!window.matchMedia("(pointer: coarse)").matches) return;
          const r = e.currentTarget.getBoundingClientRect();
          const width = Math.min(TIP_WIDTH, window.innerWidth - 32);
          setAt((open) => (open ? null : { top: r.bottom + 8, left: Math.max(16, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - 16 - width)) }));
        }}
        className="relative z-10 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-ink/5 hover:text-ink"
      >
        <Info aria-hidden className="size-4" />
      </button>
      {at &&
        createPortal(
          <span role="tooltip" data-info-tip style={{ top: at.top, left: at.left, width: `min(${TIP_WIDTH}px, calc(100vw - 32px))` }} className="tooltip-box animate-fade-in fixed z-80 normal-case">
            {text}
          </span>,
          document.body,
        )}
    </>
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
  items: readonly { key: string; label: string; info: string; value: ReactNode; change: Change | null; against?: string; target?: { text: string; status: Status | null }; sub?: ReactNode; /** The label as a link (e.g. to its tab in Geld) */ href?: string }[];
  className?: string;
}) {
  return (
    <dl data-key-numbers className={cn("grid grid-cols-2 gap-y-(--adm-inner) md:grid-cols-3", className)}>
      {items.map((n, i) => (
        <div key={n.key} className={cn("min-w-0 pr-4 md:px-6 lg:first:pl-0", i > 0 && "lg:border-l lg:border-ink/8", i % 3 !== 0 && "md:max-lg:border-l md:max-lg:border-ink/8", i % 3 === 0 && "md:max-lg:pl-0", i % 2 === 1 && "max-md:border-l max-md:border-ink/8 max-md:pl-4")}>
          <dt className="flex items-center gap-1 text-eyebrow uppercase text-(--adm-label)">
            {n.href ? (
              <Link href={n.href} data-key-link className="underline-offset-4 hover:text-ink hover:underline">
                {n.label} →
              </Link>
            ) : (
              n.label
            )}
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

/**
 * A main number as a card (Admin › Übersicht): a surface a step lighter than the ground (--adm-block), a fine edge, radius 12, a 2px stripe
 * on top in its group's colour (Geld violet, Kern turquoise); its label with ⓘ, the number, ONE line change · target, and at the bottom its
 * footer (only Gewinn: the months in a row – no small charts in cards, Regel „Admin-Diagramme“). With `href` the whole card is a link (a stretched link under the ⓘ).
 */
export function MetricCard({
  label,
  info,
  value,
  change,
  target,
  accent,
  href,
  openLabel,
  footer,
}: {
  label: string;
  info: string;
  value: ReactNode;
  change: Change | null;
  target?: { text: string; status: Status | null };
  accent: "primary" | "chart-2";
  href?: string;
  openLabel?: string;
  footer?: ReactNode;
}) {
  return (
    <div data-metric-card className="relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-ink/8 bg-(--adm-block) px-4 pt-3.5 pb-3 transition-colors duration-150 has-[[data-card-link]:hover]:bg-(--adm-block-hover)">
      <span aria-hidden className={cn("absolute inset-x-0 top-0 h-0.5", accent === "primary" ? "bg-adm-chart-primary" : "bg-adm-chart-2")} />
      {href && <Link href={href} data-card-link aria-label={openLabel ?? label} className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)" />}
      <dt className="flex items-center gap-1 text-eyebrow uppercase text-(--adm-label)">
        {label}
        {href && <span aria-hidden> →</span>}
        <InfoTip text={info} />
      </dt>
      <dd className="mt-1 text-h1 tabular-nums text-ink">{value}</dd>
      <dd className="mt-1">
        <ChangeLine change={change} target={target} className="block" />
      </dd>
      {footer && <dd className="mt-auto pt-3 text-small text-muted">{footer}</dd>}
    </div>
  );
}
