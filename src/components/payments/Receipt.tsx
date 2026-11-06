"use client";

import { Download, Receipt as ReceiptIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/ActionButton";
import { useFormat } from "@/i18n/format";
import { payments, type Receipt as ReceiptData } from "@/lib/payments";
import { receiptPdf } from "@/lib/receiptPdf";
import type { Payment, Stay } from "@/lib/types";

/** A paid share's receipt: amount, date, how it was paid (****4242), "Download receipt" (PDF). Your houses › House › Payment. */
export function Receipt({ stay, payment }: { stay: Stay; payment: Payment }) {
  const t = useTranslations("house.pay");
  const f = useFormat();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  useEffect(() => {
    let live = true;
    void payments.getReceipt(payment.id).then((next) => live && setReceipt(next));
    return () => {
      live = false;
    };
  }, [payment.id]);
  if (!receipt) return null;

  function download() {
    if (!receipt) return;
    const blob = receiptPdf([
      "Simpulo – Receipt",
      stay.title,
      `${f.stayDatesLong(stay)} · ${f.placeName(stay)}`,
      `Share: ${f.price(payment.share, stay.currency)}`,
      ...(payment.hostFee ? [`Host experience: ${f.price(payment.hostFee, stay.currency)}`] : []),
      `Simpulo fee (included): ${f.price(payment.fee, stay.currency)}`,
      `Total paid: ${f.price(receipt.amount, receipt.currency)}`,
      `Paid ${f.day(receipt.paidAt)} with ${receipt.brand} ****${receipt.last4}`,
      `Receipt no. ${receipt.paymentId}`,
    ]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simpulo-receipt-${receipt.paymentId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink/6 text-ink">
        <ReceiptIcon className="size-4.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold tabular-nums text-ink">{f.price(receipt.amount, receipt.currency)}</p>
        <p className="text-small text-muted">
          {t("receiptPaid", { date: f.day(receipt.paidAt) })} · {t("receiptMethod", { brand: receipt.brand, last4: receipt.last4 })}
        </p>
      </div>
      <Button variant="tertiary" size="sm" onClick={download}>
        <Download aria-hidden />
        {t("downloadReceipt")}
      </Button>
    </div>
  );
}
