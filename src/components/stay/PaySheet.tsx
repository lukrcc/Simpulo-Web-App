"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { FormField, formInput } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { getMyPayment, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Dev convenience: Stripe's classic test card. Any input is accepted; 0000… is declined (see store.payShare). */
const DEV_CARD = process.env.NODE_ENV === "production" ? "" : "4242 4242 4242 4242";

const inputClass = cn(formInput, "tabular-nums");

/**
 * Guest pays their share of the locked place (mock – no real card network). Entry points: the lock card in the
 * crew chat and the banner on the House page.
 */
export function PaySheet({ stay, open, onClose }: { stay: Stay; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={useTranslations("house.pay")("title")} size="wide">
      {/* Remounted per open, so a declined attempt doesn't linger. */}
      {open && <PayForm stay={stay} onDone={onClose} />}
    </Sheet>
  );
}

function PayForm({ stay, onDone }: { stay: Stay; onDone: () => void }) {
  const t = useTranslations("house.pay");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const payment = getMyPayment(store, stay.id);

  if (!payment) return <p className="text-small text-muted">{t("nothingToPay")}</p>;
  if (payment.status === "paid") return <p className="text-small text-muted">{t("alreadyPaid")}</p>;

  return (
    <CardPayForm
      stay={stay}
      amounts={payment}
      onPay={async (card) => {
        const result = await store.payShare(stay.id, card);
        if (result === "paid") {
          showToast(t("paidToast", { amount: f.price(payment.total, stay.currency) }));
          onDone();
        }
        return result;
      }}
    />
  );
}

interface CardPayFormProps {
  stay: Stay;
  /** What's charged: share, optional host programme fee, Simpulo fee, total */
  amounts: { share: number; hostFee?: number; fee: number; total: number };
  /** Charges the card (mock); "declined" keeps the form open with a note */
  onPay: (cardNumber: string) => Promise<"paid" | "declined">;
}

/** The breakdown and the card fields (mock card network) – paying a share, or joining through an invite link. */
export function CardPayForm({ stay, amounts, onPay }: CardPayFormProps) {
  const t = useTranslations("house.pay");
  const tPremium = useTranslations("growth.premium");
  const f = useFormat();
  const payment = amounts;
  const [card, setCard] = useState(DEV_CARD);
  const [expiry, setExpiry] = useState(DEV_CARD ? "12/30" : "");
  const [cvc, setCvc] = useState(DEV_CARD ? "123" : "");
  const [busy, setBusy] = useState(false);
  const [declined, setDeclined] = useState(false);

  const money = (amount: number) => f.price(amount, stay.currency);
  const complete = card.replace(/\s/g, "").length >= 12 && expiry.trim().length >= 4 && cvc.trim().length >= 3;

  async function pay(e: FormEvent) {
    e.preventDefault();
    if (!complete || busy) return;
    setBusy(true);
    setDeclined(false);
    const result = await onPay(card);
    setBusy(false);
    if (result === "declined") setDeclined(true);
  }

  return (
    <form onSubmit={pay} className="space-y-5">
      <dl className="divide-y divide-line border-b border-line">
        <Row label={payment.hostFee ? tPremium("share") : t("share")} value={money(payment.share)} />
        {payment.hostFee ? <Row label={tPremium("fieldLabel")} value={money(payment.hostFee)} /> : null}
        <Row label={t("fee")} value={money(payment.fee)} />
        <Row label={t("total")} value={money(payment.total)} strong />
      </dl>

      <FormField label={t("card")} group helper={t("mockNote")}>
        <div className="space-y-3">
          <input
            inputMode="numeric"
            autoComplete="cc-number"
            value={card}
            onChange={(e) => setCard(e.target.value)}
            placeholder="1234 5678 9012 3456"
            aria-label={t("cardNumber")}
            className={inputClass}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              inputMode="numeric"
              autoComplete="cc-exp"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              placeholder={t("expiryPlaceholder")}
              aria-label={t("expiry")}
              className={inputClass}
            />
            <input
              inputMode="numeric"
              autoComplete="cc-csc"
              value={cvc}
              onChange={(e) => setCvc(e.target.value)}
              placeholder={t("cvcPlaceholder")}
              aria-label={t("cvc")}
              className={inputClass}
            />
          </div>
        </div>
      </FormField>

      {declined && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-body text-red-700">
          {t("declined")}
        </p>
      )}

      <Button type="submit" size="lg" disabled={!complete || busy} className="w-full">
        {busy ? <Loader2 className="animate-spin" aria-label={t("processing")} /> : t("payButton", { amount: money(payment.total) })}
      </Button>
    </form>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 text-body">
      <dt className={strong ? "font-semibold text-ink" : "text-muted"}>{label}</dt>
      <dd className={cn("tabular-nums", strong ? "text-body font-semibold" : "text-ink")}>{value}</dd>
    </div>
  );
}
