"use client";

import { CircleCheck, Clock, FileUp, Loader2, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { PaySheet } from "@/components/stay/PaySheet";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { paymentSplit } from "@/lib/fees";
import { findUser, getLockDetails, getPayments, paymentProgress, useStore } from "@/lib/store";
import type { Payment, Stay } from "@/lib/types";
import { cn } from "@/lib/utils";

const UPLOAD_WINDOW_MS = 48 * 60 * 60 * 1000;
const IS_DEV = process.env.NODE_ENV !== "production";

/**
 * Host's payment status of a locked House: progress, who paid what, reminders, unlock (with refunds) and – once
 * everyone paid – the booking confirmation upload. Renders nothing while the accommodation is open.
 */
export function PaymentsCard({ stay, className }: { stay: Stay; className?: string }) {
  const t = useTranslations("houses.payments");
  const tPremium = useTranslations("growth.premium");
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
  const percent = progress.count > 0 ? Math.round((progress.paidCount / progress.count) * 100) : 0;
  const closed = stay.status === "closed";
  // The programme column only for Houses that have one.
  const withProgramme = payments.some((p) => p.hostFee);

  async function unlock() {
    setUnlocking(false);
    setBusyUnlock(true);
    await store.unlockAccommodation(stay.id);
    setBusyUnlock(false);
    showToast(t("unlockedToast"));
  }

  return (
    <section className={cn("rounded-[24px] bg-white p-6", className)}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        {lock && <span className="text-sm text-zinc-500">{t("payBy", { date: f.day(lock.payBy) })}</span>}
      </div>

      <p className="text-sm font-medium tabular-nums">
        {t("progress", {
          paid: progress.paidCount,
          count: progress.count,
          paidAmount: money(progress.paidAmount),
          totalAmount: money(progress.totalAmount),
        })}
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.count}
        aria-valuenow={progress.paidCount}
        aria-label={t("title")}
        className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100"
      >
        <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>

      <table className="mt-5 w-full text-left text-sm">
        <thead className="text-xs text-zinc-500">
          <tr>
            <th scope="col" className="pb-2 font-medium">{t("colName")}</th>
            <th scope="col" className="pb-2 text-right font-medium">{t("colShare")}</th>
            {withProgramme && <th scope="col" className="pb-2 pl-3 text-right font-medium">{tPremium("colProgramme")}</th>}
            <th scope="col" className="pb-2 pl-3 font-medium">{t("colStatus")}</th>
            <th scope="col" className="hidden pb-2 font-medium sm:table-cell">{t("colPaid")}</th>
            <th scope="col" className="pb-2">
              <span className="sr-only">{t("remind")}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5 border-t border-black/5">
          {payments.map((payment) => (
            <PaymentRow key={payment.id} payment={payment} stay={stay} withProgramme={withProgramme} onPay={() => setPaying(true)} />
          ))}
        </tbody>
      </table>

      {(progress.allPaid || stay.status === "booked") && <BookingBlock stay={stay} payments={payments} />}

      {!closed && (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-black/5 pt-4">
          <button type="button" disabled={busyUnlock} onClick={() => setUnlocking(true)} className={buttonClass("secondary", "sm")}>
            {busyUnlock ? <Loader2 className="size-4 animate-spin" aria-label={t("unlocking")} /> : t("unlock")}
          </button>
          {IS_DEV && (
            <button
              type="button"
              onClick={() => {
                store.resetPayments(stay.id);
                showToast(t("resetToast"));
              }}
              className="ml-auto rounded-full px-2 py-1 text-xs text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline"
            >
              {t("devReset")}
            </button>
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
    </section>
  );
}

function PaymentRow({ payment, stay, withProgramme, onPay }: { payment: Payment; stay: Stay; withProgramme: boolean; onPay: () => void }) {
  const t = useTranslations("houses.payments");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const user = findUser(store, payment.userId);
  const isMe = payment.userId === store.currentUserId;
  const firstName = user?.name.split(" ")[0] ?? "";
  const pending = payment.status === "pending";

  return (
    <tr>
      <td className="py-3 pr-3">
        <span className="flex min-w-0 items-center gap-2.5">
          {user && <Avatar user={user} size="sm" />}
          <span className="truncate font-medium">{isMe && user ? t("you", { name: user.name }) : (user?.name ?? payment.userId)}</span>
        </span>
      </td>
      <td className="py-3 text-right tabular-nums">{f.price(payment.share, stay.currency)}</td>
      {withProgramme && (
        <td className="py-3 pl-3 text-right tabular-nums text-zinc-600">{payment.hostFee ? f.price(payment.hostFee, stay.currency) : "–"}</td>
      )}
      <td className="py-3 pl-3">
        <StatusPill status={pending ? "pending" : "paid"} />
      </td>
      <td className="hidden py-3 text-zinc-500 sm:table-cell">{payment.paidAt ? f.day(payment.paidAt) : "–"}</td>
      <td className="py-3 pl-2 text-right">
        {pending &&
          stay.status !== "closed" &&
          (isMe ? (
            <button type="button" onClick={onPay} className={buttonClass("dark", "sm", "h-8 px-3")}>
              {t("payNow")}
            </button>
          ) : (
            <button
              type="button"
              aria-label={t("remindFor", { name: firstName })}
              onClick={() => showToast(t("remindedToast", { name: firstName }))}
              className={buttonClass("secondary", "sm", "h-8 px-3")}
            >
              {t("remind")}
            </button>
          ))}
      </td>
    </tr>
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
  // What the host gets: every share plus 80 % of each host programme (Simpulo keeps the guest fees and 20 %).
  const released = payments.reduce((sum, p) => sum + paymentSplit(p.share, p.hostFee).hostReceives, 0);

  if (stay.status === "booked" && stay.bookingConfirmedAt) {
    return (
      <div className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-emerald-900">{t("confirmedTitle", { date: f.day(stay.bookingConfirmedAt) })}</p>
          <p className="mt-0.5 text-sm text-emerald-800">{t("confirmedText")}</p>
          {stay.bookingProofUrl && (
            <a
              href={stay.bookingProofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-medium text-emerald-900 underline underline-offset-2"
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
    <div className="mt-5 rounded-2xl bg-page p-4">
      <p className="flex items-center gap-2 font-semibold">
        <Wallet className="size-5 shrink-0 text-emerald-600" aria-hidden />
        {t("fundsTitle", { amount: f.price(released, stay.currency) })}
      </p>
      <p className="mt-1 text-sm text-zinc-600">{t("fundsText")}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input ref={input} type="file" accept="image/*,application/pdf" onChange={upload} className="hidden" />
        <button type="button" disabled={busy || stay.status === "closed"} onClick={() => input.current?.click()} className={buttonClass("dark", "sm")}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-label={t("uploading")} /> : <FileUp className="size-4" aria-hidden />}
          {t("upload")}
        </button>
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
    <p className={cn("flex items-center gap-1.5 text-xs", left > 0 ? "text-zinc-500" : "font-medium text-red-600")} suppressHydrationWarning>
      <Clock className="size-3.5 shrink-0" aria-hidden />
      {left > 0
        ? `${t("uploadWithin")} · ${t("timeLeft", { hours: Math.floor(minutes / 60), minutes: minutes % 60 })}`
        : t("overdue")}
    </p>
  );
}
