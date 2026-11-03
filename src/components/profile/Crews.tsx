"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ListRow } from "@/components/ui/ListRow";
import { useFormat } from "@/i18n/format";
import { crewsOf, livedWithFor, peopleLivedWith, type CrewGroup, type LivedWithEntry, type StoreData } from "@/lib/store";
import type { Crew, LivedWith } from "@/lib/types";

/** Your own profile: "Lived with" – everyone from your completed Houses (only you see it). */
export interface OwnPeople {
  kind: "own";
  entries: LivedWithEntry[];
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
 * What the profile shows under the bio. Your own: "Lived with" (from LivedWith – nobody else ever sees it). Someone
 * else's: "Crews" – the counts, plus the Houses you lived in together (none when logged out). Nothing to show: null.
 */
export function profileCrews(store: StoreData & { crews: Crew[]; livedWith: LivedWith[] }, userId: string, viewerId: string | null): OwnPeople | ProfileCrews | null {
  if (viewerId === userId) {
    const entries = livedWithFor(store, userId);
    return entries.length > 0 ? { kind: "own", entries } : null;
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

/**
 * Own profile only: "Lived with" – one row per person (avatar, name, the House you shared most recently), each opening
 * their profile. It replaces the People list Your houses used to have.
 */
export function LivedWithSection({ entries }: { entries: LivedWithEntry[] }) {
  const t = useTranslations("profile.crews");
  return (
    <section aria-labelledby="profile-lived-with" className="mt-5 border-t border-line pt-5">
      <h2 id="profile-lived-with" className="flex items-center gap-2 text-body font-semibold">
        {t("livedWith")} <Badge>{entries.length}</Badge>
      </h2>
      <p className="mt-0.5 text-small text-muted">{t("onlyYou")}</p>
      <ul className="mt-2 divide-y divide-line">
        {entries.map(({ user, house }) => (
          <li key={user.id}>
            <Link href={`/u/${user.id}`} className="block">
              <ListRow lead={<Avatar user={user} size="md" />} title={user.name} subtitle={house.title} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Crews" under the bio: "N houses · M people", then one avatar row per House (title, dates); a face opens its profile. */
export function Crews({ crews }: { crews: ProfileCrews }) {
  const t = useTranslations("profile.crews");
  const f = useFormat();
  return (
    <section aria-labelledby="profile-crews" className="mt-5 border-t border-line pt-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="profile-crews" className="text-body font-semibold">
          {t("title")}
        </h2>
        <Badge>{t("counts", { houses: crews.houses, people: crews.people })}</Badge>
      </div>
      {crews.groups.length > 0 && (
        <>
          {crews.inCommon && <p className="mt-3 text-small font-medium text-muted">{t("inCommon")}</p>}
          <ul className="mt-3 space-y-4">
            {crews.groups.map(({ crew, stay, people }) => (
              <li key={crew.houseId}>
                <p className="flex items-baseline justify-between gap-3 text-body">
                  <span className="min-w-0 truncate font-medium text-ink">{stay.title}</span>
                  <span className="shrink-0 text-small text-muted">{f.shortRange(stay.startDate, stay.endDate)}</span>
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
