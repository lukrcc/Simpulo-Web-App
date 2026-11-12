"use client";

import { Award } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { earningsFor } from "@/lib/earnings";
import { hostTypeOf } from "@/lib/hostStats";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Pro host (lib/hostStats.ts `hostTypeOf`): at least one House with a host fee. Share hosts aren't. */
export function useIsProHost(userId: string): boolean {
  const store = useStore();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const hosted = store.stays.filter((s) => s.hostId === userId && s.status !== "draft" && s.status !== "draft_unclaimed");
  if (hosted.length === 0) return false;
  return hostTypeOf(earningsFor(store, userId, today), hosted) === "pro";
}

/**
 * "Pro host": an outline capsule (cream 20 % on Ember, ink 12 % on light), the award icon 14px + the words, in the text's colour – only for
 * pro hosts (a host fee), never for share hosts. Tooltip "Earns a host fee for running the House". `tagline`: the host's own line beside it
 * ("Surf coach · ISA Level 2"), muted.
 */
export function ProHostBadge({ user, tone = "dark", tagline = false, className }: { user: Pick<User, "id" | "proTitle">; tone?: "dark" | "light"; tagline?: boolean; className?: string }) {
  const t = useTranslations("growth.premium");
  const pro = useIsProHost(user.id);
  if (!pro) return null;
  return (
    <span className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1", className)}>
      <span
        tabIndex={0}
        data-tooltip-info={t("proHostTooltip")}
        className={cn(
          "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-small font-semibold",
          tone === "dark" ? "border-ink/20 text-ink" : "border-ink/12 text-ink",
        )}
      >
        <Award aria-hidden className="size-3.5" strokeWidth={2} />
        {t("proHost")}
      </span>
      {tagline && user.proTitle && <span className="truncate text-small text-muted">{user.proTitle}</span>}
    </span>
  );
}
