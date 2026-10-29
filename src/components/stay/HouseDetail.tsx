"use client";

import { Check, ChevronRight, CircleCheck, FilePen, IdCard, Link2, Lock, Pencil, Share2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { VerifyIdSheet } from "@/components/account/VerifyIdSheet";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { MyShare } from "@/components/payments/MyShare";
import { PaymentsCard } from "@/components/payments/PaymentsCard";
import { ShareSheet, StoryImageButton } from "@/components/share/ShareSheet";
import { Avatar } from "@/components/ui/Avatar";
import { InterestInvite } from "@/components/stay/InterestInvite";
import { buttonClass } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { SocialRow } from "@/components/ui/SocialRow";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useFormat } from "@/i18n/format";
import { mockPreviewForUrl } from "@/lib/mock-extras";
import { crewThreadId, findUser, getCrew, getCurrentUser, getCrewLinks, getLockDetails, joinedAt, paidCount, paymentStatus, useStore } from "@/lib/store";
import type { JoinRequest, Stay, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AccommodationChip } from "./AccommodationChip";
import { AccommodationSection } from "./AccommodationSection";
import { CloseStayConfirm, CrewMenu } from "./CrewMenu";
import { HostCard } from "./HostCard";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { LockSheet } from "./LockSheet";

const card = "rounded-[24px] bg-white p-6";

/** Houses detail: the host's management panel, or a member's view of a joined House. */
export function HouseDetail({ stay }: { stay: Stay }) {
  const { currentUserId } = useStore();
  return stay.hostId === currentUserId ? <HouseManage stay={stay} /> : <JoinedHouse stay={stay} />;
}

function CardTitle({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {aside && <span className="text-sm text-zinc-500">{aside}</span>}
    </div>
  );
}

// ─── Hosted ────────────────────────────────────────────────────────────────────

function HouseManage({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.detail");
  const tDraft = useTranslations("growth.draft");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const [closing, setClosing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sharing, setSharing] = useState(false);
  const me = getCurrentUser(store);
  const closed = stay.status === "closed";
  const draft = stay.status === "draft";
  // Every spot taken but still listed as open – suggest switching requests off.
  const fullButOpen = !closed && stay.acceptingRequests && stay.spotsFilled >= stay.spotsTotal;

  return (
    <div className="space-y-6">
      <section className={card}>
        <h2 className="text-2xl font-bold tracking-tight">{stay.title}</h2>
        <p className="mt-1 text-zinc-500">
          {f.longRange(stay.startDate, stay.endDate)} · {f.placeName(stay)}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {closed ? (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">{t("closed")}</span>
          ) : draft ? (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">{tDraft("badge")}</span>
          ) : (
            <RequestsToggle stay={stay} />
          )}
          <AccommodationChip stay={stay} />
          <BookedChip stay={stay} />
        </div>
        {/* Claimed or duplicated: nobody sees it until it's published – through the stepper, which checks it. */}
        {draft && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-page px-4 py-3">
            <p className="flex items-start gap-2 text-sm text-neutral-700">
              <FilePen className="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden />
              <span>
                <span className="block font-medium text-ink">{tDraft("bannerTitle")}</span>
                {tDraft("bannerText")}
              </span>
            </p>
            <Link href={`/my-stays/${stay.id}/edit`} className={buttonClass("dark", "sm")}>
              {tDraft("finish")}
            </Link>
          </div>
        )}
        {fullButOpen && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-page px-4 py-3">
            <p className="flex items-center gap-2 text-sm text-neutral-700">
              <Users className="size-4 shrink-0 text-zinc-500" aria-hidden />
              {t("fullBanner")}
            </p>
            <button type="button" onClick={() => store.setAcceptingRequests(stay.id, false)} className={buttonClass("secondary", "sm")}>
              {t("stopRequests")}
            </button>
          </div>
        )}
        {/* Payouts need a verified host – a soft nudge, never a blocker for running the House. */}
        {me && !me.verified && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent-soft/60 px-4 py-3">
            <p className="flex items-center gap-2 text-sm text-neutral-700">
              <IdCard className="size-4 shrink-0 text-accent" aria-hidden />
              {t("verifyHint")}
            </p>
            <button type="button" onClick={() => setVerifying(true)} className={buttonClass("secondary", "sm")}>
              {t("verifyAction")}
            </button>
          </div>
        )}
        <VerifyIdSheet open={verifying} onClose={() => setVerifying(false)} />
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/my-stays/${stay.id}/edit`} className={buttonClass("dark", "sm")}>
            <Pencil className="size-3.5" />
            {t("editHouse")}
          </Link>
          {/* The host sees the public page as a guest would (dark preview banner, nothing changes data). */}
          <Link href={`/house/${stay.slug}?preview=guest`} className={buttonClass("secondary", "sm")}>
            {t("viewPage")}
          </Link>
          {/* A draft has no public page to share yet. */}
          {!draft && (
            <>
              <button type="button" onClick={() => setSharing(true)} className={buttonClass("secondary", "sm")}>
                <Share2 className="size-3.5" />
                {t("shareLink")}
              </button>
              <StoryImageButton stay={stay} variant="button" />
            </>
          )}
        </div>
        <ShareSheet target={{ kind: "house", stay }} open={sharing} onClose={() => setSharing(false)} />
      </section>

      {/* People who want this city and month: the host can invite them (only shows with matching interest). */}
      {!draft && <InterestInvite stay={stay} />}
      <RequestsCard stay={stay} />
      <CrewCard stay={stay} manage />
      <HostAccommodationCard stay={stay} />
      <PaymentsCard stay={stay} />

      <section className={cn(card, "ring-1 ring-red-100")}>
        <CardTitle title={t("dangerZone")} />
        {closed ? (
          <p className="text-sm text-zinc-600">{t("closedNote")}</p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-md text-sm text-zinc-600">{t("closeExplainer")}</p>
            <button
              type="button"
              onClick={() => setClosing(true)}
              className="inline-flex h-9 items-center rounded-full border border-red-200 px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              {t("closeHouse")}
            </button>
          </div>
        )}
      </section>

      <CloseStayConfirm
        open={closing}
        onClose={() => setClosing(false)}
        onConfirm={() => {
          setClosing(false);
          store.closeStay(stay.id);
          showToast(t("closedToast"));
        }}
      />
    </div>
  );
}

/** "Booked" once the host uploaded the booking confirmation. */
function BookedChip({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.payments");
  if (stay.status !== "booked") return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
      <CircleCheck className="size-3" aria-hidden />
      {t("booked")}
    </span>
  );
}

/** "Taking requests" as a compact switch chip. Accepting, declining or someone leaving never changes it. */
function RequestsToggle({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.detail");
  const { setAcceptingRequests } = useStore();
  const on = stay.acceptingRequests;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setAcceptingRequests(stay.id, !on)}
      className="inline-flex items-center gap-2 rounded-full bg-black/5 py-1 pl-1 pr-3 text-xs font-medium text-ink transition-colors hover:bg-black/10"
    >
      <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-accent" : "bg-neutral-300")}>
        <span className={cn("absolute left-0 top-0.5 size-4 rounded-full bg-white shadow transition-transform", on ? "translate-x-4.5" : "translate-x-0.5")} />
      </span>
      {on ? t("takingRequests") : t("notTakingRequests")}
    </button>
  );
}

function RequestsCard({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.requests");
  const store = useStore();
  const requests = store.joinRequests.filter((r) => r.stayId === stay.id).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pending = requests.filter((r) => r.status === "pending");
  const earlier = requests.filter((r) => r.status !== "pending");

  return (
    <section className={card}>
      <CardTitle title={t("title")} aside={pending.length > 0 ? t("pendingCount", { count: pending.length }) : undefined} />
      {pending.length === 0 ? (
        <p className="text-sm text-zinc-500">{stay.acceptingRequests ? t("noneOpen") : t("none")}</p>
      ) : (
        <ul className="divide-y divide-black/5">
          {pending.map((request) => {
            const applicant = findUser(store, request.userId);
            return applicant ? <RequestRow key={request.id} request={request} applicant={applicant} stay={stay} /> : null;
          })}
        </ul>
      )}

      {earlier.length > 0 && (
        <details className="group mt-4 border-t border-black/5 pt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-zinc-600 hover:text-ink [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
            {t("earlier", { count: earlier.length })}
          </summary>
          <ul className="mt-2 divide-y divide-black/5">
            {earlier.map((request) => {
              const applicant = findUser(store, request.userId);
              return applicant ? <RequestRow key={request.id} request={request} applicant={applicant} stay={stay} /> : null;
            })}
          </ul>
        </details>
      )}
    </section>
  );
}

function RequestRow({ request, applicant, stay }: { request: JoinRequest; applicant: User; stay: Stay }) {
  const t = useTranslations("houses.requests");
  const f = useFormat();
  const { acceptRequest, declineRequest, openDirectThread } = useStore();
  const requireAuth = useRequireAuth();
  const router = useRouter();
  const showToast = useToast();
  const firstName = applicant.name.split(" ")[0];
  const isFull = stay.spotsFilled >= stay.spotsTotal;
  const pending = request.status === "pending";

  function reply() {
    requireAuth(
      (userId) => router.push(`/inbox/${openDirectThread(stay.id, applicant.id, userId)}`),
      t("loginToMessage", { name: firstName }),
    );
  }

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <Avatar user={applicant} size="lg" linked />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1">
              <Link href={`/u/${applicant.id}`} className="font-semibold hover:underline">
                {applicant.name}
              </Link>
              {applicant.verified && <VerifiedBadge />}
            </span>
            {!pending && <StatusPill status={request.status} />}
            {applicant.photos.length === 0 && <span className="text-xs text-zinc-500">{t("noPhoto")}</span>}
          </div>
          <p className="text-sm text-zinc-500">
            {f.ageAndCountry(applicant)} · {f.day(request.createdAt)}
          </p>
          <SocialRow user={applicant} size="sm" className="mt-2" />
        </div>
      </div>
      {pending && <p className="mt-3 text-sm leading-relaxed text-neutral-700">{request.message}</p>}

      <div className="mt-3 flex gap-2">
        {pending && (
          <>
            {/* A full crew can't take anyone else – only Decline and Reply. */}
            {!isFull && (
              <button
                type="button"
                onClick={() => {
                  acceptRequest(request.id);
                  showToast(t("acceptedToast", { name: firstName }));
                }}
                className={buttonClass("dark", "sm", "min-w-24")}
              >
                {t("accept")}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                declineRequest(request.id);
                showToast(t("declinedToast", { name: firstName }));
              }}
              className={buttonClass("secondary", "sm", "min-w-24")}
            >
              {t("decline")}
            </button>
          </>
        )}
        <button type="button" onClick={reply} className={buttonClass("ghost", "sm")}>
          {t("reply")}
        </button>
      </div>
    </li>
  );
}

/** Members with country and join date. `manage`: the host can remove people (⋯ → Remove). */
function CrewCard({ stay, manage = false }: { stay: Stay; manage?: boolean }) {
  const t = useTranslations("houses.crew");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const [removing, setRemoving] = useState<User | null>(null);
  const crew = getCrew(store, stay);
  const locked = stay.accommodationStatus === "locked" && stay.pricePerPerson !== undefined;

  return (
    <section className={card}>
      <CardTitle title={t("title")} aside={`${stay.spotsFilled}/${stay.spotsTotal}`} />
      <ul className="divide-y divide-black/5">
        {crew.map((member) => {
          const isHost = member.id === stay.hostId;
          const joined = joinedAt(store, stay, member.id);
          return (
            <li key={member.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <Avatar user={member} size="md" linked />
              <div className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1">
                  <Link href={`/u/${member.id}`} className="truncate text-sm font-medium hover:underline">
                    {member.id === store.currentUserId ? t("you", { name: member.name }) : member.name}
                  </Link>
                  {member.verified && <VerifiedBadge />}
                </span>
                <p className="truncate text-xs text-zinc-500">
                  {member.country}
                  {joined && ` · ${t(isHost ? "opened" : "joined", { date: f.day(joined) })}`}
                </p>
              </div>
              {locked && <StatusPill status={paymentStatus(store, stay.id, member.id)} />}
              {isHost ? (
                <span className="rounded-full bg-page px-2.5 py-1 text-xs font-medium text-zinc-600">{t("host")}</span>
              ) : (
                manage && <MoreMenu label={t("moreFor", { name: member.name })} items={[{ label: t("remove"), onSelect: () => setRemoving(member), danger: true }]} />
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 border-t border-black/5 pt-4 text-sm text-zinc-500">
        {t("upTo", { count: stay.spotsTotal })}
        {locked && stay.pricePerPerson && (
          <>
            {" "}
            ·{" "}
            {t.rich("eachPays", {
              price: f.price(stay.pricePerPerson, stay.currency),
              b: (chunks) => <span className="font-medium text-ink">{chunks}</span>,
            })}
          </>
        )}
      </p>

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
    </section>
  );
}

function HostAccommodationCard({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.accommodation");
  const f = useFormat();
  const store = useStore();
  /** Open LockSheet: `link` set from a link card's "Lock this", undefined from "Lock accommodation". */
  const [locking, setLocking] = useState<{ link?: string } | null>(null);
  const links = getCrewLinks(store, stay.id);
  const locked = stay.accommodationStatus === "locked";
  const lock = getLockDetails(store, stay);

  return (
    <section className={card}>
      <CardTitle title={t("title")} aside={<AccommodationChip stay={stay} />} />
      {locked ? (
        <>
          {stay.accommodationLink && (
            <LinkPreviewCard href={stay.accommodationLink} preview={mockPreviewForUrl(stay.accommodationLink, stay.title)} layout="row" />
          )}
          {lock && (
            <dl className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-page p-4">
                <dt className="text-xs text-zinc-500">{t("total")}</dt>
                <dd className="mt-0.5 text-lg font-semibold">{f.price(lock.total, stay.currency)}</dd>
              </div>
              <div className="rounded-2xl bg-page p-4">
                <dt className="text-xs text-zinc-500">{t("perPersonShares", { count: lock.spots })}</dt>
                <dd className="mt-0.5 text-lg font-semibold">{f.price(lock.perPerson, stay.currency)}</dd>
              </div>
              <div className="rounded-2xl bg-page p-4">
                <dt className="text-xs text-zinc-500">{t("paid")}</dt>
                <dd className="mt-0.5 text-lg font-semibold">
                  {t("paidOf", { paid: paidCount(store, stay), total: getCrew(store, stay).length })}
                </dd>
              </div>
            </dl>
          )}
        </>
      ) : links.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-zinc-500">{t("suggested")}</p>
          <ul className="space-y-3">
            {links.map((url) => (
              <li key={url} className="flex flex-wrap items-center gap-4 rounded-2xl border border-black/5 p-3">
                <div className="min-w-0 flex-1">
                  <LinkPreviewCard href={url} preview={mockPreviewForUrl(url)} layout="row" />
                </div>
                {stay.status !== "closed" && (
                  <button type="button" onClick={() => setLocking({ link: url })} className={buttonClass("dark", "sm", "shrink-0")}>
                    <Lock className="size-3.5" />
                    {t("lockThis")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-page p-4">
          <p className="flex items-center gap-2 text-sm text-zinc-600">
            <Link2 className="size-4 shrink-0" aria-hidden />
            {t("noLinks")}
          </p>
          <Link href={`/inbox/${crewThreadId(stay.id)}`} className={buttonClass("secondary", "sm")}>
            {t("openChat")}
          </Link>
        </div>
      )}

      {!locked && stay.status !== "closed" && (
        <button type="button" onClick={() => setLocking({})} className={buttonClass("dark", "sm", "mt-4")}>
          <Lock className="size-3.5" />
          {t("lockAccommodation")}
        </button>
      )}

      {locking && <LockSheet stay={stay} link={locking.link} onClose={() => setLocking(null)} />}
    </section>
  );
}

// ─── Joined ────────────────────────────────────────────────────────────────────

function JoinedHouse({ stay }: { stay: Stay }) {
  const t = useTranslations("houses");
  const f = useFormat();
  const store = useStore();
  const host = findUser(store, stay.hostId);
  const request = store.joinRequests.findLast((r) => r.stayId === stay.id && r.userId === store.currentUserId);
  const accepted = request?.status === "accepted";

  return (
    <div className="space-y-6">
      <section className={card}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold tracking-tight">{stay.title}</h2>
            <p className="mt-1 text-zinc-500">
              {f.longRange(stay.startDate, stay.endDate)} · {f.placeName(stay)}
            </p>
          </div>
          {accepted && <CrewMenu stay={stay} afterLeaveHref="/my-stays" />}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {request && <StatusPill status={request.status} />}
          {stay.status === "closed" && <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">{t("detail.closed")}</span>}
          <AccommodationChip stay={stay} />
          <BookedChip stay={stay} />
        </div>
        {accepted && <MyShare stay={stay} variant="panel" className="mt-4" />}
        {host && (
          <div className="mt-5 border-t border-black/5 pt-5">
            <HostCard host={host} />
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          {accepted ? (
            <Link href={`/inbox/${crewThreadId(stay.id)}`} className={buttonClass("dark", "sm")}>
              {t("accommodation.openChat")}
            </Link>
          ) : (
            <p className="flex items-center gap-1.5 text-sm text-zinc-500">
              <Check className="size-4" aria-hidden />
              {host ? t("joined.waiting", { name: host.name.split(" ")[0] }) : t("joined.waitingForHost")}
            </p>
          )}
          <Link href={`/house/${stay.slug}`} className={buttonClass("secondary", "sm")}>
            {t("detail.viewPage")}
          </Link>
        </div>
      </section>

      <CrewCard stay={stay} />

      <section className={card}>
        <CardTitle title={t("accommodation.title")} />
        <AccommodationSection stay={stay} chatLinkCount={getCrewLinks(store, stay.id).length} canOpenChat={accepted} inCard />
      </section>
    </div>
  );
}
