"use client";

import { MapPin, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMonthName } from "@/components/explore/SearchFields";
import { AvatarStack } from "@/components/ui/Avatar";
import { locationOf } from "@/lib/catalog";
import { useTodayIso } from "@/lib/birthDate";
import { peopleInFor } from "@/lib/inFor";
import { openSearchesFor, peopleIn } from "@/lib/savedSearches";
import { findUser, useStore } from "@/lib/store";
import type { User, Vibe } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_FACES = 5;

interface DemandQuery {
  city: string;
  region: string;
  startDate: string;
  endDate: string;
  vibe: Vibe | "";
}

/** The people whose saved search this House would answer. What the host hasn't decided yet doesn't rule anyone out. */
export function useSearchDemand({ city, region, startDate, endDate, vibe }: DemandQuery): { count: number; faces: User[] } {
  const store = useStore();
  const { savedSearches, currentUserId } = store;
  if (!region.trim()) return { count: 0, faces: [] };
  const month = startDate.slice(0, 7);
  const matches = openSearchesFor(
    // A search from no place at all says nothing about this one.
    savedSearches.filter((s) => s.place !== null && s.userId !== currentUserId).map((s) => ({ ...s, month: month ? s.month : null, category: vibe ? s.category : null })),
    { city, region, location: locationOf(city, region), lat: 0, lng: 0, startDate, endDate, vibe: vibe || "social" },
  );
  const ids = [...new Set(matches.flatMap((s) => (s.userId ? [s.userId] : [])))];
  return { count: peopleIn(matches), faces: ids.flatMap((id) => findUser(store, id) ?? []).slice(0, MAX_FACES) };
}

/** "5 people searched for Canggu in February – they'll be notified first": its own line, with their faces. */
export function SearchDemandHint({ className, ...query }: DemandQuery & { className?: string }) {
  const t = useTranslations("explore.search.hint");
  const monthName = useMonthName();
  const { count, faces } = useSearchDemand(query);
  if (count === 0) return null;
  const location = locationOf(query.city, query.region);
  const place = location.city || location.country;
  const month = query.startDate.slice(0, 7);
  return (
    <div className={cn("flex flex-wrap items-center gap-3 text-body font-semibold text-ink", className)}>
      <Sparkles className="size-4 shrink-0 text-ink" aria-hidden />
      {faces.length > 0 && <AvatarStack users={faces} size="sm" max={MAX_FACES} />}
      <span className="min-w-0 flex-1">{month ? t("placeMonth", { count, place, month: monthName(month) }) : t("place", { count, place })}</span>
    </div>
  );
}

/** Everyone in for this House ("I'm in for …", lib/inFor.ts) – what the host hasn't decided yet doesn't rule anyone out. */
export function useInForDemand({ city, region, startDate, endDate, vibe }: DemandQuery): { count: number; faces: User[]; ids: string[] } {
  const store = useStore();
  const today = useTodayIso();
  if (!region.trim() || !today) return { count: 0, faces: [], ids: [] };
  const ids = peopleInFor(store.inFor, { city, region, location: locationOf(city, region), lat: 0, lng: 0, startDate, endDate, vibe }, today, new Set(store.currentUserId ? [store.currentUserId] : []));
  return { count: ids.length, faces: ids.flatMap((id) => findUser(store, id) ?? []).slice(0, MAX_FACES), ids };
}

/** "14 people are in for Lisbon in March" with their faces – Open a House, the step "Where and when?". */
export function InForHint({ className, ...query }: DemandQuery & { className?: string }) {
  const t = useTranslations("inFor");
  const monthName = useMonthName();
  const { count, faces } = useInForDemand(query);
  if (count === 0) return null;
  const location = locationOf(query.city, query.region);
  const place = location.city || location.country;
  const month = query.startDate.slice(0, 7);
  return (
    <div className={cn("flex flex-wrap items-center gap-3 text-body font-semibold text-ink", className)}>
      <MapPin className="size-4 shrink-0 text-ink" aria-hidden />
      {faces.length > 0 && <AvatarStack users={faces} size="sm" max={MAX_FACES} />}
      <span className="min-w-0 flex-1">{month ? t("hint", { count, place, month: monthName(month) }) : t("hintNoMonth", { count, place })}</span>
    </div>
  );
}
