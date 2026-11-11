"use client";

import { Check, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { formInput } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { useFormat } from "@/i18n/format";
import { payments, type PaymentMethodInput } from "@/lib/payments";
import { getMyPayment, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn, housePhotos } from "@/lib/utils";
import { FEE_MODEL } from "@/config/policies";
import { Img } from "@/components/ui/Img";
import { APP_MODE } from "@/lib/appMode";
import { convertApprox } from "@/lib/rates";
import { findUser } from "@/lib/store";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { paidOverlapOf } from "@/lib/overlap";
import { shortNameOf } from "@/lib/shortName";

/** The test card, filled in outside production (the provider's own test number). */
const TEST_CARD = process.env.NODE_ENV === "production" ? "" : "4242 4242 4242 4242";

/**
 * "Pay your share", without scrolling: 820px from md, two columns (45 : 55). Left what it's for and what it costs (the House, share, host
 * experience, service fee, total with ≈ the viewer's currency, "Charged in THB", the countdown); right the payment element – Apple Pay and
 * Google Pay side by side, "or card", the card fields (44px), "Pay THB 19,800" full width and one line about cancelling. No Cancel button:
 * × and Escape close it. On phones one column at full height with the pay button fixed at the bottom. Everything through lib/payments.
 */
export function PaySheet({ stay, open, onClose }: { stay: Stay; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={useTranslations("house.pay")("title")} wide>
      {/* Remounted per open, so a declined attempt doesn't linger. */}
      {open && <PayForm stay={stay} onDone={onClose} />}
    </Sheet>
  );
}

function PayForm({ stay, onDone }: { stay: Stay; onDone: () => void }) {
  const t = useTranslations("house.pay");
  const tOverlap = useTranslations("overlap");
  const store = useStore();
  const payment = getMyPayment(store, stay.id);
  const [done, setDone] = useState(false);

  if (done) return <PaidView onClose={onDone} />;
  if (!payment) return <p className="text-small text-muted">{t("nothingToPay")}</p>;
  if (payment.status === "paid") return <p className="text-small text-muted">{t("alreadyPaid")}</p>;
  // One House per night (PARALLEL_POLICY): already paid for one on these dates – that one has to go first.
  const clash = paidOverlapOf(store, stay);
  if (clash) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink">{tOverlap("cancelFirst", { name: shortNameOf(clash) })}</p>
        <p className="text-small text-muted">{tOverlap("cancelFirstText", { name: shortNameOf(clash) })}</p>
        <ModalFooter onCancel={onDone}>
          <Button href={`/h/${clash.id}`}>{tOverlap("openOther", { name: shortNameOf(clash) })}</Button>
        </ModalFooter>
      </div>
    );
  }

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

/** Fields of the payment element: 44px, like the rest of the form system otherwise. */
const FIELD = cn(formInput, "h-11 tabular-nums");

/** The summary, the deadline and the payment element (mock). */
export function CardPayForm({ stay, amounts, onPay }: CardPayFormProps) {
  const t = useTranslations("house.pay");
  const tPremium = useTranslations("growth.premium");
  const tOverview = useTranslations("houses.overview.next");
  const f = useFormat();
  const store = useStore();
  const viewer = usePreferredCurrency();
  const [card, setCard] = useState(TEST_CARD);
  const [expiry, setExpiry] = useState(TEST_CARD ? "12/30" : "");
  const [cvc, setCvc] = useState(TEST_CARD ? "123" : "");
  const [busy, setBusy] = useState<PaymentMethodInput["kind"] | null>(null);
  const [declined, setDeclined] = useState(false);
  const [now] = useState(() => Date.now());

  const money = (amount: number) => f.price(amount, stay.currency);
  const approx = stay.currency === viewer ? null : f.price(Math.round(convertApprox(amounts.total, stay.currency, viewer)), viewer);
  const complete = card.replace(/\s/g, "").length >= 12 && expiry.trim().length >= 4 && cvc.trim().length >= 3;
  const photo = housePhotos(stay, findUser(store, stay.hostId))[0];
  const hours = stay.paymentDueAt ? Math.max(0, (Date.parse(stay.paymentDueAt) - now) / 3_600_000) : null;
  const left = hours === null ? null : hours < 48 ? tOverview("leftHours", { count: Math.max(1, Math.floor(hours)) }) : tOverview("leftDays", { count: Math.floor(hours / 24) });

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
    <form onSubmit={submit} className="grid gap-7 md:grid-cols-[45fr_55fr]">
      {/* Left: what it's for and what it costs. */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="relative block size-14 shrink-0 overflow-hidden rounded-xl bg-ink/6">{photo && <Img src={photo} alt="" fill sizes="56px" className="object-cover" />}</span>
          <div className="min-w-0">
            <p className="truncate text-body font-semibold text-ink">{stay.title}</p>
            <p className="truncate text-small text-muted">
              {f.stayDates(stay)} · {stay.location?.city ?? stay.city}
            </p>
          </div>
        </div>
        <dl className="mt-1 flex flex-col gap-3">
          <Row label={amounts.hostFee ? tPremium("share") : t("share")} value={money(amounts.share)} />
          {amounts.hostFee ? <Row label={tPremium("fieldLabel")} value={money(amounts.hostFee)} /> : null}
          {/* Guests only – the host pays their share without a service fee. */}
          {amounts.fee > 0 && <Row label={t("feeIncluded", { percent: FEE_MODEL.serviceFeePercent })} value={money(amounts.fee)} muted />}
          <div className="h-px bg-ink/8" aria-hidden />
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-body font-semibold text-ink">{t("total")}</dt>
            <dd className="text-right">
              <span className="block text-h3 tabular-nums text-ink">{money(amounts.total)}</span>
              {approx && <span className="block text-small text-muted">≈ {approx}</span>}
            </dd>
          </div>
        </dl>
        {/* Always charged in the House's own currency. */}
        <p className="text-small text-muted">{t("bankConvertsShort", { currency: stay.currency })}</p>
        {left && (
          <span className="inline-flex h-7 items-center gap-1.5 self-start rounded-full bg-ink/6 px-3 text-small font-semibold text-ink">
            <Clock aria-hidden className="size-3.5" />
            {left}
          </span>
        )}
      </div>

      {/* Right: the payment element (mock) – wallets first, then the card. */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <ApplePayButton busy={busy === "apple_pay"} disabled={busy !== null} onClick={() => void pay({ kind: "apple_pay" })} label={t("applePay")} />
          <GooglePayButton busy={busy === "google_pay"} disabled={busy !== null} onClick={() => void pay({ kind: "google_pay" })} label={t("googlePay")} />
        </div>
        <div className="flex items-center gap-3 text-small text-muted" aria-hidden>
          <span className="h-px flex-1 bg-ink/10" />
          {t("orCardShort")}
          <span className="h-px flex-1 bg-ink/10" />
        </div>
        <input inputMode="numeric" autoComplete="cc-number" value={card} onChange={(e) => setCard(e.target.value)} placeholder="1234 5678 9012 3456" aria-label={t("cardNumber")} className={FIELD} />
        <div className="grid grid-cols-2 gap-3">
          <input inputMode="numeric" autoComplete="cc-exp" value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder={t("expiryPlaceholder")} aria-label={t("expiry")} className={FIELD} />
          <input inputMode="numeric" autoComplete="cc-csc" value={cvc} onChange={(e) => setCvc(e.target.value)} placeholder={t("cvcPlaceholder")} aria-label={t("cvc")} className={FIELD} />
        </div>
        {declined && (
          <p role="alert" className="rounded-2xl bg-ink/6 px-4 py-2.5 text-body font-semibold text-ink">
            {t("declined")}
          </p>
        )}
        {/* On phones the button stays at the bottom while the rest scrolls. */}
        <div className="sticky bottom-0 -mx-7 -mb-7 flex flex-col gap-2 bg-[rgba(250,248,244,0.96)] px-7 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-3 md:static md:m-0 md:bg-transparent md:p-0">
          <Button type="submit" disabled={!complete || busy !== null} className="w-full">
            {busy === "card" ? <Loader2 className="animate-spin" aria-label={t("processing")} /> : t("payButton", { amount: money(amounts.total) })}
          </Button>
          <p className="text-center text-small text-muted">
            {t("freeCancel")} ·{" "}
            <Link href="/faq#cancellation" target="_blank" className="font-semibold text-ink underline-offset-4 hover:underline">
              {t("rules")}
            </Link>
          </p>
          {/* The test note only where the demo is shown to people. */}
          {APP_MODE === "demo" && <p className="text-center text-small text-muted">{t("mockNote")}</p>}
        </div>
      </div>
    </form>
  );
}

/** Apple Pay as Apple's guidelines show it: a black button, the white Apple logo and "Pay". */
function ApplePayButton({ onClick, disabled, busy, label }: { onClick: () => void; disabled: boolean; busy: boolean; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className="press flex h-11 items-center justify-center gap-1 rounded-full bg-black text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-60">
      {busy ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <>
          <svg aria-hidden viewBox="0 0 24 24" className="-mt-0.5 size-[18px] fill-current">
            <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
          </svg>
          <span className="text-body-lg font-medium">Pay</span>
        </>
      )}
    </button>
  );
}

/** Google Pay as Google's guidelines show it: a white button with a fine edge, the four-colour G and "Pay". */
function GooglePayButton({ onClick, disabled, busy, label }: { onClick: () => void; disabled: boolean; busy: boolean; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className="press flex h-11 items-center justify-center gap-1.5 rounded-full border border-[#747775] bg-white text-[#3C4043] transition-colors duration-150 hover:bg-[#F8F9FA] disabled:opacity-60">
      {busy ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <>
          <svg aria-hidden viewBox="0 0 48 48" className="size-[18px]">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          <span className="text-body-lg font-medium">Pay</span>
        </>
      )}
    </button>
  );
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between text-body">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("tabular-nums", muted ? "text-muted" : "text-ink")}>{value}</dd>
    </div>
  );
}
