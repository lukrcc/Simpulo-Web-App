"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { useFormat } from "@/i18n/format";
import { crewsOf, getPeople, peopleLivedWith, type CrewGroup, type StoreData } from "@/lib/store";
import type { Crew, User } from "@/lib/types";

/** Your own profile: "People · N" – the way to /people. */
export interface OwnPeople {
  kind: "own";
  people: User[];
}

/** Someone else's: the counts, plus the Houses you lived in together. */
export interface ProfileCrews {
  kind: "theirs";
  /** Completed Houses the person lived in */
  houses: number;
  /** Different people they lived with, across all of them */
  people: number;
  /** The Houses shown as rows: all of them on your own profile, only the ones you shared on someone else's */
  groups: CrewGroup[];
  /** Someone else's profile: the rows are the Houses in common */
  inCommon: boolean;
}

/**
 * What the profile shows under the bio. Your own: "People · N" (everyone from your completed and locked Houses).
 * Someone else's: "Crews" – the counts, plus the Houses you lived in together (none when logged out). Nothing to
 * show: null.
 */
export function profileCrews(store: StoreData & { crews: Crew[] }, userId: string, viewerId: string | null): OwnPeople | ProfileCrews | null {
  if (viewerId === userId) {
    const people = getPeople(store, userId).map((p) => p.user);
    return people.length > 0 ? { kind: "own", people } : null;
  }
  const groups = crewsOf(store, userId);
  if (groups.length === 0) return null;
  return {
    kind: "theirs",
    houses: groups.length,
    people: peopleLivedWith(store, userId).reduce((sum, g) => sum + g.people.length, 0),
    groups: viewerId ? groups.filter((g) => g.crew.memberIds.includes(viewerId)) : [],
    inCommon: true,
  };
}

/** Own profile: "People · 10" with a few faces – opens /people. */
export function PeopleLink({ people }: { people: User[] }) {
  const t = useTranslations("profile.crews");
  return (
    <Link
      href="/people"
      className="-mx-2 mt-5 flex items-center gap-3 rounded-2xl border-t border-black/5 px-2 pb-2 pt-5 transition-colors hover:bg-black/[0.02]"
    >
      <span className="text-sm font-semibold">
        {t("people")} <span className="font-normal text-zinc-500">· {people.length}</span>
      </span>
      <span className="ml-auto">
        <AvatarStack users={people} max={5} size="sm" />
      </span>
      <ChevronRight className="size-4 shrink-0 text-zinc-400" aria-hidden />
    </Link>
  );
}

/** "Crews" under the bio: "N houses · M people", then one avatar row per House (title, dates); a face opens its profile. */
export function Crews({ crews }: { crews: ProfileCrews }) {
  const t = useTranslations("profile.crews");
  const f = useFormat();
  return (
    <section aria-labelledby="profile-crews" className="mt-5 border-t border-black/5 pt-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="profile-crews" className="text-sm font-semibold">
          {t("title")}
        </h2>
        <p className="text-sm text-zinc-500 tabular-nums">{t("counts", { houses: crews.houses, people: crews.people })}</p>
      </div>
      {crews.groups.length > 0 && (
        <>
          {crews.inCommon && <p className="mt-3 text-xs font-medium text-zinc-500">{t("inCommon")}</p>}
          <ul className="mt-3 space-y-4">
            {crews.groups.map(({ crew, stay, people }) => (
              <li key={crew.houseId}>
                <p className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium text-ink">{stay.title}</span>
                  <span className="shrink-0 text-xs text-zinc-500">{f.shortRange(stay.startDate, stay.endDate)}</span>
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t("peopleIn", { title: stay.title })}>
                  {people.map((person) => (
                    <li key={person.id}>
                      <Avatar user={person} size="md" linked />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
