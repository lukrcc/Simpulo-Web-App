"use client";

import { Check, CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ListRow } from "@/components/stay/DetailSection";
import { PaySheet } from "@/components/stay/PaySheet";
import { Button } from "@/components/ui/ActionButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cardClass } from "@/components/ui/Card";
import { useFormat } from "@/i18n/format";
import { getMyPayment, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The current user's own share of a locked House: "Your share: €528 · due Jan 20 · Pay now" while pending,
 * a quiet paid line afterwards. Nothing when they owe nothing (not in the crew, or not locked).
 * `variant="panel"`: a list row for Your houses (amount, status badge, Pay now).
 */
export function MyShare({ stay, variant = "banner", className }: { stay: Stay; variant?: "banner" | "panel"; className?: string }) {
  const t = useTranslations("house.banner");
  const f = useFormat();
  const store = useStore();
  const [paying, setPaying] = useState(false);
  const tSection = useTranslations("houses.detail.sections");
  const payment = getMyPayment(store, stay.id);
  // Before the crew is complete there's nothing to pay yet.
  if (!payment || stay.accommodationStatus !== "locked" || (payment.status !== "paid" && !stay.paymentDueAt)) return null;
  const due = stay.paymentDueAt;

  // Your houses (Joined → Your payment): one list row – amount, status, Pay now as a tertiary action.
  if (variant === "panel") {
    const amount = f.price(payment.total, stay.currency);
    const paid = payment.status === "paid";
    return (
      <div className={className}>
        <ListRow
          lead={<CreditCard aria-hidden />}
          title={amount}
          subtitle={paid && payment.paidAt ? t("paidOn", { date: f.day(payment.paidAt) }) : due ? tSection("payBy", { date: `${f.day(due)} ${f.time(due)}` }) : undefined}
          aside={<StatusBadge status={paid ? "paid" : "pending"} />}
          action={
            !paid && (
              <Button variant="tertiary" onClick={() => setPaying(true)} data-preview-action>
                {t("payNow")}
              </Button>
            )
          }
        />
        <PaySheet stay={stay} open={paying} onClose={() => setPaying(false)} />
      </div>
    );
  }

  if (payment.status === "paid") {
    return (
      <p className={cn("flex items-center gap-1.5 text-small text-muted", className)}>
        <Check className="size-4 text-accent" aria-hidden />
        {t("paid")}
      </p>
    );
  }

  return (
    <div className={cn(cardClass, "flex flex-wrap items-center gap-3", className)}>
      <CreditCard className="size-5 shrink-0 text-muted" aria-hidden />
      <p className="min-w-0 flex-1 text-body text-ink">
        {t.rich("yourShare", {
          amount: f.price(payment.total, stay.currency),
          date: due ? `${f.day(due)} ${f.time(due)}` : "–",
          b: (chunks) => <span className="font-semibold text-ink">{chunks}</span>,
        })}
      </p>
      <Button variant="secondary" onClick={() => setPaying(true)} data-preview-action>
        {t("payNow")}
      </Button>
      <PaySheet stay={stay} open={paying} onClose={() => setPaying(false)} />
    </div>
  );
}
