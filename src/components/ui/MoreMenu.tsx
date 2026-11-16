"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Anchored } from "./Anchored";
import { cn } from "@/lib/utils";

export type MoreMenuItem =
  | { label: string; href: string; danger?: boolean }
  | { label: string; onSelect: () => void; danger?: boolean }
  /** A fine line between groups */
  | { separator: true };

/** Groups of entries with a fine line between them (empty groups left out). */
export function grouped(...groups: MoreMenuItem[][]): MoreMenuItem[] {
  return groups.filter((g) => g.length > 0).flatMap((g, i) => (i === 0 ? g : [{ separator: true as const }, ...g]));
}

interface MoreMenuProps {
  items: MoreMenuItem[];
  /** Accessible name of the ⋯ button */
  label?: string;
  className?: string;
  /** The ⋯ button's own look (a glass circle on a photo); default: a quiet round button */
  buttonClassName?: string;
  /** Above the entries, not an entry: using it keeps the menu open (the chat's background dots) */
  top?: ReactNode;
  /** Whenever it opens */
  onOpen?: () => void;
  /** Menus take the tone of the surface they come from: from a dark one (a Night chat) the dark glass (.bar-menu), else the light glass */
  dark?: boolean;
}

/**
 * ⋯ button with a small dropdown. The menu and its transparent backdrop live in <body> (Anchored): opened inside a card with a
 * backdrop-filter or a transform, a fixed backdrop would otherwise be caught in that card – and the page could stop taking clicks. It
 * closes on a click beside it, on Escape and after a choice; closing always removes the backdrop with it.
 */
export function MoreMenu({ items, label, className, buttonClassName, top, onOpen, dark = false }: MoreMenuProps) {
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
  if (items.length === 0 && !top) return null;
  const itemClass = "block w-full px-4 py-2.5 text-left text-body hover:bg-ink/5";

  return (
    <div className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!open) onOpen?.();
          setOpen((o) => !o);
        }}
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
          <div role="menu" className={cn(dark ? "bar-menu p-0! py-1!" : "glass-panel", "animate-fade-in overflow-hidden rounded-[20px]! py-1", top ? "w-64" : "w-56")}>
            {top && (
              <>
                <div className="px-4 pb-3 pt-2.5">{top}</div>
                {items.length > 0 && <div role="separator" className="my-1 h-px bg-ink/8" />}
              </>
            )}
            {items.map((item, i) =>
              "separator" in item ? (
                <div key={`sep-${i}`} role="separator" className="my-1 h-px bg-ink/8" />
              ) : "href" in item ? (
                <Link key={item.label} role="menuitem" href={item.href} onClick={() => setOpen(false)} className={cn(itemClass, item.danger && "text-danger")}>
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
                  className={cn(itemClass, item.danger && "text-danger")}
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
