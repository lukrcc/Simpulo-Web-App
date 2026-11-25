"use client";

import { useStore } from "@/lib/store";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { APP_MODE } from "@/lib/appMode";
import { adminNumberMismatches } from "@/lib/admin/consistency";
import { unitClashes } from "@/config/admin-tiles";
import { topicClashes } from "@/config/admin-topics";
import { Compass, Megaphone, Menu, X, FlaskConical, Gauge, Home, Inbox, Landmark, Network, SlidersHorizontal, Tags, TrendingUp, Users, Wallet, type LucideIcon, CalendarRange } from "lucide-react";
import Link from "next/link";
import { notFound, usePathname } from "next/navigation";
import { NextIntlClientProvider, useMessages, useTranslations } from "next-intl";
import { createContext, isValidElement, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { lockScroll } from "@/components/ui/ModalOverlay";
import { useTabScroll } from "@/components/ui/useTabScroll";
import type { Locale } from "@/i18n/config";
import { ADMIN_DE, ADMIN_UI_DE } from "@/lib/i18n/admin.de";
import { SideNav, type SideNavItem } from "@/components/settings/SideNav";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { useIsAdmin } from "@/lib/admin/access";
import type { Status } from "@/lib/admin/metrics";
import { StatusDot } from "./AdminCharts";
import { useAdminPeriod } from "@/lib/admin/period";
import { AdminPageHeader, PeriodDays, PeriodRange, PeriodRow, PeriodTabs, TabLevelContext } from "./AdminLayout";
import { AdminTooltip } from "./AdminTooltip";
import { AdminThemeSwitch, useAdminThemeLabels } from "./AdminThemeSwitch";
import { useAdminSearch } from "@/lib/admin/urlState";
import { useAdminTasks } from "@/lib/admin/useAdminTasks";
import { taskCounts } from "@/lib/admin/tasks";
import { ADMIN_PAGE_STYLE, pageColorVars } from "@/config/admin/pages";
import { ADMIN_ICONS } from "./adminIcons";
import { TopicHeader } from "./AdminTopics";
import { cn } from "@/lib/utils";

type AreaKey = "cockpit" | "inbox" | "zeitplan" | "money" | "growth" | "topics" | "houses" | "hosts" | "marketing" | "data" | "labs" | "vision" | "funding" | "platform";
interface Area {
  key: AreaKey;
  href: string;
  icon: LucideIcon;
  /** Pages without their own entry that belong here (they mark this entry): Traffic under Wachstum, Log under System */
  also?: readonly string[];
}

/**
 * The side list by question (CLAUDE.md "Admin-Gliederung"): HEUTE – what to do now (Übersicht · Aufgaben with its count · Zeitplan) ·
 * ZAHLEN – how it's going (Geld · Wachstum · Analyse) · PLATTFORM – what's on Simpulo (Houses · Hosts) · PLANEN – where it's going
 * (Marketing · Algorithmus · Labore · Vision · Finanzierung); System small under it, without a group. Warteliste is a tab of Wachstum,
 * Bewerbungen a tab of Hosts.
 */
const GROUPS: readonly { key: "today" | "numbers" | "platform" | "plan"; areas: readonly Area[] }[] = [
  {
    key: "today",
    areas: [
      { key: "cockpit", href: "/admin", icon: Gauge },
      { key: "inbox", href: "/admin/aufgaben", icon: Inbox },
      { key: "zeitplan", href: "/admin/zeitplan", icon: CalendarRange },
    ],
  },
  {
    key: "numbers",
    areas: [
      { key: "money", href: "/admin/money", icon: Wallet },
      { key: "growth", href: "/admin/growth", icon: TrendingUp, also: ["/admin/traffic"] },
      { key: "topics", href: "/admin/topics", icon: Tags },
    ],
  },
  {
    key: "platform",
    areas: [
      { key: "houses", href: "/admin/houses", icon: Home },
      { key: "hosts", href: "/admin/hosts", icon: Users },
    ],
  },
  {
    key: "plan",
    areas: [
      { key: "marketing", href: "/admin/marketing", icon: Megaphone },
      { key: "data", href: "/admin/data", icon: Network },
      { key: "labs", href: "/admin/labore", icon: FlaskConical },
      { key: "vision", href: "/admin/vision", icon: Compass },
      { key: "funding", href: "/admin/funding", icon: Landmark, also: ["/admin/market-cap"] },
    ],
  },
];
/** System: under the groups, small, without a heading (Log belongs to it). */
const SYSTEM: Area = { key: "platform", href: "/admin/platform", icon: SlidersHorizontal, also: ["/admin/log"] };
const AREAS: readonly Area[] = [...GROUPS.flatMap((g) => g.areas), SYSTEM];

/**
 * Group colours (styles/admin-tokens.css --adm-group-*, never status, never dots): Heute blue, Zahlen green, Plattform lilac, Planen orange;
 * System neutral. Whole class names, so Tailwind finds them. The overview's tiles are tinted in their row's group (AREA_TILE).
 */
export type AreaColor = (typeof GROUPS)[number]["key"];
export const AREA_TEXT: Record<AreaColor, string> = { today: "text-adm-group-today", numbers: "text-adm-group-numbers", platform: "text-adm-group-platform", plan: "text-adm-group-plan" };
/** The group headings in the side list: small grey caps, no block behind (CLAUDE.md "Admin hell nach Apple-Art", Hell and Dunkel). */
const AREA_CHIP: Record<AreaColor, string> = {
  today: "text-(--adm-label)",
  numbers: "text-(--adm-label)",
  platform: "text-(--adm-label)",
  plan: "text-(--adm-label)",
};
export const AREA_BG: Record<AreaColor, string> = { today: "bg-adm-group-today", numbers: "bg-adm-group-numbers", platform: "bg-adm-group-platform", plan: "bg-adm-group-plan" };
/** Tiles: the card surface (--card) tinted in its group (≈ 7–9 %) with an edge (≈ 28–32 %); hover a little stronger. */
/** Every tile the same silvery surface (CLAUDE.md "Admin: Farbe nur zur Orientierung") – the group no longer tints it; kept per group so callers stay. */
export const AREA_TILE: Record<AreaColor, string> = { today: "adm-tile", numbers: "adm-tile", platform: "adm-tile", plan: "adm-tile" };

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
      {/* The admin's one tooltip – large, cream (the app's Tooltip stays out on admin pages). */}
      <AdminTooltip />
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
  // Dev only (CLAUDE.md "Admin: eine Datenquelle"): bookings and revenue must agree on every page – a difference is logged as an error.
  const checkInputs = useAdminInputs();
  const { events: checkEvents } = useStore();
  useEffect(() => {
    // Only once the data is in (the mock's events load after the first render) – before that there is nothing to compare.
    if (APP_MODE !== "dev" || checkEvents.length === 0) return;
    const mismatches = adminNumberMismatches(checkInputs, checkEvents);
    if (mismatches.length) console.error("[admin] Zahlen weichen ab:", mismatches);
    else console.info("[admin] Zahlen stimmen überein (Übersicht · Geld · Wachstum · Planen).");
  }, [checkInputs, checkEvents]);
  // Dev only (CLAUDE.md "Jeder Farbton nur einmal pro Seite"): a page that repeats a hue or has more units than hues is an error.
  useEffect(() => {
    if (APP_MODE !== "dev") return;
    const clashes = [...unitClashes(), ...topicClashes()];
    if (clashes.length) console.error("[admin] Farbtöne doppelt:", clashes);
  }, []);
  // ?focus= (a tile's route, config/admin-tiles.ts): the element with that data-focus-key is marked (data-focused) and scrolled into view –
  // once it is there (a capsule's content can come a moment later). One place for every page.
  const search = useAdminSearch();
  const focusKey = search.get("focus");
  const tabKey = search.get("tab");
  useEffect(() => {
    document.querySelectorAll(".admin-scope [data-focused]").forEach((el) => el.removeAttribute("data-focused"));
    if (!focusKey) return;
    let done = false;
    const mark = () => {
      if (done) return;
      const el = document.querySelector<HTMLElement>(`.admin-scope [data-focus-key="${CSS.escape(focusKey)}"]`);
      if (!el) return;
      done = true;
      el.setAttribute("data-focused", "");
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    mark();
    const observer = new MutationObserver(mark);
    observer.observe(document.body, { childList: true, subtree: true });
    const stop = window.setTimeout(() => observer.disconnect(), 3000);
    return () => {
      observer.disconnect();
      window.clearTimeout(stop);
    };
  }, [focusKey, tabKey, pathname]);
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
  const activePage: AreaKey = [...GROUPS.flatMap((g) => g.areas), SYSTEM].find((a) => a.href === active)?.key ?? "cockpit";
  // What needs you, as an ember count at the entry's right – all from the one task list (taskCounts), so they agree with "Braucht dich".
  const needs: Partial<Record<AreaKey, number>> = { inbox: inboxOpen };
  // Every page its one colour and symbol (config/admin/pages.ts, CLAUDE.md "Eine Farbe = eine Seite") – the same symbol as its card in Übersicht.
  const item = (a: Area) => ({
    key: a.key,
    href: a.href,
    label: t(`nav.${a.key}`),
    icon: ADMIN_ICONS[ADMIN_PAGE_STYLE[a.key].icon],
    // Only the active entry in its page's colour; the others grey like their words (CLAUDE.md "Admin: Kontrast für Auswahl").
    iconColor: active === a.href ? `var(--adm-c-${ADMIN_PAGE_STYLE[a.key].color})` : "var(--adm-nav-idle)",
    selected: active === a.href,
    current: active === a.href,
    badge: needs[a.key] ? <NavBadge count={needs[a.key]!} label={t("needsYou", { count: needs[a.key]! })} urgent={a.key === "inbox" && counts.safetyOpen} /> : undefined,
  });

  const navGroups = <AdminSideList active={active} item={item} needs={needs} />;

  return (
    // .admin-scope: the admin colours (styles/admin-tokens.css) exist only in here.
    // From 1024px at least the window's height under the header, and over the main area's bottom padding: the side list is never pushed up.
    // Light/dark: the product's own setting (html[data-theme], lib/theme.ts) – the admin has no look of its own. data-admin-group: the active
    // page's group – its colour drives the capsules' active state, focus rings and the tiles (admin-tokens.css).
    <div
      data-admin-group={GROUPS.find((g) => g.areas.some((a) => a.href === active))?.key ?? "system"}
      data-admin-page={activePage}
      style={pageColorVars(ADMIN_PAGE_STYLE[activePage].color) as CSSProperties}
      className="admin-scope lg:-mb-(--space-section) lg:grid lg:min-h-[calc(100dvh-var(--header-h))] lg:grid-cols-[220px_minmax(0,1fr)] lg:pl-4">
      {/* The side list fills the height: entries --sidebar-item-h (from the window's height), the active one white 8 %; before each area
          capsule 0.8 × an entry. */}
      {/* Never scrolls (overflow hidden): the rows follow the window's height; a very flat window folds the other areas (AdminSideList fit). */}
      <aside className="max-lg:hidden lg:sticky lg:top-(--header-h) lg:h-[calc(100dvh-var(--header-h))] lg:w-[220px] lg:overflow-hidden lg:pb-(--adm-page-top) lg:pt-(--adm-page-top)" data-admin-nav>
        <AdminSideList active={active} item={item} needs={needs} fit />
      </aside>
      <div data-admin-content className="min-w-0 px-4 pb-(--adm-page-inset) pt-(--adm-page-top) md:px-(--adm-page-inset)">
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
  // The standing side list (fit) is ONE flex column over the full height: between the groups equal spacers that grow with the room (at least
  // --sidebar-gap-min), SYSTEM and the appearance strip at the bottom – the strip flush with the bottom inset (CLAUDE.md "Seitenleiste").
  // The sheet (tablets) keeps fixed gaps.
  const spacer = (key: string) => <div key={key} aria-hidden data-nav-spacer className="min-h-(--sidebar-gap-min) flex-1 shrink-0" />;
  const list = (fold: boolean) =>
    GROUPS.flatMap((group, i) => {
      const shown = !fold || group.key === open;
      const heading = cn("mb-1 flex h-(--sidebar-heading-h) w-full items-center gap-2 rounded-lg px-3 text-nav-group uppercase", AREA_CHIP[group.key]);
      const waiting = group.areas.reduce((sum, a) => sum + (needs[a.key] ?? 0), 0);
      const block = (
        <div key={group.key} className={cn(!fit && i > 0 && "mt-(--sidebar-gap)")}>
          {fold && !shown ? (
            <button type="button" aria-expanded={false} onClick={() => setOpen(group.key)} className={cn(heading, "text-left")}>
              <span className="min-w-0 flex-1 truncate">{t(`navGroup.${group.key}`)}</span>
              {waiting > 0 && <NavBadge count={waiting} label={t("needsYou", { count: waiting })} />}
            </button>
          ) : (
            <p className={heading}>{t(`navGroup.${group.key}`)}</p>
          )}
          {shown && <SideNav compact label={t(`navGroup.${group.key}`)} items={group.areas.map(item)} />}
        </div>
      );
      return fit ? [block, spacer(`gap-${group.key}`)] : [block];
    });
  // SYSTEM: its own group like the others (heading strip in slate, the entry's symbol in the same colour); under it, at the very bottom, the
  // appearance (System · Hell · Dunkel – the product's one setting) as a full-width strip as high as a heading (CLAUDE.md "Seitenleiste").
  const themeLabels = useAdminThemeLabels();
  const system = (
    <>
      <div className={cn("shrink-0", !fit && "mt-(--sidebar-gap)")} data-admin-system>
        <p className="mb-1 flex h-(--sidebar-heading-h) w-full items-center gap-2 rounded-lg px-3 text-nav-group uppercase text-(--adm-label)">{t("navGroup.system")}</p>
        <SideNav compact label={t("navGroup.system")} items={[item(SYSTEM)]} />
      </div>
      <div data-admin-theme-row className={cn("shrink-0", fit ? "mt-(--sidebar-strip-gap)" : "mt-(--sidebar-gap)")}>
        <AdminThemeSwitch strip labels={themeLabels} />
      </div>
    </>
  );
  if (!fit)
    return (
      <>
        {list(false)}
        {system}
      </>
    );
  return (
    <div ref={box} className="relative flex h-full flex-col overflow-hidden">
      <div aria-hidden inert ref={probe} className="pointer-events-none invisible absolute inset-x-0 top-0">
        {list(false)}
        {system}
      </div>
      {list(folded)}
      {system}
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
export function AdminShell({
  title,
  badge,
  aside: asideProp,
  tabs: tabsProp,
  subTabs: subTabsProp,
  period = false,
  keepAside = false,
  children,
}: {
  title: string;
  badge?: string;
  /** The controls, right in the head's one row */
  aside?: ReactNode;
  /** The tabs, left in that row */
  tabs?: ReactNode;
  /** The second level (AdminSubTabs), right under the row */
  subTabs?: ReactNode;
  /**
   * The admin's one period (Woche · Monat · Quartal · Jahr, lib/admin/period.ts) – the last control, top right; "center" centres it in the
   * click row (Übersicht, over its tiles). Pages (or tabs) without a time reference leave it out.
   */
  period?: boolean | "center";
  /** A card overview keeps its control top right (Labore's "Ansichten ▾" – the only way to its views) */
  keepAside?: boolean;
  children: ReactNode;
}) {
  let aside = asideProp;
  let subTabs = subTabsProp;
  let tabs = tabsProp;
  const nest = useContext(NestContext);
  const [chosen] = useAdminPeriod();
  // "Acht Karten": in a topic view the first row holds "← Seite" and the topics; the period's capsule row and the page's own controls (search,
  // sort, filters) go to a second row – the period left, the controls and what the period covers right – so the topics fit one row.
  const topicOpen = useAdminSearch().has("topic");
  const hasPeriod = period === true;
  // A card overview (CLAUDE.md "Kopfreihe nur für Zeitraum"): the row over the cards only for the period – no extra texts or links top right
  // (they are in the cards); without a period no row at all, the cards start the page's inset under the header.
  const cardsOverview = !topicOpen && !nest && isValidElement(tabsProp) && tabsProp.type === TopicHeader;
  if (cardsOverview && !keepAside) aside = undefined;
  if (cardsOverview && !hasPeriod && period !== "center" && !aside)
    return (
      <>
        <AdminPageHeader title={title} />
        <div data-cards-top className="pt-[calc(var(--adm-page-inset)-var(--adm-page-top))]">{children}</div>
      </>
    );
  if (topicOpen && (aside || hasPeriod)) {
    const own = aside;
    aside = undefined;
    subTabs = (
      <div data-topic-controls className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {subTabs}
          {hasPeriod && <PeriodRow level="sub" />}
        </div>
        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-(--adm-cap-gap)">
          {own}
          {hasPeriod && <PeriodRange />}
        </div>
      </div>
    );
  }
  // The period as ONE capsule row (CLAUDE.md "Zeitraum als eine Kapsel-Reihe"): on the overview left in the head's row (Woche · Monat ·
  // Quartal · Jahr | the days), what it covers right ("KW 48 · 23.–29. Nov ⓘ").
  const withPeriod = hasPeriod && !topicOpen;
  if (withPeriod)
    tabs = (
      <div className="flex min-w-0 items-center gap-3">
        {tabs}
        <PeriodRow />
      </div>
    );
  const controls = withPeriod ? (
    <>
      {aside}
      <PeriodRange />
    </>
  ) : (
    aside
  );
  // Shown as a tab of another page: the host page's tabs on top; this page's own tabs, sub-tabs and controls in the second row.
  if (nest)
    return (
      <>
        <AdminPageHeader
          title={title}
          badge={badge}
          tabs={nest.tabs}
          controls={nest.controls}
          subTabs={
            tabs || subTabs || controls ? (
              <TabLevelContext.Provider value="sub">
                <div data-nested-row className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    {tabs}
                    {subTabs}
                  </div>
                  {controls && <div className="flex shrink-0 flex-wrap items-center gap-(--adm-cap-gap)">{controls}</div>}
                </div>
              </TabLevelContext.Provider>
            ) : undefined
          }
        />
        {children}
      </>
    );
  return (
    <>
      {/* With a period: "Woche" brings its days (Mo … So · Ganze Woche) as the second row. */}
      <AdminPageHeader
        title={title}
        badge={badge}
        tabs={tabs}
        controls={controls}
        center={period === "center" ? <PeriodTabs /> : undefined}
        subTabs={
          period === "center" && chosen === "week" ? (
            <div className={cn("flex flex-wrap items-center gap-3", period === "center" ? "justify-center" : "justify-between")}>
              {subTabs}
              <span className={period === "center" ? "" : "ml-auto"}>
                <PeriodDays />
              </span>
            </div>
          ) : (
            subTabs
          )
        }
      />
      {children}
    </>
  );
}

const NestContext = createContext<{ tabs: ReactNode; controls?: ReactNode } | null>(null);

/**
 * A whole admin page shown as one tab of another (Hosts › Bewerbungen, Wachstum › Warteliste): the outer page passes its tabs (and its
 * controls); the inner page's AdminShell puts them on top and moves its own tabs and controls into the second row.
 */
export function AdminNested({ tabs, controls, children }: { tabs: ReactNode; controls?: ReactNode; children: ReactNode }) {
  return <NestContext.Provider value={{ tabs, controls }}>{children}</NestContext.Provider>;
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
              g.key === group.key ? AREA_CHIP[g.key] : "text-ink/60",
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
