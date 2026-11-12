"use client";

import { BarChart3, Gauge, FileText, Home, Inbox, LayoutDashboard, LifeBuoy, ListOrdered, Network, ScrollText, SlidersHorizontal, Sparkles, Tags, TrendingUp } from "lucide-react";
import Link from "next/link";
import { notFound, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { SideNav } from "@/components/settings/SideNav";
import { Badge } from "@/components/ui/Badge";
import { listItemStyles } from "@/components/ui/listSelection";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { useIsAdmin } from "@/lib/admin/access";
import { cn } from "@/lib/utils";

/** The dashboard's areas, in the side list's order. */
const AREAS = [
  { key: "cockpit", href: "/admin", icon: Gauge },
  { key: "overview", href: "/admin/overview", icon: LayoutDashboard },
  { key: "houses", href: "/admin/houses", icon: Home },
  { key: "applications", href: "/admin/applications", icon: Inbox },
  { key: "waitlist", href: "/admin/waitlist", icon: ListOrdered },
  { key: "topics", href: "/admin/topics", icon: Tags },
  { key: "algorithm", href: "/admin/algorithm", icon: Network },
  { key: "traffic", href: "/admin/traffic", icon: BarChart3 },
  { key: "platform", href: "/admin/platform", icon: SlidersHorizontal },
  { key: "log", href: "/admin/log", icon: ScrollText },
] as const;
/** The tools from before the dashboard, below a small "More". */
const MORE = [
  { key: "growth", href: "/admin/growth", icon: TrendingUp },
  { key: "prepared", href: "/admin/houses/prepared", icon: Sparkles },
  { key: "support", href: "/admin/support", icon: LifeBuoy },
] as const;

/** The area a path belongs to: the longest href it starts with. */
function activeHref(pathname: string): string {
  const all = [...AREAS, ...MORE].map((a) => a.href);
  // "/admin" (the Cockpit) only for itself – every other area starts with it.
  return all.filter((href) => pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`))).toSorted((a, b) => b.length - a.length)[0] ?? "/admin";
}

/**
 * The frame of /admin (app/admin/layout.tsx): only for admins (useIsAdmin – everyone else gets the 404; until it's known, nothing). From
 * 1024px the side list like Settings (the same SideNav, 240px) and the area beside it; below, the areas as one scrolling row of capsules.
 */
export function AdminFrame({ children }: { children: ReactNode }) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  if (isAdmin === null) return <Container page className="min-h-[60vh]">{null}</Container>;
  if (!isAdmin) notFound();

  const active = activeHref(pathname);
  const item = (a: (typeof AREAS)[number] | (typeof MORE)[number]) => ({ key: a.key, href: a.href, label: t(`nav.${a.key}`), icon: a.icon, selected: active === a.href, current: active === a.href });

  return (
    // .admin-scope: the admin colours (styles/admin-tokens.css) exist only in here.
    <Container className="admin-scope pb-16 pt-6 lg:pt-16">
      <div className="lg:mx-auto lg:grid lg:max-w-[1320px] lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-14">
        <div className="max-lg:hidden lg:sticky lg:top-[calc(var(--header-h)+64px)]">
          <SideNav label={t("title")} items={AREAS.map(item)} />
          <p className="mb-2 mt-8 px-4 text-eyebrow uppercase text-muted">{t("nav.more")}</p>
          <SideNav label={t("nav.more")} items={MORE.map(item)} />
        </div>
        {/* Phones and tablets: the areas as one row. */}
        <ScrollRow label={t("title")} className="mb-6 lg:hidden">
          {[...AREAS, ...MORE].map((a) => (
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
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}

/** An area's head: the title (h1 at h2 size, level with the side list's top), a short line, a badge ("Demo data"), an action on the right. */
export function AdminShell({ title, intro, badge, aside, children }: { title: string; intro?: string; badge?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-h2">{title}</h1>
            {badge && <Badge icon={<FileText aria-hidden />}>{badge}</Badge>}
          </div>
          {intro && <p className="mt-2 text-body text-muted">{intro}</p>}
        </div>
        {aside}
      </div>
      <div className="mt-10">{children}</div>
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
export function StatRow({ stats }: { stats: readonly { label: string; value: ReactNode; sub?: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-y-8 md:grid-cols-4">
      {stats.map((s, i) => (
        <div key={s.label} className={cn("min-w-0 pr-4 md:px-6 md:first:pl-0", i % 2 === 1 && "max-md:border-l max-md:border-ink/8 max-md:pl-4", i > 0 && "md:border-l md:border-ink/8")}>
          <dt className="text-small text-muted">{s.label}</dt>
          <dd className="mt-1 text-h1 tabular-nums text-ink">{s.value}</dd>
          {s.sub && <dd className="mt-1 text-small text-muted">{s.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}
