"use client";

import { CalendarPlus, Check, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { REQUEST_POLICY } from "@/config/policies";
import { hoursLeft } from "@/lib/requests";
import { useNow } from "@/lib/useNow";
import { againHref } from "@/components/create/model";
import { MyShare } from "@/components/payments/MyShare";
import { Receipt } from "@/components/payments/Receipt";
import { HelpButton, helpAvailable } from "@/components/help/HelpSheet";
import { ConfirmPopover } from "@/components/ui/ConfirmPopover";
import { downloadIcs } from "@/lib/ics";
import { RefundNotice } from "@/components/payments/Refund";
import { PaymentsSection } from "@/components/payments/PaymentsCard";
import { HostShareTools } from "@/components/share/HostShareTools";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { ChipIndicator } from "@/components/ui/ChipIndicator";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Img } from "@/components/ui/Img";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { SocialRow } from "@/components/ui/SocialRow";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StayThumb } from "@/components/ui/StayThumb";
import { useToast } from "@/components/ui/Toast";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useFormat } from "@/i18n/format";
import { crewThreadId, findUser, getCrew, getCrewThread, getInvited, getMyPayment, isCrewMember, joinedAt, paymentStatus, useStore } from "@/lib/store";
import type { JoinRequest, Stay, User } from "@/lib/types";
import { cn, housePhotos, openSpots } from "@/lib/utils";
import { CrewMenu } from "./CrewMenu";
import { DetailSection, ListRow } from "./DetailSection";
import { GuestProgress, HostProgress } from "./HouseProgress";
import { hasOffer, waitlistOf, waitlistRequestsOf } from "@/lib/waitlist";
import { HostInvitesSection } from "./HouseInvites";
import { LockSheet } from "./LockSheet";
import { PaySheet } from "./PaySheet";

type HostTab = "requests" | "crew" | "payments" | "share";
type GuestTab = "crew" | "payment";
type Tab = HostTab | GuestTab;

/** A row that does something: only it gets a surface, and only on hover. */
const ROW_HOVER = "rounded-2xl transition-colors duration-150 hover:bg-(--chip-bg)";
/** Under the fixed head, inside the scrolling part: the rows' hover surfaces reach past the text without being cut off. */
const TAB_PANEL = "col-start-1 row-start-1 min-w-0 px-3";
const TAB_FADE_MS = 200;

/**
 * Your houses › one House (/your-houses/[id]). No card and no white: everything lies on the page. The head, then where it stands as a
 * stepper with the next task, then the tabs (?tab=). The page scrolls as a whole. A House that's over has no tabs.
 */
export function HouseDetail({ stay }: { stay: Stay }) {
  const store = useStore();
  if (stay.status === "completed" && isCrewMember(store, stay, store.currentUserId)) return <PastHouse stay={stay} />;
  return stay.hostId === store.currentUserId ? <HouseManage stay={stay} /> : <JoinedHouse stay={stay} />;
}

/** The fixed head, on one centre line: thumbnail, title, "dates · place" with the status as a small capsule; right the page's actions with one primary. */
function HouseHead({ stay, badges, actions, menu }: { stay: Stay; badges?: ReactNode; actions?: ReactNode; menu?: ReactNode }) {
  const f = useFormat();
  const photo = housePhotos(stay)[0];
  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-3 px-3">
      <div className="flex min-w-0 flex-1 basis-80 items-center gap-4">
        {photo ? <Img src={photo} alt="" width={56} height={56} className="size-14 shrink-0 rounded-[14px] object-cover" /> : <StayThumb stay={stay} size={56} className="size-14 rounded-[14px]" />}
        <div className="min-w-0">
          <h2 className="truncate text-h2 text-ink">{stay.title}</h2>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-body text-muted [&>span:not(:first-child)]:bg-ink/6">
            <span className="truncate">
              {f.stayDatesLong(stay)} · {f.placeName(stay)}
            </span>
            {badges}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {actions}
        {menu}
      </div>
    </header>
  );
}

/** Where the House stands, one badge: Closed, Draft, Booked, Crew complete, or whether it's taking requests. */
export function StatusLine({ stay, className }: { stay: Stay; className?: string }) {
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
  return <Badge className={className}>{t(key)}</Badge>;
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

/** The tabs as text chips with the one sliding capsule: only the chosen tab has a surface (none on hover). A tab's number sits in an accent dot. */
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
            hoverSurface={false}
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

/** What's under the tabs. The old tab fades out while the new one fades in, 200ms. */
function TabPanels<T extends Tab>({ tab, render }: { tab: T; render: (tab: T) => ReactNode }) {
  const [current, setCurrent] = useState(tab);
  const [leaving, setLeaving] = useState<T | null>(null);
  if (tab !== current) {
    setLeaving(current);
    setCurrent(tab);
  }
  useEffect(() => {
    if (leaving === null) return;
    const timer = window.setTimeout(() => setLeaving(null), TAB_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [current, leaving]);
  return (
    <div className="mt-5 grid grid-cols-1">
      {(leaving === null ? [current] : [leaving, current]).map((panel) => (
        <div key={panel} role="tabpanel" inert={panel !== current} className={cn(TAB_PANEL, leaving !== null && (panel === current ? "animate-tab-in" : "animate-tab-out"))}>
          {render(panel)}
        </div>
      ))}
    </div>
  );
}

/** Head, the stepper (with --space-section around it), then the tabs. */
function TabbedHouse({ head, progress, tabs }: { head: ReactNode; progress?: ReactNode; tabs: ReactNode }) {
  return (
    <div className="flex flex-col">
      {head}
      {progress && <div className="mt-12 px-3">{progress}</div>}
      <div className={progress ? "mt-14" : "mt-8"}>{tabs}</div>
    </div>
  );
}

/**
 * In the head, when it's time: "Add to calendar" once the booking is confirmed (.ics), "Something went wrong" from three days before arrival
 * until the day after it ends.
 */
function StayExtras({ stay }: { stay: Stay }) {
  const t = useTranslations("calendar");
  const [now] = useState(() => Date.now());
  return (
    <>
      {stay.bookingConfirmedAt && (
        <Button variant="tertiary" size="sm" onClick={() => downloadIcs(stay)}>
          <CalendarPlus aria-hidden />
          {t("add")}
        </Button>
      )}
      {helpAvailable(stay, now) && <HelpButton stay={stay} />}
    </>
  );
}

// ─── Hosted ────────────────────────────────────────────────────────────────────

const HOST_TABS: readonly HostTab[] = ["requests", "crew", "payments", "share"];
const DRAFT_TABS: readonly HostTab[] = ["requests", "crew", "payments"];

function HouseManage({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.detail");
  const store = useStore();
  const draft = stay.status === "draft";
  const open = stay.status === "published" || stay.status === "booked";
  const tabs = draft ? DRAFT_TABS : HOST_TABS;
  const [tab, setTab] = useTab(tabs);
  const [locking, setLocking] = useState(false);
  const { requests, waitlistRequests } = openRequestsOf(store, stay);
  const chat = getCrewThread(store, stay.id) ? `/messages/${crewThreadId(stay.id)}` : null;
  const full = stay.spotsFilled >= stay.spotsTotal;

  const primary = draft ? <Button size="sm" href={`/your-houses/${stay.id}/edit`}>{t("next.finish")}</Button> : chat && stay.status !== "closed" ? <Button size="sm" href={chat}>{t("next.openCrewChat")}</Button> : null;

  return (
    <TabbedHouse
      head={
        <HouseHead
          stay={stay}
          badges={<StatusLine stay={stay} />}
          menu={<CrewMenu stay={stay} afterLeaveHref="/your-houses" minimal />}
          actions={
            <>
              {/* The host sees the public page as a guest would (preview banner, nothing changes data). */}
              {!draft && (
                <Button variant="tertiary" size="sm" href={`/house/${stay.slug}?preview=guest`}>
                  {t("viewPage")}
                </Button>
              )}
              {!draft && (
                <Button variant="secondary" size="sm" href={`/your-houses/${stay.id}/edit`}>
                  {t("edit")}
                </Button>
              )}
              <StayExtras stay={stay} />
              {primary}
            </>
          }
        />
      }
      progress={<HostProgress stay={stay} requests={requests} chat={chat} onTab={setTab} onLock={() => setLocking(true)} />}
      tabs={
        <>
          <TabRow tabs={tabs} value={tab} onChange={setTab} counts={{ requests: requests.length + waitlistRequests.length }} />
          <TabPanels
            tab={tab}
            render={(panel) => {
              if (panel === "requests") return <RequestsTab stay={stay} requests={requests} waitlistRequests={waitlistRequests} />;
              if (panel === "crew") return (
                <>
                  <CrewRows stay={stay} manage />
                  <WaitlistRows stay={stay} />
                  {open && <HostInvitesSection stay={stay} />}
                </>
              );
              if (panel === "payments") return <PaymentsSection stay={stay} onLock={open && full ? () => setLocking(true) : undefined} />;
              return <div className="mx-auto w-full max-w-md"><HostShareTools stay={stay} /></div>;
            }}
          />
          {locking && <LockSheet stay={stay} onClose={() => setLocking(false)} />}
        </>
      }
    />
  );
}

/** A House's open requests: verified guests first (they put their ID behind it), then whichever expires first (the oldest); the waitlist's apart. */
function openRequestsOf(store: ReturnType<typeof useStore>, stay: Stay) {
  const verified = (userId: string) => Boolean(findUser(store, userId)?.verified);
  const requests = store.joinRequests
    .filter((r) => r.stayId === stay.id && r.status === "pending")
    .toSorted((a, b) => Number(verified(b.userId)) - Number(verified(a.userId)) || a.createdAt.localeCompare(b.createdAt));
  return { requests, waitlistRequests: waitlistRequestsOf(store, stay.id) };
}

/** One House's open requests, exactly as on its Requests tab – for the sheet behind "Review" on Your houses. */
export function HouseRequests({ stay }: { stay: Stay }) {
  const store = useStore();
  const { requests, waitlistRequests } = openRequestsOf(store, stay);
  return <RequestsTab stay={stay} requests={requests} waitlistRequests={waitlistRequests} />;
}

/** The open requests, the newest first; under "Waitlist", separately, who asked to wait for a spot (oldest first – that's their order). */
function RequestsTab({ stay, requests, waitlistRequests }: { stay: Stay; requests: JoinRequest[]; waitlistRequests: JoinRequest[] }) {
  const t = useTranslations("houses.requests");
  const store = useStore();
  if (requests.length === 0 && waitlistRequests.length === 0) return <p className="text-body text-muted">{t("none")}</p>;
  const rows = (list: JoinRequest[]) => (
    <ul className="flex flex-col gap-2">
      {list.map((request) => {
        const applicant = findUser(store, request.userId);
        return applicant ? <RequestRow key={request.id} request={request} applicant={applicant} stay={stay} /> : null;
      })}
    </ul>
  );
  return (
    <div className="flex flex-col gap-8">
      {requests.length > 0 && (
        <section>
          {waitlistRequests.length > 0 && <p className="mb-2 text-eyebrow uppercase text-ink/55">{t("joinRequests")}</p>}
          {rows(requests)}
        </section>
      )}
      {waitlistRequests.length > 0 && (
        <section>
          <p className="mb-2 text-eyebrow uppercase text-ink/55">{t("waitlist")}</p>
          {rows(waitlistRequests)}
        </section>
      )}
    </div>
  );
}

/** The waitlist in its order (#1 first); a running offer says until when; the host takes someone off from the row's "…". */
function WaitlistRows({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.crew");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const [now] = useState(() => new Date().toISOString());
  const list = waitlistOf(store, stay.id);
  if (list.length === 0) return null;
  return (
    <section className="mt-8">
      <p className="mb-2 px-3 text-eyebrow uppercase text-ink/55">{t("waitlist")}</p>
      <ol>
        {list.map((request, i) => {
          const person = findUser(store, request.userId);
          if (!person) return null;
          const offered = hasOffer(request, now) && request.offerExpiresAt;
          return (
            <li key={request.id}>
              <ListRow
                lead={
                  <span className="flex items-center gap-3">
                    <span className="w-5 text-right text-body font-semibold tabular-nums text-muted">{i + 1}</span>
                    <Avatar user={person} size="md" linked />
                  </span>
                }
                title={
                  <Link href={`/u/${person.id}`} className="truncate hover:underline">
                    {person.name}
                  </Link>
                }
                subtitle={offered ? t("waitlistOffered", { time: `${f.day(offered)} ${f.time(offered)}` }) : `${person.country} · ${t("waitlistAsked", { date: f.day(request.createdAt) })}`}
                action={
                  <MoreMenu
                    label={t("waitlistRemoveLabel", { name: person.name })}
                    items={[
                      {
                        label: t("waitlistRemove"),
                        danger: true,
                        onSelect: () => {
                          store.removeFromWaitlist(request.id);
                          showToast(t("waitlistRemovedToast", { name: person.name.split(" ")[0] }));
                        },
                      },
                    ]}
                  />
                }
              />
            </li>
          );
        })}
      </ol>
    </section>
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

/**
 * A request: the person, their socials and message, how long it still waits ("Expires in 31h", ink under 12h); two buttons: Accept (primary)
 * and "Not a fit" (tertiary) – no reason, no confirmation, a toast "Declined · Undo" for 5s instead. Waitlist requests don't expire.
 */
function RequestRow({ request, applicant, stay }: { request: JoinRequest; applicant: User; stay: Stay }) {
  const t = useTranslations("houses.requests");
  const f = useFormat();
  const { acceptRequest, declineRequest, undoDecline } = useStore();
  const showToast = useToast();
  const firstName = applicant.name.split(" ")[0];
  // Spots held by open invites count as taken – a full crew can't take anyone else.
  const waitlist = request.status === "waitlist_requested";
  const isFull = !waitlist && openSpots(stay) === 0;
  const now = useNow();
  const left = !waitlist && now !== null ? hoursLeft(request, now) : null;

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
                showToast(t(waitlist ? "waitlistedToast" : "acceptedToast", { name: firstName }));
              }}
            >
              {t("accept")}
            </Button>
          )}
          <Button
            variant="tertiary"
            onClick={() => {
              declineRequest(request.id);
              showToast(t("declinedToast"), "done", undefined, { ms: UNDO_MS, action: { label: t("undo"), onClick: () => undoDecline(request.id) } });
            }}
          >
            {t("notAFit")}
          </Button>
        </div>
        {left !== null && <p className={cn("mt-2 text-small", left < REQUEST_POLICY.urgentHours ? "text-ink" : "text-muted")}>{t("expiresIn", { hours: left })}</p>}
      </div>
    </li>
  );
}

/** "Declined · Undo" stays this long. */
const UNDO_MS = 5000;


// ─── Joined ────────────────────────────────────────────────────────────────────

const GUEST_TABS: readonly GuestTab[] = ["crew", "payment"];

function JoinedHouse({ stay }: { stay: Stay }) {
  const t = useTranslations("houses");
  const tWithdraw = useTranslations("withdraw");
  const tSection = useTranslations("houses.detail.sections");
  const tNext = useTranslations("houses.detail.next");
  const store = useStore();
  const host = findUser(store, stay.hostId);
  const showToast = useToast();
  const [tab, setTab] = useTab(GUEST_TABS);
  const [paying, setPaying] = useState(false);
  const request = store.joinRequests.findLast((r) => r.stayId === stay.id && r.userId === store.currentUserId);
  const accepted = request?.status === "accepted";
  const invited = request?.status === "invited";
  const hostName = host?.name.split(" ")[0] ?? "";
  const payment = getMyPayment(store, stay.id);
  // Refunded (the booking wasn't confirmed, the spot went to the waitlist, or left): "Refund of €410 on its way · 5–10 days".
  const refunded = !payment ? store.payments.findLast((p) => p.stayId === stay.id && p.userId === store.currentUserId && p.status === "refunded") : undefined;
  const owes = accepted && stay.accommodationStatus === "locked" && payment?.status === "pending" && Boolean(stay.paymentDueAt);
  const chat = accepted ? `/messages/${crewThreadId(stay.id)}` : null;

  function respond(accept: boolean) {
    store.respondToInvite(stay.id, accept);
    showToast(accept ? t("invite.acceptedToast", { title: stay.title }) : t("invite.declinedToast"));
  }

  // One primary – the next step: answer the invite, pay the share, else the crew chat.
  const next = invited ? (
    <>
      <Button variant="secondary" size="sm" onClick={() => respond(false)}>
        {t("invite.decline")}
      </Button>
      <Button size="sm" onClick={() => respond(true)}>{t("invite.accept")}</Button>
    </>
  ) : owes ? (
    <Button size="sm" onClick={() => setPaying(true)}>{tNext("payNow")}</Button>
  ) : chat ? (
    <Button size="sm" href={chat}>{tNext("openCrewChat")}</Button>
  ) : null;

  return (
    <TabbedHouse
      head={
        <HouseHead
          stay={stay}
          menu={accepted && <CrewMenu stay={stay} afterLeaveHref="/your-houses" minimal />}
          badges={
            <>
              {request && <StatusBadge status={request.status} />}
              <StatusLine stay={stay} />
            </>
          }
          actions={
            <>
              <Button variant="tertiary" size="sm" href={`/house/${stay.slug}`}>
                {t("detail.viewPage")}
              </Button>
              {(request?.status === "pending" || request?.status === "waitlist_requested") && (
                <ConfirmPopover
                  trigger={tWithdraw(request.status === "pending" ? "action" : "waitlistAction")}
                  title={tWithdraw(request.status === "pending" ? "title" : "waitlistTitle")}
                  text={tWithdraw("text")}
                  confirmLabel={tWithdraw("confirm")}
                  cancelLabel={tWithdraw("keep")}
                  onConfirm={() => {
                    store.withdrawRequest(stay.id);
                    showToast(tWithdraw("toast"));
                  }}
                  triggerClassName="px-2 text-body"
                />
              )}
              {accepted && <StayExtras stay={stay} />}
              {next}
            </>
          }
        />
      }
      progress={<GuestProgress stay={stay} request={request} hostName={hostName} onPay={owes ? () => setPaying(true) : undefined} chat={chat} />}
      tabs={
        <>
          <TabRow tabs={GUEST_TABS} value={tab} onChange={setTab} />
          <TabPanels
            tab={tab}
            render={(panel) => {
              if (panel === "crew") return <CrewRows stay={stay} />;
              return (
                  <div className="max-w-[640px]">
                    {refunded ? (
                      <RefundNotice payment={refunded} currency={stay.currency} reason={refunded.refundedAmount !== undefined ? "spot_transferred" : stay.status === "closed" ? "host_cancelled" : stay.accommodationStatus !== "locked" ? "booking_not_confirmed" : "cancelled"} />
                    ) : stay.accommodationStatus === "locked" && (owes || payment?.status === "paid") ? (
                      <div className="flex flex-col gap-6">
                        <MyShare stay={stay} variant="panel" />
                        {payment?.status === "paid" && <Receipt stay={stay} payment={payment} />}
                      </div>
                    ) : (
                      <p className="text-body text-muted">{tSection("notLockedGuest")}</p>
                    )}
                    <p className="mt-4 text-small text-muted">{tSection("refundNote")}</p>
                  </div>
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
      tabs={<div className="px-3">
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
