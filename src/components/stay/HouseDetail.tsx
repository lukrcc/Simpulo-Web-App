"use client";

import { ArrowRight, Check, ClipboardList, ExternalLink, Lock, MessageCircle, RotateCcw, Users, Vote, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { againHref } from "@/components/create/model";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { MyShare } from "@/components/payments/MyShare";
import { PaymentsSection } from "@/components/payments/PaymentsCard";
import { HostShareTools } from "@/components/share/HostShareTools";
import { Button } from "@/components/ui/ActionButton";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { ChipIndicator } from "@/components/ui/ChipIndicator";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Img } from "@/components/ui/Img";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { useViewerPriceLabel } from "@/components/ui/PriceLine";
import { SocialRow } from "@/components/ui/SocialRow";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StayThumb } from "@/components/ui/StayThumb";
import { useToast } from "@/components/ui/Toast";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useFormat } from "@/i18n/format";
import { openVote } from "@/lib/crewVotes";
import { paymentSplit } from "@/lib/fees";
import { crewThreadId, findUser, getCrew, getCrewThread, getInvited, getMyPayment, getPayments, isCrewMember, joinedAt, paymentProgress, paymentStatus, useStore } from "@/lib/store";
import type { JoinRequest, Stay, User } from "@/lib/types";
import { cn, housePhotos, openSpots } from "@/lib/utils";
import { CrewMenu } from "./CrewMenu";
import { DetailSection, ListRow } from "./DetailSection";
import { HostCard } from "./HostCard";
import { HostInvitesSection } from "./HouseInvites";
import { LockSheet } from "./LockSheet";
import { PaySheet } from "./PaySheet";

type HostTab = "overview" | "requests" | "crew" | "payments" | "share";
type GuestTab = "overview" | "crew" | "payment";
type Tab = HostTab | GuestTab;

/** A row that does something: only it gets a surface, and only on hover. */
const ROW_HOVER = "rounded-2xl transition-colors duration-150 hover:bg-(--chip-bg)";
/** Under the fixed head, inside the scrolling part: the rows' hover surfaces reach past the text without being cut off. */
const TAB_PANEL = "col-start-1 row-start-1 min-w-0 px-3 pb-6";
const TAB_FADE_MS = 200;

/**
 * Your houses, right column. No card and no white: everything lies on the page. The head stays, the tabs under it choose what fills the
 * rest (?tab=), and only that part scrolls. A House that's over has no tabs.
 */
export function HouseDetail({ stay }: { stay: Stay }) {
  const store = useStore();
  if (stay.status === "completed" && isCrewMember(store, stay, store.currentUserId)) return <PastHouse stay={stay} />;
  return stay.hostId === store.currentUserId ? <HouseManage stay={stay} /> : <JoinedHouse stay={stay} />;
}

/** The fixed head: thumbnail, title, "dates · place", status badges; right the page's actions with one primary. */
function HouseHead({ stay, badges, actions, menu }: { stay: Stay; badges?: ReactNode; actions?: ReactNode; menu?: ReactNode }) {
  const f = useFormat();
  const photo = housePhotos(stay)[0];
  return (
    <header className="flex flex-wrap items-start gap-x-6 gap-y-3 px-3">
      <div className="flex min-w-0 flex-1 basis-80 items-start gap-4">
        {photo ? <Img src={photo} alt="" width={56} height={56} className="size-14 shrink-0 rounded-[14px] object-cover" /> : <StayThumb stay={stay} size={56} className="size-14 rounded-[14px]" />}
        <div className="min-w-0">
          <h2 className="truncate text-h2 text-ink">{stay.title}</h2>
          <p className="mt-0.5 truncate text-body text-muted">
            {f.stayDatesLong(stay)} · {f.placeName(stay)}
          </p>
          {badges && <div className="mt-2 flex flex-wrap items-center gap-2">{badges}</div>}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-4">
        {actions}
        {menu}
      </div>
    </header>
  );
}

/** Where the House stands, one badge: Closed, Draft, Booked, Crew complete, or whether it's taking requests. */
function StatusLine({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.detail");
  const key =
    stay.status === "closed"
      ? "badges.closed"
      : stay.status === "draft"
        ? "badges.draft"
        : stay.status === "booked"
          ? "badges.booked"
          : stay.spotsFilled >= stay.spotsTotal
            ? "crewComplete"
            : stay.acceptingRequests
              ? "takingRequests"
              : "notTakingRequests";
  return <Badge>{t(key)}</Badge>;
}

/** ?tab=, without a trip to the server. Anything this role doesn't have is the first tab. */
function useTab<T extends Tab>(tabs: readonly T[]): [T, (tab: T) => void] {
  const param = useSearchParams().get("tab");
  const tab = tabs.find((t) => t === param) ?? tabs[0];
  const select = (next: T) => {
    const url = new URL(window.location.href);
    if (next === tabs[0]) url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    // Without state of its own: only then does Next take the change over into useSearchParams.
    window.history.replaceState(null, "", url.pathname + url.search);
  };
  return [tab, select];
}

/** The tabs as text chips with the sliding peach capsule, as on Explore. A tab's number sits in an accent dot. */
function TabRow<T extends Tab>({ tabs, value, onChange, counts }: { tabs: readonly T[]; value: T; onChange: (tab: T) => void; counts?: Partial<Record<Tab, number>> }) {
  const t = useTranslations("houses.tabs");
  const name = (tab: Tab) => t(tab);
  return (
    <div role="tablist" aria-label={t("label")} className="relative mt-4 flex shrink-0 flex-wrap items-center gap-1 px-3">
      <ChipIndicator />
      {tabs.map((tab) => {
        const count = counts?.[tab] ?? 0;
        return (
          <Chip
            key={tab}
            variant="text"
            role="tab"
            aria-selected={tab === value}
            active={tab === value}
            onClick={() => onChange(tab)}
            aria-label={count > 0 ? t("withCount", { label: name(tab), count }) : undefined}
            trailing={count > 0 ? <span aria-hidden className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-accent text-small text-white">{count}</span> : undefined}
          >
            {name(tab)}
          </Chip>
        );
      })}
    </div>
  );
}

/** What's under the tabs: the only part that scrolls. The old tab fades out while the new one fades in, 200ms. */
function TabPanels<T extends Tab>({ tab, render }: { tab: T; render: (tab: T) => ReactNode }) {
  const paneRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(tab);
  const [leaving, setLeaving] = useState<T | null>(null);
  if (tab !== current) {
    setLeaving(current);
    setCurrent(tab);
  }
  useEffect(() => {
    paneRef.current?.scrollTo({ top: 0 });
    if (leaving === null) return;
    const timer = window.setTimeout(() => setLeaving(null), TAB_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [current, leaving]);
  return (
    <div ref={paneRef} className="mt-5 split:scroll-pane split:min-h-0 split:flex-1">
      <div className="grid grid-cols-1">
        {(leaving === null ? [current] : [leaving, current]).map((panel) => (
          <div key={panel} role="tabpanel" inert={panel !== current} className={cn(TAB_PANEL, leaving !== null && (panel === current ? "animate-tab-in" : "animate-tab-out"))}>
            {render(panel)}
          </div>
        ))}
      </div>
    </div>
  );
}

function TabbedHouse({ head, tabs }: { head: ReactNode; tabs: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-col split:h-full">
      {head}
      {tabs}
    </div>
  );
}

// ─── Overview ──────────────────────────────────────────────────────────────────

interface Task {
  key: string;
  icon: LucideIcon;
  text: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
}

/** What there is to do, a sentence each: a click goes where it's done. Nothing to do: "All set", and what's next. */
function TaskList({ tasks, stay }: { tasks: Task[]; stay: Stay }) {
  const t = useTranslations("houses.overview");
  const [now] = useState(() => Date.now());
  if (tasks.length === 0) {
    const days = stay.startDate ? Math.ceil((Date.parse(stay.startDate) - now) / 86_400_000) : 0;
    return (
      <div>
        <p className="text-h2 text-ink">{t("allSet")}</p>
        {days > 0 && <p className="mt-1 text-body text-muted">{t("arrival", { count: days })}</p>}
      </div>
    );
  }
  const row = cn("-mx-3 flex min-h-14 items-center gap-3 px-3 py-2 text-left text-body text-ink", ROW_HOVER);
  return (
    <ul className="flex flex-col gap-1">
      {tasks.map(({ key, icon: Icon, text, onClick, href, external }) => {
        const content = (
          <>
            <Icon className="size-5 shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 flex-1">{text}</span>
            <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
          </>
        );
        return (
          <li key={key}>
            {href ? (
              <Link href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className={row}>
                {content}
              </Link>
            ) : (
              <button type="button" onClick={onClick} className={cn(row, "w-[calc(100%+24px)]")}>
                {content}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Label small and muted over the value. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-small text-muted">{label}</dt>
      <dd className="mt-0.5 text-body font-semibold text-ink">{children}</dd>
    </div>
  );
}

/** Under the tasks, compact: who's in, the price per person, and for the host the payout. */
function OverviewFacts({ stay, payout }: { stay: Stay; payout?: string }) {
  const t = useTranslations("houses.overview");
  const store = useStore();
  const price = useViewerPriceLabel(stay);
  return (
    <dl className="mt-(--space-inner) flex flex-wrap items-start gap-x-12 gap-y-4">
      <Fact label={t("crew")}>
        <span className="flex items-center gap-2">
          <AvatarStack users={getCrew(store, stay)} size="sm" max={5} linked />
          {t("crewIn", { filled: stay.spotsFilled, total: stay.spotsTotal })}
        </span>
      </Fact>
      <Fact label={t("price")}>{price}</Fact>
      {payout && <Fact label={t("payout")}>{payout}</Fact>}
    </dl>
  );
}

// ─── Hosted ────────────────────────────────────────────────────────────────────

const HOST_TABS: readonly HostTab[] = ["overview", "requests", "crew", "payments", "share"];
const DRAFT_TABS: readonly HostTab[] = ["overview", "requests", "crew", "payments"];

function HouseManage({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.detail");
  const tOverview = useTranslations("houses.overview");
  const f = useFormat();
  const store = useStore();
  const draft = stay.status === "draft";
  const open = stay.status === "published" || stay.status === "booked";
  const tabs = draft ? DRAFT_TABS : HOST_TABS;
  const [tab, setTab] = useTab(tabs);
  const [locking, setLocking] = useState(false);
  const requests = store.joinRequests.filter((r) => r.stayId === stay.id && r.status === "pending").toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  const chat = getCrewThread(store, stay.id) ? `/inbox/${crewThreadId(stay.id)}` : null;
  const full = stay.spotsFilled >= stay.spotsTotal;
  const locked = stay.accommodationStatus === "locked";
  const voting = openVote(stay, "accommodation");
  const progress = paymentProgress(store, stay.id);
  const payout = locked ? getPayments(store, stay.id).reduce((sum, p) => sum + paymentSplit(p.share, p.hostFee).hostReceives, 0) : 0;

  const tasks: Task[] = [
    ...(draft ? [{ key: "finish", icon: ClipboardList, text: tOverview("finish"), href: `/my-stays/${stay.id}/edit` }] : []),
    ...(requests.length > 0 ? [{ key: "requests", icon: Users, text: tOverview("requests", { count: requests.length }), onClick: () => setTab("requests") }] : []),
    ...(stay.paymentDueAt && progress.paidCount < progress.count
      ? [{ key: "payments", icon: Wallet, text: tOverview("paymentsOpen", { open: progress.count - progress.paidCount, count: progress.count, date: `${f.day(stay.paymentDueAt)}, ${f.time(stay.paymentDueAt)}` }), onClick: () => setTab("payments") }]
      : []),
    ...(voting && chat ? [{ key: "voting", icon: Vote, text: tOverview("voting"), href: chat }] : []),
    ...(open && full && !locked && !voting ? [{ key: "lock", icon: Lock, text: tOverview("choosePlace"), onClick: () => setLocking(true) }] : []),
    ...(stay.allPaidAt && !stay.bookingConfirmedAt ? [{ key: "book", icon: Lock, text: tOverview("bookPlace"), onClick: () => setTab("payments") }] : []),
    ...(open && full && !stay.crewGroupUrl ? [{ key: "group", icon: MessageCircle, text: tOverview("groupLink"), href: `/my-stays/${stay.id}/edit` }] : []),
  ];

  const primary = draft ? <Button href={`/my-stays/${stay.id}/edit`}>{t("next.finish")}</Button> : chat && stay.status !== "closed" ? <Button href={chat}>{t("next.openCrewChat")}</Button> : null;

  return (
    <TabbedHouse
      head={
        <HouseHead
          stay={stay}
          badges={<StatusLine stay={stay} />}
          menu={<CrewMenu stay={stay} afterLeaveHref="/my-stays" minimal />}
          actions={
            <>
              {/* The host sees the public page as a guest would (preview banner, nothing changes data). */}
              {!draft && (
                <Button variant="tertiary" href={`/house/${stay.slug}?preview=guest`}>
                  {t("viewPage")}
                </Button>
              )}
              {!draft && (
                <Button variant="secondary" href={`/my-stays/${stay.id}/edit`}>
                  {t("edit")}
                </Button>
              )}
              {primary}
            </>
          }
        />
      }
      tabs={
        <>
          <TabRow tabs={tabs} value={tab} onChange={setTab} counts={{ requests: requests.length }} />
          <TabPanels
            tab={tab}
            render={(panel) => {
              if (panel === "requests") return <RequestsTab stay={stay} requests={requests} />;
              if (panel === "crew") return (
                <>
                  <CrewRows stay={stay} manage />
                  {open && <HostInvitesSection stay={stay} />}
                </>
              );
              if (panel === "payments") return <PaymentsSection stay={stay} onLock={open && full ? () => setLocking(true) : undefined} />;
              if (panel === "share") return <div className="mx-auto w-full max-w-md"><HostShareTools stay={stay} /></div>;
              return (
                <>
                  <TaskList tasks={tasks} stay={stay} />
                  <OverviewFacts stay={stay} payout={locked ? f.price(payout, stay.currency) : undefined} />
                </>
              );
            }}
          />
          {locking && <LockSheet stay={stay} onClose={() => setLocking(false)} />}
        </>
      }
    />
  );
}

/** The open requests, the newest first. */
function RequestsTab({ stay, requests }: { stay: Stay; requests: JoinRequest[] }) {
  const t = useTranslations("houses.requests");
  const store = useStore();
  if (requests.length === 0) return <p className="text-body text-muted">{t("none")}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {requests.map((request) => {
        const applicant = findUser(store, request.userId);
        return applicant ? <RequestRow key={request.id} request={request} applicant={applicant} stay={stay} /> : null;
      })}
    </ul>
  );
}

/** Everyone in (avatar, name, country · joined, Paid / Pending); the host removes someone from the row's "…". */
function CrewRows({ stay, manage = false }: { stay: Stay; manage?: boolean }) {
  const t = useTranslations("houses.crew");
  const tDetail = useTranslations("houses.detail");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const [removing, setRemoving] = useState<User | null>(null);
  const crew = getCrew(store, stay);
  const invited = getInvited(store, stay.id);
  const locked = stay.accommodationStatus === "locked" && stay.pricePerPerson !== undefined;

  return (
    <>
      <ul>
        {crew.map((member) => {
          const isHost = member.id === stay.hostId;
          const joined = joinedAt(store, stay, member.id);
          return (
            <li key={member.id}>
              <ListRow
                lead={<Avatar user={member} size="md" linked />}
                title={
                  <span className="flex min-w-0 items-center gap-1">
                    <Link href={`/u/${member.id}`} className="truncate hover:underline">
                      {member.id === store.currentUserId ? t("you", { name: member.name }) : member.name}
                    </Link>
                    {member.verified && <VerifiedBadge />}
                  </span>
                }
                subtitle={`${member.country}${joined ? ` · ${t(isHost ? "opened" : "joined", { date: f.day(joined) })}` : ""}`}
                aside={
                  <>
                    {locked && stay.status !== "completed" && (stay.paymentDueAt || paymentStatus(store, stay.id, member.id) === "paid") && <StatusBadge status={paymentStatus(store, stay.id, member.id)} />}
                    {isHost && <Badge>{t("host")}</Badge>}
                  </>
                }
                action={manage && !isHost && <MoreMenu label={t("removeLabel", { name: member.name })} items={[{ label: tDetail("sections.remove"), danger: true, onSelect: () => setRemoving(member) }]} />}
              />
            </li>
          );
        })}
        {/* Invited from a past crew: not in yet, but their spot is held until they answer. */}
        {invited.map((person) => (
          <li key={person.id}>
            <ListRow
              lead={<Avatar user={person} size="md" linked className="opacity-60" />}
              title={
                <Link href={`/u/${person.id}`} className="text-muted hover:underline">
                  {person.name}
                </Link>
              }
              subtitle={t("invitedNote")}
              aside={<StatusBadge status="invited" />}
            />
          </li>
        ))}
      </ul>
      <ConfirmSheet
        open={removing !== null}
        title={t("removeTitle", { name: removing?.name.split(" ")[0] ?? "" })}
        description={t("removeDescription")}
        confirmLabel={t("removeConfirm")}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) {
            store.removeMember(stay.id, removing.id);
            showToast(t("removedToast", { name: removing.name.split(" ")[0] }));
          }
          setRemoving(null);
        }}
      />
    </>
  );
}

/** A request: the person, their socials and message; Accept (primary), Reply (secondary), Decline (tertiary). */
function RequestRow({ request, applicant, stay }: { request: JoinRequest; applicant: User; stay: Stay }) {
  const t = useTranslations("houses.requests");
  const f = useFormat();
  const { acceptRequest, declineRequest, openDirectThread } = useStore();
  const requireAuth = useRequireAuth();
  const router = useRouter();
  const showToast = useToast();
  const firstName = applicant.name.split(" ")[0];
  // Spots held by open invites count as taken – a full crew can't take anyone else.
  const isFull = openSpots(stay) === 0;

  function reply() {
    requireAuth(
      (userId) => router.push(`/inbox/${openDirectThread(stay.id, applicant.id, userId)}`),
      t("loginToMessage", { name: firstName }),
    );
  }

  return (
    <li className={cn("-mx-3 flex gap-3 p-3", ROW_HOVER)}>
      <Avatar user={applicant} size="md" linked />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1 text-body font-semibold text-ink">
          <Link href={`/u/${applicant.id}`} className="truncate hover:underline">
            {applicant.name}
          </Link>
          {applicant.verified && <VerifiedBadge />}
        </p>
        <p className="text-small text-muted">
          {f.ageAndCountry(applicant)} · {f.day(request.createdAt)}
          {applicant.photos.length === 0 && ` · ${t("noPhoto")}`}
        </p>
        <SocialRow user={applicant} size="sm" className="mt-1 empty:hidden" />
        {request.message.trim() && <p className="mt-2 max-w-[640px] text-body text-ink">{request.message}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {!isFull && (
            <Button
              onClick={() => {
                acceptRequest(request.id);
                showToast(t("acceptedToast", { name: firstName }));
              }}
            >
              {t("accept")}
            </Button>
          )}
          <Button variant="secondary" onClick={reply}>
            {t("reply")}
          </Button>
          <Button
            variant="tertiary"
            onClick={() => {
              declineRequest(request.id);
              showToast(t("declinedToast", { name: firstName }));
            }}
          >
            {t("decline")}
          </Button>
        </div>
      </div>
    </li>
  );
}

// ─── Joined ────────────────────────────────────────────────────────────────────

const GUEST_TABS: readonly GuestTab[] = ["overview", "crew", "payment"];

function JoinedHouse({ stay }: { stay: Stay }) {
  const t = useTranslations("houses");
  const tOverview = useTranslations("houses.overview");
  const tSection = useTranslations("houses.detail.sections");
  const tNext = useTranslations("houses.detail.next");
  const f = useFormat();
  const store = useStore();
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const host = findUser(store, stay.hostId);
  const showToast = useToast();
  const [tab, setTab] = useTab(GUEST_TABS);
  const [paying, setPaying] = useState(false);
  const request = store.joinRequests.findLast((r) => r.stayId === stay.id && r.userId === store.currentUserId);
  const accepted = request?.status === "accepted";
  const invited = request?.status === "invited";
  const hostName = host?.name.split(" ")[0] ?? "";
  const payment = getMyPayment(store, stay.id);
  const owes = accepted && stay.accommodationStatus === "locked" && payment?.status === "pending" && Boolean(stay.paymentDueAt);
  const crewGroup = accepted && stay.crewGroupUrl && stay.spotsFilled >= stay.spotsTotal ? stay.crewGroupUrl : null;
  const chat = accepted ? `/inbox/${crewThreadId(stay.id)}` : null;

  function respond(accept: boolean) {
    store.respondToInvite(stay.id, accept);
    showToast(accept ? t("invite.acceptedToast", { title: stay.title }) : t("invite.declinedToast"));
  }

  function messageHost() {
    requireAuth((userId) => router.push(`/inbox/${store.openDirectThread(stay.id, stay.hostId, userId)}`));
  }

  const tasks: Task[] = [
    ...(owes && stay.paymentDueAt ? [{ key: "pay", icon: Wallet, text: tOverview("yourShareDue", { date: `${f.day(stay.paymentDueAt)}, ${f.time(stay.paymentDueAt)}` }), onClick: () => setTab("payment") }] : []),
    ...(accepted && chat && openVote(stay, "accommodation") ? [{ key: "voting", icon: Vote, text: tOverview("voting"), href: chat }] : []),
    ...(crewGroup ? [{ key: "group", icon: ExternalLink, text: tNext("openCrewGroup"), href: crewGroup, external: true }] : []),
  ];

  // One primary – the next step: answer the invite, pay the share, else the crew chat.
  const next = invited ? (
    <>
      <Button variant="secondary" onClick={() => respond(false)}>
        {t("invite.decline")}
      </Button>
      <Button onClick={() => respond(true)}>{t("invite.accept")}</Button>
    </>
  ) : owes ? (
    <Button onClick={() => setPaying(true)}>{tNext("payNow")}</Button>
  ) : chat ? (
    <Button href={chat}>{tNext("openCrewChat")}</Button>
  ) : null;

  return (
    <TabbedHouse
      head={
        <HouseHead
          stay={stay}
          menu={accepted && <CrewMenu stay={stay} afterLeaveHref="/my-stays" minimal />}
          badges={
            <>
              {request && <StatusBadge status={request.status} />}
              <StatusLine stay={stay} />
              {request?.status === "pending" && <span className="text-small text-muted">{host ? t("joined.waiting", { name: hostName }) : t("joined.waitingForHost")}</span>}
            </>
          }
          actions={
            <>
              <Button variant="tertiary" href={`/house/${stay.slug}`}>
                {t("detail.viewPage")}
              </Button>
              {next}
            </>
          }
        />
      }
      tabs={
        <>
          <TabRow tabs={GUEST_TABS} value={tab} onChange={setTab} />
          <TabPanels
            tab={tab}
            render={(panel) => {
              if (panel === "crew") return <CrewRows stay={stay} />;
              if (panel === "payment")
                return (
                  <div className="max-w-[640px]">
                    {stay.accommodationStatus === "locked" && (owes || payment?.status === "paid") ? <MyShare stay={stay} variant="panel" /> : <p className="text-body text-muted">{tSection("notLockedGuest")}</p>}
                    <p className="mt-2 text-small text-muted">{tSection("refundNote")}</p>
                  </div>
                );
              return (
                <>
                  {request?.status === "pending" ? <p className="text-body text-muted">{host ? t("joined.waiting", { name: hostName }) : t("joined.waitingForHost")}</p> : <TaskList tasks={tasks} stay={stay} />}
                  <OverviewFacts stay={stay} />
                  {host && (
                    <div className="mt-(--space-inner)">
                      <HostCard
                        host={host}
                        action={
                          <Button variant="secondary" onClick={messageHost}>
                            <MessageCircle aria-hidden />
                            {tSection("messageHost", { name: hostName })}
                          </Button>
                        }
                      />
                    </div>
                  )}
                </>
              );
            }}
          />
          <PaySheet stay={stay} open={paying} onClose={() => setPaying(false)} />
        </>
      }
    />
  );
}

// ─── Past ──────────────────────────────────────────────────────────────────────

/** A completed House, for everyone who lived in it (host included): Crew → Open again with this crew → Summary. */
function PastHouse({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.past");
  const tSection = useTranslations("houses.detail.sections");
  const f = useFormat();
  const store = useStore();
  const payment = getMyPayment(store, stay.id);
  const paid = payment?.status === "paid" ? f.price(payment.total, stay.currency) : tSection("summaryNothing");

  return (
    <TabbedHouse
      head={<HouseHead
        stay={stay}
        badges={<Badge icon={<Check aria-hidden />}>{t("badge")}</Badge>}
        actions={
          <Button variant="secondary" href={`/house/${stay.slug}`}>
            {t("viewPage")}
          </Button>
        }
      />}
      tabs={<div className="mt-5 px-3 pb-6 split:scroll-pane split:min-h-0 split:flex-1">
        <CrewRows stay={stay} />
        {/* Same place, vibe and spots – the crew invited as the House is opened (see againHref / createStay). */}
        <DetailSection
          title={tSection("openAgain")}
          action={
            <Button variant="secondary" href={againHref(stay.id)}>
              <RotateCcw aria-hidden />
              {tSection("openAgainAction")}
            </Button>
          }
        >
          <p className="text-body text-muted">{tSection("openAgainText")}</p>
        </DetailSection>
        <DetailSection title={tSection("summary")}>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-body">
            <dt className="text-small leading-[22px] text-muted">{tSection("summaryDates")}</dt>
            <dd className="text-ink">{f.stayDatesLong(stay)}</dd>
            <dt className="text-small leading-[22px] text-muted">{tSection("summaryPlace")}</dt>
            <dd className="text-ink">{f.placeName(stay)}</dd>
            <dt className="text-small leading-[22px] text-muted">{tSection("summaryPaid")}</dt>
            <dd className="tabular-nums text-ink">{paid}</dd>
          </dl>
        </DetailSection>
      </div>}
    />
  );
}
