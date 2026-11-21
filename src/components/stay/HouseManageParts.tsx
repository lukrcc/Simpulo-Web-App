"use client";

// The host's building blocks for one House – the requests (with the waitlist), the crew with its "…", the waitlist in order, a look into the
// crew chat. Used by the House area (stay/HouseArea.tsx: Chat, Manage) and Your houses ("Review" sheet). The old detail view is gone.

import { hidesPhotoUntilAccepted, profileHref } from "@/lib/privacy";
import { knownThrough } from "@/lib/yourPeople";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Textarea } from "@/components/ui/Input";
import { REQUEST_POLICY } from "@/config/policies";
import { hoursLeft } from "@/lib/requests";
import { useNow } from "@/lib/useNow";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { SocialLinks } from "@/components/SocialLinks";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useFormat } from "@/i18n/format";
import { crewThreadId, findUser, getCrew, getCrewThread, getInvited, joinedAt, paymentStatus, useStore } from "@/lib/store";
import type { JoinRequest, Stay, User } from "@/lib/types";
import { cn, openSpots } from "@/lib/utils";
import { ListRow } from "./DetailSection";
import { hasOffer, waitlistOf, waitlistRequestsOf } from "@/lib/waitlist";

/** A row that does something: only it gets a surface, and only on hover. */
const ROW_HOVER = "rounded-2xl transition-colors duration-150 hover:bg-(--chip-bg)";

/** The crew's chat: its last messages (the same thread as Messages) and "Open in Messages". */
export function ChatBody({ stay, empty }: { stay: Stay; /** No thread yet: what to say instead */ empty: string }) {
  const t = useTranslations("house.area.chat");
  const f = useFormat();
  const store = useStore();
  const thread = getCrewThread(store, stay.id);
  if (!thread) return <p className="text-body text-muted">{empty}</p>;
  const last = thread.messages.filter((m) => m.senderId !== "system" && m.text.trim() !== "").slice(-8);
  return (
    <div className="flex flex-col gap-6">
      {last.length === 0 ? (
        <p className="text-body text-muted">{t("quiet")}</p>
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
      <div>
        <Button size="md" href={`/messages/${crewThreadId(stay.id)}`}>
          {t("open")}
        </Button>
      </div>
    </div>
  );
}

/** A House's open requests: verified guests first (they put their ID behind it), then whichever expires first (the oldest); the waitlist's apart. */
export function openRequestsOf(store: ReturnType<typeof useStore>, stay: Stay) {
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
export function RequestsTab({ stay, requests, waitlistRequests }: { stay: Stay; requests: JoinRequest[]; waitlistRequests: JoinRequest[] }) {
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
export function WaitlistRows({ stay }: { stay: Stay }) {
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
                  <Link href={profileHref(person.id)} className="truncate hover:underline">
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
export function CrewRows({ stay, manage = false }: { stay: Stay; manage?: boolean }) {
  const t = useTranslations("houses.crew");
  const tDetail = useTranslations("houses.detail");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const [removing, setRemoving] = useState<User | null>(null);
  /** Why (optional) – the guest sees it in their notification and Me tab */
  const [removeReason, setRemoveReason] = useState("");
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
                    <Link href={profileHref(member.id)} className="truncate hover:underline">
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
                <Link href={profileHref(person.id)} className="text-muted hover:underline">
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
        onClose={() => {
          setRemoving(null);
          setRemoveReason("");
        }}
        onConfirm={() => {
          if (removing) {
            store.removeMember(stay.id, removing.id, removeReason);
            showToast(t("removedToast", { name: removing.name.split(" ")[0] }));
          }
          setRemoving(null);
          setRemoveReason("");
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="text-small text-muted">{t("removeReason", { name: removing?.name.split(" ")[0] ?? "" })}</span>
          <Textarea rows={3} maxLength={300} value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} placeholder={t("removeReasonPlaceholder")} />
        </label>
      </ConfirmSheet>
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

  // "Hide my photo until I'm accepted" (lib/privacy.ts): no photo on the request until the host said yes. Last names never.
  const photoHidden = request.status !== "accepted" && hidesPhotoUntilAccepted(applicant);
  return (
    <li className={cn("-mx-3 flex gap-3 p-3", ROW_HOVER)}>
      <Avatar user={applicant} size="md" linked={!photoHidden} mode={photoHidden ? "hidden" : "full"} />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1 text-body font-semibold text-ink">
          <Link href={profileHref(applicant.id)} className="truncate hover:underline">
            {firstName}
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
        {/* The guest's note for the host (from the request window). */}
        {request.message.trim() && (
          <div className="mt-2 max-w-[640px]">
            <p className="text-eyebrow uppercase text-muted">{t("note")}</p>
            <p className="mt-1 text-body text-ink">{request.message}</p>
          </div>
        )}
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


