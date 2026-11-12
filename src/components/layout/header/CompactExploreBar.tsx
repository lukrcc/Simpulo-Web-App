"use client";

import { Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { Container } from "@/components/layout/Container";
import { AccountMenu } from "@/components/layout/HeaderActions";
import { NavIcon } from "@/components/layout/header/FilledNavIcons";
import { navItemsFor } from "@/components/layout/nav";
import { useMessagesUnread } from "@/components/notifications/useNotifications";
import { iconButtonStyles } from "@/components/ui/IconButton";
import { useExploreCompact } from "@/lib/exploreCompact";
import { getCurrentUser, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Explore, scrolled down (lib/exploreCompact): header and filters as ONE bar – 64px, graphite, full width, a 1px --graphite-line under it,
 * its content on the 1440 grid. Left the Orbit mark (28px, back to the top); then the filters in focus – Where · When and Short trips (36px),
 * the categories as text with icons in a sideways-scrolling zone (fade + round arrow on the right, "More ▾" at the end), "All filters" as a
 * cream block (36px, radius 10). Right the navigation as icons (Your houses, Messages with its unread dot; tooltips), the avatar and "Open a
 * House" as a round "+" (1px cream 25 %). The sort lives in the All-filters panel here. Phones: the mark, Where · When, Short trips and the
 * filter icon – the navigation stays in the bottom tab bar. In and out with opacity and a short slide (220ms; none with reduced motion).
 */
export function CompactExploreBar({ search, shortTrips, categories, filters, mobileFilters }: { search: ReactNode; shortTrips: ReactNode; categories: ReactNode; filters: ReactNode; mobileFilters: ReactNode }) {
  const t = useTranslations("nav");
  const tOpen = useTranslations("common.ui.openHouse");
  const compact = useExploreCompact();
  const store = useStore();
  const me = getCurrentUser(store);
  const requireAuth = useRequireAuth();
  const router = useRouter();
  const unread = useMessagesUnread().chats;
  const items = navItemsFor(me !== undefined, "header").filter((item) => item.labelKey === "houses" || item.labelKey === "messages");

  return (
    <div
      data-site-header
      data-compact-bar
      inert={!compact}
      aria-hidden={!compact}
      className={cn(
        "fixed inset-x-0 top-0 z-45 bg-graphite shadow-[inset_0_-1px_0_var(--graphite-line)] pt-[calc(var(--band-h)+var(--safe-top))] text-ink [--control-h:36px] md:pt-(--band-h)",
        "transition-[opacity,translate] duration-220 ease-out motion-reduce:transition-none",
        compact ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
      )}
    >
      <Container className="explore-width flex h-16 items-center gap-3">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
          aria-label={t("backToTop")}
          className="press flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-ink/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
        >
          {/* The Orbit mark without its square: orange and cream, readable on graphite. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG mark, no optimisation needed */}
          <img src="/orbit-mark.svg" alt="" width={28} height={28} className="size-7" />
        </button>
        {/* Phones: Where · When gives way (truncated) so the filter icon always fits after Short trips. */}
        <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none md:shrink-0 [&>*:first-child]:min-w-0 [&>*:first-child]:shrink">
          {search}
          {shortTrips}
        </div>
        <div className="shrink-0 md:hidden">{mobileFilters}</div>
        <div className="hidden min-w-0 flex-1 md:block">{categories}</div>
        <div className="hidden shrink-0 md:block">{filters}</div>
        <nav aria-label={t("compactLabel")} className="hidden shrink-0 items-center gap-1 md:flex">
          {items.map((item) => {
            const label = t(`items.${item.headerLabelKey ?? item.labelKey}`);
            const showUnread = me !== undefined && item.labelKey === "messages" && unread > 0;
            const gated = me === undefined && item.audience === "member";
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={showUnread ? t("itemUnread", { label, count: unread }) : label}
                onClick={
                  gated
                    ? (e) => {
                        e.preventDefault();
                        requireAuth(() => router.push(item.href), { reason: item.labelKey === "messages" ? "messages" : "yourHouses" });
                      }
                    : undefined
                }
                className={cn(iconButtonStyles("sm"), "relative text-ink")}
              >
                <NavIcon item={item} active={false} line />
                {showUnread && <span aria-hidden className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" />}
              </Link>
            );
          })}
          <span className="ml-1 flex">
            {me ? (
              <AccountMenu me={me} avatarSize="sm" />
            ) : (
              <button type="button" onClick={() => requireAuth(undefined, { reason: "login" })} aria-label={t("logIn")} className="press flex size-8 items-center justify-center rounded-full bg-ink/6 text-ink hover:bg-ink/10">
                <UserRound aria-hidden className="size-4" />
              </button>
            )}
          </span>
          <Link href="/create" aria-label={tOpen("label")} className="press ml-1 flex size-9 items-center justify-center rounded-full border border-ink/25 text-ink transition-colors duration-150 hover:bg-ink/6">
            <Plus aria-hidden className="size-4" strokeWidth={2.25} />
          </Link>
        </nav>
      </Container>
    </div>
  );
}
