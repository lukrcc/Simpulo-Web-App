"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { usePreviewGuard } from "@/components/PreviewMode";
import { MonthChips, shortMonth } from "@/components/form/MonthChips";
import { Button } from "@/components/ui/ActionButton";
import { Sheet } from "@/components/ui/Sheet";
import { interestIn, interestsIn, type DemandSpot } from "@/lib/interests";
import { findUser, getCurrentUser, useStore } from "@/lib/store";
import type { User } from "@/lib/types";

const noSubscribe = () => () => {};
/** This month, YYYY-MM, in the browser only – the server (and the prerender) must not read the clock: "" there. */
export function useThisMonth(): string {
  return useSyncExternalStore(noSubscribe, () => new Date().toISOString().slice(0, 7), () => "");
}

/** The month the next 12 months end with. */
function lastOfYearAhead(thisMonth: string): string {
  const [year, month] = thisMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month + 10, 1)).toISOString().slice(0, 7);
}

/** The months people want, as one span: "Feb–Mar", with the year only past the next 12 months; null without dated interest. */
export function monthSpan(format: ReturnType<typeof useFormatter>, spot: DemandSpot, thisMonth: string): string | null {
  if (spot.months.length === 0) return null;
  const first = spot.months[0].month;
  const last = spot.months.at(-1)!.month;
  const span = first === last ? shortMonth(format, first, false) : `${shortMonth(format, first, false)}–${shortMonth(format, last, false)}`;
  return thisMonth && last > lastOfYearAhead(thisMonth) ? `${span} ${last.slice(0, 4)}` : span;
}

/** How long the own avatar takes from the button into the stack. */
const FLY_MS = 450;

/**
 * "I'm interested" on any card of a place. Logged out it asks for an email (`asking`); logged in it counts at once and your avatar
 * flies from the button into the stack ([data-my-avatar] in `stackRef`). The card stays under the pointer even when YOUR PICKS
 * appears above it. Already in: `press` calls what it's given.
 */
export function useInterestPress(spot: DemandSpot, refs: { card: RefObject<HTMLElement | null>; button: RefObject<HTMLElement | null>; stack: RefObject<HTMLElement | null> }) {
  const store = useStore();
  const me = getCurrentUser(store);
  const loggedIn = store.currentUserId !== null;
  const interested = interestIn(store.interests, store.currentUserId, spot) !== undefined;
  const guard = usePreviewGuard();
  const [asking, setAsking] = useState(false);
  const topBefore = useRef<number | null>(null);

  useLayoutEffect(() => {
    const before = topBefore.current;
    topBefore.current = null;
    if (before === null) return;
    const moved = (refs.card.current?.getBoundingClientRect().top ?? before) - before;
    if (Math.abs(moved) > 1) window.scrollBy({ top: moved, behavior: "instant" });
    if (!interested || !me?.photos[0]) return;
    const from = refs.button.current?.getBoundingClientRect();
    if (!from) return;
    const avatar = refs.stack.current?.querySelector<HTMLElement>("[data-my-avatar]");
    if (avatar && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const to = avatar.getBoundingClientRect();
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      avatar.style.zIndex = "2";
      avatar.animate([{ transform: `translate(${dx}px, ${dy}px) scale(1.15)` }, { transform: "none" }], { duration: FLY_MS, easing: "cubic-bezier(0.32, 0.72, 0, 1)" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when you join or leave
  }, [interested]);

  const toggle = () => {
    if (!store.currentUserId) return;
    topBefore.current = refs.card.current?.getBoundingClientRect().top ?? null;
    store.toggleInterest(spot, store.currentUserId);
  };
  const press = (whenIn: () => void) =>
    guard(() => {
      if (!loggedIn) return setAsking(true);
      if (interested) return whenIn();
      toggle();
    });
  return { interested, loggedIn, asking, setAsking, press, leave: toggle };
}

/** "Change months": yours for this place, replaced. `onRemove`: also the way out of it. */
export function ChangeMonthsSheet({ spot, onClose, onRemove }: { spot: DemandSpot; onClose: () => void; onRemove?: () => void }) {
  const t = useTranslations("explore.interests");
  const store = useStore();
  const [months, setMonths] = useState(() => interestIn(store.interests, store.currentUserId, spot)?.months ?? []);
  return (
    <Sheet open onClose={onClose} title={t("changeMonthsTitle", { place: spot.placeName })}>
      <MonthChips value={months} onChange={setMonths} label={t("add.months")} />
      <Button
        variant="primary"
        size="lg"
        disabled={months.length === 0}
        className="mt-6 w-full"
        onClick={() => {
          store.setInterestMonths(spot.destinationId, months);
          onClose();
        }}
      >
        {t("saveMonths")}
      </Button>
      {onRemove && (
        <Button
          variant="tertiary"
          className="mt-2 w-full"
          onClick={() => {
            onRemove();
            onClose();
          }}
        >
          {t("removeInterest")}
        </Button>
      )}
    </Sheet>
  );
}

export interface VisiblePerson {
  user: User;
  months: string[];
}

/**
 * The people interested in a spot who opted in to be shown (never the opted-out ones). Logged in, the card shows them;
 * logged out only as a blurred teaser. (A real backend sends logged-out visitors placeholders, not their photos.)
 */
export function useOptedInPeople(spot: DemandSpot): VisiblePerson[] {
  const store = useStore();
  return interestsIn(store.interests, spot.placeName).flatMap((interest) => {
    const user = interest.visible ? findUser(store, interest.userId) : undefined;
    return user ? [{ user, months: interest.months }] : [];
  });
}

