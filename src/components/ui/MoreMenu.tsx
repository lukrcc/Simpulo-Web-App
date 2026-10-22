"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type MoreMenuItem =
  | { label: string; href: string; danger?: boolean }
  | { label: string; onSelect: () => void; danger?: boolean };

interface MoreMenuProps {
  items: MoreMenuItem[];
  /** Accessible name of the ⋯ button */
  label?: string;
  className?: string;
}

/** ⋯ button with a small dropdown. A transparent backdrop closes it on any outside click. */
export function MoreMenu({ items, label, className }: MoreMenuProps) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  const itemClass = "block w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50";

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label ?? t("more")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-full p-2 text-neutral-600 hover:bg-black/5 hover:text-ink"
      >
        <MoreHorizontal className="size-5" />
      </button>
      {open && (
        <>
          <button type="button" aria-label={t("ui.moreMenu.closeMenu")} tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
          <div
            role="menu"
            className="animate-fade-in absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-2xl bg-white py-1 shadow-xl ring-1 ring-black/5"
          >
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
        </>
      )}
    </div>
  );
}
