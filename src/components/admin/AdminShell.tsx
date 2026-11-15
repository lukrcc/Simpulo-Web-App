"use client";

import { ListChecks, Compass, Landmark, FileText, Gauge, Home, Inbox, LifeBuoy, ListOrdered, Network, SlidersHorizontal, Tags, TrendingUp, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { notFound, usePathname } from "next/navigation";
import { NextIntlClientProvider, useMessages, useTranslations } from "next-intl";
import { useMemo, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { ADMIN_DE, ADMIN_UI_DE } from "@/lib/i18n/admin.de";
import { SideNav } from "@/components/settings/SideNav";
import { Badge } from "@/components/ui/Badge";
import { listItemStyles } from "@/components/ui/listSelection";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { useIsAdmin } from "@/lib/admin/access";
import type { Status } from "@/lib/admin/metrics";
import { StatusDot } from "./AdminCharts";
import { useAdminTasks } from "@/lib/admin/useAdminTasks";
import { taskCounts } from "@/lib/admin/tasks";
import { cn } from "@/lib/utils";

type AreaKey = "today" | "cockpit" | "houses" | "hosts" | "growth" | "topics" | "data" | "vision" | "funding" | "support" | "platform" | "waitlist" | "applications";
interface Area {
  key: AreaKey;
  href: string;
  icon: LucideIcon;
  /** Pages without their own entry that belong here (they mark this entry): Money under the overview, Traffic under growth, Log under System */
  also?: readonly string[];
}

/** The side list in four groups with small headings, in this order: MARKT · WACHSTUM · BETRIEB · LAUNCH. */
const GROUPS: readonly { key: "market" | "growth" | "operate" | "launch"; areas: readonly Area[] }[] = [
  {
    key: "market",
    areas: [
      { key: "today", href: "/admin/today", icon: ListChecks },
      { key: "cockpit", href: "/admin", icon: Gauge, also: ["/admin/money"] },
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
      { key: "vision", href: "/admin/vision", icon: Compass },
      { key: "funding", href: "/admin/funding", icon: Landmark },
    ],
  },
  {
    key: "operate",
    areas: [
      { key: "support", href: "/admin/support", icon: LifeBuoy },
      { key: "platform", href: "/admin/platform", icon: SlidersHorizontal, also: ["/admin/log"] },
    ],
  },
  {
    key: "launch",
    areas: [
      { key: "waitlist", href: "/admin/waitlist", icon: ListOrdered },
      { key: "applications", href: "/admin/applications", icon: Inbox },
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
export const AREA_BG: Record<AreaColor, string> = { launch: "bg-adm-area-launch", market: "bg-adm-area-market", growth: "bg-adm-area-growth", operate: "bg-adm-area-operate" };

/** The area colour of a page, by the group its side-list entry is in. */
function areaColorOf(pathname: string): AreaColor {
  const href = activeHref(pathname);
  return GROUP_COLOR[GROUPS.find((g) => g.areas.some((a) => a.href === href))?.key ?? "market"];
}

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
 * compact so it fits at 1280 × 720: entries 36px, icon 18px, words 14px, group headings 11px), the same SideNav as Settings, in four groups; the content takes all the rest and is
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
  // "Heute": how many tasks are open – red when a safety report is among them.
  const counts = taskCounts(useAdminTasks());
  if (isAdmin === null) return <div className="min-h-[60vh]" />;
  if (!isAdmin) notFound();

  const active = activeHref(pathname);
  // What needs you, as an ember count at the entry's right – all from the one task list (taskCounts), so they agree with "Braucht dich".
  const needs: Partial<Record<AreaKey, number>> = { today: counts.total, applications: counts.applications, support: counts.support };
  const item = (a: Area) => ({
    key: a.key,
    href: a.href,
    label: t(`nav.${a.key}`),
    icon: a.icon,
    selected: active === a.href,
    current: active === a.href,
    badge: needs[a.key] ? <NavBadge count={needs[a.key]!} label={t("needsYou", { count: needs[a.key]! })} urgent={a.key === "today" && counts.safetyOpen} /> : undefined,
  });

  return (
    // .admin-scope: the admin colours (styles/admin-tokens.css) exist only in here.
    // From 1024px at least the window's height under the header, and over the main area's bottom padding: the side list is never pushed up.
    <div className="admin-scope lg:-mb-(--space-section) lg:grid lg:min-h-[calc(100dvh-var(--header-h))] lg:grid-cols-[200px_minmax(0,1fr)] lg:pl-4">
      <aside className="scroll-pane max-lg:hidden lg:sticky lg:top-(--header-h) lg:h-[calc(100dvh-var(--header-h))] lg:w-[200px] lg:overflow-y-auto lg:overscroll-contain lg:pb-1.5 lg:pt-2">
        {GROUPS.map((group, i) => (
          <div key={group.key} className={i > 0 ? "mt-4" : undefined}>
            <p className="mb-1 px-3 text-nav-group uppercase text-muted">{t(`navGroup.${group.key}`)}</p>
            <SideNav compact iconClass={AREA_TEXT[GROUP_COLOR[group.key]]} label={t(`navGroup.${group.key}`)} items={group.areas.map(item)} />
          </div>
        ))}
      </aside>
      <div className="min-w-0 px-4 pb-16 pt-6 md:px-8 lg:pl-10 lg:pr-12 lg:pt-10">
        {/* Phones and tablets: the areas as one row. */}
        <ScrollRow label={t("title")} className="mb-6 lg:hidden">
          {AREAS.map((a) => (
            <Link
              key={a.key}
              href={a.href}
              aria-current={active === a.href ? "page" : undefined}
              className={cn(listItemStyles(active === a.href), "flex h-10 shrink-0 items-center whitespace-nowrap px-4 text-body", active === a.href ? "font-semibold text-ink" : "text-ink/70")}
            >
              {t(`nav.${a.key}`)}
            </Link>
          ))}
        </ScrollRow>
        <div className="mx-auto max-w-[1440px]">{children}</div>
      </div>
    </div>
  );
}

/** A count that needs you, right-aligned in a side-list entry: ember, cream number (the admin's "needs you" colour). */
function NavBadge({ count, label, urgent = false }: { count: number; label: string; /** A safety report is open: red instead of ember */ urgent?: boolean }) {
  return (
    <span className={cn("flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1.5 text-nav-group tabular-nums tracking-normal text-on-signal", urgent ? "bg-danger" : "bg-adm-critical")}>
      <span aria-hidden>{count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * An area's head: ONE short title that says what the area answers ("Are we on track to move?") – never the tab's name again, no words under
 * it, only a fine 2px line in the area's colour; a small capsule beside it when needed ("Demo data"), an action on the right.
 */
export function AdminShell({ title, badge, aside, children }: { title: string; badge?: string; aside?: ReactNode; children: ReactNode }) {
  const color = areaColorOf(usePathname());
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h2">{title}</h1>
          {badge && <Badge icon={<FileText aria-hidden />}>{badge}</Badge>}
        </div>
        {aside}
      </div>
      {/* The area's fine line under the title (2px, its area colour – not a status). */}
      <span aria-hidden className={cn("mt-3 block h-0.5 w-12 rounded-full", AREA_BG[color])} />
      <div className="mt-7">{children}</div>
    </>
  );
}

/** A section inside an area: the small heading (12px uppercase muted) over its content, 56px between sections. */
export function AdminSection({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mt-14 first:mt-0", className)}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-3">
        <h2 className="shrink-0 text-eyebrow uppercase text-muted">{title}</h2>
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
    <dl className="grid grid-cols-2 gap-y-8 md:grid-cols-4">
      {stats.map((s, i) => (
        <div key={s.label} className={cn("min-w-0 pr-4 md:px-6 md:first:pl-0", i % 2 === 1 && "max-md:border-l max-md:border-ink/8 max-md:pl-4", i > 0 && "md:border-l md:border-ink/8")}>
          <dt className="flex items-center gap-2 text-small text-muted">
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
