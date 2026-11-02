"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FiltersButton, SortCapsule, SortList } from "@/components/explore/Filters";
import { AccountMenu } from "@/components/layout/HeaderActions";
import { Logo } from "@/components/layout/Logo";
import { isNavActive } from "@/components/layout/nav";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { cn } from "@/lib/utils";
import { HeaderChips } from "./HeaderChips";
import type { HeaderData } from "./SiteHeader";

/**
 * The expanded header (sizes: SiteHeader.tsx). Row 1, 72px: wordmark + tagline | the nav, centred | bell + avatar
 * and "Open a House" (logged out: "Log in" + "Open a House"). Row 2 (Explore only), 44px + 12px: the chips and
 * Sort + Filters.
 */
export function HeaderExpanded({ data, exploreRow }: { data: HeaderData; exploreRow: boolean }) {
  const t = useTranslations("nav");
  const tOpen = useTranslations("common.ui.openHouse");
  const { pathname, loggedIn, me, items, unread, controls, filters, requireAuth } = data;
  const sortLabel = controls?.sort?.options.find((o) => o.value === filters.sort)?.label ?? "";

  return (
    <>
      <div className="grid h-18 grid-cols-[1fr_auto_1fr] items-center">
        {/* The tagline hangs under the wordmark out of the flow, so the box – and its centre – is the wordmark. */}
        <Logo size="header" className="relative" taglineClassName="absolute left-0 top-full whitespace-nowrap" />

        <nav aria-label={t("compactLabel")} className="flex items-center gap-7">
          {items.map(({ href, labelKey, headerLabelKey, icon: Icon }) => {
            const label = t(`items.${headerLabelKey ?? labelKey}`);
            const current = isNavActive(href, pathname);
            const showUnread = labelKey === "messages" && unread > 0;
            return (
              <Link
                key={href}
                href={href}
                aria-current={current ? "page" : undefined}
                aria-label={showUnread ? t("itemUnread", { label, count: unread }) : undefined}
                className={cn(
                  "relative flex items-center gap-2 py-2 text-[15px] font-medium transition-colors",
                  current ? "text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-ink" : "text-muted hover:text-ink",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
                {showUnread && <span aria-hidden className="absolute -right-2.5 top-2 size-1.5 rounded-full bg-accent" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 justify-self-end">
          {loggedIn && me ? (
            <>
              <NotificationBell variant="header" />
              <AccountMenu me={me} size="base" />
            </>
          ) : (
            <button type="button" onClick={requireAuth} className="flex h-10 items-center whitespace-nowrap text-[14px] font-medium text-ink underline-offset-4 hover:underline">
              {t("logIn")}
            </button>
          )}
          {/* 40px, 15px/600, 20px sides, 16px before it. */}
          <Link href="/create" className="ml-2 inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-ink px-5 text-[15px] font-semibold text-surface transition-colors hover:bg-ink/90">
            {tOpen("label")}
          </Link>
        </div>
      </div>

      {exploreRow && (
        <div className="flex h-11 items-center gap-6">
          {controls ? (
            <>
              <div className="min-w-0 flex-1">
                <HeaderChips controls={controls} value={filters.vibes} size="md" />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {controls.sort && (
                  <SortCapsule label={sortLabel} size="md">
                    <SortList options={controls.sort.options} value={filters.sort} onChange={controls.sort.onChange} />
                  </SortCapsule>
                )}
                <FiltersButton count={controls.filters.count} onClick={controls.filters.onOpen} expanded={controls.filters.open} size="md" />
              </div>
            </>
          ) : (
            // Until Explore has mounted: chip-shaped placeholders.
            <div aria-hidden className="flex min-w-0 flex-1 gap-2 overflow-hidden">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i} className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-ink/5" />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
