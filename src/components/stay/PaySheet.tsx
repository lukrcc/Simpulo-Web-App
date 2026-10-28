"use client";

import { CreditCard, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { sheetButtonClass } from "@/components/auth/AuthSheet";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { getMyPayment, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Dev convenience: Stripe's classic test card. Any input is accepted; 0000… is declined (see store.payShare). */
const DEV_CARD = process.env.NODE_ENV === "production" ? "" : "4242 4242 4242 4242";

const inputClass =
  "h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-[15px] tabular-nums outline-none transition-colors placeholder:text-neutral-400 focus:border-ink";

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
  const tPremium = useTranslations("growth.premium");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const payment = getMyPayment(store, stay.id);
  const [card, setCard] = useState(DEV_CARD);
  const [expiry, setExpiry] = useState(DEV_CARD ? "12/30" : "");
  const [cvc, setCvc] = useState(DEV_CARD ? "123" : "");
  const [busy, setBusy] = useState(false);
  const [declined, setDeclined] = useState(false);

  if (!payment) return <p className="text-sm text-zinc-500">{t("nothingToPay")}</p>;
  if (payment.status === "paid") return <p className="text-sm text-zinc-500">{t("alreadyPaid")}</p>;

  const money = (amount: number) => f.price(amount, stay.currency);
  const complete = card.replace(/\s/g, "").length >= 12 && expiry.trim().length >= 4 && cvc.trim().length >= 3;

  async function pay(e: FormEvent) {
    e.preventDefault();
    if (!complete || busy) return;
    setBusy(true);
    setDeclined(false);
    const result = await store.payShare(stay.id, card);
    setBusy(false);
    if (result === "declined") {
      setDeclined(true);
      return;
    }
    showToast(t("paidToast", { amount: money(payment!.total) }));
    onDone();
  }

  return (
    <form onSubmit={pay} className="space-y-5">
      <dl className="divide-y divide-black/5 rounded-2xl bg-page px-4">
        <Row label={payment.hostFee ? tPremium("share") : t("share")} value={money(payment.share)} />
        {payment.hostFee ? <Row label={tPremium("fieldLabel")} value={money(payment.hostFee)} /> : null}
        <Row label={t("fee")} value={money(payment.fee)} />
        <Row label={t("total")} value={money(payment.total)} strong />
      </dl>

      <fieldset className="space-y-3">
        <legend className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
          <CreditCard className="size-4" aria-hidden />
          {t("card")}
        </legend>
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
        <p className="text-xs text-zinc-500">{t("mockNote")}</p>
      </fieldset>

      {declined && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {t("declined")}
        </p>
      )}

      <button
        type="submit"
        disabled={!complete || busy}
        className={cn(sheetButtonClass, "justify-center bg-ink text-white hover:bg-[#2A2A30] disabled:bg-neutral-200 disabled:text-neutral-500")}
      >
        {busy ? <Loader2 className="size-5 animate-spin" aria-label={t("processing")} /> : t("payButton", { amount: money(payment.total) })}
      </button>
    </form>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <dt className={strong ? "font-semibold text-ink" : "text-zinc-600"}>{label}</dt>
      <dd className={cn("tabular-nums", strong ? "text-base font-semibold" : "text-ink")}>{value}</dd>
    </div>
  );
}
