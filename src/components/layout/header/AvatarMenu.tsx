"use client";

// The avatar in the header: a click opens the account menu – a popover from the bar in the dark glass (.bar-menu, like every menu that opens
// out of the bar: radius 20, 12 in, 8px under the bar), no side sheet. Your profile · Saved · Your people · Settings · Help · Share an idea ·
// Get the app (not in the installed app) · Admin (admins only) · a line · Log out. It closes on a click beside it, on Escape and after a
// choice. Log out ends the session on this device only (Settings › Account has "Log out of all devices").
import { Bookmark, Eye, LayoutDashboard, LifeBuoy, Lightbulb, LogOut, Settings, Smartphone, UserRound, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { openGetApp } from "@/components/GetAppDialog";
import { Anchored } from "@/components/ui/Anchored";
import { Avatar } from "@/components/ui/Avatar";
import { darkMenuClass } from "@/components/ui/DarkMenu";
import { useToast } from "@/components/ui/Toast";
import { useIsAdmin } from "@/lib/admin/access";
import { useIsStandalone } from "@/lib/install";
import { useStore } from "@/lib/store";
import { openGetHelp, openShareIdea } from "@/lib/support/feedback";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

type Item = { key: "profile" | "preview" | "saved" | "people" | "settings" | "help" | "idea" | "app" | "admin"; icon: LucideIcon; href?: string; onSelect?: () => void };

const ITEM = "flex h-10 w-full items-center gap-3 rounded-full px-3 text-left text-body text-ink/85 transition-colors duration-150 hover:bg-ink/5 hover:text-ink";

export function AvatarMenu({ me }: { me: User }) {
  const t = useTranslations("nav.menu");
  const store = useStore();
  const router = useRouter();
  const showToast = useToast();
  const isAdmin = useIsAdmin() === true;
  const standalone = useIsStandalone();
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

  const items: Item[] = [
    { key: "profile", icon: UserRound, href: "/me" },
    // Your profile as others see it (its preview).
    { key: "preview", icon: Eye, href: "/profile?preview=1" },
    { key: "saved", icon: Bookmark, href: "/saved" },
    { key: "people", icon: Users, href: "/people" },
    { key: "settings", icon: Settings, href: "/settings" },
    { key: "help", icon: LifeBuoy, onSelect: () => openGetHelp() },
    { key: "idea", icon: Lightbulb, onSelect: openShareIdea },
    ...(standalone ? [] : [{ key: "app", icon: Smartphone, onSelect: openGetApp } satisfies Item]),
    ...(isAdmin ? [{ key: "admin", icon: LayoutDashboard, href: "/admin" } satisfies Item] : []),
  ];
  const close = () => setOpen(false);
  const body = (item: Item) => (
    <>
      <item.icon aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
    </>
  );

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
          <div role="menu" aria-label={t("label")} className={cn(darkMenuClass, "animate-fade-in w-64")}>
            {items.map((item) =>
              item.href ? (
                <Link key={item.key} role="menuitem" href={item.href} onClick={close} className={ITEM}>
                  {body(item)}
                </Link>
              ) : (
                <button
                  key={item.key}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    close();
                    item.onSelect?.();
                  }}
                  className={ITEM}
                >
                  {body(item)}
                </button>
              ),
            )}
            <div role="separator" className="mx-3 my-2 h-px bg-ink/12" />
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                close();
                store.logout();
                showToast(t("loggedOut"));
                router.push("/");
              }}
              className={ITEM}
            >
              <LogOut aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate">{t("logOut")}</span>
            </button>
          </div>
        </Anchored>
      )}
    </>
  );
}
