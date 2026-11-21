"use client";

// Admin › Wachstum (/admin/growth): no visible title (the side list shows where you are). The click row: tabs Kanäle · Empfehler · Houses ·
// Verhalten, right Zeitraum ▾ and "Analytics ↗". Above the tabs, always: Besucher · Anfragen · Bezahlt · Wert ÷ Kosten, each with its change
// (getChange) and ⓘ. Kanäle, Empfehler, Houses: rows without a frame – an icon or photo, the name, a mini bar visits → requests → paid with the
// three numbers, the revenue right; the top 10, "Alle zeigen" opens the full list in the detail. Verhalten: app installs and asking the host.
// Every number from lib/admin/metrics.ts (later from the pre-computed statistics, see there).
import { Link2, MessageCircle, MousePointerClick, Search, Globe, ArrowUpRight, type LucideIcon, MessageSquare, Share, Ticket, QrCode, ImageIcon, Megaphone, UserPlus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useFormat } from "@/i18n/format";
import { findUser, useStore } from "@/lib/store";
import { profileHref } from "@/lib/privacy";
import { housePhotos, cn } from "@/lib/utils";
import { SOCIAL_ICONS } from "@/components/ui/socialIcons";
import { Img } from "@/components/ui/Img";
import { TOOL_LINKS } from "@/config/app-links";
import { AdminShell } from "./AdminShell";
import { AdminTabs, PeriodTabs } from "./AdminLayout";
import { ChangeLine, InfoTip, KeyNumbers } from "./AdminNumbers";
import { askingHostMetrics, growthFunnel, growthRows, installRates, monthKpis, type GrowthPeriod, type GrowthRow } from "@/lib/admin/metrics";
import { useAdminPeriod } from "@/lib/admin/period";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { dec, monthLong, num, pct } from "@/lib/i18n/adminFormat";

const DIRECT = "\u0000direct";
const NO_REF = "\u0000none";
const TOP = 10;

type GrowthTab = "channels" | "referrers" | "houses" | "behaviour";
const TABS: readonly GrowthTab[] = ["channels", "referrers", "houses", "behaviour"];

/** A channel's icon: the platforms' own marks (monochrome), else a line icon. */
const CHANNEL_ICONS: Record<string, ComponentType<{ className?: string }> | LucideIcon> = {
  instagram: SOCIAL_ICONS.instagram.icon,
  tiktok: SOCIAL_ICONS.tiktok.icon,
  youtube: SOCIAL_ICONS.youtube.icon,
  twitch: SOCIAL_ICONS.twitch.icon,
  whatsapp: MessageCircle,
  copy: Link2,
  messages: MessageSquare,
  story: ImageIcon,
  native: Share,
  invite: Ticket,
  qr: QrCode,
  hostkit: Megaphone,
  hostref: UserPlus,
  google: Search,
  [DIRECT]: MousePointerClick,
};

export function AdminGrowth() {
  const t = useTranslations("admin.growthArea");
  const tAdmin = useTranslations("admin");
  const store = useStore();
  const { events } = store;
  const { today } = useAdminInputs();
  const [tab, setTab] = useState<GrowthTab>("channels");
  // The admin's one period (Tag · Woche · Monat · Quartal · Jahr), the same as the overview's.
  const [period] = useAdminPeriod();
  const [all, setAll] = useState(false);

  const byChannel = useMemo(() => growthRows(events, (e) => e.utmSource ?? DIRECT, period, today), [events, period, today]);
  const byRef = useMemo(() => growthRows(events, (e) => e.refUserId ?? NO_REF, period, today).filter((r) => r.key !== NO_REF), [events, period, today]);
  const byHouse = useMemo(() => growthRows(events, (e) => e.houseId, period, today), [events, period, today]);
  const analytics = TOOL_LINKS.find((l) => l.key === "analytics")?.url;

  const channelName = (key: string) => (key === DIRECT ? t("channel.direct") : t.has(`channel.${key}` as Parameters<typeof t>[0]) ? t(`channel.${key}` as Parameters<typeof t>[0]) : key);
  const rowsOf = tab === "channels" ? byChannel : tab === "referrers" ? byRef : byHouse;
  const visual = (key: string): ReactNode => {
    if (tab === "channels") {
      const Icon = CHANNEL_ICONS[key] ?? Globe;
      return (
        <span className="flex size-10 items-center justify-center rounded-full bg-ink/6 text-ink/80">
          <Icon className="size-4.5" />
        </span>
      );
    }
    if (tab === "referrers") {
      const user = findUser(store, key);
      // A preview image 40px, loaded lazily (long lists).
      return user?.photos[0] ? <Img src={user.photos[0]} alt="" width={40} height={40} loading="lazy" className="size-10 rounded-full object-cover" /> : <span className="size-10 rounded-full bg-ink/6" />;
    }
    const stay = store.stays.find((st) => st.id === key);
    const photo = stay ? housePhotos(stay, findUser(store, stay.hostId))[0] : undefined;
    return photo ? <Img src={photo} alt="" width={40} height={40} loading="lazy" className="size-10 rounded-lg object-cover" /> : <span className="size-10 rounded-lg bg-ink/6" />;
  };
  const nameOf = (key: string): ReactNode => {
    if (tab === "channels") return channelName(key);
    if (tab === "referrers") {
      const user = findUser(store, key);
      return (
        <Link href={profileHref(key)} className="hover:underline">
          {user?.name ?? t("unknownUser", { id: key })}
        </Link>
      );
    }
    const stay = store.stays.find((st) => st.id === key);
    return stay ? (
      <Link href={`/house/${stay.slug}`} className="hover:underline">
        {stay.title}
      </Link>
    ) : (
      key
    );
  };

  return (
    <AdminShell
      title={tAdmin("growthTitle")}
      tabs={
        <AdminTabs
          label={t("tabsLabel")}
          value={tab}
          onChange={(next) => (setTab(next), setAll(false))}
          tabs={TABS.map((key) => ({ value: key, label: t(`tab.${key}`), tooltip: key === "channels" ? t("channelsInfo") : undefined }))}
        />
      }
      aside={
        <>
          <PeriodTabs />
          {analytics && (
            <a href={analytics} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-body font-semibold text-ink hover:underline">
              {t("analytics")}
              <ArrowUpRight aria-hidden className="size-4" />
            </a>
          )}
        </>
      }
    >
      <FunnelKpis period={period} />
      <div className="mt-(--adm-section)">
        {tab === "behaviour" ? (
          <>
            <InstallKpis />
            <AskingKpis />
          </>
        ) : (
          <div className={cn("grid gap-x-10 gap-y-6", all && "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]")}>
            <FunnelList rows={rowsOf.slice(0, TOP)} visual={visual} name={nameOf} empty={t("none")} />
            {all && (
              <section aria-label={t("allTitle")} className="min-w-0 lg:sticky lg:top-[calc(var(--header-h)+var(--adm-page))] lg:max-h-[calc(100svh-var(--header-h)-2*var(--adm-page))] lg:self-start lg:overflow-y-auto lg:overscroll-contain">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-eyebrow uppercase text-(--adm-label)">{t("allTitle")}</h2>
                  <button type="button" onClick={() => setAll(false)} className="text-small font-semibold text-ink hover:underline">
                    {t("showLess")}
                  </button>
                </div>
                <FunnelList rows={rowsOf} visual={visual} name={nameOf} empty={t("none")} />
              </section>
            )}
            {!all && rowsOf.length > TOP && (
              <button type="button" onClick={() => setAll(true)} className="justify-self-start text-small font-semibold text-ink hover:underline">
                {t("showAll", { count: rowsOf.length })}
              </button>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

/**
 * Always on top: Besucher · Anfragen · Bezahlt in the period (each with its change against the period before) · Wert ÷ Kosten (the last full
 * month, target ≥ 3) – one row, each with ⓘ.
 */
function FunnelKpis({ period }: { period: GrowthPeriod }) {
  const t = useTranslations("admin.growthArea");
  const tk = useTranslations("admin.growthArea.kpis");
  const tc = useTranslations("admin.cockpit");
  const store = useStore();
  const inputs = useAdminInputs();
  const f = growthFunnel(store.events, period, inputs.today);
  const k = monthKpis(inputs);
  const periodText = tc(`compare.info.${period}`);
  return (
    <dl className="grid grid-cols-2 gap-y-(--adm-inner) lg:grid-cols-4">
      {[
        { key: "visitors", label: t("funnel.visitors"), info: `${t("funnel.info.visitors")} (${periodText})`, value: num(f.visitors.value), change: f.visitors.change },
        { key: "requests", label: t("funnel.requests"), info: `${t("funnel.info.requests")} (${periodText})`, value: num(f.requests.value), change: f.requests.change },
        { key: "paid", label: t("funnel.paid"), info: `${t("funnel.info.paid")} (${periodText})`, value: num(f.paid.value), change: f.paid.change },
        {
          key: "valueToCost",
          label: tk("valueToCost"),
          info: `${tk("info.valueToCost")} (${monthLong(`${k.month}-01`)})`,
          value: k.valueToCost.value === null ? "–" : `${dec(k.valueToCost.value)} ×`,
          change: k.valueToCost.change,
          target: { text: tk("target", { target: k.valueToCost.target }), status: k.valueToCost.status },
        },
      ].map((n, i) => (
        <div key={n.key} className={cn("min-w-0 pr-4 lg:px-6 lg:first:pl-0", i > 0 && "lg:border-l lg:border-ink/8", i % 2 === 1 && "max-lg:border-l max-lg:border-ink/8 max-lg:pl-4")}>
          <dt className="flex items-center gap-1 text-eyebrow uppercase text-(--adm-label)">
            {n.label}
            <InfoTip text={n.info} />
          </dt>
          <dd className="mt-1 text-adm-figure tabular-nums text-ink">{n.value}</dd>
          <dd className="mt-1">
            <ChangeLine change={n.change} target={"target" in n ? n.target : undefined} className="block" />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Rows without a frame: icon/photo · name · a mini bar visits → requests → paid (one track per row, as wide as its visits against the most
 * visits in the list; requests and paid inside it) with the three numbers · revenue right.
 */
function FunnelList({ rows, visual, name, empty }: { rows: readonly GrowthRow[]; visual: (key: string) => ReactNode; name: (key: string) => ReactNode; empty: string }) {
  const t = useTranslations("admin.growthArea");
  const f = useFormat();
  if (rows.length === 0) return <p className="text-body text-muted">{empty}</p>;
  const most = Math.max(1, ...rows.map((r) => r.visits));
  return (
    <ul className="divide-y divide-ink/8">
      {rows.map((row) => (
        <li key={row.key} className="flex min-h-14 items-center gap-4 py-2">
          <span className="shrink-0">{visual(row.key)}</span>
          <span className="w-44 shrink-0 truncate text-body font-semibold text-ink">{name(row.key)}</span>
          <span className="min-w-0 flex-1">
            <span aria-hidden className="relative block h-2 rounded-full bg-ink/6">
              <span className="absolute inset-y-0 left-0 rounded-full bg-ink/18" style={{ width: `${(row.visits / most) * 100}%` }} />
              <span className="absolute inset-y-0 left-0 rounded-full bg-ink/45" style={{ width: `${(row.requests / most) * 100}%` }} />
              <span className="absolute inset-y-0 left-0 rounded-full bg-adm-chart-1" style={{ width: `${(row.paid / most) * 100}%` }} />
            </span>
            <span className="mt-1 block text-small tabular-nums text-muted">{t("funnelLine", { visits: num(row.visits), requests: num(row.requests), paid: num(row.paid) })}</span>
          </span>
          <span className="w-24 shrink-0 text-right text-body font-semibold tabular-nums text-ink">{f.price(Math.round(row.revenue), "EUR")}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The install rate of guests with a booking (lib/admin/metrics.ts installRates), iPhone and Android apart – each with its change and ⓘ.
 * Without install records "noch nicht messbar".
 */
function InstallKpis() {
  const t = useTranslations("admin.growthArea.kpis");
  const k = installRates(useAdminInputs());
  const month = monthLong(`${k.month}-01`);
  const against = t("against", { month: monthLong(`${k.monthBefore}-01`) });
  const item = (key: "installIos" | "installAndroid", r: typeof k.ios) => ({
    key,
    label: t(key),
    info: `${t(`info.${key}`)} (${month})`,
    value: r.value === null ? "–" : pct(Math.round(r.value)),
    change: r.change,
    against,
    sub: r.value === null ? t("notMeasurable") : t("installSub", { count: num(r.booked ?? 0) }),
  });
  return (
    <section>
      <h2 className="text-eyebrow uppercase text-(--adm-label)">{t("installs")}</h2>
      <KeyNumbers className="mt-4" items={[item("installIos", k.ios), item("installAndroid", k.android)]} />
    </section>
  );
}

/**
 * Asking the host (lib/admin/metrics.ts askingHostMetrics): messages before a request · chats that lead to a request · requests with a note.
 * The data points are planned – the mock counts its own chats and requests; no change against a month yet.
 */
function AskingKpis() {
  const t = useTranslations("admin.growthArea.kpis");
  const k = askingHostMetrics(useAdminInputs());
  // The note "data points planned" belongs in the ⓘ, not under the numbers.
  const item = (key: "askBefore" | "askToRequest" | "askNote", value: string, sub: string) => ({ key, label: t(key), info: `${t(`info.${key}`)} ${t("askPlanned")}`, value, change: null, sub });
  return (
    <section className="mt-(--adm-section)">
      <h2 className="text-eyebrow uppercase text-(--adm-label)">{t("asking")}</h2>
      <KeyNumbers
        className="mt-4"
        items={[
          item("askBefore", k.messagesBeforeRequest === null ? "–" : dec(k.messagesBeforeRequest), t("askChats", { count: num(k.chats) })),
          item("askToRequest", k.askedToRequest === null ? "–" : pct(Math.round(k.askedToRequest)), t("askChats", { count: num(k.chats) })),
          item("askNote", k.requestsWithNote === null ? "–" : pct(Math.round(k.requestsWithNote)), t("askRequests", { count: num(k.requests) })),
        ]}
      />
    </section>
  );
}
