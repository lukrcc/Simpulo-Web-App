"use client";

import { useEffect, useState } from "react";
import { cardTaskOf, needsFill } from "@/lib/houseTasks";
import { acceptedOverlaps } from "@/lib/overlap";
import { unreadThreadCount, useStore } from "@/lib/store";

/** A request that still ties you to a House (not declined, expired or withdrawn). */
const LIVE = new Set(["pending", "accepted", "invited", "waitlisted", "waitlist_requested"]);

/**
 * The installed app's icon count (navigator.setAppBadge): unread chats + open Needs-you tasks – what asks something of you on your Houses
 * (cardTaskOf), one for overlapping acceptances, one per House of yours to fill. 0 clears it. Only where the browser supports it; renders
 * nothing.
 */
export function AppBadge() {
  const store = useStore();
  // The clock, once a minute (deadlines move tasks in and out).
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString());
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, []);

  const me = store.currentUserId;
  let count = 0;
  if (me && now) {
    const mine = store.stays.filter((stay) => stay.hostId === me || store.joinRequests.some((r) => r.stayId === stay.id && r.userId === me && LIVE.has(r.status)));
    const tasks = mine.filter((stay) => cardTaskOf(store, stay, now) !== null).length;
    const overlaps = acceptedOverlaps(store).length > 0 ? 1 : 0;
    const fill = mine.filter((stay) => stay.hostId === me && needsFill(stay, now.slice(0, 10))).length;
    count = unreadThreadCount(store) + tasks + overlaps + fill;
  }

  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (!nav.setAppBadge || !nav.clearAppBadge) return;
    void (count > 0 ? nav.setAppBadge(count) : nav.clearAppBadge()).catch(() => {});
  }, [count]);
  return null;
}
