"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { formInput } from "@/components/form/FormLayout";
import { MonthChips } from "@/components/form/MonthChips";
import { Button } from "@/components/ui/ActionButton";
import { Checkbox } from "@/components/ui/Checkbox";
import type { DestinationCandidate } from "@/lib/data/destinationTypes";
import { DESTINATION_MIN_INTEREST } from "@/config/explore";
import { addAnonymousInterest, ensureDestination, useDestinations, useHasCard } from "@/lib/destinations";
import { PlaceCombobox } from "./PlaceCombobox";
import { FLEXIBLE, interestIn, wantsMonth } from "@/lib/interests";
import { useStore } from "@/lib/store";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Where someone wants to go: a place from the search (never typed text), months, and "Count me in". With an account it joins
 * their interests; without one it asks for an email and the consent to use it. A new place starts as a pending Destination.
 */
export function DestinationInterestForm({ initial, title, onDone, onCardFound }: { initial?: DestinationCandidate; title?: string; onDone?: () => void; /** "Somewhere else?": the place has a card, go to it. Without a card: one line, and nothing to see yet. */ onCardFound?: (destinationId: string) => void }) {
  const t = useTranslations("explore.prelaunch");
  const tAdd = useTranslations("explore.interests.add");
  const format = useFormatter();
  const store = useStore();
  const { destinations, interests } = useDestinations();
  const userId = store.currentUserId;
  const [place, setPlace] = useState<DestinationCandidate | null>(initial ?? null);
  const [months, setMonths] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [notify, setNotify] = useState(true);
  const [visible, setVisible] = useState(true);
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState<{ place: DestinationCandidate; months: string[] } | null>(null);

  const hasCard = useHasCard();
  const [savedOnly, setSavedOnly] = useState(false);
  const emailOk = EMAIL.test(email.trim());

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!place || months.length === 0 || (!userId && (!emailOk || !consent))) return;
    const destination = ensureDestination(place);
    if (userId) {
      store.addInterest({ destinationId: destination.id, placeName: destination.name, country: destination.country, region: destination.region, months, notify, consent: notify, visible }, userId);
    } else {
      addAnonymousInterest({ destinationId: destination.id, months, email, consent, createdAt: new Date().toISOString() });
    }
    if (onCardFound) {
      const known = destinations.find((d) => d.id === destination.id) ?? destination;
      const counted = interestIn(interests, userId, { destinationId: destination.id }) !== undefined;
      if (hasCard(known, known.interestedCount + (counted ? 0 : 1))) return onCardFound(destination.id);
      setSavedOnly(true);
    }
    setDone({ place, months });
  }

  if (done) {
    // Everyone for this place and its first month, this one included.
    const n = interests.filter((i) => i.destinationId === done.place.id && wantsMonth(i, done.months[0])).length;
    const dated = done.months.filter((m) => m !== FLEXIBLE);
    const names = dated.map((m) => format.dateTime(new Date(`${m}-01T00:00:00Z`), { month: "long", timeZone: "UTC" })).join(", ");
    return (
      <div role="status">
        <p className="flex items-start gap-2 text-h3 text-ink">
          <Check className="mt-1 size-5 shrink-0 text-accent" aria-hidden />
          {savedOnly ? tAdd("savedNoCard", { min: DESTINATION_MIN_INTEREST }) : dated.length > 0 ? t("confirmed", { n, place: done.place.name, months: names }) : t("confirmedAnytime", { n, place: done.place.name })}
        </p>
        <Button
          variant="tertiary"
          size="md"
          className="mt-4"
          onClick={() => {
            if (onDone) onDone();
            else {
              setDone(null);
              setPlace(null);
              setMonths([]);
              setTried(false);
            }
          }}
        >
          {onDone ? t("close") : t("another")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {title && <h2 className="text-h3 text-ink">{title}</h2>}
      <div>
        <label htmlFor="destination-search" className="mb-2 block text-body font-medium">
          {t("destination")}
        </label>
        {place ? (
          <span className="inline-flex h-11 items-center gap-2 rounded-full bg-(--select-bg) pl-4 pr-2 text-body font-semibold text-ink">
            {`${place.name}, ${place.country}`}
            <button type="button" onClick={() => setPlace(null)} aria-label={t("changeDestination")} className="rounded-full p-1 hover:bg-white/50">
              <X className="size-4" aria-hidden />
            </button>
          </span>
        ) : (
          <PlaceCombobox id="destination-search" onPick={setPlace} invalid={tried && !place} />
        )}
        {tried && !place && <p className="mt-1.5 text-small text-red-600">{t("destinationError")}</p>}
      </div>

      <fieldset>
        <legend className="mb-2 text-body font-medium">{t("months")}</legend>
        <MonthChips value={months} onChange={setMonths} label={t("months")} />
        {tried && months.length === 0 && <p className="mt-1.5 text-small text-red-600">{t("monthsError")}</p>}
      </fieldset>

      {userId ? (
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span className="text-body text-ink">{tAdd("notify")}</span>
            <Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-body text-ink">{tAdd("visible")}</span>
              <span className="mt-0.5 block text-small text-muted">{tAdd("visibleHelper")}</span>
            </span>
            <Checkbox checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          </label>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="destination-email" className="mb-2 block text-body font-medium">
              {t("email")}
            </label>
            <input id="destination-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("emailPlaceholder")} aria-invalid={tried && !emailOk ? true : undefined} className={formInput} />
            {tried && !emailOk && <p className="mt-1.5 text-small text-red-600">{t("emailError")}</p>}
          </div>
          <div>
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <span className="text-body text-ink">{t("consent")}</span>
              <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            </label>
            <Link href="/privacy" className="mt-1 inline-block text-small text-muted underline underline-offset-4 hover:text-ink">
              {t("privacy")}
            </Link>
            {tried && !consent && <p className="mt-1.5 text-small text-red-600">{t("consentError")}</p>}
          </div>
        </>
      )}

      <Button type="submit" variant="primary" size="lg" className="w-full">
        {t("submit")}
      </Button>
    </form>
  );
}
