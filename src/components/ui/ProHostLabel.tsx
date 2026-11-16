"use client";

import { Home } from "lucide-react";
import { useTranslations } from "next-intl";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

/** How many Houses someone has hosted, as anyone may count them (published, booked or over – no drafts, nothing unlisted). */
export function useHostedCount(userId: string): number {
  const { stays } = useStore();
  return stays.filter((s) => s.hostId === userId && !s.isExample && s.visibility !== "unlisted" && ["published", "booked", "completed"].includes(s.status)).length;
}

/**
 * "Hosts 3 Houses": the one host title in the app (there's no "Pro host" any more) – an outline capsule 28px (ink 12 %, on Ember ink 20 %),
 * a house icon 14px + the words, for anyone who hosts. `tagline`: the host's own line beside it ("Surf coach · ISA Level 2"), muted.
 */
export function HostsBadge({ user, tone = "dark", tagline = false, className }: { user: Pick<User, "id" | "proTitle">; tone?: "dark" | "light"; tagline?: boolean; className?: string }) {
  const t = useTranslations("profile.view");
  const count = useHostedCount(user.id);
  if (count === 0) return null;
  return (
    <span className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1", className)}>
      <span className={cn("inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-small font-semibold text-ink", tone === "dark" ? "border-ink/20" : "border-ink/12")}>
        <Home aria-hidden className="size-3.5" strokeWidth={2} />
        {t("hostsHouses", { count })}
      </span>
      {tagline && user.proTitle && <span className="truncate text-small text-muted">{user.proTitle}</span>}
    </span>
  );
}
