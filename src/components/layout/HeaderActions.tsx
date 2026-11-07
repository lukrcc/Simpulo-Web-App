"use client";

import { Download, Heart, LogOut, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Anchored } from "@/components/ui/Anchored";
import { Avatar } from "@/components/ui/Avatar";
import { useIsStandalone } from "@/lib/install";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { GET_THE_APP_HREF } from "./secondaryLinks";

/** The menu's glass, as the other menus, but nearly opaque (92 %) – no photo shows through behind its text. */
const MENU_GLASS = { backgroundColor: "rgba(250, 248, 244, 0.92)" };

/**
 * The avatar's menu, 260px of glass (8px inside): the head – avatar 40px, the name, "View profile" – is one link to the own profile; a
 * hairline; Saved houses · Settings · Get the app (not when installed already); a hairline; Log out; 12px below, "Impressum · Privacy ·
 * Terms" in one small line. Rows 40px, text 15px, icons 18px muted, hover a soft rounded surface over the full width.
 */
export function AccountMenu({ me }: { me: User }) {
  const t = useTranslations("nav");
  const tFooter = useTranslations("footer");
  const { logout } = useStore();
  const router = useRouter();
  const standalone = useIsStandalone();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);
  const items: ReadonlyArray<{ href: string; label: string; icon: LucideIcon }> = [
    { href: "/saved", label: t("menu.saved"), icon: Heart },
    { href: "/settings", label: t("menu.settings"), icon: Settings },
    ...(standalone ? [] : [{ href: GET_THE_APP_HREF, label: t("menu.getTheApp"), icon: Download }]),
  ];
  const row = "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-body text-ink transition-colors duration-150 hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-none";
  const separator = <div role="separator" className="mx-3 my-2 h-px bg-ink/8" />;
  const legal = [
    { href: "/impressum", label: tFooter("links.impressum") },
    { href: "/privacy", label: tFooter("links.privacy") },
    { href: "/terms", label: tFooter("links.terms") },
  ];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("yourProfile")}
        data-tooltip={t("yourProfile")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ink/25 focus-visible:ring-offset-2"
      >
        <Avatar user={me} size="sm" />
      </button>
      {open && (
        // In a portal: the site header clips its overflow. The backdrop closes it; it sits under the menu.
        <Anchored anchor={buttonRef} align="end">
          <button type="button" aria-label={t("menu.close")} tabIndex={-1} onClick={close} className="fixed inset-0 -z-10 cursor-default" />
          <div role="menu" style={MENU_GLASS} className="glass-panel animate-fade-in w-[260px] overflow-hidden rounded-[20px]! p-2">
            {/* The head is one link to the own profile. */}
            <Link href="/profile" role="menuitem" onClick={close} className="flex items-center gap-3 rounded-xl p-2 transition-colors duration-150 hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-none">
              <Avatar user={me} size="md" />
              <span className="min-w-0">
                <span className="block truncate text-body font-semibold text-ink">{me.name}</span>
                <span className="block text-small text-muted">{t("menu.viewProfile")}</span>
              </span>
            </Link>
            {separator}
            {items.map(({ href, label, icon: Icon }) => (
              <Link key={href} role="menuitem" href={href} onClick={close} className={row}>
                <Icon className="size-4.5 shrink-0 text-muted" aria-hidden />
                {label}
              </Link>
            ))}
            {separator}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                logout();
                router.push("/");
              }}
              className={row}
            >
              <LogOut className="size-4.5 shrink-0 text-muted" aria-hidden />
              {t("menu.logOut")}
            </button>
            {/* 12px below: the legal links in one small line. */}
            <p className="mt-3 px-3 pb-1 text-eyebrow font-normal normal-case tracking-normal text-muted">
              {legal.map(({ href, label }, i) => (
                <span key={href}>
                  {i > 0 && <span aria-hidden> · </span>}
                  <Link href={href} role="menuitem" onClick={close} className="transition-colors duration-150 hover:text-ink">
                    {label}
                  </Link>
                </span>
              ))}
            </p>
          </div>
        </Anchored>
      )}
    </div>
  );
}
