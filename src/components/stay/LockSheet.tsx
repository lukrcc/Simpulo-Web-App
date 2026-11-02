"use client";

import { Loader2, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { FormField, formInput } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { Chip } from "@/components/ui/Chip";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { mockPreviewForUrl } from "@/lib/mock-extras";
import { paymentSplit } from "@/lib/fees";
import { defaultPayBy, getCrew, getCrewLinks, useStore } from "@/lib/store";
import type { Currency, Stay } from "@/lib/types";
import { CURRENCIES, cn } from "@/lib/utils";
import { LinkPreviewCard } from "./LinkPreviewCard";

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
  const tPremium = useTranslations("growth.premium");
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
  // A guest's payment: stay share + host programme (capped at 30 % of the share) + guest fee.
  const split = paymentSplit(perPerson, stay.hostFeePerPerson);
  const programmeCapped = perPerson > 0 && stay.hostFeePerPerson !== undefined && split.hostFee < stay.hostFeePerPerson;
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
        <FormField label={t("linkLabel")} error={cleanUrl !== "" && !urlValid ? t("linkInvalid") : null}>
          <input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("linkPlaceholder")}
            aria-invalid={cleanUrl !== "" && !urlValid}
            className={formInput}
          />
        </FormField>
        {urlValid && <LinkPreviewCard href={cleanUrl} preview={mockPreviewForUrl(cleanUrl)} layout="row" />}

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <FormField label={t("totalLabel")}>
            <span className="relative block">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">{f.currencySymbol(currency)}</span>
              {/* Plain text field (no number stepper) – digits only. */}
              <input
                type="text"
                inputMode="decimal"
                autoFocus={Boolean(link)}
                value={total}
                onChange={(e) => setTotal(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder={t("totalPlaceholder")}
                className={cn(formInput, "pl-11 tabular-nums")}
              />
            </span>
          </FormField>
          <FormField label={t("currency")}>
            <Select fit value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </FormField>
          <span className="col-span-2 -mt-1.5 block text-[13px] text-muted">{t("currencyHint")}</span>
        </div>

        <FormField label={t("splitBetween")} group helper={t("occupancy", { people: f.people(crewSize), spots: f.spots(stay.spotsTotal) })}>
          <div className="flex flex-wrap gap-2">
            {spotChoices.map((n) => (
              <Chip key={n} active={spots === n} size="fit" onClick={() => setSpots(n)} className="min-w-12 flex-1">
                {n}
              </Chip>
            ))}
          </div>
        </FormField>

        <FormField label={t("payBy")} helper={t("payByHint")}>
          <input
            type="date"
            value={payBy}
            min={today()}
            max={stay.startDate || undefined}
            onChange={(e) => setPayBy(e.target.value)}
            className={formInput}
          />
        </FormField>

        {/* The split, as plain text under a line – no box inside the sheet. */}
        <div className="border-t border-line pt-4">
          <p className="text-sm font-medium tabular-nums text-ink">
            {perPerson === 0
              ? t("previewEmpty")
              : split.hostFee > 0
                ? tPremium("lockPreview", {
                    total: f.price(totalValue, currency),
                    spots,
                    perPerson: f.price(perPerson, currency),
                    programme: f.price(split.hostFee, currency),
                    fee: f.price(split.fee, currency),
                    withFee: f.price(split.total, currency),
                  })
                : t("preview", {
                    total: f.price(totalValue, currency),
                    spots,
                    perPerson: f.price(perPerson, currency),
                    withFee: f.price(split.total, currency),
                  })}
          </p>
          {split.hostFee > 0 && (
            <p className="mt-1 text-[13px] text-muted">{tPremium("youReceive", { amount: f.price(split.hostReceives, currency) })}</p>
          )}
          {programmeCapped && <p className="mt-1 text-[13px] text-muted">{tPremium("capped", { amount: f.price(split.hostFee, currency) })}</p>}
          <p className="mt-1 text-[13px] text-muted">{t("hint")}</p>
        </div>

        <Button type="submit" size="lg" disabled={!canSubmit} className="w-full">
          {busy ? (
            <Loader2 className="animate-spin" aria-label={t("locking")} />
          ) : (
            <>
              <Lock aria-hidden />
              {t("submit")}
            </>
          )}
        </Button>
      </form>
    </Sheet>
  );
}
