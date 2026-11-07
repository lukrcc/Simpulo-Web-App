"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Anchored } from "./Anchored";
import { cn } from "@/lib/utils";

export type MoreMenuItem =
  | { label: string; href: string; danger?: boolean }
  | { label: string; onSelect: () => void; danger?: boolean };

interface MoreMenuProps {
  items: MoreMenuItem[];
  /** Accessible name of the ⋯ button */
  label?: string;
  className?: string;
  /** The ⋯ button's own look (a glass circle on a photo); default: a quiet round button */
  buttonClassName?: string;
}

/**
 * ⋯ button with a small dropdown. The menu and its transparent backdrop live in <body> (Anchored): opened inside a card with a
 * backdrop-filter or a transform, a fixed backdrop would otherwise be caught in that card – and the page could stop taking clicks. It
 * closes on a click beside it, on Escape and after a choice; closing always removes the backdrop with it.
 */
export function MoreMenu({ items, label, className, buttonClassName }: MoreMenuProps) {
  const t = useTranslations("common");
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
  if (items.length === 0) return null;
  const itemClass = "block w-full px-4 py-2.5 text-left text-body hover:bg-white/50";

  return (
    <div className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label ?? t("ui.moreMenu.moreOptions")}
        aria-haspopup="menu"
        aria-expanded={open}
        className={buttonClassName ?? "rounded-full p-2 text-muted hover:bg-ink/5 hover:text-ink"}
      >
        <MoreHorizontal className="size-5" />
      </button>
      {open && (
        <Anchored anchor={buttonRef} align="end">
          <button type="button" aria-label={t("ui.moreMenu.closeMenu")} tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 -z-10 cursor-default" />
          <div role="menu" className="glass-panel animate-fade-in w-56 overflow-hidden rounded-[20px]! py-1">
            {items.map((item) =>
              "href" in item ? (
                <Link key={item.label} role="menuitem" href={item.href} onClick={() => setOpen(false)} className={cn(itemClass, item.danger && "text-red-600")}>
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={cn(itemClass, item.danger && "text-red-600")}
                >
                  {item.label}
                </button>
              ),
            )}
          </div>
        </Anchored>
      )}
    </div>
  );
}
