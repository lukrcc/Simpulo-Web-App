"use client";

import { Download, LogOut, Settings, User as UserIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { OpenHouseButton } from "@/components/ui/OpenHouseButton";
import { getCurrentUser, useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { GET_THE_APP_HREF } from "./secondaryLinks";

/** Header right side: "Log in" (logged out) or the avatar menu (logged in), plus "Open a House". */
export function HeaderActions() {
  const store = useStore();
  const requireAuth = useRequireAuth();
  const me = getCurrentUser(store);
  const t = useTranslations("nav");

  return (
    <div className="flex items-center justify-end gap-5">
      {me ? (
        <AccountMenu me={me} />
      ) : (
        <button type="button" onClick={() => requireAuth()} className="text-sm font-medium text-zinc-500 hover:text-ink">
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
    { href: "/settings", label: t("menu.settings"), icon: Settings },
    { href: GET_THE_APP_HREF, label: t("menu.getTheApp"), icon: Download },
  ];
  const itemClass = "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink hover:bg-neutral-50";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("yourProfile")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <Avatar user={me} size="sm" />
      </button>
      {open && (
        <>
          <button type="button" aria-label={t("menu.close")} tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
          <div role="menu" className="animate-fade-in absolute right-0 top-full z-50 mt-2 w-[220px] overflow-hidden rounded-2xl bg-white py-1.5 shadow-xl ring-1 ring-black/5">
            <p className="truncate px-4 pb-2 pt-1.5 text-xs text-zinc-500">{me.name}</p>
            {items.map(({ href, label, icon: Icon }) => (
              <Link key={href} role="menuitem" href={href} onClick={() => setOpen(false)} className={itemClass}>
                <Icon className="size-4 text-zinc-500" aria-hidden />
                {label}
              </Link>
            ))}
            <div className="my-1.5 h-px bg-black/5" role="separator" />
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
              <LogOut className="size-4 text-zinc-500" aria-hidden />
              {t("menu.logOut")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
