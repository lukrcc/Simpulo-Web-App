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
  /** Right-aligned in the entry (Admin: a count that needs you) */
  badge?: ReactNode;
}

/**
 * The side list of Settings and Admin: the areas as capsules 44px (listItemStyles – chosen: the outline capsule ink 1.5px, semibold; else ink
 * 70 %, hover ink 5 %), line icons 20px without a tile (stroke 1.75). `top` sits above (Settings' profile card). `hash` = plain anchors (Settings
 * switches areas by the URL hash); otherwise Next links. `plain`: the phone's first view in Settings marks nothing (nothing is open yet).
 */
export function SideNav({
  label,
  items,
  top,
  hash = false,
  plain = false,
  compact = false,
  iconClass,
  className,
}: {
  label: string;
  items: readonly SideNavItem[];
  top?: ReactNode;
  hash?: boolean;
  plain?: boolean;
  /** Admin: entries --sidebar-item-h (34–48px with the window's height), icon 20px, words 16–17px – the whole list fills the height */
  compact?: boolean;
  /** The icons' colour class (Admin: the area colour); the words stay ink */
  iconClass?: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={className}>
      {top}
      <ul className={cn("flex flex-col", compact ? "gap-0" : "gap-1", top ? "mt-4" : null)}>
        {items.map(({ key, href, label: text, icon: Icon, selected, current, badge }) => {
          const linkClass = cn(
            listItemStyles(selected),
            compact ? "flex h-(--sidebar-item-h,36px) items-center gap-2.5 px-3 text-nav-side" : "flex h-11 items-center gap-3 px-4 text-body",
            selected ? "font-semibold text-ink" : "text-ink/70",
            plain && "max-lg:border-transparent max-lg:font-normal max-lg:text-ink/70",
          );
          const body = (
            <>
              <Icon aria-hidden className={cn("shrink-0", "size-5", iconClass)} strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate">{text}</span>
              {badge}
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
