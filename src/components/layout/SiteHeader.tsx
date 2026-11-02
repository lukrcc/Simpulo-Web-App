"use client";

import { Plus, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/ActionButton";
import { getCurrentUser, pendingRequestCount, unreadThreadCount, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Container } from "./Container";
import { AccountMenu } from "./HeaderActions";
import { useHeaderSlot } from "./HeaderSlot";
import { Logo } from "./Logo";
import { isNavActive, navItemsFor } from "./nav";
import { NotificationBell } from "./NotificationBell";

/** Scrolled past this, Explore's header goes compact … */
const COMPACT_FROM_PX = 120;
/** … and back above this it expands again – the gap between the two keeps it from flickering. */
const EXPAND_BELOW_PX = 40;

/** Width of Sort + Filters (40px each, 8px apart) in row 2 – fixed, so the chips' room is known in both states. */
const CONTROLS_W = 280;
/** The wordmark's column in the compact row (28px wordmark + 24px gap). */
const LOGO_COL = 144;
/** The right side's circles: 40px, 8px apart; 16px before the bell / login circle and before "+". */
const CIRCLE = 40;
const GAP = 8;
const GROUP_GAP = 16;

/** Pages whose header has the chip row (ExploreFeed fills it through HeaderSlot) and the compact state. */
export function hasExploreRow(pathname: string | null): boolean {
  return pathname === "/" || pathname === "/explore" || (pathname?.startsWith("/collections/") ?? false);
}

/**
 * The one site header (desktop, ≥ md; phones have their own chrome). Row 1, 80px: wordmark + tagline, the nav with
 * icons (current page underlined), Log in or bell + avatar, and "Open a House". On Explore a second row, 56px: the
 * category chips (40px, from the page through HeaderSlot) with Sort + Filters (40px), then 16px to the line (152px
 * in all) – and, scrolled past 120px, the compact state: one 72px row, everything on its centre line (row 1 is a
 * flex row that shrinks to the bar's height; the chips and controls move up into it at 0.9; the icon circles are
 * its last flex child). One DOM for both states; globals.css (.sh-*) moves and fades the parts, only the heights
 * change size. The header's slot in the page stays 152px (80px elsewhere), so nothing below it moves.
 */
export function SiteHeader() {
  // usePathname suspends on dynamic routes during prerender, so it gets its own boundary.
  return (
    <Suspense fallback={<SiteHeaderView pathname={null} />}>
      <SiteHeaderByRoute />
    </Suspense>
  );
}

function SiteHeaderByRoute() {
  return <SiteHeaderView pathname={usePathname()} />;
}

function SiteHeaderView({ pathname }: { pathname: string | null }) {
  const t = useTranslations("nav");
  const tOpen = useTranslations("common.ui.openHouse");
  const store = useStore();
  const requireAuth = useRequireAuth();
  const me = getCurrentUser(store);
  const loggedIn = me !== undefined;
  const unread = unreadThreadCount(store);
  const items = navItemsFor(loggedIn, "header");
  const exploreRow = hasExploreRow(pathname);
  const compact = useCompactHeader(exploreRow);
  const { setEl } = useHeaderSlot();
  const { ref: openRef, width: openWidth } = useElementWidth<HTMLSpanElement>(136);
  const { ref: loginRef, width: loginWidth } = useElementWidth<HTMLButtonElement>(44);
  // Your houses' badge: requests waiting on the Houses you host.
  const pendingRequests = me ? store.stays.filter((s) => s.hostId === me.id).reduce((n, s) => n + pendingRequestCount(store, s.id), 0) : 0;

  // What the compact row's right side takes up: the nav circles, 16px, bell + avatar (or the login circle), 16px, "+"
  // – so the chips know where to stop.
  const trailing = GROUP_GAP + (loggedIn ? CIRCLE + GAP + CIRCLE : CIRCLE) + GROUP_GAP + CIRCLE;
  const iconsW = items.length * CIRCLE + (items.length - 1) * GAP + trailing;
  const style = {
    "--icons-w": `${iconsW}px`,
    "--controls-w": `${CONTROLS_W}px`,
    "--logo-col": `${LOGO_COL}px`,
  } as CSSProperties;

  return (
    <header
      data-site-header
      data-rows={exploreRow ? "2" : "1"}
      data-state={compact ? "compact" : "expanded"}
      style={style}
      className="pointer-events-none sticky top-0 z-40 hidden h-(--header-slot) md:block"
    >
      {/* The bar: bg with a blur, one line under it, no shadow; its height is the one thing that changes size. */}
      <div className="sh-bar pointer-events-auto relative h-(--header-h) bg-bg/80 backdrop-blur-xl after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-line">
        <Container className="h-full">
          {/* The frame: the content width – the rows and the container-query units (globals.css) measure against it. */}
          <div className="sh-frame relative h-full">
          {/* Row 1 (80px; compact: the bar's 72px, so its centre line is the bar's): wordmark | nav | actions. */}
          <div className="sh-row1 absolute inset-x-0 top-0 grid h-[min(80px,var(--header-h))] grid-cols-[1fr_auto_1fr] items-center">
            {/* The tagline hangs under the wordmark out of the flow, so the link's box – and its centre – is the wordmark. */}
            <Logo className="sh-logo relative" taglineClassName="sh-tagline absolute left-0 top-full whitespace-nowrap" />

            <nav aria-label={t("compactLabel")} className="sh-nav flex items-center gap-8" inert={compact || undefined}>
              {items.map(({ href, labelKey, headerLabelKey, icon: Icon }) => {
                const label = t(`items.${headerLabelKey ?? labelKey}`);
                const active = isNavActive(href, pathname);
                const showUnread = labelKey === "messages" && unread > 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    aria-label={showUnread ? t("itemUnread", { label, count: unread }) : undefined}
                    className={cn(
                      "relative flex items-center gap-2 py-2 text-base font-medium transition-colors",
                      active ? "text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-ink" : "text-muted hover:text-ink",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden />
                    {label}
                    {showUnread && <span aria-hidden className="absolute -right-2.5 top-2 size-1.5 rounded-full bg-accent" />}
                  </Link>
                );
              })}
            </nav>

            {/* Right: one flex row in both states – its children collapse to zero width (and give their gap back) when
                the state doesn't show them (.sh-c, globals.css). Compact: nav circles · 16 · bell · avatar · 16 · "+"
                (logged out: nav circles · 16 · login circle · 16 · "+"); expanded: bell · avatar · 16 · Open a House
                (logged out: Log in · 16 · Open a House). Nothing absolute, so nothing can overlap. */}
            <div className="sh-right ml-auto flex items-center gap-2 justify-self-end">
              {items.map(({ href, labelKey, headerLabelKey, icon: Icon }) => {
                const label = t(`items.${headerLabelKey ?? labelKey}`);
                const active = isNavActive(href, pathname);
                const showUnread = labelKey === "messages" && unread > 0;
                const count = labelKey === "houses" ? pendingRequests : 0;
                return (
                  <WithTooltip key={href} label={label} className="sh-c sh-compact-only">
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      aria-label={count > 0 ? t("itemNew", { label, count }) : showUnread ? t("itemUnread", { label, count: unread }) : label}
                      className={cn(circle, active ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:bg-bg")}
                    >
                      <Icon aria-hidden />
                      {/* Your houses: open requests as an 18px accent circle; Messages: an 8px accent dot while unread. */}
                      {count > 0 && (
                        <span aria-hidden className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold leading-none text-white tabular-nums">
                          {count > 9 ? "9+" : count}
                        </span>
                      )}
                      {showUnread && <span aria-hidden className={cn("absolute right-1.5 top-1.5 size-2 rounded-full border bg-accent", active ? "border-ink" : "border-surface")} />}
                    </Link>
                  </WithTooltip>
                );
              })}
              {loggedIn ? (
                <>
                  <span className="sh-c sh-c-16">
                    <NotificationBell variant="header" />
                  </span>
                  <span className="sh-c">
                    <AccountMenu me={me} />
                  </span>
                </>
              ) : (
                <>
                  <WithTooltip label={t("logIn")} className="sh-c sh-compact-only sh-c-16">
                    <button type="button" onClick={() => requireAuth()} aria-label={t("logIn")} className={cn(circle, "border-line bg-surface text-ink hover:bg-bg")}>
                      <UserIcon aria-hidden />
                    </button>
                  </WithTooltip>
                  <span className="sh-c sh-expanded-only" style={{ "--w": `${loginWidth}px` } as CSSProperties} inert={compact || undefined}>
                    <button ref={loginRef} type="button" onClick={() => requireAuth()} className="flex h-11 shrink-0 items-center whitespace-nowrap text-[15px] font-medium text-ink underline-offset-4 hover:underline">
                      {t("logIn")}
                    </button>
                  </span>
                </>
              )}
              <WithTooltip label={tOpen("label")} className="sh-c sh-compact-only sh-c-16">
                <Link href="/create" aria-label={tOpen("label")} className={cn(circle, "border-ink bg-ink text-surface hover:bg-ink/90")}>
                  <Plus aria-hidden />
                </Link>
              </WithTooltip>
              <span className="sh-c sh-expanded-only sh-c-16" style={{ "--w": `${openWidth}px` } as CSSProperties} inert={compact || undefined}>
                <span ref={openRef} className="inline-flex shrink-0">
                  <Button href="/create" size="lg">
                    {tOpen("label")}
                  </Button>
                </span>
              </span>
            </div>
          </div>

          {/* Row 2 (Explore, 56px under row 1, 16px above the line): the chips – filled by the page (HeaderSlot),
              skeleton chips until then – and Sort + Filters (the page fills those too, into the same slot). */}
          {exploreRow && (
            <div className="sh-row2 absolute inset-x-0 top-20 flex h-14 items-center gap-6">
              <div ref={setEl} className="sh-slot contents" />
              <div aria-hidden className="sh-placeholder hidden min-w-0 flex-1 gap-2 overflow-hidden">
                {Array.from({ length: 8 }, (_, i) => (
                  <span key={i} className="h-10 w-24 shrink-0 animate-pulse rounded-full bg-ink/5" />
                ))}
              </div>
            </div>
          )}
          </div>
        </Container>
      </div>
    </header>
  );
}

const circle = "relative flex size-10 shrink-0 items-center justify-center rounded-full border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent [&_svg]:size-5";

/** A name tag under a circle after 400ms of hover, or on keyboard focus. */
function WithTooltip({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <span className={cn("group relative flex", className)}>
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-medium text-surface opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-hover:delay-400 group-has-focus-visible:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

/**
 * Explore's compact header: on once scrollY > 120, off again below 40 (hysteresis). A passive scroll listener, read
 * once per frame. Off below md and wherever `enabled` is false (pages without the chip row).
 */
function useCompactHeader(enabled: boolean): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const desktop = window.matchMedia("(min-width: 768px)");
    let frame = 0;
    let current = false;
    const apply = (next: boolean) => {
      if (next === current) return;
      current = next;
      setCompact(next);
    };
    const read = () => {
      frame = 0;
      if (!desktop.matches) return apply(false);
      const y = window.scrollY;
      if (y > COMPACT_FROM_PX) apply(true);
      else if (y < EXPAND_BELOW_PX) apply(false);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    desktop.addEventListener("change", read);
    return () => {
      window.removeEventListener("scroll", onScroll);
      desktop.removeEventListener("change", read);
      cancelAnimationFrame(frame);
      apply(false);
    };
  }, [enabled]);
  return enabled && compact;
}

/** An element's width (ResizeObserver) – "Open a House" and "Log in", whose wrappers animate to it and back to 0. */
function useElementWidth<T extends HTMLElement>(fallback: number): { ref: React.RefObject<T | null>; width: number } {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.offsetWidth || fallback);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fallback]);
  return { ref, width };
}
