"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";
import { useDismiss } from "@/components/explore/Filters";
import { useIsPhone } from "@/lib/useMediaQuery";
import { MenuLayer } from "./MenuLayer";
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

/** Phones: dangerous entries (Cancel this House, Leave, Block) at the bottom, after a line – the rest keeps its order and groups. */
function dangerLast(items: MoreMenuItem[]): MoreMenuItem[] {
  const isDanger = (i: MoreMenuItem) => !("separator" in i) && i.danger === true;
  const safe = items.filter((i) => !isDanger(i));
  const danger = items.filter(isDanger);
  // No line at the start or end of the safe part, and never two in a row.
  const tidy = safe.filter((item, i, all) => !("separator" in item) || (i > 0 && i < all.length - 1 && !("separator" in all[i - 1])));
  return danger.length ? [...tidy, { separator: true }, ...danger] : tidy;
}

/**
 * ⋯ button with a small dropdown – from 744px under the button (Anchored, in <body>: inside a card with a backdrop-filter or a transform a
 * fixed layer would be caught in that card); on phones a sheet from the bottom in the same tone (MenuLayer), rows 48px, dangerous entries
 * red at the bottom. It closes on a click beside it, on Escape and after a choice.
 */
export function MoreMenu({ items, label, className, buttonClassName, top, onOpen, dark = false }: MoreMenuProps) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const phone = useIsPhone();
  useDismiss(open, () => setOpen(false), rootRef, buttonRef, panelRef);
  if (items.length === 0 && !top) return null;
  const itemClass = cn("block w-full text-left text-body hover:bg-ink/5", phone ? "flex h-12 items-center rounded-full px-4" : "px-4 py-2.5");
  const shown = phone ? dangerLast(items) : items;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
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
      <MenuLayer
        open={open}
        onClose={() => setOpen(false)}
        anchor={buttonRef}
        panelRef={panelRef}
        label={label ?? t("ui.moreMenu.moreOptions")}
        tone={dark ? "dark" : "light"}
        panelProps={{ role: "menu" }}
        panelClassName={cn(dark ? "bar-menu p-0! py-1!" : "glass-panel", "animate-fade-in overflow-hidden rounded-[20px]! py-1", top ? "w-64" : "w-56")}
      >
        {top && (
          <>
            <div className="px-4 pb-3 pt-2.5">{top}</div>
            {items.length > 0 && <div role="separator" className="my-1 h-px bg-ink/8" />}
          </>
        )}
        {shown.map((item, i) =>
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
      </MenuLayer>
    </div>
  );
}
