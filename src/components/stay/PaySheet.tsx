"use client";

import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { formInput } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { useFormat } from "@/i18n/format";
import { payments, type PaymentMethodInput } from "@/lib/payments";
import { getMyPayment, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The test card, filled in outside production (the provider's own test number). */
const TEST_CARD = process.env.NODE_ENV === "production" ? "" : "4242 4242 4242 4242";

/**
 * "Pay your share": what it's for and what it costs (share, host experience, Simpulo's fee – included), by when, the payment element (card or a
 * wallet), "Pay €410". Then a check and "You're in", or "Card declined – try another card". Everything through lib/payments.
 */
export function PaySheet({ stay, open, onClose }: { stay: Stay; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={useTranslations("house.pay")("title")}>
      {/* Remounted per open, so a declined attempt doesn't linger. */}
      {open && <PayForm stay={stay} onDone={onClose} />}
    </Sheet>
  );
}

function PayForm({ stay, onDone }: { stay: Stay; onDone: () => void }) {
  const t = useTranslations("house.pay");
  const store = useStore();
  const payment = getMyPayment(store, stay.id);
  const [done, setDone] = useState(false);

  if (done) return <PaidView onClose={onDone} />;
  if (!payment) return <p className="text-small text-muted">{t("nothingToPay")}</p>;
  if (payment.status === "paid") return <p className="text-small text-muted">{t("alreadyPaid")}</p>;

  return (
    <CardPayForm
      onCancel={onDone}
      stay={stay}
      amounts={payment}
      onPay={async (method) => {
        const intent = await payments.createPaymentIntent(stay.id, payment.userId);
        const result = await payments.confirmPayment(intent, method);
        if (result.status !== "succeeded") return "declined";
        store.markSharePaid(stay.id);
        setDone(true);
        return "paid";
      }}
    />
  );
}

/** Paid: a check drawing in, and what happens next. */
function PaidView({ onClose }: { onClose: () => void }) {
  const t = useTranslations("house.pay");
  return (
    <div role="status" className="flex flex-col items-center py-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-ink text-white motion-safe:animate-check-in">
        <Check className="size-8" strokeWidth={2.5} aria-hidden />
      </span>
      <p className="mt-5 text-h3 text-ink">{t("successTitle")}</p>
      <p className="mt-1 text-body text-muted">{t("successText")}</p>
      <ModalFooter className="mt-8 w-full">
        <Button onClick={onClose}>{t("done")}</Button>
      </ModalFooter>
    </div>
  );
}

interface CardPayFormProps {
  onCancel?: () => void;
  stay: Stay;
  /** What's charged: share, optional host experience, Simpulo fee, total */
  amounts: { share: number; hostFee?: number; fee: number; total: number };
  /** Charges the method; "declined" keeps the form open with a note */
  onPay: (method: PaymentMethodInput) => Promise<"paid" | "declined">;
}

/** The summary, the deadline and the payment element (mock): paying a share, or joining through an invite link. */
export function CardPayForm({ stay, amounts, onPay, onCancel }: CardPayFormProps) {
  const t = useTranslations("house.pay");
  const tPremium = useTranslations("growth.premium");
  const f = useFormat();
  const [card, setCard] = useState(TEST_CARD);
  const [expiry, setExpiry] = useState(TEST_CARD ? "12/30" : "");
  const [cvc, setCvc] = useState(TEST_CARD ? "123" : "");
  const [busy, setBusy] = useState<PaymentMethodInput["kind"] | null>(null);
  const [declined, setDeclined] = useState(false);

  const money = (amount: number) => f.price(amount, stay.currency);
  const complete = card.replace(/\s/g, "").length >= 12 && expiry.trim().length >= 4 && cvc.trim().length >= 3;

  async function pay(method: PaymentMethodInput) {
    if (busy) return;
    setBusy(method.kind);
    setDeclined(false);
    const result = await onPay(method);
    setBusy(null);
    if (result === "declined") setDeclined(true);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (complete) void pay({ kind: "card", number: card });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div>
        <p className="text-body font-semibold text-ink">{stay.title}</p>
        <p className="text-small text-muted">
          {f.stayDatesLong(stay)} · {f.placeName(stay)}
        </p>
      </div>
      <dl className="rounded-2xl bg-ink/4 px-5 py-2">
        <Row label={amounts.hostFee ? tPremium("share") : t("share")} value={money(amounts.share)} />
        {amounts.hostFee ? <Row label={tPremium("fieldLabel")} value={money(amounts.hostFee)} /> : null}
        <Row label={t("feeIncluded")} value={money(amounts.fee)} muted />
        <Row label={t("total")} value={money(amounts.total)} strong />
      </dl>
      {stay.paymentDueAt && <p className="-mt-3 text-small text-muted">{t("payBy", { date: `${f.day(stay.paymentDueAt)}, ${f.time(stay.paymentDueAt)}` })}</p>}

      {/* The payment element (mock): wallets first, then the card. */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => void pay({ kind: "apple_pay" })}>
            {busy === "apple_pay" ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t("applePay")}
          </Button>
          <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => void pay({ kind: "google_pay" })}>
            {busy === "google_pay" ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {t("googlePay")}
          </Button>
        </div>
        <p className="text-center text-small text-muted">{t("orCard")}</p>
        <input inputMode="numeric" autoComplete="cc-number" value={card} onChange={(e) => setCard(e.target.value)} placeholder="1234 5678 9012 3456" aria-label={t("cardNumber")} className={cn(formInput, "tabular-nums")} />
        <div className="grid grid-cols-2 gap-3">
          <input inputMode="numeric" autoComplete="cc-exp" value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder={t("expiryPlaceholder")} aria-label={t("expiry")} className={cn(formInput, "tabular-nums")} />
          <input inputMode="numeric" autoComplete="cc-csc" value={cvc} onChange={(e) => setCvc(e.target.value)} placeholder={t("cvcPlaceholder")} aria-label={t("cvc")} className={cn(formInput, "tabular-nums")} />
        </div>
        <p className="text-small text-muted">{t("mockNote")}</p>
      </div>

      {declined && (
        <p role="alert" className="rounded-2xl bg-ink/6 px-4 py-3 text-body font-semibold text-ink">
          {t("declined")}
        </p>
      )}

      <ModalFooter onCancel={onCancel}>
        <Button type="submit" disabled={!complete || busy !== null}>
          {busy === "card" ? <Loader2 className="animate-spin" aria-label={t("processing")} /> : t("payButton", { amount: money(amounts.total) })}
        </Button>
      </ModalFooter>
    </form>
  );
}

function Row({ label, value, strong = false, muted = false }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-body">
      <dt className={strong ? "font-semibold text-ink" : "text-muted"}>{label}</dt>
      <dd className={cn("tabular-nums", strong ? "font-semibold text-ink" : muted ? "text-muted" : "text-ink")}>{value}</dd>
    </div>
  );
}
