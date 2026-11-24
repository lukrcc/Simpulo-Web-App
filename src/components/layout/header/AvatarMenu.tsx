// The avatar in the header: a click opens the account menu (CLAUDE.md "Kopfleiste – drei Zonen"): a calm popover in the glass of the header's
// other panels (.bar-menu), 8px under the bar. Signed in: Profile · Your people · Saved · Settings · Log out; signed out (the person icon): Log
// in · Sign up. It closes on a click beside it, on Escape and after a choice (phones and tablets: the same list, BottomTabBar).
import { Bookmark, LogIn, LogOut, Settings, UserPlus, UserRound, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { Anchored } from "@/components/ui/Anchored";
import { Avatar } from "@/components/ui/Avatar";
import { darkMenuClass } from "@/components/ui/DarkMenu";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

type Item = { key: "profile" | "people" | "saved" | "settings" | "logOut" | "logIn" | "signUp"; icon: LucideIcon; href?: string; onSelect?: () => void };

/** One row: at least 44px (fingers), the icon 16px with the header's stroke (1.75). */
const ITEM = "flex min-h-11 w-full items-center gap-3 rounded-full px-3 text-left text-body text-ink/85 transition-colors duration-150 hover:bg-ink/5 hover:text-ink";
const ICON = "size-4 shrink-0";
const STROKE = 1.75;

function MenuRows({ groups, onDone, rowClassName }: { groups: Item[][]; onDone: () => void; rowClassName?: string }) {
  const t = useTranslations("nav.menu");
  const row = cn(ITEM, rowClassName);
  return (
    <>
      {groups.map((group, i) => (
        <div key={i} role="none">
          {i > 0 && <div role="separator" className="mx-3 my-2 h-px bg-ink/12" />}
          {group.map((item) => {
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
          })}
        </div>
      ))}
    </>
  );
}

/**
 * The account menu's entries – ONE list for the desktop popover (AvatarMenu), the tablet's popover over the Profile tab and the phones' sheet
 * (BottomTabBar): Profile · Your people · Saved · Settings, after a fine line Log out (this device; "Log out of all devices" stays in Settings ›
 * Account). Dark mode, help, ideas, the app and the admin live in Settings and the footer. `onDone` closes the surrounding menu or sheet.
 */
export function AccountMenuList({ onDone, rowClassName }: { onDone: () => void; rowClassName?: string }) {
  const t = useTranslations("nav.menu");
  const store = useStore();
  const router = useRouter();
  const showToast = useToast();
  const groups: Item[][] = [
    [
      { key: "profile", icon: UserRound, href: "/profile" },
      { key: "people", icon: Users, href: "/people" },
      { key: "saved", icon: Bookmark, href: "/saved" },
      { key: "settings", icon: Settings, href: "/settings" },
    ],
    [
      {
        key: "logOut",
        icon: LogOut,
        onSelect: () => {
          store.logout();
          showToast(t("loggedOut"));
          router.push("/");
        },
      },
    ],
  ];
  return <MenuRows groups={groups} onDone={onDone} rowClassName={rowClassName} />;
}

/** Signed out: Log in · Sign up – both the one auth sheet (one flow, no separate sign-up), with their own words. */
export function GuestMenuList({ onDone, rowClassName }: { onDone: () => void; rowClassName?: string }) {
  const requireAuth = useRequireAuth();
  const groups: Item[][] = [
    [
      { key: "logIn", icon: LogIn, onSelect: () => requireAuth(undefined, { reason: "login" }) },
      { key: "signUp", icon: UserPlus, onSelect: () => requireAuth(undefined, { reason: "signup" }) },
    ],
  ];
  return <MenuRows groups={groups} onDone={onDone} rowClassName={rowClassName} />;
}

export function AvatarMenu({ me }: { me: User | undefined }) {
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
        className={cn(
          "press flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full transition-shadow duration-150",
          !me && "bg-(--hdr-corner-bg) text-ink hover:bg-(--hdr-corner-hover)",
          open && "ring-2 ring-ink/40",
        )}
      >
        {me ? <Avatar user={me} size="md" className="max-w-none" /> : <UserRound aria-hidden className="size-4" />}
      </button>
      {open && (
        <Anchored anchor={buttonRef} align="end">
          <button type="button" aria-label={t("close")} tabIndex={-1} onClick={close} className="fixed inset-0 -z-10 cursor-default" />
          <div role="menu" aria-label={t("label")} className={cn(darkMenuClass, "animate-fade-in w-64")}>
            {me ? <AccountMenuList onDone={close} /> : <GuestMenuList onDone={close} />}
          </div>
        </Anchored>
      )}
    </>
  );
}
