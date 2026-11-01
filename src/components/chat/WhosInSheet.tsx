"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { getCrew, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";

/** "Who's in": host first, then the accepted members – each links to their profile, crew-only channels beside. */
export function WhosInSheet({ stay, open, onClose }: { stay: Stay; open: boolean; onClose: () => void }) {
  const t = useTranslations("messages.thread");
  const store = useStore();
  const crew = getCrew(store, stay);

  return (
    <Sheet open={open} onClose={onClose} title={t("whosIn")} subtitle={t("memberCount", { count: crew.length })}>
      <ul className="-mx-2 space-y-0.5">
        {crew.map((user) => (
          <li key={user.id} className="flex items-center gap-2 rounded-2xl px-2 py-2 hover:bg-bg">
            <Link href={`/u/${user.id}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar user={user} size="md" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-medium">
                  <span className="truncate">{user.name}</span>
                  {user.id === stay.hostId && (
                    <span className="shrink-0 rounded-full bg-bg px-2 py-0.5 text-[11px] font-semibold text-ink">{t("host")}</span>
                  )}
                  {user.id === store.currentUserId && <span className="shrink-0 text-xs font-normal text-muted">{t("you")}</span>}
                </p>
                <p className="truncate text-sm text-muted">{user.country}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
