"use client";

import { Check, CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PaySheet } from "@/components/stay/PaySheet";
import { buttonClass } from "@/components/ui/button";
import { useFormat } from "@/i18n/format";
import { getLockDetails, getMyPayment, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The current user's own share of a locked House: "Your share: €528 · due Jan 20 · Pay now" while pending,
 * a quiet paid line afterwards. Nothing when they owe nothing (not in the crew, or not locked).
 * `variant="panel"`: the compact form for the joined-House panel ("Paid ✓ · Jan 18").
 */
export function MyShare({ stay, variant = "banner", className }: { stay: Stay; variant?: "banner" | "panel"; className?: string }) {
  const t = useTranslations("house.banner");
  const f = useFormat();
  const store = useStore();
  const [paying, setPaying] = useState(false);
  const payment = getMyPayment(store, stay.id);
  if (!payment || stay.accommodationStatus !== "locked") return null;

  if (payment.status === "paid") {
    return (
      <p className={cn("flex items-center gap-1.5 text-sm text-zinc-500", className)}>
        <Check className="size-4 text-emerald-600" aria-hidden />
        {variant === "panel" && payment.paidAt ? t("paidOn", { date: f.day(payment.paidAt) }) : t("paid")}
      </p>
    );
  }

  const due = stay.payByDate ?? getLockDetails(store, stay)?.payBy;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3",
        variant === "banner" ? "rounded-2xl bg-white p-4" : "rounded-2xl bg-page p-4",
        className,
      )}
    >
      {variant === "banner" && (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <CreditCard className="size-5" aria-hidden />
        </span>
      )}
      <p className="min-w-0 flex-1 text-sm text-neutral-700">
        {t.rich("yourShare", {
          amount: f.price(payment.total, stay.currency),
          date: due ? f.day(due) : "–",
          b: (chunks) => <span className="font-semibold text-ink">{chunks}</span>,
        })}
      </p>
      <button type="button" onClick={() => setPaying(true)} className={buttonClass("dark", "sm", "shrink-0")}>
        {t("payNow")}
      </button>
      <PaySheet stay={stay} open={paying} onClose={() => setPaying(false)} />
    </div>
  );
}
