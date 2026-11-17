"use client";

import { Compass, FileUser, FlaskConical, Gauge, Home, Inbox, Landmark, ListOrdered, Network, SlidersHorizontal, Tags, TrendingUp, Users, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { notFound, usePathname } from "next/navigation";
import { NextIntlClientProvider, useMessages, useTranslations } from "next-intl";
import { useMemo, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { ADMIN_DE, ADMIN_UI_DE } from "@/lib/i18n/admin.de";
import { SideNav } from "@/components/settings/SideNav";
import { listItemStyles } from "@/components/ui/listSelection";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { useIsAdmin } from "@/lib/admin/access";
import type { Status } from "@/lib/admin/metrics";
import { StatusDot } from "./AdminCharts";
import { AdminPageHeader } from "./AdminLayout";
import { useAdminTasks } from "@/lib/admin/useAdminTasks";
import { taskCounts } from "@/lib/admin/tasks";
import { cn } from "@/lib/utils";

type AreaKey = "cockpit" | "houses" | "hosts" | "growth" | "topics" | "data" | "labs" | "vision" | "funding" | "inbox" | "money" | "platform" | "waitlist" | "applications";
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

  return (
    // .admin-scope: the admin colours (styles/admin-tokens.css) exist only in here.
    // From 1024px at least the window's height under the header, and over the main area's bottom padding: the side list is never pushed up.
    <div className="admin-scope lg:-mb-(--space-section) lg:grid lg:min-h-[calc(100dvh-var(--header-h))] lg:grid-cols-[220px_minmax(0,1fr)] lg:pl-4">
      {/* The side list fills the height: entries --sidebar-item-h (from the window's height), the active one white 8 %; before each area
          capsule 0.8 × an entry. */}
      <aside className="scroll-pane max-lg:hidden lg:sticky lg:top-(--header-h) lg:h-[calc(100dvh-var(--header-h))] lg:w-[220px] lg:overflow-y-auto lg:overscroll-contain lg:pb-1 lg:pt-(--admin-page-pad)" data-admin-nav>
        {GROUPS.map((group, i) => (
          <div key={group.key} className={cn(i > 0 && "mt-[calc(var(--sidebar-item-h)*0.8)]")}>
            <p className={cn("mb-1 flex h-7 items-center rounded-lg px-3 text-nav-group uppercase", AREA_CHIP[GROUP_COLOR[group.key]])}>{t(`navGroup.${group.key}`)}</p>
            <SideNav compact iconClass={AREA_TEXT[GROUP_COLOR[group.key]]} label={t(`navGroup.${group.key}`)} items={group.areas.map(item)} />
          </div>
        ))}
      </aside>
      <div className="min-w-0 px-4 pb-(--adm-section) pt-6 md:px-(--adm-page) lg:pt-(--admin-page-pad)">
        {/* Phones and tablets: the areas as one row. */}
        <ScrollRow label={t("title")} className="mb-(--adm-inner) lg:hidden">
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
 * An area's head (AdminPageHeader): no visible title (an sr-only <h1>; the side list shows where you are), the first row the click row –
 * tabs left, controls right. No further capsule rows on the page.
 */
export function AdminShell({ title, badge, aside, tabs, children }: { title: string; badge?: string; /** The controls, right in the head's one row */ aside?: ReactNode; /** The tabs, left in that row */ tabs?: ReactNode; children: ReactNode }) {
  return (
    <>
      <AdminPageHeader title={title} badge={badge} tabs={tabs} controls={aside} />
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
