"use client";

import { User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FiltersButton, SortCapsule, SortList } from "@/components/explore/Filters";
import { AccountMenu } from "@/components/layout/HeaderActions";
import { Logo } from "@/components/layout/Logo";
import { isNavActive } from "@/components/layout/nav";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { cn } from "@/lib/utils";
import { headerDot } from "./dot";
import { HeaderChips } from "./HeaderChips";
import type { HeaderData } from "./SiteHeader";

/** The compact circles: 32px, surface with a line border (ink when current), a 16px icon. */
const circle = "relative flex size-8 shrink-0 items-center justify-center rounded-full border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent [&>svg]:size-4";

/**
 * The compact header (Explore, scrolled; sizes: SiteHeader.tsx) – one 64px row, a grid "auto 1fr auto auto" with
 * 20px gaps: wordmark | only the chips (as many as fit, then More) | Sort + Filters | the nav as circles, bell,
 * avatar, "Open a House" (logged out: nav circles, login circle, "Open a House").
 */
export function HeaderCompact({ data }: { data: HeaderData }) {
  const t = useTranslations("nav");
  const tOpen = useTranslations("common.ui.openHouse");
  const { pathname, loggedIn, me, items, unread, pendingRequests, controls, filters, requireAuth } = data;
  const sortLabel = controls?.sort?.options.find((o) => o.value === filters.sort)?.label ?? "";

  return (
    <div className="grid h-16 grid-cols-[auto_1fr_auto_auto] items-center gap-5">
      <Logo size="header" tagline={false} />

      <div className="relative min-w-0">{controls && <HeaderChips controls={controls} value={filters.vibes} size="compact" />}</div>

      <div className="flex items-center gap-2">
        {controls?.sort && (
          <SortCapsule label={sortLabel} size="sm">
            <SortList options={controls.sort.options} value={filters.sort} onChange={controls.sort.onChange} />
          </SortCapsule>
        )}
        {controls && <FiltersButton count={controls.filters.count} onClick={controls.filters.onOpen} expanded={controls.filters.open} size="sm" />}
      </div>

      <div className="flex items-center gap-2">
        {items.map(({ href, labelKey, headerLabelKey, icon: Icon }) => {
          const label = t(`items.${headerLabelKey ?? labelKey}`);
          const current = isNavActive(href, pathname);
          const newRequests = labelKey === "houses" && pendingRequests > 0;
          const showUnread = labelKey === "messages" && unread > 0;
          const ariaLabel = newRequests ? t("itemNew", { label, count: pendingRequests }) : showUnread ? t("itemUnread", { label, count: unread }) : label;
          return (
            <Link key={href} href={href} title={label} aria-current={current ? "page" : undefined} aria-label={ariaLabel} className={cn(circle, current ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:bg-bg")}>
              <Icon aria-hidden />
              {(newRequests || showUnread) && <span aria-hidden className={headerDot} />}
            </Link>
          );
        })}
        {loggedIn && me ? (
          <>
            <NotificationBell variant="compact" />
            <AccountMenu me={me} size="sm" />
          </>
        ) : (
          <button type="button" onClick={requireAuth} title={t("logIn")} aria-label={t("logIn")} className={cn(circle, "border-line bg-surface text-ink hover:bg-bg")}>
            <UserIcon aria-hidden />
          </button>
        )}
        {/* 32px, 13px/600, 14px sides, no icon. */}
        <Link href="/create" className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-ink px-3.5 text-[13px] font-semibold text-surface transition-colors hover:bg-ink/90">
          {tOpen("label")}
        </Link>
      </div>
    </div>
  );
}
