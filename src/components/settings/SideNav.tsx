"use client";

import { ChevronLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { listItemStyles } from "@/components/ui/listSelection";
import { cn } from "@/lib/utils";

export interface SideNavItem {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  /** Drawn as chosen (the outline capsule) */
  selected: boolean;
  /** aria-current="page" */
  current?: boolean;
}

/**
 * The side list of Settings and Admin: the areas as capsules 44px (listItemStyles – chosen: the outline capsule ink 1.5px, semibold; else ink
 * 70 %, hover ink 5 %), line icons 20px without a tile (stroke 1.75). `top` sits above (Settings' profile card). `hash` = plain anchors (Settings
 * switches areas by the URL hash); otherwise Next links. `plain`: the phone's first view in Settings marks nothing (nothing is open yet).
 */
export function SideNav({ label, items, top, hash = false, plain = false, className }: { label: string; items: readonly SideNavItem[]; top?: ReactNode; hash?: boolean; plain?: boolean; className?: string }) {
  return (
    <nav aria-label={label} className={className}>
      {top}
      <ul className={cn("flex flex-col gap-1", top ? "mt-4" : null)}>
        {items.map(({ key, href, label: text, icon: Icon, selected, current }) => {
          const linkClass = cn(
            listItemStyles(selected),
            "flex h-11 items-center gap-3 px-4 text-body",
            selected ? "font-semibold text-ink" : "text-ink/70",
            plain && "max-lg:border-transparent max-lg:font-normal max-lg:text-ink/70",
          );
          const body = (
            <>
              <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate">{text}</span>
              <ChevronLeft aria-hidden className="size-4 rotate-180 text-ink/30 lg:hidden" />
            </>
          );
          return (
            <li key={key}>
              {hash ? (
                <a href={href} aria-current={current ? "page" : undefined} className={linkClass}>
                  {body}
                </a>
              ) : (
                <Link href={href} aria-current={current ? "page" : undefined} className={linkClass}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
