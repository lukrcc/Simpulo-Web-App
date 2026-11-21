"use client";

// The avatar in the header: a click opens the account menu – a popover from the bar in the dark glass (.bar-menu, like every menu that opens
// out of the bar: radius 20, 12 in, 8px under the bar), no side sheet. Its entries and order: AccountMenuList below. It closes on a click beside it, on Escape and after a
// choice (phones: the same list in a sheet from the bottom, MobileAccountSheet). Log out ends the session on this device only (Settings › Account has "Log out of all devices").
import { Bookmark, LayoutDashboard, LifeBuoy, Lightbulb, Moon, Settings, Smartphone, Users, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { openGetApp } from "@/components/GetAppDialog";
import { Anchored } from "@/components/ui/Anchored";
import { Avatar } from "@/components/ui/Avatar";
import { darkMenuClass } from "@/components/ui/DarkMenu";
import { useIsAdmin } from "@/lib/admin/access";
import { useIsStandalone } from "@/lib/install";
import { getCurrentUser, useStore } from "@/lib/store";
import { APPEARANCE_IN_MENU } from "@/config/appearance";
import { applyThemePref, useResolvedTheme, useThemePref, type ThemePref } from "@/lib/theme";
import { Switch } from "@/components/ui/Switch";
import { openGetHelp, openShareIdea } from "@/lib/support/feedback";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

type Item = { key: "saved" | "people" | "earnings" | "settings" | "help" | "idea" | "app" | "admin"; icon: LucideIcon; href?: string; onSelect?: () => void };

/** One row: at least 44px (fingers), the icon 16px with the header's stroke (1.75). */
const ITEM = "flex min-h-11 w-full items-center gap-3 rounded-full px-3 text-left text-body text-ink/85 transition-colors duration-150 hover:bg-ink/5 hover:text-ink";
const ICON = "size-4 shrink-0";
const STROKE = 1.75;

/**
 * The account menu's entries – ONE list for the desktop popover (AvatarMenu), the tablet's popover over the Profile tab and the phones' sheet
 * (BottomTabBar). In groups with fine lines (CLAUDE.md "Avatar-Menü"): the head (photo, name, "View profile" – the whole head leads to the
 * own profile) · Saved · Your people · Earnings (hosts) · Dark mode (a switch – the mode in effect; turning it stores Light or Dark, the
 * same value as Settings › Appearance; the menu stays open) · Help · Share an idea · Get the app (not in the installed app) · Admin (admins) ·
 * Settings. Log out lives in Settings › Account. `onDone` closes the surrounding menu or sheet; `rowClassName` lets the sheet use taller rows for fingers.
 */
export function AccountMenuList({ onDone, rowClassName }: { onDone: () => void; rowClassName?: string }) {
  const t = useTranslations("nav.menu");
  const store = useStore();
  const me = getCurrentUser(store);
  const isAdmin = useIsAdmin() === true;
  const standalone = useIsStandalone();
  const pref = useThemePref();
  const dark = useResolvedTheme() === "dark";
  // Hosts: anyone with a House of their own (not an example) – they get Earnings.
  const hosts = me !== undefined && store.stays.some((s) => s.hostId === me.id && !s.isExample && s.status !== "draft_unclaimed");
  const groups: Item[][] = [
    [
      { key: "saved", icon: Bookmark, href: "/saved" },
      { key: "people", icon: Users, href: "/people" },
      ...(hosts ? [{ key: "earnings", icon: Wallet, href: "/your-houses/payouts" } satisfies Item] : []),
    ],
    [
      { key: "help", icon: LifeBuoy, onSelect: () => openGetHelp() },
      { key: "idea", icon: Lightbulb, onSelect: openShareIdea },
      ...(standalone ? [] : [{ key: "app", icon: Smartphone, onSelect: openGetApp } satisfies Item]),
    ],
    ...(isAdmin ? [[{ key: "admin", icon: LayoutDashboard, href: "/admin" } satisfies Item]] : []),
  ];
  const row = cn(ITEM, rowClassName);
  const line = <div role="separator" className="mx-3 my-2 h-px bg-ink/12" />;
  const entry = (item: Item) => {
    const body = (
      <>
        <item.icon aria-hidden className={ICON} strokeWidth={STROKE} />
        <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
      </>
    );
    return item.href ? (
      <Link key={item.key} role="menuitem" href={item.href} onClick={onDone} className={row}>
        {body}
      </Link>
    ) : (
      <button
        key={item.key}
        role="menuitem"
        type="button"
        onClick={() => {
          onDone();
          item.onSelect?.();
        }}
        className={row}
      >
        {body}
      </button>
    );
  };
  const choose = (next: ThemePref) => {
    if (next === pref) return;
    applyThemePref(next);
    store.setAppearance(next);
  };
  return (
    <>
      {/* The head: photo, name, "View profile" – all of it leads to the own profile. */}
      {me && (
        <Link role="menuitem" href="/profile" onClick={onDone} data-account-head className="flex min-h-14 items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors duration-150 hover:bg-ink/5">
          <Avatar user={me} size="md" className="shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body font-semibold text-ink">{me.name.split(" ")[0]}</span>
            <span className="block truncate text-small text-muted">{t("viewProfile")}</span>
          </span>
        </Link>
      )}
      {groups.map((group, i) => (
        <div key={i} role="none">
          {line}
          {group.map(entry)}
          {/* Dark mode after the first group: one row like the others, a switch on the right – it shows the mode in effect; turning it
              stores a fixed choice (Light or Dark). "Match system" lives in Settings › Appearance. The menu stays open. */}
          {i === 0 && APPEARANCE_IN_MENU && (
            <>
              {line}
              <div role="none" data-account-appearance className={cn("flex min-h-11 items-center gap-3 px-3", rowClassName)}>
                <Moon aria-hidden className={ICON} strokeWidth={STROKE} />
                <span className="min-w-0 flex-1 truncate text-body text-ink/85">{t("darkMode")}</span>
                <Switch on={dark} label={t("darkMode")} onChange={(on) => choose(on ? "dark" : "light")} />
              </div>
            </>
          )}
        </div>
      ))}
      {line}
      <Link role="menuitem" href="/settings" onClick={onDone} className={row}>
        <Settings aria-hidden className={ICON} strokeWidth={STROKE} />
        <span className="min-w-0 flex-1 truncate">{t("settings")}</span>
      </Link>
    </>
  );
}

export function AvatarMenu({ me }: { me: User }) {
  const t = useTranslations("nav.menu");
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const close = () => setOpen(false);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("label")}
        aria-haspopup="menu"
        aria-expanded={open}
        data-header-avatar
        className={cn("press flex size-10 shrink-0 overflow-hidden rounded-full transition-shadow duration-150", open && "ring-2 ring-ink/40")}
      >
        <Avatar user={me} size="md" className="max-w-none" />
      </button>
      {open && (
        <Anchored anchor={buttonRef} align="end">
          <button type="button" aria-label={t("close")} tabIndex={-1} onClick={close} className="fixed inset-0 -z-10 cursor-default" />
          <div role="menu" aria-label={t("label")} className={cn(darkMenuClass, "animate-fade-in w-72")}>
            <AccountMenuList onDone={close} />
          </div>
        </Anchored>
      )}
    </>
  );
}
