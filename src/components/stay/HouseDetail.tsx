"use client";

import { Check, CircleCheck, ExternalLink, Lock, LockOpen, MessageCircle, RotateCcw, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { againHref } from "@/components/create/model";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { MyShare } from "@/components/payments/MyShare";
import { PaymentsSection } from "@/components/payments/PaymentsCard";
import { HostShareTools } from "@/components/share/HostShareTools";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { SocialRow } from "@/components/ui/SocialRow";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useFormat } from "@/i18n/format";
import { crewThreadId, findUser, getCrew, getCrewThread, getInvited, getMyPayment, isCrewMember, joinedAt, paymentStatus, useStore } from "@/lib/store";
import type { JoinRequest, Stay, User } from "@/lib/types";
import { openSpots } from "@/lib/utils";
import { CrewMenu } from "./CrewMenu";
import { DetailSection, DetailSections, ListRow, detailCard } from "./DetailSection";
import { HostCard } from "./HostCard";
import { HostInvitesSection, InviteSheet } from "./HouseInvites";
import { LockSheet } from "./LockSheet";
import { PaySheet } from "./PaySheet";

/**
 * Your houses, right column: exactly two cards – the header (title, dates · place, status, actions) and one content
 * card whose sections follow a fixed order per role: hosting, joined, or – once it's over – past.
 */
export function HouseDetail({ stay }: { stay: Stay }) {
  const store = useStore();
  if (stay.status === "completed" && isCrewMember(store, stay, store.currentUserId)) return <PastHouse stay={stay} />;
  return stay.hostId === store.currentUserId ? <HouseManage stay={stay} /> : <JoinedHouse stay={stay} />;
}

/** The header card: title, "dates · place", status badges left; right the secondary actions and exactly one primary. */
function HeaderCard({ stay, badges, actions, menu }: { stay: Stay; badges?: ReactNode; actions?: ReactNode; menu?: ReactNode }) {
  const f = useFormat();
  return (
    <section className={detailCard}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-64">
          <h2 className="text-h2">{stay.title}</h2>
          <p className="mt-1 text-muted">
            {f.longRange(stay.startDate, stay.endDate)} · {f.placeName(stay)}
          </p>
          {badges && <div className="mt-3 flex flex-wrap items-center gap-2">{badges}</div>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
          {menu}
        </div>
      </div>
    </section>
  );
}

/** "Locked · €480 pp" / "Accommodation open", and "Booked" once the confirmation is uploaded. */
function AccommodationBadges({ stay }: { stay: Stay }) {
  const t = useTranslations("house.accommodationChip");
  const tBadges = useTranslations("houses.detail.badges");
  const f = useFormat();
  const locked = stay.accommodationStatus === "locked";
  return (
    <>
      <Badge icon={locked ? <Lock aria-hidden /> : <LockOpen aria-hidden />}>
        {locked ? (stay.pricePerPerson ? t("lockedPrice", { price: f.price(stay.pricePerPerson, stay.currency) }) : t("locked")) : t("open")}
      </Badge>
      {stay.status === "booked" && <Badge icon={<CircleCheck aria-hidden />}>{tBadges("booked")}</Badge>}
    </>
  );
}

// ─── Hosted ────────────────────────────────────────────────────────────────────

/** Hosting: Crew → Interested & invites → Share → Payments. */
function HouseManage({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.detail");
  const draft = stay.status === "draft";
  const open = stay.status === "published" || stay.status === "booked";

  return (
    <div className="space-y-6">
      <HeaderCard
        stay={stay}
        menu={<CrewMenu stay={stay} afterLeaveHref="/my-stays" minimal />}
        badges={
          <>
            <Badge>
              {stay.status === "closed"
                ? t("badges.closed")
                : draft
                  ? t("badges.draft")
                  : stay.acceptingRequests
                    ? t("takingRequests")
                    : t("notTakingRequests")}
            </Badge>
            <AccommodationBadges stay={stay} />
          </>
        }
        actions={
          <>
            {!draft && (
              <>
                {/* The host sees the public page as a guest would (dark preview banner, nothing changes data). */}
                <Button variant="secondary" href={`/house/${stay.slug}?preview=guest`}>
                  {t("viewPage")}
                </Button>
                <Button variant="secondary" href={`/my-stays/${stay.id}/edit`}>
                  {t("editHouse")}
                </Button>
              </>
            )}
            <HostNextAction stay={stay} />
          </>
        }
      />

      <DetailSections>
        <CrewSection stay={stay} manage />
        {open && <HostInvitesSection stay={stay} />}
        {/* A draft has no public page to share yet. */}
        {!draft && <HostShareTools stay={stay} title={t("sections.share")} />}
        <HostPaymentsSection stay={stay} />
      </DetailSections>
    </div>
  );
}

/**
 * The host's one primary button – the next step: a draft is finished; open with spots left → Invite; crew full and
 * not locked → Lock accommodation; booked → Open crew group (the crew chat while there's no group link); while
 * shares are being paid → the crew chat. Closed: none.
 */
function HostNextAction({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.detail.next");
  const store = useStore();
  const [sheet, setSheet] = useState<"invite" | "lock" | null>(null);
  const full = stay.spotsFilled >= stay.spotsTotal;
  const locked = stay.accommodationStatus === "locked";
  const chat = getCrewThread(store, stay.id) ? `/inbox/${crewThreadId(stay.id)}` : null;

  if (stay.status === "closed") return null;
  if (stay.status === "draft") return <Button href={`/my-stays/${stay.id}/edit`}>{t("finish")}</Button>;
  if (stay.status === "booked") {
    if (stay.crewGroupUrl)
      return (
        <Button href={stay.crewGroupUrl} external>
          <ExternalLink aria-hidden />
          {t("openCrewGroup")}
        </Button>
      );
    return chat && <Button href={chat}>{t("openCrewChat")}</Button>;
  }
  if (!full && !locked)
    return (
      <>
        <Button onClick={() => setSheet("invite")} disabled={openSpots(stay) === 0}>
          <UserPlus aria-hidden />
          {t("invite")}
        </Button>
        <InviteSheet stay={stay} open={sheet === "invite"} onClose={() => setSheet(null)} />
      </>
    );
  if (!locked)
    return (
      <>
        <Button onClick={() => setSheet("lock")}>
          <Lock aria-hidden />
          {t("lockAccommodation")}
        </Button>
        {sheet === "lock" && <LockSheet stay={stay} onClose={() => setSheet(null)} />}
      </>
    );
  return chat && <Button href={chat}>{t("openCrewChat")}</Button>;
}

/** Payments: the payment status once the place is locked; before that one status line (locking is the header's job). */
function HostPaymentsSection({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.detail.sections");
  if (stay.accommodationStatus === "locked") return <PaymentsSection stay={stay} />;
  return (
    <DetailSection title={t("payments")}>
      <p className="text-body text-muted">{t("notLocked")}</p>
    </DetailSection>
  );
}

/**
 * Crew: everyone in (avatar, name, country · joined), the occupancy as a badge. Host (`manage`): Remove, the past-crew
 * invitees holding a spot, and the open requests to answer.
 */
function CrewSection({ stay, manage = false }: { stay: Stay; manage?: boolean }) {
  const t = useTranslations("houses.crew");
  const tDetail = useTranslations("houses.detail");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const [removing, setRemoving] = useState<User | null>(null);
  const crew = getCrew(store, stay);
  const invited = getInvited(store, stay.id);
  const locked = stay.accommodationStatus === "locked" && stay.pricePerPerson !== undefined;
  const requests = manage
    ? store.joinRequests.filter((r) => r.stayId === stay.id && r.status === "pending").toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];

  return (
    <DetailSection
      title={tDetail("sections.crew")}
      action={<Badge>{tDetail("badges.occupancy", { filled: stay.spotsFilled, total: stay.spotsTotal })}</Badge>}
    >
      <ul className="">
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
                    {locked && stay.status !== "completed" && <StatusBadge status={paymentStatus(store, stay.id, member.id)} />}
                    {isHost && <Badge>{t("host")}</Badge>}
                  </>
                }
                action={
                  manage &&
                  !isHost && (
                    <Button variant="tertiary" onClick={() => setRemoving(member)} aria-label={t("removeLabel", { name: member.name })}>
                      {tDetail("sections.remove")}
                    </Button>
                  )
                }
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

      {requests.length > 0 && (
        <div className="mt-4">
          <div className="mb-2">
            <Badge>{tDetail("badges.new", { count: requests.length })}</Badge>
          </div>
          <ul className="">
            {requests.map((request) => {
              const applicant = findUser(store, request.userId);
              return applicant ? <RequestRow key={request.id} request={request} applicant={applicant} stay={stay} /> : null;
            })}
          </ul>
        </div>
      )}

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
    </DetailSection>
  );
}

/** A pending request: the person (as a list row), their message, Accept (secondary) and Decline / Reply (tertiary). */
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
    <li className="pb-4">
      <ListRow
        lead={<Avatar user={applicant} size="md" linked />}
        title={
          <span className="flex min-w-0 items-center gap-1">
            <Link href={`/u/${applicant.id}`} className="truncate hover:underline">
              {applicant.name}
            </Link>
            {applicant.verified && <VerifiedBadge />}
          </span>
        }
        subtitle={`${f.ageAndCountry(applicant)} · ${f.day(request.createdAt)}${applicant.photos.length === 0 ? ` · ${t("noPhoto")}` : ""}`}
      />
      <div className="pl-[52px]">
        <SocialRow user={applicant} size="sm" />
        <p className="mt-2 text-body leading-relaxed text-ink">{request.message}</p>
        <div className="mt-3 flex flex-wrap items-center gap-5">
          {!isFull && (
            <Button
              variant="secondary"
              onClick={() => {
                acceptRequest(request.id);
                showToast(t("acceptedToast", { name: firstName }));
              }}
            >
              {t("accept")}
            </Button>
          )}
          <Button
            variant="tertiary"
            onClick={() => {
              declineRequest(request.id);
              showToast(t("declinedToast", { name: firstName }));
            }}
          >
            {t("decline")}
          </Button>
          <Button variant="tertiary" onClick={reply}>
            {t("reply")}
          </Button>
        </div>
      </div>
    </li>
  );
}

// ─── Joined ────────────────────────────────────────────────────────────────────

/** Joined: Crew → Your payment → Crew group (once complete) → Host. */
function JoinedHouse({ stay }: { stay: Stay }) {
  const t = useTranslations("houses");
  const tSection = useTranslations("houses.detail.sections");
  const tNext = useTranslations("houses.detail.next");
  const store = useStore();
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const host = findUser(store, stay.hostId);
  const showToast = useToast();
  const [paying, setPaying] = useState(false);
  const request = store.joinRequests.findLast((r) => r.stayId === stay.id && r.userId === store.currentUserId);
  const accepted = request?.status === "accepted";
  const invited = request?.status === "invited";
  const hostName = host?.name.split(" ")[0] ?? "";
  const payment = getMyPayment(store, stay.id);
  const owes = accepted && stay.accommodationStatus === "locked" && payment?.status === "pending";
  const crewGroup = accepted && stay.crewGroupUrl && stay.spotsFilled >= stay.spotsTotal ? stay.crewGroupUrl : null;

  function respond(accept: boolean) {
    store.respondToInvite(stay.id, accept);
    showToast(accept ? t("invite.acceptedToast", { title: stay.title }) : t("invite.declinedToast"));
  }

  function messageHost() {
    requireAuth((userId) => router.push(`/inbox/${store.openDirectThread(stay.id, stay.hostId, userId)}`));
  }

  // One primary – the next step: answer the invite, pay the share, the crew group once complete, else the crew chat.
  const next = invited ? (
    <>
      <Button variant="secondary" onClick={() => respond(false)}>
        {t("invite.decline")}
      </Button>
      <Button onClick={() => respond(true)}>{t("invite.accept")}</Button>
    </>
  ) : owes ? (
    <Button onClick={() => setPaying(true)}>{tNext("payNow")}</Button>
  ) : crewGroup ? (
    <Button href={crewGroup} external>
      <ExternalLink aria-hidden />
      {tNext("openCrewGroup")}
    </Button>
  ) : accepted ? (
    <Button href={`/inbox/${crewThreadId(stay.id)}`}>{tNext("openCrewChat")}</Button>
  ) : null;

  return (
    <div className="space-y-6">
      <HeaderCard
        stay={stay}
        menu={accepted && <CrewMenu stay={stay} afterLeaveHref="/my-stays" />}
        badges={
          <>
            {request && <StatusBadge status={request.status} />}
            {stay.status === "closed" && <Badge>{t("detail.badges.closed")}</Badge>}
            <AccommodationBadges stay={stay} />
            {request?.status === "pending" && (
              <span className="text-small text-muted">{host ? t("joined.waiting", { name: hostName }) : t("joined.waitingForHost")}</span>
            )}
          </>
        }
        actions={
          <>
            <Button variant="secondary" href={`/house/${stay.slug}`}>
              {t("detail.viewPage")}
            </Button>
            {next}
          </>
        }
      />
      <PaySheet stay={stay} open={paying} onClose={() => setPaying(false)} />

      <DetailSections>
        <CrewSection stay={stay} />
        {accepted && (
          <DetailSection title={tSection("yourPayment")}>
            {stay.accommodationStatus === "locked" ? <MyShare stay={stay} variant="panel" /> : <p className="text-body text-muted">{tSection("notLockedGuest")}</p>}
            <p className="mt-2 text-small text-muted">{tSection("refundNote")}</p>
          </DetailSection>
        )}
        {/* The crew's own WhatsApp / Telegram group: confirmed members, once the crew is complete. */}
        {crewGroup && (
          <DetailSection
            title={tSection("crewGroup")}
            action={
              <Button variant="secondary" href={crewGroup} external>
                <ExternalLink aria-hidden />
                {tSection("openCrewGroup")}
              </Button>
            }
          >
            <p className="text-body text-muted">{tSection("crewGroupText")}</p>
          </DetailSection>
        )}
        {host && (
          <DetailSection
            title={tSection("host")}
            action={
              <Button variant="secondary" onClick={messageHost}>
                <MessageCircle aria-hidden />
                {tSection("messageHost", { name: hostName })}
              </Button>
            }
          >
            <HostCard host={host} />
          </DetailSection>
        )}
      </DetailSections>
    </div>
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
    <div className="space-y-6">
      <HeaderCard
        stay={stay}
        badges={<Badge icon={<Check aria-hidden />}>{t("badge")}</Badge>}
        actions={
          <Button variant="secondary" href={`/house/${stay.slug}`}>
            {t("viewPage")}
          </Button>
        }
      />

      <DetailSections>
        <CrewSection stay={stay} />
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
            <dd className="text-ink">{f.longRange(stay.startDate, stay.endDate)}</dd>
            <dt className="text-small leading-[22px] text-muted">{tSection("summaryPlace")}</dt>
            <dd className="text-ink">{f.placeName(stay)}</dd>
            <dt className="text-small leading-[22px] text-muted">{tSection("summaryPaid")}</dt>
            <dd className="tabular-nums text-ink">{paid}</dd>
          </dl>
        </DetailSection>
      </DetailSections>
    </div>
  );
}
