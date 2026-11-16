"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { Wordmark } from "@/components/layout/Logo";
import { SimpuloQR } from "@/components/SimpuloQR";
import { Button } from "@/components/ui/ActionButton";
import { appQrLink } from "@/lib/links";
import { useHydrated } from "@/lib/useHydrated";

/** How many cards fit one A4 page (2 × 2, each A6 105 × 148 mm). */
const CARDS_PER_PAGE = 4;

/**
 * The print template for Houses: four A6 cards on an A4 page, each the wordmark, one line, the QR code to /get?src=qr (so installs from the
 * cards are counted) and "Scan with your camera". On screen a short head with "Print"; printed only the cards (globals.css @media print).
 */
export function GetCard() {
  const t = useTranslations("install.card");
  // The QR code holds the absolute link (the window's origin without NEXT_PUBLIC_LINK_BASE_URL) – drawn after hydration.
  const hydrated = useHydrated();
  return (
    <div className="page-container pb-24 pt-8 print:p-0">
      <div data-print-hide className="mx-auto mb-8 flex max-w-[720px] flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 text-ink">{t("pageTitle")}</h1>
          <p className="mt-1 text-body text-muted">{t("pageLead")}</p>
        </div>
        <Button onClick={() => window.print()}>
          <Printer aria-hidden />
          {t("print")}
        </Button>
      </div>
      <div className="get-card-sheet mx-auto grid max-w-[720px] grid-cols-1 gap-4 sm:grid-cols-2 print:max-w-none print:gap-0">
        {Array.from({ length: CARDS_PER_PAGE }, (_, i) => (
          <div key={i} className="get-card flex aspect-[105/148] flex-col items-center justify-between rounded-[20px] bg-surface p-8 text-center print:rounded-none">
            <Wordmark size="lg" />
            <div className="flex flex-col items-center gap-3">
              <p className="text-h3 text-ink">{t("title")}</p>
              <p className="max-w-[26ch] text-body text-muted">{t("text")}</p>
            </div>
            {hydrated ? <SimpuloQR url={appQrLink()} size={150} /> : <span className="size-[150px]" />}
            <p className="text-small text-muted">{t("scan")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
