"use client";

import { Compass, FileUser, Megaphone, Menu, X, FlaskConical, Gauge, Home, Inbox, Landmark, ListOrdered, Network, SlidersHorizontal, Tags, TrendingUp, Users, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { notFound, usePathname } from "next/navigation";
import { NextIntlClientProvider, useMessages, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { lockScroll } from "@/components/ui/ModalOverlay";
import { useTabScroll } from "@/components/ui/useTabScroll";
import type { Locale } from "@/i18n/config";
import { ADMIN_DE, ADMIN_UI_DE } from "@/lib/i18n/admin.de";
import { SideNav, type SideNavItem } from "@/components/settings/SideNav";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { useIsAdmin } from "@/lib/admin/access";
import type { Status } from "@/lib/admin/metrics";
import { StatusDot } from "./AdminCharts";
import { AdminPageHeader } from "./AdminLayout";
import { useAdminTasks } from "@/lib/admin/useAdminTasks";
import { taskCounts } from "@/lib/admin/tasks";
import { cn } from "@/lib/utils";

type AreaKey = "cockpit" | "houses" | "hosts" | "growth" | "topics" | "data" | "labs" | "vision" | "funding" | "inbox" | "money" | "platform" | "waitlist" | "applications" | "marketing";
interface Area {
  key: AreaKey;
  href: string;
  icon: LucideIcon;
  /** Pages without their own entry that belong here (they mark this entry): Money under the overview, Traffic under growth, Log under System */
  also?: readonly string[];
}

/**
 * The side list in four groups, in this order: MARKT Übersicht · Houses · Hosts · WACHSTUM Wachstum · Analyse · Algorithmus · Labore · Vision ·
 * Finanzierung · BETRIEB Posteingang (count) · Geld · System · LAUNCH Warteliste · Bewerbungen.
 */
const GROUPS: readonly { key: "market" | "growth" | "operate" | "launch"; areas: readonly Area[] }[] = [
  {
    key: "market",
    areas: [
      { key: "cockpit", href: "/admin", icon: Gauge },
      { key: "houses", href: "/admin/houses", icon: Home },
      { key: "hosts", href: "/admin/hosts", icon: Users },
    ],
  },
  {
    key: "growth",
    areas: [
      { key: "growth", href: "/admin/growth", icon: TrendingUp, also: ["/admin/traffic"] },
      { key: "topics", href: "/admin/topics", icon: Tags },
      { key: "data", href: "/admin/data", icon: Network },
      { key: "labs", href: "/admin/labore", icon: FlaskConical },
      { key: "vision", href: "/admin/vision", icon: Compass },
      { key: "funding", href: "/admin/funding", icon: Landmark },
    ],
  },
  {
    key: "operate",
    areas: [
      { key: "inbox", href: "/admin/posteingang", icon: Inbox },
      { key: "money", href: "/admin/money", icon: Wallet },
      { key: "platform", href: "/admin/platform", icon: SlidersHorizontal, also: ["/admin/log"] },
    ],
  },
  {
    key: "launch",
    areas: [
      { key: "waitlist", href: "/admin/waitlist", icon: ListOrdered },
      { key: "applications", href: "/admin/applications", icon: FileUser },
      { key: "marketing", href: "/admin/marketing", icon: Megaphone },
    ],
  },
];
const AREAS: readonly Area[] = GROUPS.flatMap((g) => g.areas);

/**
 * Area colours (styles/admin-tokens.css, never status, never dots): Markt → clay, Wachstum → plum, Betrieb → slate, Launch → neutral grey.
 * Whole class names, so Tailwind finds them.
 */
export type AreaColor = "launch" | "market" | "growth" | "operate";
const GROUP_COLOR: Record<(typeof GROUPS)[number]["key"], AreaColor> = { market: "market", growth: "growth", operate: "operate", launch: "launch" };
export const AREA_TEXT: Record<AreaColor, string> = { launch: "text-adm-area-launch", market: "text-adm-area-market", growth: "text-adm-area-growth", operate: "text-adm-area-operate" };
/** The area headings in the side list: a block over the list's full width, the area colour 16 % behind, the words in the area colour. */
const AREA_CHIP: Record<AreaColor, string> = {
  market: "bg-adm-area-market-chip text-adm-area-market",
  growth: "bg-adm-area-growth-chip text-adm-area-growth",
  operate: "bg-adm-area-operate-chip text-adm-area-operate",
  launch: "bg-adm-area-launch-chip text-adm-area-launch",
};
export const AREA_BG: Record<AreaColor, string> = { launch: "bg-adm-area-launch", market: "bg-adm-area-market", growth: "bg-adm-area-growth", operate: "bg-adm-area-operate" };

/**
 * The entry a path belongs to: the longest href (or `also` path) it is or starts with – "/admin", the overview, only for itself; prepared
 * Houses (/admin/houses/prepared) under Houses.
 */
function activeHref(pathname: string): string {
  const matches = AREAS.flatMap((a) => [a.href, ...(a.also ?? [])].map((path) => ({ path, href: a.href }))).filter(
    ({ path }) => pathname === path || (path !== "/admin" && pathname.startsWith(`${path}/`)),
  );
  return matches.toSorted((a, b) => b.path.length - a.path.length)[0]?.href ?? "/admin";
}

/**
 * The frame of /admin (app/admin/layout.tsx): only for admins (useIsAdmin – everyone else gets the 404; until it's known, nothing). From
 * 1024px the side list fixed at the left edge (200px, 16px from the edge, the full height under the header – it never scrolls with the page;
 * fills the height: entries --sidebar-item-h, icon 20px, words 16–17px, the areas as coloured capsules), the same SideNav as Settings, in four groups; the content takes all the rest and is
 * what scrolls. Below 1024px the areas as one scrolling row of capsules.
 */
export function AdminFrame({ children }: { children: ReactNode }) {
  const messages = useMessages();
  // The admin is German (lib/i18n/admin.de.ts): its own provider with locale "de" – dates and numbers follow; the app stays English.
  const adminMessages = useMemo(
    () => ({
      ...messages,
      admin: ADMIN_DE,
      // The shared building blocks inside the admin speak German too (Sheet, dialog foot, ScrollRow, form labels).
      common: { ...messages.common, cancel: ADMIN_UI_DE.cancel, close: ADMIN_UI_DE.close, back: ADMIN_UI_DE.back, ui: { ...messages.common.ui, form: { optional: ADMIN_UI_DE.optional, preview: ADMIN_UI_DE.preview } } },
      explore: { ...messages.explore, collections: { ...messages.explore.collections, scrollBack: ADMIN_UI_DE.scrollBack, scrollOn: ADMIN_UI_DE.scrollOn } },
    }),
    [messages],
  );
  return (
    <NextIntlClientProvider locale={"de" as Locale} messages={adminMessages} timeZone="UTC">
      <AdminFrameInner>{children}</AdminFrameInner>
    </NextIntlClientProvider>
  );
}

function AdminFrameInner({ children }: { children: ReactNode }) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  // "Posteingang": how many items are open (tasks + tickets, each once) – red when a safety report is among them.
  const counts = taskCounts(useAdminTasks());
  // The open elements: every task and open ticket, once (the same list as the Posteingang).
  const inboxOpen = counts.total;
  // Tablet (744–1023px): the side list as a sheet from the left, closed again when a page is picked.
  const [navOpen, setNavOpen] = useState(false);
  const [navPath, setNavPath] = useState(pathname);
  if (navPath !== pathname) {
    setNavPath(pathname);
    setNavOpen(false);
  }
  useEffect(() => {
    if (!navOpen) return;
    const unlock = lockScroll();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [navOpen]);
  if (isAdmin === null) return <div className="min-h-[60vh]" />;
  if (!isAdmin) notFound();

  const active = activeHref(pathname);
  // What needs you, as an ember count at the entry's right – all from the one task list (taskCounts), so they agree with "Braucht dich".
  const needs: Partial<Record<AreaKey, number>> = { inbox: inboxOpen, applications: counts.applications };
  const item = (a: Area) => ({
    key: a.key,
    href: a.href,
    label: t(`nav.${a.key}`),
    icon: a.icon,
    selected: active === a.href,
    current: active === a.href,
    badge: needs[a.key] ? <NavBadge count={needs[a.key]!} label={t("needsYou", { count: needs[a.key]! })} urgent={a.key === "inbox" && counts.safetyOpen} /> : undefined,
  });

  const navGroups = <AdminSideList active={active} item={item} needs={needs} />;

  return (
    // .admin-scope: the admin colours (styles/admin-tokens.css) exist only in here.
    // From 1024px at least the window's height under the header, and over the main area's bottom padding: the side list is never pushed up.
    <div className="admin-scope lg:-mb-(--space-section) lg:grid lg:min-h-[calc(100dvh-var(--header-h))] lg:grid-cols-[220px_minmax(0,1fr)] lg:pl-4">
      {/* The side list fills the height: entries --sidebar-item-h (from the window's height), the active one white 8 %; before each area
          capsule 0.8 × an entry. */}
      {/* Never scrolls (overflow hidden): the rows follow the window's height; a very flat window folds the other areas (AdminSideList fit). */}
      <aside className="max-lg:hidden lg:sticky lg:top-(--header-h) lg:h-[calc(100dvh-var(--header-h))] lg:w-[220px] lg:overflow-hidden lg:pb-1 lg:pt-(--adm-page-top)" data-admin-nav>
        <AdminSideList active={active} item={item} needs={needs} fit />
      </aside>
      <div className="min-w-0 px-4 pb-(--adm-section) pt-(--adm-page-top) md:px-(--adm-page)">
        {/* Phones (< 744px): two rows – the four areas (Markt · Wachstum · Betrieb · Launch) as a scrolling row of capsules, under it the
            pages of the current area as scrolling tabs (bold, white, underlined – the admin's active state). A capsule opens its area's first
            page. Tablets: every page in one row. */}
        <PhoneNav active={active} item={item} />
        {/* Tablets (744–1023px): one button with the page you're on – it opens the side list as a sheet from the left (280px, the admin's dark
            surface, the page dimmed behind it); a pick, a tap beside it or Escape closes it. From 1024px the side list stands. */}
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          aria-expanded={navOpen}
          className="mb-(--adm-inner) hidden h-11 items-center gap-2 rounded-full px-4 text-body font-semibold text-ink ring-1 ring-ink/12 md:max-lg:inline-flex"
        >
          <Menu aria-hidden className="size-4" />
          {AREAS.find((a) => a.href === active) ? t(`nav.${AREAS.find((a) => a.href === active)!.key}`) : t("navMenu")}
        </button>
        {navOpen && (
          <div className="fixed inset-0 z-60 hidden md:max-lg:block">
            <button type="button" tabIndex={-1} aria-hidden onClick={() => setNavOpen(false)} className="bar-sheet-scrim absolute inset-0 cursor-default" />
            <nav aria-label={t("navMenu")} className="scroll-pane absolute inset-y-0 left-0 w-70 overflow-y-auto overscroll-contain bg-(--bg) px-3 pb-[max(1rem,var(--safe-bottom))] pt-[calc(var(--safe-top)+1rem)] shadow-[1px_0_0_var(--line)]" data-admin-nav-sheet>
              <div className="mb-3 flex items-center justify-between px-3">
                <p className="text-eyebrow uppercase text-(--adm-label)">{t("navMenu")}</p>
                <button type="button" onClick={() => setNavOpen(false)} aria-label={t("navMenuClose")} className="flex size-11 items-center justify-center rounded-full text-ink/70 hover:text-ink">
                  <X aria-hidden className="size-5" />
                </button>
              </div>
              {navGroups}
            </nav>
          </div>
        )}
        <div className="mx-auto max-w-[1440px]">{children}</div>
      </div>
    </div>
  );
}

/** A count that needs you, right-aligned in a side-list entry: ember, cream number (the admin's "needs you" colour). */
/**
 * The admin's side list: the four areas, each its coloured heading (unchanged) and its entries (SideNav compact, sizes from the tokens).
 * `fit` (the standing side list): it must never scroll – when even the smallest rows don't fit (a very flat window), only the current area
 * shows its entries; the others show only their heading, a tap opens that one instead (with its count, if something needs you there).
 */
function AdminSideList({ active, item, needs, fit = false }: { active: string | undefined; item: (a: Area) => SideNavItem; needs: Partial<Record<AreaKey, number>>; fit?: boolean }) {
  const t = useTranslations("admin");
  const current = GROUPS.find((g) => g.areas.some((a) => a.href === active))?.key ?? GROUPS[0].key;
  const [folded, setFolded] = useState(false);
  const [open, setOpen] = useState<string>(current);
  const [openFor, setOpenFor] = useState(current);
  if (openFor !== current) {
    setOpenFor(current);
    setOpen(current);
  }
  const probe = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  // The whole list, measured in an invisible copy: does it fit the side list's height?
  useLayoutEffect(() => {
    if (!fit) return;
    const check = () => {
      const full = probe.current?.offsetHeight ?? 0;
      const room = box.current?.clientHeight ?? 0;
      setFolded(room > 0 && full > room);
    };
    check();
    const observer = new ResizeObserver(check);
    if (box.current) observer.observe(box.current);
    if (probe.current) observer.observe(probe.current);
    return () => observer.disconnect();
  }, [fit]);
  const list = (fold: boolean) =>
    GROUPS.map((group, i) => {
      const shown = !fold || group.key === open;
      const heading = cn("mb-1 flex h-(--sidebar-heading-h) w-full items-center gap-2 rounded-lg px-3 text-nav-group uppercase", AREA_CHIP[GROUP_COLOR[group.key]]);
      const waiting = group.areas.reduce((sum, a) => sum + (needs[a.key] ?? 0), 0);
      return (
        <div key={group.key} className={cn(i > 0 && "mt-(--sidebar-gap)")}>
          {fold && !shown ? (
            <button type="button" aria-expanded={false} onClick={() => setOpen(group.key)} className={cn(heading, "text-left")}>
              <span className="min-w-0 flex-1 truncate">{t(`navGroup.${group.key}`)}</span>
              {waiting > 0 && <NavBadge count={waiting} label={t("needsYou", { count: waiting })} />}
            </button>
          ) : (
            <p className={heading}>{t(`navGroup.${group.key}`)}</p>
          )}
          {shown && <SideNav compact iconClass={AREA_TEXT[GROUP_COLOR[group.key]]} label={t(`navGroup.${group.key}`)} items={group.areas.map(item)} />}
        </div>
      );
    });
  if (!fit) return <>{list(false)}</>;
  return (
    <div ref={box} className="relative h-full overflow-hidden">
      <div aria-hidden inert ref={probe} className="pointer-events-none invisible absolute inset-x-0 top-0">
        {list(false)}
      </div>
      {list(folded)}
    </div>
  );
}

function NavBadge({ count, label, urgent = false }: { count: number; label: string; /** A safety report is open: red instead of ember */ urgent?: boolean }) {
  return (
    <span className={cn("flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1.5 text-nav-group tabular-nums tracking-normal text-on-signal", urgent ? "bg-danger" : "bg-adm-critical")}>
      <span aria-hidden>{count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * An area's head (AdminPageHeader): no visible title (an sr-only <h1>; the side list shows where you are), the first row the click row –
 * tabs left, settings right (all AdminTabs capsules), the second level (AdminSubTabs) right under it. No further capsule rows on the page.
 */
export function AdminShell({ title, badge, aside, tabs, subTabs, children }: { title: string; badge?: string; /** The controls, right in the head's one row */ aside?: ReactNode; /** The tabs, left in that row */ tabs?: ReactNode; /** The second level (AdminSubTabs), right under the row */ subTabs?: ReactNode; children: ReactNode }) {
  return (
    <>
      <AdminPageHeader title={title} badge={badge} tabs={tabs} controls={aside} subTabs={subTabs} />
      {children}
    </>
  );
}

/** A section inside an area: a short noun as its heading (12px caps, labels 45 %) over its content, 40px between sections (--adm-section). */
export function AdminSection({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mt-(--adm-section) first:mt-0", className)}>
      <div className="mb-(--adm-inner) flex flex-wrap items-baseline justify-between gap-x-4 gap-y-3">
        <h2 className="shrink-0 text-eyebrow uppercase text-(--adm-label)">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Key numbers in a row, directly on the page: label small above, the number large; columns split by a 1px line (ink 8 %). */
export function StatRow({
  stats,
  size = "lg",
}: {
  stats: readonly {
    label: string;
    value: ReactNode;
    sub?: ReactNode;
    /** A number with a target: its status dot (getStatus) */
    status?: Status | null;
    /** The page's main number, in ocean (chart-1) – at most one per area */
    focus?: boolean;
  }[];
  /** "md": settings rather than key numbers (Money › Payouts) – the value at h3 */
  size?: "lg" | "md";
}) {
  return (
    <dl className="grid grid-cols-2 gap-y-(--adm-inner) md:grid-cols-4">
      {stats.map((s, i) => (
        <div key={s.label} className={cn("min-w-0 pr-4 md:px-6 md:first:pl-0", i % 2 === 1 && "max-md:border-l max-md:border-ink/8 max-md:pl-4", i > 0 && "md:border-l md:border-ink/8")}>
          <dt className="flex items-center gap-2 text-eyebrow uppercase text-(--adm-label)">
            {s.status !== undefined && <StatusDot status={s.status} />}
            {s.label}
          </dt>
          <dd className={cn("mt-1 tabular-nums", s.focus ? "text-adm-chart-1" : "text-ink", size === "lg" ? "text-h1" : "text-h3")}>{s.value}</dd>
          {s.sub && <dd className="mt-1 text-small text-muted">{s.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Phones: the areas as capsules (ScrollRow), the current area's pages as tabs under it (.tab-scroll – one line, the chosen one in view). */
function PhoneNav({ active, item }: { active: string | undefined; item: (a: Area) => { key: string; href: string; label: string; badge?: ReactNode } }) {
  const t = useTranslations("admin");
  const group = GROUPS.find((g) => g.areas.some((a) => a.href === active)) ?? GROUPS[0];
  const tabs = useRef<HTMLDivElement>(null);
  useTabScroll(tabs, active);
  return (
    <nav aria-label={t("title")} className="mb-(--adm-inner) md:hidden" data-admin-phone-nav>
      <ScrollRow label={t("title")} active={group.key}>
        {GROUPS.map((g) => (
          <Link
            key={g.key}
            href={g.areas[0].href}
            data-active={g.key === group.key || undefined}
            aria-current={g.key === group.key ? "true" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-nav-group uppercase",
              g.key === group.key ? AREA_CHIP[GROUP_COLOR[g.key]] : "text-ink/60",
            )}
          >
            {t(`navGroup.${g.key}`)}
          </Link>
        ))}
      </ScrollRow>
      <div ref={tabs} data-bleed className="tab-scroll mt-2 flex items-center gap-4">
        {group.areas.map((a) => {
          const it = item(a);
          const on = a.href === active;
          return (
            <Link
              key={a.key}
              href={a.href}
              data-tap="none"
              aria-current={on ? "page" : undefined}
              className={cn("flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap text-nav-main", on ? "font-semibold text-(--adm-active) underline decoration-2 underline-offset-4" : "text-(--adm-idle-nav)")}
            >
              {it.label}
              {it.badge}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
