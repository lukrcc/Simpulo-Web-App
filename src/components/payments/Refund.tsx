"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/i18n/format";
import type { Currency, Payment } from "@/lib/types";

/** What goes back: the whole payment, or less when Simpulo's fee stays (a spot that went to the waitlist). */
export const refundAmountOf = (payment: Pick<Payment, "total" | "refundedAmount">) => payment.refundedAmount ?? payment.total;

/** "Refund of €410 on its way · 5–10 days" – a line (Settings › Payments). */
export function RefundLine({ payment, currency }: { payment: Payment; currency?: Currency }) {
  const t = useTranslations("refund");
  const f = useFormat();
  return <>{t("line", { amount: f.price(refundAmountOf(payment), currency) })}</>;
}

/**
 * The same as a note with its reason: the host didn't confirm the booking in 48h, the spot went to the waitlist, or the House was left / cancelled.
 * Your houses › House › Payment.
 */
export function RefundNotice({ payment, currency, reason }: { payment: Payment; currency: Currency; reason: "booking_not_confirmed" | "spot_transferred" | "cancelled" }) {
  const t = useTranslations("refund");
  const f = useFormat();
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink/6 text-ink">
        <RotateCcw className="size-4.5" aria-hidden />
      </span>
      <div>
        <p className="text-body font-semibold text-ink">{t("line", { amount: f.price(refundAmountOf(payment), currency) })}</p>
        <p className="text-small text-muted">{t(`reason.${reason}`)}</p>
      </div>
    </div>
  );
}
