"use client";

import { ChevronRight, Compass, House, Plus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { MasterDetail } from "@/components/layout/MasterDetail";
import { HouseDetail } from "@/components/stay/HouseDetail";
import { Button } from "@/components/ui/ActionButton";
import { AvatarStack } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { cardClass } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Img } from "@/components/ui/Img";
import { StayThumb } from "@/components/ui/StayThumb";
import { findUser, getCrew, isCrewMember, pendingRequestCount, useStore } from "@/lib/store";
import type { JoinRequest, Stay } from "@/lib/types";
import { useFormat } from "@/i18n/format";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { cn } from "@/lib/utils";

export function MyStays() {
  const t = useTranslations("houses");
  return (
    <RequireLogin title={t("loginTitle")} description={t("loginDescription")}>
      <MyStaysContent />
    </RequireLogin>
  );
}

type Section = "hosting" | "joined" | "past";
const SECTIONS: readonly Section[] = ["hosting", "joined", "past"];
const DEFAULT_OPEN: readonly Section[] = ["hosting", "joined"];
const OPEN_KEY = "simpulo:houses-open";

function readOpenSections(): readonly Section[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(OPEN_KEY) ?? "null");
    return Array.isArray(saved) ? SECTIONS.filter((s) => saved.includes(s)) : DEFAULT_OPEN;
  } catch {
    return DEFAULT_OPEN;
  }
}

function saveOpenSections(sections: ReadonlySet<Section>) {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify([...sections]));
  } catch {
    // not remembered – the defaults next time
  }
}

function MyStaysContent() {
  const t = useTranslations("houses");
  const store = useStore();
  const isDesktop = useIsDesktop();
  const selectedId = useSearchParams().get("id");

  // Completed Houses move to Past – for the host and the crew alike – and stay listed there.
  const hosting = store.stays
    .filter((s) => s.hostId === store.currentUserId && s.status !== "completed")
    .toSorted((a, b) => a.startDate.localeCompare(b.startDate));
  const joined = store.joinRequests
    .filter((r) => r.userId === store.currentUserId && (r.status === "accepted" || r.status === "pending" || r.status === "invited"))
    .map((r) => ({ request: r, stay: store.stays.find((s) => s.id === r.stayId) }))
    .filter((j): j is { request: JoinRequest; stay: Stay } => Boolean(j.stay) && j.stay!.status !== "completed");
  const past = store.stays
    .filter((s) => s.status === "completed" && isCrewMember(store, s, store.currentUserId))
    .toSorted((a, b) => b.endDate.localeCompare(a.endDate));

  // Hosting and Joined start open, Past closed; afterwards what the user left open (this browser). A deep link into a
  // closed section opens it.
  const [open, setOpen] = useState<ReadonlySet<Section>>(() => {
    const sections = new Set(readOpenSections());
    const target = hosting.some((s) => s.id === selectedId) ? "hosting" : joined.some((j) => j.stay.id === selectedId) ? "joined" : past.some((s) => s.id === selectedId) ? "past" : null;
    if (target) sections.add(target);
    return sections;
  });
  const toggle = (section: Section) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(section)) next.add(section);
      saveOpenSections(next);
      return next;
    });

  const all = [...hosting, ...joined.map((j) => j.stay), ...past];
  const active = all.find((s) => s.id === selectedId) ?? all[0];
  const row = (stay: Stay, props?: Partial<StayRowLinkProps>) => (
    <StayRowLink stay={stay} active={isDesktop && stay.id === active?.id} isDesktop={isDesktop} {...props} />
  );

  const list = (
    <div className="space-y-2">
      <ListSection label={t("sections.hosting")} count={hosting.length} open={open.has("hosting")} onToggle={() => toggle("hosting")}>
        {hosting.length > 0 ? (
          <>
            <ul className="space-y-1">
              {hosting.map((stay) => (
                <li key={stay.id}>{row(stay, { pending: pendingRequestCount(store, stay.id) })}</li>
              ))}
            </ul>
            {/* A quiet way to the next House while the list is short. */}
            {hosting.length < 3 && <NextStep href="/create" icon={Plus} label={t("openAnother")} />}
          </>
        ) : (
          <OpenFirstHouseCard />
        )}
      </ListSection>

      <ListSection label={t("sections.joined")} count={joined.length} open={open.has("joined")} onToggle={() => toggle("joined")}>
        {joined.length > 0 ? (
          <>
            <ul className="space-y-1">
              {joined.map(({ request, stay }) => (
                <li key={request.id}>{row(stay, { waiting: request.status === "pending", invited: request.status === "invited" })}</li>
              ))}
            </ul>
            <NextStep href="/" icon={Compass} label={t("emptyJoined.title")} />
          </>
        ) : (
          <EmptyState
            icon={Compass}
            title={t("emptyJoined.title")}
            description={t("emptyJoined.description")}
            action={
              <Button href="/" variant="secondary">
                {t("emptyJoined.action")}
              </Button>
            }
          />
        )}
      </ListSection>

      <ListSection label={t("sections.past")} count={past.length} open={open.has("past")} onToggle={() => toggle("past")}>
        {past.length > 0 ? (
          <ul className="space-y-1">
            {past.map((stay) => (
              <li key={stay.id}>{row(stay)}</li>
            ))}
          </ul>
        ) : (
          <p className="px-2.5 pb-2 text-small text-muted">{t("pastEmpty.description")}</p>
        )}
      </ListSection>
    </div>
  );

  return (
    <MasterDetail
      fixedList
      title={t("title")}
      list={list}
      // Desktop only – below lg a row opens /my-stays/[id].
      detail={
        isDesktop &&
        (active ? (
          <HouseDetail key={active.id} stay={active} />
        ) : (
          <EmptyState icon={House} title={t("noHouse")} />
        ))
      }
    />
  );
}

/** A collapsible group of the list: "Hosting (3)" with a chevron, its rows below while open. */
function ListSection({ label, count, open, onToggle, children }: { label: string; count: number; open: boolean; onToggle: () => void; children: ReactNode }) {
  const t = useTranslations("houses.sections");
  const id = useId();
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
        aria-label={t("toggle", { label, count })}
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-body font-semibold text-ink hover:bg-surface/60"
      >
        <ChevronRight className={cn("size-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-90")} aria-hidden />
        <span className="flex-1">{label}</span>
        <Badge>{count}</Badge>
      </button>
      {open && (
        <div id={id} className="mt-1">
          {children}
        </div>
      )}
    </section>
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
  /** Joined: invited from a past crew, not answered yet */
  invited?: boolean;
}

function StayRowLink({ stay, active, isDesktop, pending = 0, waiting = false, invited = false }: StayRowLinkProps) {
  const t = useTranslations("houses.row");
  const tDraft = useTranslations("growth.draft");
  const tDetail = useTranslations("houses.detail");
  const f = useFormat();
  const store = useStore();
  const host = findUser(store, stay.hostId);
  const photo = host?.photos[0];

  return (
    <Link
      href={isDesktop ? `/my-stays?id=${stay.id}` : `/my-stays/${stay.id}`}
      scroll={false}
      aria-current={active ? "page" : undefined}
      // Straight on the page background: a light surface on hover, and when active also a 3px ink bar at the left edge.
      className={cn(
        "relative flex items-center gap-3 rounded-2xl p-2.5 transition-colors",
        active ? "bg-surface before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-full before:bg-accent" : "hover:bg-surface/60",
      )}
    >
      {photo ? (
        <Img src={photo} alt={host.name} width={56} height={56} className="size-14 shrink-0 rounded-xl object-cover" />
      ) : (
        <StayThumb stay={stay} size={56} className="size-14" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-body font-semibold">{stay.title}</p>
          {pending > 0 && <Badge>{t("new", { count: pending })}</Badge>}
          {waiting && <Badge>{t("pending")}</Badge>}
          {invited && <Badge>{t("invited")}</Badge>}
          {stay.status === "closed" && <Badge>{t("closed")}</Badge>}
          {stay.status === "draft" && <Badge>{tDraft("badge")}</Badge>}
        </div>
        <p className="truncate text-small text-muted">
          {f.placeName(stay)} · {f.shortRange(stay.startDate, stay.endDate)}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <AvatarStack users={getCrew(store, stay)} size="xs" />
          <Badge>{tDetail("badges.occupancy", { filled: stay.spotsFilled, total: stay.spotsTotal })}</Badge>
        </div>
      </div>
    </Link>
  );
}

/** The quiet next step under a section ("Open another House", "Find a House"): a tertiary link, level with the row text. */
function NextStep({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Button href={href} variant="tertiary" className="ml-2.5 mt-2 py-2">
      <Icon aria-hidden />
      {label}
    </Button>
  );
}

/** No hosted House yet: a card with the round + as illustration and "Open a House" as a secondary button. */
function OpenFirstHouseCard() {
  const t = useTranslations("houses.firstHouse");
  const tNav = useTranslations("nav");
  return (
    <div className={cn(cardClass, "mt-2 flex flex-col items-center text-center")}>
      <span className="flex size-12 items-center justify-center rounded-full bg-(--select-bg) text-ink">
        <Plus className="size-5" aria-hidden />
      </span>
      <p className="mt-4 font-semibold">
        {t.rich("title", { accent: (chunks) => <span className="text-ink">{chunks}</span> })}
      </p>
      <p className="mt-1 text-small text-muted">{t("description")}</p>
      <Button href="/create" variant="secondary" className="mt-5">
        {tNav("openHouse")}
      </Button>
    </div>
  );
}
