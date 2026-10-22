"use client";

import { Compass, Heart, House, Plus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { MasterDetail } from "@/components/layout/MasterDetail";
import { HouseDetail } from "@/components/stay/HouseDetail";
import { StayCard } from "@/components/StayCard";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Img } from "@/components/ui/Img";
import { Sheet } from "@/components/ui/Sheet";
import { StayThumb } from "@/components/ui/StayThumb";
import { Tabs } from "@/components/ui/Tabs";
import { findUser, getCrew, getCurrentUser, pendingRequestCount, useStore } from "@/lib/store";
import type { JoinRequest, Stay, User } from "@/lib/types";
import { useFormat } from "@/i18n/format";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { cn } from "@/lib/utils";

type Tab = "hosting" | "joined" | "saved";

export function MyStays() {
  const t = useTranslations("houses");
  return (
    <RequireLogin title={t("loginTitle")} description={t("loginDescription")}>
      <MyStaysContent />
    </RequireLogin>
  );
}

function MyStaysContent() {
  const t = useTranslations("houses");
  const store = useStore();
  const isDesktop = useIsDesktop();
  const selectedId = useSearchParams().get("id");

  const hosting = store.stays
    .filter((s) => s.hostId === store.currentUserId)
    .toSorted((a, b) => a.startDate.localeCompare(b.startDate));
  const joined = store.joinRequests
    .filter((r) => r.userId === store.currentUserId && (r.status === "accepted" || r.status === "pending"))
    .map((r) => ({ request: r, stay: store.stays.find((s) => s.id === r.stayId) }))
    .filter((j): j is { request: JoinRequest; stay: Stay } => Boolean(j.stay));

  // A deep link to a joined House opens the Joined tab.
  const savedIds = getCurrentUser(store)?.savedStayIds ?? [];
  const saved = savedIds.map((id) => store.stays.find((s) => s.id === id)).filter((s): s is Stay => Boolean(s));
  const [tab, setTab] = useState<Tab>(() => (joined.some((j) => j.stay.id === selectedId) ? "joined" : "hosting"));
  const stays = tab === "hosting" ? hosting : tab === "joined" ? joined.map((j) => j.stay) : [];
  const active = stays.find((s) => s.id === selectedId) ?? stays[0];

  const list = (
    <>
      <Tabs
        tabs={[
          { value: "hosting", label: t("tabs.hosting"), count: hosting.length },
          { value: "joined", label: t("tabs.joined"), count: joined.length },
          { value: "saved", label: t("tabs.saved"), count: saved.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      <ul className="mt-4 space-y-1">
        {tab === "hosting" &&
          hosting.map((stay) => (
            <li key={stay.id}>
              <StayRowLink stay={stay} active={isDesktop && stay.id === active?.id} isDesktop={isDesktop} pending={pendingRequestCount(store, stay.id)} />
            </li>
          ))}
        {tab === "joined" &&
          joined.map(({ request, stay }) => (
            <li key={request.id}>
              <StayRowLink stay={stay} active={isDesktop && stay.id === active?.id} isDesktop={isDesktop} waiting={request.status === "pending"} />
            </li>
          ))}
      </ul>
      {/* Saved: compact rows on desktop (the cards fill the detail panel), cards on mobile. Both open the House. */}
      {tab === "saved" && saved.length > 0 && (
        <>
          <ul className="hidden space-y-1 lg:block">
            {saved.map((stay) => (
              <li key={stay.id}>
                <StayRowLink stay={stay} active={false} isDesktop={isDesktop} href={`/stays/${stay.slug}`} />
              </li>
            ))}
          </ul>
          <div className="grid gap-4 lg:hidden">
            {saved.map((stay) => (
              <StayCard key={stay.id} stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} />
            ))}
          </div>
        </>
      )}
      {tab === "saved" && saved.length === 0 && (
        <EmptyState
          icon={Heart}
          title={t("saved.emptyTitle")}
          description={t("saved.emptyDescription")}
          action={
            <Link href="/" className={buttonClass("dark", "sm")}>
              {t("emptyJoined.action")}
            </Link>
          }
        />
      )}
      {/* Saved Houses first (or their empty state), then the hosts you get alerts from. */}
      {tab === "saved" && <HostAlertsRow />}
      {tab === "hosting" && hosting.length === 0 && <OpenFirstHouseCard />}
      {/* A quiet way to the next House while the list is short. */}
      {tab === "hosting" && hosting.length > 0 && hosting.length < 3 && <DashedRow href="/create" icon={Plus} label={t("openAnother")} />}
      {tab === "joined" && joined.length > 0 && <DashedRow href="/" icon={Compass} label={t("emptyJoined.title")} />}
      {tab === "joined" && joined.length === 0 && (
        <EmptyState
          icon={Compass}
          title={t("emptyJoined.title")}
          description={t("emptyJoined.description")}
          action={
            <Link href="/" className={buttonClass("dark", "sm")}>
              {t("emptyJoined.action")}
            </Link>
          }
        />
      )}
    </>
  );

  return (
    <MasterDetail
      panel
      title={t("title")}
      list={list}
      // Desktop only – below lg a row opens /my-stays/[id].
      detail={
        isDesktop &&
        (tab === "saved" ? (
          saved.length > 0 ? (
            <div className="grid grid-cols-2 gap-6 xl:grid-cols-3">
              {saved.map((stay) => (
                <StayCard key={stay.id} stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} />
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[24px] border-2 border-dashed border-black/10">
              <EmptyState icon={Heart} title={t("saved.emptyTitle")} />
            </div>
          )
        ) : active ? (
          <HouseDetail key={active.id} stay={active} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-[24px] border-2 border-dashed border-black/10">
            <EmptyState icon={House} title={tab === "hosting" ? t("noHouse") : t("noJoinedHouse")} />
          </div>
        ))
      }
    />
  );
}

interface StayRowLinkProps {
  stay: Stay;
  active: boolean;
  isDesktop: boolean;
  /** Hosted: pending requests */
  pending?: number;
  /** Joined: own request still pending */
  waiting?: boolean;
  /** Overrides the Houses detail link (Saved rows open the House page) */
  href?: string;
}

function StayRowLink({ stay, active, isDesktop, pending = 0, waiting = false, href }: StayRowLinkProps) {
  const t = useTranslations("houses.row");
  const f = useFormat();
  const store = useStore();
  const host = findUser(store, stay.hostId);
  const photo = host?.photos[0];

  return (
    <Link
      href={href ?? (isDesktop ? `/my-stays?id=${stay.id}` : `/my-stays/${stay.id}`)}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn("flex items-center gap-3 rounded-2xl p-2.5 transition-colors", active ? "bg-page" : "hover:bg-black/[0.03]")}
    >
      {photo ? (
        <Img src={photo} alt={host.name} width={56} height={56} className="size-14 shrink-0 rounded-xl object-cover" />
      ) : (
        <StayThumb stay={stay} size={56} className="size-14" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{stay.title}</p>
          {pending > 0 && (
            <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">{t("new", { count: pending })}</span>
          )}
          {waiting && <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium text-zinc-600">{t("pending")}</span>}
          {stay.status === "closed" && (
            <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium text-zinc-600">{t("closed")}</span>
          )}
        </div>
        <p className="truncate text-xs text-zinc-500">
          {f.placeName(stay)} · {f.shortRange(stay.startDate, stay.endDate)}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <AvatarStack users={getCrew(store, stay)} size="xs" />
          <span className="text-xs text-zinc-500">
            {stay.spotsFilled}/{stay.spotsTotal}
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Empty Hosting tab: invites the first House. */
function DashedRow({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="mt-1 flex items-center gap-3 rounded-2xl border-2 border-dashed border-black/10 p-2.5 text-sm font-medium text-zinc-500 transition-colors hover:border-black/20 hover:text-ink"
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-page">
        <Icon className="size-5" aria-hidden />
      </span>
      {label}
    </Link>
  );
}

function OpenFirstHouseCard() {
  const t = useTranslations("houses.firstHouse");
  return (
    <Link
      href="/create"
      className="mt-2 flex flex-col items-center rounded-[24px] border-2 border-dashed border-black/10 p-8 text-center transition-colors hover:border-black/20 hover:bg-white/60"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-ink text-white">
        <Plus className="size-5" aria-hidden />
      </span>
      <p className="mt-4 font-semibold">
        {t.rich("title", { accent: (chunks) => <span className="text-accent">{chunks}</span> })}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{t("description")}</p>
    </Link>
  );
}

/** Saved segment: hosts with alerts on ("Notify me" on their profile), with a sheet to turn them off. */
function HostAlertsRow() {
  const t = useTranslations("houses.hostAlerts");
  const store = useStore();
  const [open, setOpen] = useState(false);
  const hosts = (getCurrentUser(store)?.hostAlerts ?? []).map((id) => findUser(store, id)).filter((u): u is User => Boolean(u));
  if (hosts.length === 0) return null;

  return (
    <section className="mt-6 border-t border-black/5 pt-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{t("title")}</h2>
        <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-ink underline underline-offset-2 hover:text-zinc-600">
          {t("manage")}
        </button>
      </div>
      <div className="mt-3">
        <AvatarStack users={hosts} size="sm" max={8} linked />
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("sheetTitle")}>
        <p className="mb-4 text-sm text-zinc-500">{t("sheetDescription")}</p>
        <ul className="divide-y divide-black/5">
          {hosts.map((host) => (
            <li key={host.id} className="flex items-center gap-3 py-3">
              <Avatar user={host} size="md" linked />
              <Link href={`/u/${host.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline" onClick={() => setOpen(false)}>
                {host.name}
              </Link>
              <button type="button" onClick={() => store.toggleHostAlert(host.id)} className={buttonClass("secondary", "sm")}>
                {t("turnOff")}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </section>
  );
}
