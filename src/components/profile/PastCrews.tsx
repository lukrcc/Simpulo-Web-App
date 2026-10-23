"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { useFormat } from "@/i18n/format";
import { getCrew, isCrewMember, type StoreData } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { firstName } from "@/lib/utils";

export interface PastCrewMate {
  user: User;
  /** The completed House they shared (the most recent one, if several). */
  stay: Stay;
}

/** Everyone from a completed House this user hosted or joined – most recent House first, each person once. */
export function getPastCrewMates(store: StoreData, userId: string): PastCrewMate[] {
  const mates: PastCrewMate[] = [];
  const done = store.stays.filter((s) => s.status === "completed" && isCrewMember(store, s, userId)).toSorted((a, b) => b.endDate.localeCompare(a.endDate));
  for (const stay of done) {
    for (const mate of getCrew(store, stay)) {
      if (mate.id !== userId && !mates.some((m) => m.user.id === mate.id)) mates.push({ user: mate, stay });
    }
  }
  return mates;
}

/** "Past crews": everyone this user has lived with in a completed House. Renders nothing when empty. */
export function PastCrews({ user, mates }: { user: User; mates: PastCrewMate[] }) {
  const t = useTranslations("profile");
  const f = useFormat();
  const [open, setOpen] = useState(false);
  if (mates.length === 0) return null;

  return (
    <>
      {/* One row: "Lived with" + faces (max 5, then +N); opens the full list. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("pastCrewsOpen", { count: mates.length, name: firstName(user) })}
        className="mt-4 flex items-center gap-3 rounded-full text-sm text-zinc-500 transition-colors hover:text-ink"
      >
        {t("livedWith")}
        <AvatarStack users={mates.map((m) => m.user)} max={5} size="sm" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("pastCrewsTitle")} subtitle={t("pastCrewsSubtitle", { name: firstName(user) })}>
        <ul className="scroll-pane -mx-2 max-h-[60vh]">
          {mates.map(({ user: mate, stay }) => (
            <li key={mate.id}>
              <Link href={`/u/${mate.id}`} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-black/[0.03]">
                <Avatar user={mate} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{mate.name}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {mate.country} · {stay.title || f.placeName(stay)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
