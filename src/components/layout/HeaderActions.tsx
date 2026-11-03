"use client";

import { Download, Heart, LogOut, Settings, User as UserIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Anchored } from "@/components/ui/Anchored";
import { Avatar } from "@/components/ui/Avatar";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { GET_THE_APP_HREF } from "./secondaryLinks";

/** Avatar → Profile · Settings · Get the app · Log out. */
export function AccountMenu({ me }: { me: User }) {
  const t = useTranslations("nav");
  const { logout } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
  const itemClass = "flex w-full items-center gap-3 px-4 py-2.5 text-left text-body text-ink hover:bg-bg";

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("yourProfile")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <Avatar user={me} size="base" />
      </button>
      {open && (
        // In a portal: the site header clips its overflow. The backdrop closes it; it sits under the menu.
        <Anchored anchor={buttonRef} align="end">
          <button type="button" aria-label={t("menu.close")} tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 -z-10 cursor-default" />
          <div role="menu" className="animate-fade-in w-[220px] overflow-hidden rounded-2xl bg-surface py-1.5 shadow-xl ring-1 ring-line">
            <p className="truncate px-4 pb-2 pt-1.5 text-small text-muted">{me.name}</p>
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
        </Anchored>
      )}
    </div>
  );
}
