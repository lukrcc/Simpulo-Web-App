"use client";

import { Download, Heart, LogOut, Settings, User as UserIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { OpenHouseButton } from "@/components/ui/OpenHouseButton";
import { getCurrentUser, useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";
import { GET_THE_APP_HREF } from "./secondaryLinks";

/** Header right side: "Log in" (logged out) or the bell + avatar menu (logged in), plus "Open a House". */
export function HeaderActions() {
  const store = useStore();
  const requireAuth = useRequireAuth();
  const me = getCurrentUser(store);
  const t = useTranslations("nav");

  return (
    // Logged in: bell, avatar and "Open a House" 16px apart, centred on one line.
    <div className={cn("flex items-center justify-end", me ? "gap-4" : "gap-5")}>
      {me ? (
        <>
          <NotificationBell variant="header" />
          <AccountMenu me={me} />
        </>
      ) : (
        <button type="button" onClick={() => requireAuth()} className="text-sm font-medium text-muted hover:text-ink">
          {t("logIn")}
        </button>
      )}
      <OpenHouseButton />
    </div>
  );
}

/** Avatar → Profile · Settings · Get the app · Log out. */
function AccountMenu({ me }: { me: User }) {
  const t = useTranslations("nav");
  const { logout } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const items: ReadonlyArray<{ href: string; label: string; icon: LucideIcon }> = [
    { href: "/profile", label: t("menu.profile"), icon: UserIcon },
    { href: "/saved", label: t("menu.saved"), icon: Heart },
    { href: "/settings", label: t("menu.settings"), icon: Settings },
    { href: GET_THE_APP_HREF, label: t("menu.getTheApp"), icon: Download },
  ];
  const itemClass = "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink hover:bg-bg";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("yourProfile")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <Avatar user={me} size="md" />
      </button>
      {open && (
        <>
          <button type="button" aria-label={t("menu.close")} tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
          <div role="menu" className="animate-fade-in absolute right-0 top-full z-50 mt-2 w-[220px] overflow-hidden rounded-2xl bg-surface py-1.5 shadow-xl ring-1 ring-line">
            <p className="truncate px-4 pb-2 pt-1.5 text-xs text-muted">{me.name}</p>
            {items.map(({ href, label, icon: Icon }) => (
              <Link key={href} role="menuitem" href={href} onClick={() => setOpen(false)} className={itemClass}>
                <Icon className="size-4 text-muted" aria-hidden />
                {label}
              </Link>
            ))}
            <div className="my-1.5 h-px bg-ink/5" role="separator" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
                router.push("/");
              }}
              className={itemClass}
            >
              <LogOut className="size-4 text-muted" aria-hidden />
              {t("menu.logOut")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
