"use client";

import { CircleCheck, Clock, FileUp, Loader2, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { DetailSection, ListRow } from "@/components/stay/DetailSection";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { PaySheet } from "@/components/stay/PaySheet";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { paymentSplit } from "@/lib/fees";
import { findUser, getLockDetails, getPayments, paymentProgress, useStore } from "@/lib/store";
import type { Payment, Stay } from "@/lib/types";
import { cn } from "@/lib/utils";

const UPLOAD_WINDOW_MS = 48 * 60 * 60 * 1000;
const IS_DEV = process.env.NODE_ENV !== "production";

/**
 * Your houses → "Payments" for the host of a locked House: progress, who paid what, reminders, the payout, unlock
 * (with refunds) and – once everyone paid – the booking confirmation upload. Renders nothing while the accommodation
 * is open.
 */
export function PaymentsSection({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.payments");
  const tSection = useTranslations("houses.detail.sections");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const [unlocking, setUnlocking] = useState(false);
  const [busyUnlock, setBusyUnlock] = useState(false);
  const [paying, setPaying] = useState(false);

  if (stay.accommodationStatus !== "locked") return null;

  const payments = getPayments(store, stay.id);
  const progress = paymentProgress(store, stay.id);
  const lock = getLockDetails(store, stay);
  const money = (amount: number) => f.price(amount, stay.currency);
  const payout = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + paymentSplit(p.share, p.hostFee).hostReceives, 0);
  const percent = progress.count > 0 ? Math.round((progress.paidCount / progress.count) * 100) : 0;
  const closed = stay.status === "closed";

  async function unlock() {
    setUnlocking(false);
    setBusyUnlock(true);
    await store.unlockAccommodation(stay.id);
    setBusyUnlock(false);
    showToast(t("unlockedToast"));
  }

  return (
    // No header action – the status line says where it stands.
    <DetailSection title={t("title")}>
      <p className="text-body tabular-nums text-ink">
        {t("progress", {
          paid: progress.paidCount,
          count: progress.count,
          paidAmount: money(progress.paidAmount),
          totalAmount: money(progress.totalAmount),
        })}
        {lock && <span className="text-small text-muted"> · {tSection("payBy", { date: f.day(lock.payBy) })}</span>}
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.count}
        aria-valuenow={progress.paidCount}
        aria-label={t("title")}
        className="mt-2 h-2 overflow-hidden rounded-full bg-bg"
      >
        <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>

      <ul className="mt-3 divide-y divide-line">
        {payments.map((payment) => (
          <PaymentRow key={payment.id} payment={payment} stay={stay} onPay={() => setPaying(true)} />
        ))}
      </ul>

      {(progress.allPaid || stay.status === "booked") && <BookingBlock stay={stay} payments={payments} />}
      {/* What reaches the host: every paid share and programme fee, minus the commission – paid out once booked. */}
      <p className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4 text-body">
        <span className="font-medium text-ink">{tSection("payout")}</span>
        <span className="text-right text-muted">
          {tSection(stay.status === "booked" ? "payoutDone" : "payoutPending", { amount: money(payout) })}
        </span>
      </p>

      {!closed && (
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <Button variant="tertiary" disabled={busyUnlock} onClick={() => setUnlocking(true)}>
            {busyUnlock ? <Loader2 className="animate-spin" aria-label={t("unlocking")} /> : tSection("unlock")}
          </Button>
          {IS_DEV && (
            <Button
              variant="tertiary"
              onClick={() => {
                store.resetPayments(stay.id);
                showToast(t("resetToast"));
              }}
            >
              {t("devReset")}
            </Button>
          )}
        </div>
      )}

      <PaySheet stay={stay} open={paying} onClose={() => setPaying(false)} />
      <ConfirmSheet
        open={unlocking}
        title={t("unlockTitle")}
        description={t("unlockDescription")}
        confirmLabel={t("unlockConfirm")}
        onClose={() => setUnlocking(false)}
        onConfirm={() => void unlock()}
      />
    </DetailSection>
  );
}

/** One crew member's share: avatar, name, "€480 · paid Jan 2" / "€480 · open", status badge, Pay now / Remind. */
function PaymentRow({ payment, stay, onPay }: { payment: Payment; stay: Stay; onPay: () => void }) {
  const t = useTranslations("houses.payments");
  const tSection = useTranslations("houses.detail.sections");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const user = findUser(store, payment.userId);
  const isMe = payment.userId === store.currentUserId;
  const firstName = user?.name.split(" ")[0] ?? "";
  const pending = payment.status === "pending";
  // Share plus the host programme, if any – what this person owes the House.
  const amount = f.price(payment.share + (payment.hostFee ?? 0), stay.currency);

  return (
    <li>
      <ListRow
        lead={user && <Avatar user={user} size="md" />}
        title={isMe && user ? t("you", { name: user.name }) : (user?.name ?? payment.userId)}
        subtitle={payment.paidAt ? tSection("paidOn", { amount, date: f.day(payment.paidAt) }) : tSection("due", { amount })}
        aside={<StatusBadge status={pending ? "pending" : "paid"} />}
        action={
          pending &&
          stay.status !== "closed" &&
          (isMe ? (
            <Button variant="tertiary" onClick={onPay}>
              {t("payNow")}
            </Button>
          ) : (
            <Button variant="tertiary" aria-label={t("remindFor", { name: firstName })} onClick={() => showToast(t("remindedToast", { name: firstName }))}>
              {t("remind")}
            </Button>
          ))
        }
      />
    </li>
  );
}

/** Everyone paid: funds are released to the host, who books and uploads the confirmation within 48 hours. */
function BookingBlock({ stay, payments }: { stay: Stay; payments: Payment[] }) {
  const t = useTranslations("houses.payments");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  // What the host gets: every share plus 90 % of each host programme (Simpulo keeps the guest fees and 10 %).
  const released = payments.reduce((sum, p) => sum + paymentSplit(p.share, p.hostFee).hostReceives, 0);

  if (stay.status === "booked" && stay.bookingConfirmedAt) {
    return (
      <div className="mt-4 flex items-start gap-3 border-t border-line pt-4">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{t("confirmedTitle", { date: f.day(stay.bookingConfirmedAt) })}</p>
          <p className="mt-0.5 text-small text-muted">{t("confirmedText")}</p>
          {stay.bookingProofUrl && (
            <a
              href={stay.bookingProofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles("tertiary", "md", "mt-2")}
            >
              {t("viewProof")}
            </a>
          )}
        </div>
      </div>
    );
  }

  const lastPaidAt = payments.reduce((latest, p) => (p.paidAt && p.paidAt > latest ? p.paidAt : latest), "");

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    await store.confirmBooking(stay.id, file);
    setBusy(false);
    showToast(t("confirmedToast"));
  }

  return (
    // Part of the Payments section: plain content under a line, never a box inside the card.
    <div className="mt-4 border-t border-line pt-4">
      <p className="flex items-center gap-2 font-semibold">
        <Wallet className="size-5 shrink-0 text-emerald-600" aria-hidden />
        {t("fundsTitle", { amount: f.price(released, stay.currency) })}
      </p>
      <p className="mt-1 text-small text-muted">{t("fundsText")}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input ref={input} type="file" accept="image/*,application/pdf" onChange={upload} className="hidden" />
        <Button variant="secondary" disabled={busy || stay.status === "closed"} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="animate-spin" aria-label={t("uploading")} /> : <FileUp aria-hidden />}
          {t("upload")}
        </Button>
        {lastPaidAt && <UploadCountdown from={lastPaidAt} />}
      </div>
    </div>
  );
}

/** "Upload within 48 hours · 47h 12m left", ticking every 30 s from the moment the last share was paid. */
function UploadCountdown({ from }: { from: string }) {
  const t = useTranslations("houses.payments");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const left = new Date(from).getTime() + UPLOAD_WINDOW_MS - now;
  const minutes = Math.max(0, Math.floor(left / 60_000));

  return (
    <p className={cn("flex items-center gap-1.5 text-small", left > 0 ? "text-muted" : "font-medium text-red-600")} suppressHydrationWarning>
      <Clock className="size-3.5 shrink-0" aria-hidden />
      {left > 0
        ? `${t("uploadWithin")} · ${t("timeLeft", { hours: Math.floor(minutes / 60), minutes: minutes % 60 })}`
        : t("overdue")}
    </p>
  );
}
