"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { isNavActive, navItemsFor } from "./nav";

export function NavLinksFallback() {
  return <NavLinksView pathname={null} />;
}

export function NavLinks() {
  return <NavLinksView pathname={usePathname()} />;
}

/** Gap between the text baseline of the active tab and the underline. */
const UNDERLINE_OFFSET_PX = 6;

/** Plain text tabs with one orange underline that slides to the active tab. */
function NavLinksView({ pathname }: { pathname: string | null }) {
  const loggedIn = useStore().currentUserId !== null;
  const items = navItemsFor(loggedIn);
  const t = useTranslations("nav");
  const navRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const positioned = useRef(false);

  // Position the bar from the active link's box. Written straight to the DOM – no re-render needed.
  useLayoutEffect(() => {
    const nav = navRef.current;
    const bar = barRef.current;
    if (!nav || !bar) return;

    const position = () => {
      const link = nav.querySelector<HTMLElement>('[aria-current="page"]');
      const baseline = link?.querySelector<HTMLElement>("[data-baseline]");
      if (!link || !baseline) {
        bar.style.opacity = "0";
        return;
      }
      bar.style.opacity = "1";
      // Links have no horizontal padding, so the link's width is the text width.
      bar.style.width = `${link.offsetWidth}px`;
      bar.style.top = `${baseline.offsetTop + UNDERLINE_OFFSET_PX}px`;
      bar.style.transform = `translateX(${link.offsetLeft}px)`;
    };

    // First placement without animation, so the bar doesn't slide in from the left edge on load.
    if (!positioned.current) {
      bar.style.transition = "none";
      position();
      void bar.offsetWidth; // flush styles before re-enabling the transition
      bar.style.transition = "";
      positioned.current = true;
    } else {
      position();
    }

    const observer = new ResizeObserver(position);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [pathname, loggedIn]);

  return (
    <nav ref={navRef} className="relative flex items-center gap-8">
      {items.map(({ href, labelKey }) => {
        const active = isNavActive(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "py-2 text-sm font-medium transition-colors",
              active ? "text-ink" : "text-zinc-500 hover:text-ink",
            )}
          >
            {t(`items.${labelKey}`)}
            {/* Empty inline-block: sits exactly on the text baseline, so offsetTop measures it. */}
            <span data-baseline aria-hidden className="inline-block" />
          </Link>
        );
      })}
      <span
        ref={barRef}
        aria-hidden
        className="absolute left-0 top-0 h-0.5 w-0 rounded-full bg-accent opacity-0 transition-[transform,width,opacity] duration-250 ease-[cubic-bezier(.2,.8,.2,1)]"
      />
    </nav>
  );
}
