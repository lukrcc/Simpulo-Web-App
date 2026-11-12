"use client";

import { knownThrough } from "@/lib/yourPeople";
import { Check, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { REQUEST_POLICY } from "@/config/policies";
import { hoursLeft } from "@/lib/requests";
import { useNow } from "@/lib/useNow";
import { againHref } from "@/components/create/model";
import { MyShare } from "@/components/payments/MyShare";
import { Receipt } from "@/components/payments/Receipt";
import { HelpButton, helpAvailable } from "@/components/help/HelpSheet";
import { RefundNotice } from "@/components/payments/Refund";
import { PaymentsSection } from "@/components/payments/PaymentsCard";
import { HostShareTools } from "@/components/share/HostShareTools";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { ALL_PLACES } from "@/lib/data/places";
import { linkDomain } from "@/lib/links";
import { hostOverlapOf } from "@/lib/overlap";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Img } from "@/components/ui/Img";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { Sheet } from "@/components/ui/Sheet";
import { SocialLinks } from "@/components/SocialLinks";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useFormat } from "@/i18n/format";
import { crewInOf, crewThreadId, findUser, getCrew, getCrewThread, getInvited, getMyPayment, isCrewMember, joinedAt, paymentStatus, useStore } from "@/lib/store";
import type { JoinRequest, Stay, User } from "@/lib/types";
import { cn, housePhotos, openSpots } from "@/lib/utils";
import { CrewMenu } from "./CrewMenu";
import { ListRow } from "./DetailSection";
import { GuestProgress, HostProgress } from "./HouseProgress";
import { hasOffer, waitlistOf, waitlistRequestsOf } from "@/lib/waitlist";
import { HostInvitesSection } from "./HouseInvites";
import { LockSheet } from "./LockSheet";
import { PaySheet } from "./PaySheet";

/** A row that does something: only it gets a surface, and only on hover. */
const ROW_HOVER = "rounded-2xl transition-colors duration-150 hover:bg-(--chip-bg)";
/** An outline button ("View page", "Do it again"): no fill, a 1.5px ink edge. */
const OUTLINE = (size: "sm" | "md") => cn(buttonStyles("secondary", size), "border-[1.5px] border-ink bg-transparent shadow-none");

/** What's behind the capsules under the step's card. */
type SheetKey = "requests" | "crew" | "chat" | "details";

/** Where a link pointed the page (?focus=, see manageHref): pay opens the pay sheet; the rest open the sheet that holds it. */
type Focus = "pay" | "requests" | "invite" | "booking" | "chat";
const FOCI: readonly Focus[] = ["pay", "requests", "invite", "booking", "chat"];
const sheetOfFocus: Record<Exclude<Focus, "pay">, SheetKey | null> = { requests: "requests", invite: null, booking: "details", chat: "chat" };

/** Reads ?focus= once the page is there and acts on it: `onPay` for "pay", else opens the sheet that holds it ("invite" is the step's card). */
function useHouseFocus(openSheet: (sheet: SheetKey) => void, onPay?: () => void) {
  const param = useSearchParams().get("focus");
  const focus = FOCI.find((f) => f === param) ?? null;
  useEffect(() => {
    if (!focus) return;
    if (focus === "pay") {
      onPay?.();
      return;
    }
    const sheet = sheetOfFocus[focus];
    if (sheet) openSheet(sheet);
    // Once per focus in the URL – a later change of the callbacks mustn't open anything again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);
}

/**
 * Your houses › one House (/your-houses/[id]) – functional, not decorative (host and guest alike). A compact head (72px: the photo 56px,
 * title, dates · place; right the status, "View page" and "…"), the stepper on one line, ONE card for the current step, and under it the
 * capsules "Crew · Chat · Details" (the host's with "Requests" first) – everything else lives in their sheets. One narrow column (720px).
 */
export function HouseDetail({ stay }: { stay: Stay }) {
  const store = useStore();
  if (stay.status === "completed" && isCrewMember(store, stay, store.currentUserId)) return <PastHouse stay={stay} />;
  return stay.hostId === store.currentUserId ? <HouseManage stay={stay} /> : <JoinedHouse stay={stay} />;
}

/** The head: the square photo (56px, radius 12px), title (20px semibold) and "Dec 6–20 · Bangkok" muted; right the status, "View page", "…". */
function HouseHead({ stay, status, actions, eyebrow }: { stay: Stay; status?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  const f = useFormat();
  const store = useStore();
  const photo = housePhotos(stay, findUser(store, stay.hostId))[0];
  return (
    <header className="flex min-h-18 items-center gap-4">
      <span className="relative block size-14 shrink-0 overflow-hidden rounded-xl bg-ink/6">{photo && <Img src={photo} alt="" fill sizes="56px" priority className="object-cover" />}</span>
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="text-eyebrow uppercase text-ink/55">{eyebrow}</p>}
        <h1 className="truncate text-h3 text-ink">{stay.title}</h1>
        <p className="truncate text-body text-muted">
          {f.stayDates(stay)} · {stay.location?.city ?? stay.city}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {status}
        {actions}
      </div>
    </header>
  );
}

/** "View page": an outline button. */
function ViewPageLink({ href }: { href: string }) {
  const t = useTranslations("houses.view");
  return (
    <Link href={href} className={OUTLINE("sm")}>
      {t("viewPage")}
    </Link>
  );
}

/** One capsule under the step's card: its word and a number; an unread count as a small orange circle. */
function Capsule({ label, count, unread, onClick }: { label: string; count?: number; unread?: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press inline-flex h-10 items-center gap-2 rounded-full border border-ink/12 px-4 text-nav-main text-ink/80 transition-colors duration-150 hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
    >
      {label}
      {count !== undefined && <span className="tabular-nums text-muted">{count}</span>}
      {unread !== undefined && unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-eyebrow leading-none tracking-normal text-on-signal tabular-nums">{unread}</span>}
    </button>
  );
}

/** The page's frame: the head, a note (overlapping Houses), the stepper and its card, the capsules – one column of 720px. */
function HouseFrame({ head, note, children, capsules }: { head: ReactNode; note?: ReactNode; children: ReactNode; capsules?: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      {head}
      {note && <p className="-mt-3 text-small text-muted">{note}</p>}
      {children}
      {capsules && <div className="flex flex-wrap gap-2">{capsules}</div>}
    </div>
  );
}

/** Unread messages in the crew's chat. */
function useChatUnread(stay: Stay): number {
  const store = useStore();
  const thread = getCrewThread(store, stay.id);
  if (!thread || !store.currentUserId) return 0;
  const readAt = store.lastReadAt[thread.id];
  return thread.messages.filter((m) => m.senderId !== store.currentUserId && m.senderId !== "system" && (!readAt || m.createdAt > readAt)).length;
}

/** The crew's chat in a sheet: its last messages and "Open chat". */
function ChatBody({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.view");
  const f = useFormat();
  const store = useStore();
  const thread = getCrewThread(store, stay.id);
  const last = (thread?.messages ?? []).filter((m) => m.senderId !== "system" && m.text.trim() !== "").slice(-8);
  return (
    <div className="flex flex-col gap-6">
      {last.length === 0 ? (
        <p className="text-body text-muted">{t("chatEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {last.map((message) => {
            const sender = findUser(store, message.senderId);
            return (
              <li key={message.id} className="flex items-start gap-3">
                {sender && <Avatar user={sender} size="sm" />}
                <p className="min-w-0 flex-1 text-body text-ink">
                  <span className="font-semibold">{sender?.name.split(" ")[0]}</span> <span className="text-small text-muted">{f.time(message.createdAt)}</span>
                  <span className="block">{message.text}</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {thread && (
        <div>
          <Button size="md" href={`/messages/${crewThreadId(stay.id)}`}>
            {t("openChat")}
          </Button>
        </div>
      )}
    </div>
  );
}

/** A heading inside a sheet. */
function SheetPart({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-eyebrow uppercase text-ink/55">{title}</h3>
      {children}
    </section>
  );
}

/** Details: the place (or "decided with the crew"), the address once booked, the House rules. */
function DetailsBody({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.view");
  const f = useFormat();
  const rows: { label: string; value: ReactNode }[] = [
    {
      label: t("accommodation"),
      value:
        stay.accommodationStatus === "locked" && stay.accommodationLink ? (
          <a href={stay.accommodationLink} target="_blank" rel="noopener" className="font-semibold text-ink underline-offset-4 hover:underline">
            {linkDomain(stay.accommodationLink)} ↗
          </a>
        ) : (
          t("accommodationOpen")
        ),
    },
    { label: t("address"), value: stay.bookingConfirmedAt ? f.placeName(stay) : t("addressAfter") },
  ];
  return (
    <SheetPart title={t("details")}>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-body">
        {rows.map((row) => (
          <Fragment key={row.label}>
            <dt className="text-small leading-[22px] text-muted">{row.label}</dt>
            <dd className="text-ink">{row.value}</dd>
          </Fragment>
        ))}
      </dl>
      {stay.houseRules.length > 0 && (
        <>
          <p className="mt-2 text-small text-muted">{t("rules")}</p>
          <ul className="flex flex-col gap-1.5">
            {stay.houseRules.map((rule) => (
              <li key={rule} className="flex items-start gap-2 text-body text-ink">
                <Check aria-hidden className="mt-1 size-4 shrink-0 text-muted" />
                {rule}
              </li>
            ))}
          </ul>
        </>
      )}
    </SheetPart>
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

/** The capsules' sheets: one at a time, from the right with a mouse, from below on touch. */
function DetailSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Sheet variant="panel" open={open} onClose={onClose} title={title}>
      {/* The panel's body has no padding of its own: the content keeps the head's 24px. */}
      <div className="flex flex-col gap-8 px-6 pb-6 pt-1">{children}</div>
    </Sheet>
  );
}

// ─── Hosted ────────────────────────────────────────────────────────────────────

function HouseManage({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.view");
  const tOverlap = useTranslations("overlap");
  const store = useStore();
  const draft = stay.status === "draft";
  const open = stay.status === "published" || stay.status === "booked";
  const [locking, setLocking] = useState(false);
  const [sheet, setSheet] = useState<SheetKey | null>(null);
  const { requests, waitlistRequests } = openRequestsOf(store, stay);
  const chat = getCrewThread(store, stay.id) ? `/messages/${crewThreadId(stay.id)}` : null;
  const full = stay.spotsFilled >= stay.spotsTotal;
  const twoAtOnce = hostOverlapOf(store, stay);
  const unread = useChatUnread(stay);
  const [now] = useState(() => Date.now());
  useHouseFocus(setSheet);
  const close = () => setSheet(null);

  return (
    <HouseFrame
      head={
        <HouseHead
          stay={stay}
          status={<StatusLine stay={stay} />}
          actions={
            <>
              {!draft && <ViewPageLink href={`/house/${stay.slug}?preview=guest`} />}
              <CrewMenu stay={stay} afterLeaveHref="/your-houses" minimal extraItems={[{ label: t("edit"), href: `/your-houses/${stay.id}/edit` }]} />
            </>
          }
        />
      }
      note={twoAtOnce ? tOverlap("hostTwo") : undefined}
      capsules={
        <>
          <Capsule label={t("requests")} count={requests.length + waitlistRequests.length} onClick={() => setSheet("requests")} />
          <Capsule label={t("crew")} count={crewInOf(store, stay)} onClick={() => setSheet("crew")} />
          {chat && <Capsule label={t("chat")} unread={unread} onClick={() => setSheet("chat")} />}
          <Capsule label={t("details")} onClick={() => setSheet("details")} />
        </>
      }
    >
      <HostProgress stay={stay} requests={requests} chat={chat} onSheet={setSheet} onLock={() => setLocking(true)} />
      <DetailSheet open={sheet === "requests"} title={t("requests")} onClose={close}>
        <RequestsTab stay={stay} requests={requests} waitlistRequests={waitlistRequests} />
      </DetailSheet>
      <DetailSheet open={sheet === "crew"} title={t("crew")} onClose={close}>
        <div>
          <CrewRows stay={stay} manage />
          <WaitlistRows stay={stay} />
        </div>
      </DetailSheet>
      <DetailSheet open={sheet === "chat"} title={t("chat")} onClose={close}>
        <ChatBody stay={stay} />
      </DetailSheet>
      <DetailSheet open={sheet === "details"} title={t("details")} onClose={close}>
        <SheetPart title={t("payments")}>
          <PaymentsSection stay={stay} onLock={open && full ? () => setLocking(true) : undefined} />
        </SheetPart>
        {!draft && (
          <SheetPart title={t("share")}>
            {open && <HostInvitesSection stay={stay} />}
            <HostShareTools stay={stay} />
          </SheetPart>
        )}
        <DetailsBody stay={stay} />
        {helpAvailable(stay, now) && <HelpButton stay={stay} />}
      </DetailSheet>
      {locking && <LockSheet stay={stay} onClose={() => setLocking(false)} />}
    </HouseFrame>
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
  const router = useRouter();
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
              // The host may write to someone they invited (DIRECT_MESSAGE_POLICY).
              action={manage && <MoreMenu label={t("messageLabel", { name: person.name })} items={[{ label: t("message"), onSelect: () => router.push(`/messages?id=${store.openDirectThread(stay.id, person.id)}`) }]} />}
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
export function RequestRow({ request, applicant, stay }: { request: JoinRequest; applicant: User; stay: Stay }) {
  const t = useTranslations("houses.requests");
  const f = useFormat();
  const store = useStore();
  const { acceptRequest, declineRequest, undoDecline } = store;
  const showToast = useToast();
  const firstName = applicant.name.split(" ")[0];
  // Mutual people: someone the host lived with whom the guest lived with too (lib/yourPeople.ts).
  const known = knownThrough(store, stay.hostId, applicant.id);
  const router = useRouter();
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
          {f.ageAndCountry(applicant, true)} · {f.day(request.createdAt)}
          {applicant.photos.length === 0 && ` · ${t("noPhoto")}`}
        </p>
        <SocialLinks user={applicant} variant="icons" className="mt-1 empty:hidden" />
        {known.length > 0 && (
          <p className="mt-2 flex items-center gap-2 text-small font-semibold text-ink">
            <Avatar user={known[0]} size="xs" />
            {t("knownThrough", { name: known[0].name.split(" ")[0], others: known.length - 1 })}
          </p>
        )}
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
          {/* The host may write to someone who asked (DIRECT_MESSAGE_POLICY): a direct chat about this House. */}
          <Button variant="secondary" onClick={() => router.push(`/messages?id=${store.openDirectThread(stay.id, applicant.id)}`)}>
            {t("message")}
          </Button>
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

function JoinedHouse({ stay }: { stay: Stay }) {
  const t = useTranslations("houses");
  const tView = useTranslations("houses.view");
  const tWithdraw = useTranslations("withdraw");
  const tSection = useTranslations("houses.detail.sections");
  const store = useStore();
  const host = findUser(store, stay.hostId);
  const showToast = useToast();
  const [paying, setPaying] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [sheet, setSheet] = useState<SheetKey | null>(null);
  const [now] = useState(() => Date.now());
  const request = store.joinRequests.findLast((r) => r.stayId === stay.id && r.userId === store.currentUserId);
  const accepted = request?.status === "accepted";
  const payment = getMyPayment(store, stay.id);
  // Refunded (the booking wasn't confirmed, the spot went to the waitlist, or left): "Refund of €410 on its way · 5–10 days".
  const refunded = !payment ? store.payments.findLast((p) => p.stayId === stay.id && p.userId === store.currentUserId && p.status === "refunded") : undefined;
  const owes = accepted && stay.accommodationStatus === "locked" && payment?.status === "pending" && Boolean(stay.paymentDueAt);
  const chat = accepted ? `/messages/${crewThreadId(stay.id)}` : null;
  const waiting = request?.status === "pending" || request?.status === "waitlist_requested";
  const unread = useChatUnread(stay);
  useHouseFocus(setSheet, owes ? () => setPaying(true) : undefined);
  const close = () => setSheet(null);

  function respond(accept: boolean) {
    store.respondToInvite(stay.id, accept);
    showToast(accept ? t("invite.acceptedToast", { title: stay.title }) : t("invite.declinedToast"));
  }

  const refundReason = refunded ? (refunded.refundedAmount !== undefined ? "spot_transferred" : stay.status === "closed" ? "host_cancelled" : stay.accommodationStatus !== "locked" ? "booking_not_confirmed" : "cancelled") : null;

  return (
    <HouseFrame
      head={
        <HouseHead
          stay={stay}
          status={request ? <StatusBadge status={request.status} /> : <StatusLine stay={stay} />}
          actions={
            <>
              <ViewPageLink href={`/house/${stay.slug}`} />
              {accepted ? (
                <CrewMenu stay={stay} afterLeaveHref="/your-houses" minimal />
              ) : waiting ? (
                <MoreMenu label={tView("withdraw")} items={[{ label: tWithdraw(request?.status === "pending" ? "action" : "waitlistAction"), danger: true, onSelect: () => setWithdrawing(true) }]} />
              ) : null}
            </>
          }
        />
      }
      capsules={
        <>
          <Capsule label={tView("crew")} count={crewInOf(store, stay)} onClick={() => setSheet("crew")} />
          {chat && <Capsule label={tView("chat")} unread={unread} onClick={() => setSheet("chat")} />}
          <Capsule label={tView("details")} onClick={() => setSheet("details")} />
        </>
      }
    >
      <GuestProgress
        stay={stay}
        request={request}
        host={host}
        onPay={owes ? () => setPaying(true) : undefined}
        onRespond={respond}
        onWithdraw={waiting ? () => setWithdrawing(true) : undefined}
        chat={chat}
        extra={refunded && refundReason ? <RefundNotice payment={refunded} currency={stay.currency} reason={refundReason} /> : undefined}
      />
      <DetailSheet open={sheet === "crew"} title={tView("crew")} onClose={close}>
        <CrewRows stay={stay} />
      </DetailSheet>
      <DetailSheet open={sheet === "chat"} title={tView("chat")} onClose={close}>
        <ChatBody stay={stay} />
      </DetailSheet>
      <DetailSheet open={sheet === "details"} title={tView("details")} onClose={close}>
        <DetailsBody stay={stay} />
        <SheetPart title={tView("payment")}>
          {refunded && refundReason ? (
            <RefundNotice payment={refunded} currency={stay.currency} reason={refundReason} />
          ) : stay.accommodationStatus === "locked" && (owes || payment?.status === "paid") ? (
            <div className="flex flex-col gap-6">
              <MyShare stay={stay} variant="panel" />
              {payment?.status === "paid" && <Receipt stay={stay} payment={payment} />}
            </div>
          ) : (
            <p className="text-body text-muted">{tSection("notLockedGuest")}</p>
          )}
          <p className="text-small text-muted">{tSection("refundNote")}</p>
        </SheetPart>
        {accepted && helpAvailable(stay, now) && <HelpButton stay={stay} />}
      </DetailSheet>
      <PaySheet stay={stay} open={paying} onClose={() => setPaying(false)} />
      <ConfirmSheet
        open={withdrawing}
        title={tWithdraw(request?.status === "pending" ? "title" : "waitlistTitle")}
        description={tWithdraw("text")}
        confirmLabel={tWithdraw("confirm")}
        onClose={() => setWithdrawing(false)}
        onConfirm={() => {
          setWithdrawing(false);
          store.withdrawRequest(stay.id);
          showToast(tWithdraw("toast"));
        }}
      />
    </HouseFrame>
  );
}

// ─── Past ──────────────────────────────────────────────────────────────────────

/**
 * A House that's over, for everyone who lived in it: no stepper, no payment. The compact head with "Lived in · March 2027", one card with the
 * crew ("Lived with") and the two ways on: "Do it again" (outline) and "Houses like this".
 */
function PastHouse({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.view");
  const format = useFormatter();
  const store = useStore();
  const me = store.currentUserId;
  const host = findUser(store, stay.hostId);
  const people = [...(host ? [host] : []), ...getCrew(store, stay).filter((u) => u.id !== stay.hostId)].filter((u) => u.id !== me);
  const month = format.dateTime(new Date(`${stay.startDate.slice(0, 7)}-01T00:00:00Z`), { month: "long", year: "numeric", timeZone: "UTC" });
  const place = ALL_PLACES.find((p) => p.name.split(",")[0].trim().toLowerCase() === stay.location.city.toLowerCase());
  return (
    <HouseFrame head={<HouseHead stay={stay} eyebrow={t("livedIn", { date: month })} actions={<ViewPageLink href={`/house/${stay.slug}`} />} />}>
      <section className="flex max-w-[640px] flex-col gap-5 rounded-[20px] bg-(--surface) p-6">
        <h2 className="text-eyebrow uppercase text-ink/55">{t("crew")}</h2>
        <ul className="flex flex-wrap gap-4">
          {people.map((person) => (
            <li key={person.id} className="flex w-20 flex-col items-center gap-2 text-center">
              <Avatar user={person} size="lg" linked />
              <span className="w-full truncate text-body font-semibold text-ink">{person.name.split(" ")[0]}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Link href={againHref(stay.id)} className={OUTLINE("md")}>
            <RotateCcw aria-hidden />
            {t("doItAgain")}
          </Link>
          <Link href={`/explore?vibe=${stay.vibe}${place ? `&place=${place.id}` : ""}`} className={buttonStyles("tertiary", "md")}>
            {t("housesLike")}
          </Link>
        </div>
      </section>
    </HouseFrame>
  );
}
