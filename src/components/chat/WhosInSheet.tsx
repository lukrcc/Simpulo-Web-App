"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ListRow } from "@/components/ui/ListRow";
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
      <ul className="">
        {crew.map((user) => (
          <li key={user.id}>
            <Link href={`/u/${user.id}`} onClick={onClose} className="-mx-2 block rounded-xl px-2 transition-colors hover:bg-bg">
              <ListRow
                lead={<Avatar user={user} size="md" />}
                title={user.name}
                subtitle={user.country}
                aside={
                  <span className="flex shrink-0 items-center gap-1.5">
                    {user.id === stay.hostId && <Badge>{t("host")}</Badge>}
                    {user.id === store.currentUserId && <Badge>{t("you")}</Badge>}
                  </span>
                }
              />
            </Link>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
