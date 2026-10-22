"use client";

import { Loader2, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { buttonClass } from "@/components/ui/button";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { mockPreviewForUrl } from "@/lib/mock-extras";
import { defaultPayBy, feeFor, getCrew, getCrewLinks, useStore } from "@/lib/store";
import type { Currency, Stay } from "@/lib/types";
import { CURRENCIES, cn } from "@/lib/utils";
import { LinkPreviewCard } from "./LinkPreviewCard";

const inputClass = "h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-ink";

function isUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Today as YYYY-MM-DD (UTC, like every calendar date in the app). */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Host locks the accommodation: link, total price for the whole place, split across the spots → share per person,
 * plus the pay-by date. Opened from a link card ("Lock this", link prefilled) or the Manage page (link editable,
 * prefilled with the newest link from the crew chat).
 */
export function LockSheet({ stay, link, onClose }: { stay: Stay; link?: string; onClose: () => void }) {
  const t = useTranslations("houses.lock");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const crewSize = Math.max(1, getCrew(store, stay).length);
  const maxSpots = Math.max(crewSize, stay.spotsTotal);
  const [url, setUrl] = useState(() => link ?? getCrewLinks(store, stay.id).at(-1) ?? "");
  const [total, setTotal] = useState("");
  const [currency, setCurrency] = useState<Currency>(stay.currency);
  const [spots, setSpots] = useState(maxSpots);
  // Houses without dates have no arrival to cap the default at.
  const [payBy, setPayBy] = useState(() => defaultPayBy(stay));
  const [busy, setBusy] = useState(false);

  const cleanUrl = url.trim();
  const urlValid = isUrl(cleanUrl);
  const totalValue = Math.round(Number(total));
  const perPerson = totalValue > 0 ? Math.ceil(totalValue / spots) : 0;
  const fee = feeFor(perPerson);
  const canSubmit = urlValid && perPerson > 0 && payBy !== "" && !busy;
  const spotChoices = Array.from({ length: maxSpots - crewSize + 1 }, (_, i) => crewSize + i);

  async function handleLock(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    await store.lockAccommodation(stay.id, { link: cleanUrl, total: totalValue, spots, currency, payBy });
    setBusy(false);
    showToast(t("lockedToast"));
    onClose();
  }

  return (
    <Sheet open onClose={() => !busy && onClose()} title={t("title")}>
      <form onSubmit={handleLock} className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("linkLabel")}</span>
          <input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("linkPlaceholder")}
            aria-invalid={cleanUrl !== "" && !urlValid}
            className={inputClass}
          />
          {cleanUrl !== "" && !urlValid && <span className="mt-1.5 block text-xs text-red-600">{t("linkInvalid")}</span>}
        </label>
        {urlValid && <LinkPreviewCard href={cleanUrl} preview={mockPreviewForUrl(cleanUrl)} layout="row" />}

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t("totalLabel")}</span>
            <span className="relative block">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">{f.currencySymbol(currency)}</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                autoFocus={Boolean(link)}
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder={t("totalPlaceholder")}
                className={cn(inputClass, "pl-11")}
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t("currency")}</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className={cn(inputClass, "w-auto pr-8")}
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
          <span className="col-span-2 -mt-1.5 block text-xs text-neutral-500">{t("currencyHint")}</span>
        </div>

        <div role="group" aria-label={t("splitBetween")}>
          <span className="mb-1.5 block text-sm font-medium">{t("splitBetween")}</span>
          <div className="flex flex-wrap gap-2">
            {spotChoices.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={spots === n}
                onClick={() => setSpots(n)}
                className={cn(
                  "min-w-12 flex-1 rounded-full border px-4 py-2 text-sm transition-colors",
                  spots === n ? "border-ink bg-ink text-white" : "border-neutral-200 bg-white hover:border-neutral-400",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="mt-1.5 block text-xs text-neutral-500">
            {t("occupancy", { people: f.people(crewSize), spots: f.spots(stay.spotsTotal) })}
          </span>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("payBy")}</span>
          <input
            type="date"
            value={payBy}
            min={today()}
            max={stay.startDate || undefined}
            onChange={(e) => setPayBy(e.target.value)}
            className={inputClass}
          />
          <span className="mt-1.5 block text-xs text-neutral-500">{t("payByHint")}</span>
        </label>

        <div className="rounded-2xl bg-page p-4">
          <p className="text-sm font-medium tabular-nums text-ink">
            {perPerson > 0
              ? t("preview", {
                  total: f.price(totalValue, currency),
                  spots,
                  perPerson: f.price(perPerson, currency),
                  withFee: f.price(perPerson + fee, currency),
                })
              : t("previewEmpty")}
          </p>
          <p className="mt-1 text-[13px] text-zinc-500">{t("hint")}</p>
        </div>

        <button type="submit" disabled={!canSubmit} className={buttonClass("dark", "lg", "w-full")}>
          {busy ? (
            <Loader2 className="size-5 animate-spin" aria-label={t("locking")} />
          ) : (
            <>
              <Lock className="size-4" />
              {t("submit")}
            </>
          )}
        </button>
      </form>
    </Sheet>
  );
}
