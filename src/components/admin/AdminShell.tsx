"use client";

import { BarChart3, FileText, Gauge, Home, Inbox, LifeBuoy, ListOrdered, Network, ScrollText, SlidersHorizontal, Sparkles, Tags, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { notFound, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { SideNav } from "@/components/settings/SideNav";
import { Badge } from "@/components/ui/Badge";
import { listItemStyles } from "@/components/ui/listSelection";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { useIsAdmin } from "@/lib/admin/access";
import type { Status } from "@/lib/admin/metrics";
import { StatusDot } from "./AdminCharts";
import { cn } from "@/lib/utils";

type AreaKey = "cockpit" | "money" | "houses" | "applications" | "waitlist" | "topics" | "data" | "traffic" | "growth" | "support" | "prepared" | "platform" | "log";
interface Area {
  key: AreaKey;
  href: string;
  icon: LucideIcon;
}

/** The side list in four groups with small headings, in this order. */
const GROUPS: readonly { key: "steer" | "market" | "intelligence" | "operate"; areas: readonly Area[] }[] = [
  {
    key: "steer",
    areas: [
      { key: "cockpit", href: "/admin", icon: Gauge },
      { key: "money", href: "/admin/money", icon: Wallet },
    ],
  },
  {
    key: "market",
    areas: [
      { key: "houses", href: "/admin/houses", icon: Home },
      { key: "applications", href: "/admin/applications", icon: Inbox },
      { key: "waitlist", href: "/admin/waitlist", icon: ListOrdered },
      { key: "topics", href: "/admin/topics", icon: Tags },
    ],
  },
  {
    key: "intelligence",
    areas: [
      { key: "data", href: "/admin/data", icon: Network },
      { key: "traffic", href: "/admin/traffic", icon: BarChart3 },
      { key: "growth", href: "/admin/growth", icon: TrendingUp },
    ],
  },
  {
    key: "operate",
    areas: [
      { key: "support", href: "/admin/support", icon: LifeBuoy },
      { key: "prepared", href: "/admin/houses/prepared", icon: Sparkles },
      { key: "platform", href: "/admin/platform", icon: SlidersHorizontal },
      { key: "log", href: "/admin/log", icon: ScrollText },
    ],
  },
];
const AREAS: readonly Area[] = GROUPS.flatMap((g) => g.areas);

/** The area a path belongs to: the longest href it starts with ("/admin", the Cockpit, only for itself – every other area starts with it). */
function activeHref(pathname: string): string {
  return (
    AREAS.map((a) => a.href)
      .filter((href) => pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`)))
      .toSorted((a, b) => b.length - a.length)[0] ?? "/admin"
  );
}

/**
 * The frame of /admin (app/admin/layout.tsx): only for admins (useIsAdmin – everyone else gets the 404; until it's known, nothing). From
 * 1024px the side list fixed at the left edge (208px, 12px from the edge, the full height under the header – it never scrolls with the page;
 * only if it's taller than the window, inside itself), the same SideNav as Settings, in four groups; the content takes all the rest and is
 * what scrolls. Below 1024px the areas as one scrolling row of capsules.
 */
export function AdminFrame({ children }: { children: ReactNode }) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  if (isAdmin === null) return <div className="min-h-[60vh]" />;
  if (!isAdmin) notFound();

  const active = activeHref(pathname);
  const item = (a: Area) => ({ key: a.key, href: a.href, label: t(`nav.${a.key}`), icon: a.icon, selected: active === a.href, current: active === a.href });

  return (
    // .admin-scope: the admin colours (styles/admin-tokens.css) exist only in here.
    // From 1024px at least the window's height under the header, and over the main area's bottom padding: the side list is never pushed up.
    <div className="admin-scope lg:-mb-(--space-section) lg:grid lg:min-h-[calc(100dvh-var(--header-h))] lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="scroll-pane max-lg:hidden lg:sticky lg:top-(--header-h) lg:h-[calc(100dvh-var(--header-h))] lg:overflow-y-auto lg:overscroll-contain lg:py-6 lg:pl-3">
        {GROUPS.map((group, i) => (
          <div key={group.key} className={i > 0 ? "mt-5" : undefined}>
            <p className="mb-1 px-4 text-eyebrow uppercase text-muted">{t(`navGroup.${group.key}`)}</p>
            <SideNav label={t(`navGroup.${group.key}`)} items={group.areas.map(item)} />
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

/**
 * An area's head: ONE short title that says what the area answers ("Are we on track to move?") – never the tab's name again, no line under
 * it; a small capsule beside it when needed ("Demo data"), an action on the right.
 */
export function AdminShell({ title, badge, aside, children }: { title: string; badge?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h2">{title}</h1>
          {badge && <Badge icon={<FileText aria-hidden />}>{badge}</Badge>}
        </div>
        {aside}
      </div>
      <div className="mt-8">{children}</div>
    </>
  );
}

/** A section inside an area: the small heading (12px uppercase muted) over its content, 56px between sections. */
export function AdminSection({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mt-14 first:mt-0", className)}>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-eyebrow uppercase text-muted">{title}</h2>
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
  stats: readonly { label: string; value: ReactNode; sub?: ReactNode; /** A number with a target: its status dot (getStatus) */ status?: Status | null }[];
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
          <dd className={cn("mt-1 tabular-nums text-ink", size === "lg" ? "text-h1" : "text-h3")}>{s.value}</dd>
          {s.sub && <dd className="mt-1 text-small text-muted">{s.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}
