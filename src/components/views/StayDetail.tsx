"use client";

import Link from "next/link";
import { Camera, Check, DoorClosed, ExternalLink, Lock, MailOpen, MessageCircle, Plus, RotateCcw, SearchX, UserPlus, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, use, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { ConfirmPopover } from "@/components/ui/ConfirmPopover";
import { ageOn, MIN_AGE } from "@/lib/birthDate";
import { hasOffer, waitlistOf, waitlistOpen, waitlistPosition, waitlistReason } from "@/lib/waitlist";
import { AuthOptions } from "@/components/auth/AuthSheet";
import { FormField, formInput, formTextarea } from "@/components/form/FormLayout";
import { useInstallNudge } from "@/components/InstallNudge";
import { PreviewBanner, PreviewProvider } from "@/components/PreviewMode";
import { PhotoSheet } from "@/components/PhotoSheet";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { useHouseShare } from "@/components/share/HouseShare";
import { StayCard } from "@/components/StayCard";
import { MyShare } from "@/components/payments/MyShare";
import { Container } from "@/components/layout/Container";
import { CrewVotes } from "@/components/stay/CrewVotes";
import { HouseCard } from "@/components/stay/HouseCard";
import { HouseActions, HouseCrew, HouseDay, HouseFacts, HouseFit, HouseJoinBar, HouseMore, HouseOffer, HouseSummary, HouseWhere, HouseWhy, RequestSummary } from "@/components/stay/HouseSections";
import { PaySheet } from "@/components/stay/PaySheet";
import { InviteBanner, InviteJoinSheet } from "@/components/stay/HouseInvites";
import { Button } from "@/components/ui/ActionButton";
import { iconButtonStyles } from "@/components/ui/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { againHref, createHref } from "@/components/create/model";
import { useFormat } from "@/i18n/format";
import { crewThreadId, findUser, getCrew, getCrewThread, getCurrentUser, getMyRequest, isBlocked, isCrewMember, useStore, validHouseInvite, houseInviteUrl } from "@/lib/store";
import type { JoinRequest, Stay } from "@/lib/types";
import { useHouseStage } from "@/lib/houseTransition";
import { memberStage } from "@/lib/joinFlow";
import { cn, housePhotos, openSpots } from "@/lib/utils";
import { SEARCH_HEAD_START_HOURS } from "@/config/explore";
import { inHeadStart, isListedStay } from "@/lib/launch";

export function StayDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const store = useStore();
  const stay = store.stays.find((s) => s.slug === slug);

  // Drafts (and Houses still waiting to be claimed) exist only for their host.
  if (!stay || ((stay.status === "draft" || stay.status === "draft_unclaimed") && stay.hostId !== store.currentUserId)) {
    return <StayUnavailable reason="notFound" />;
  }
  // Hosted by someone you blocked: as if it weren't there.
  if (isBlocked(store, stay.hostId)) return <StayUnavailable reason="blocked" exceptId={stay.id} />;
  // Closed: gone for everyone but the host and the crew (isCrewMember counts the host), who still need the page.
  if (stay.status === "closed" && !isCrewMember(store, stay, store.currentUserId)) return <StayUnavailable reason="closed" exceptId={stay.id} />;

  return <StayDetailContent stay={stay} />;
}

const UNAVAILABLE_ICONS = { notFound: SearchX, closed: DoorClosed, blocked: UserX } as const;
const MAX_OTHER_HOUSES = 3;

/** Missing, closed or blocked-host House: one friendly line, the way back, and a few open Houses to go on with. */
function StayUnavailable({ reason, exceptId }: { reason: keyof typeof UNAVAILABLE_ICONS; exceptId?: string }) {
  const t = useTranslations("safety.unavailable");
  const store = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const others = store.stays
    .filter((s) => s.id !== exceptId && isListedStay(s) && s.endDate >= today && !isBlocked(store, s.hostId))
    .slice(0, MAX_OTHER_HOUSES);

  return (
    <Container page>
      <div className="mx-auto max-w-xl">
        <EmptyState
          icon={UNAVAILABLE_ICONS[reason]}
          title={t(`${reason}Title`)}
          description={t(`${reason}Description`)}
          action={
            <Button href="/">{t("explore")}</Button>
          }
        />
      </div>
      {others.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-body-lg font-semibold">{t("others")}</h2>
          <div className="card-grid [--card-cols:3] [--card-min:280px]">
            {others.map((s) => (
              <StayCard key={s.id} stay={s} host={findUser(store, s.hostId)} crew={getCrew(store, s)} />
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}

function StayDetailContent({ stay }: { stay: Stay }) {
  const t = useTranslations("house");
  const store = useStore();
  const router = useRouter();
  const pathname = usePathname();
  useHouseStage();
  // ?preview=guest (host only) – read in its own boundary, so the page itself renders on the server for everyone.
  const [previewParam, setPreviewParam] = useState(false);
  const tPreview = useTranslations("common.ui.preview");
  const tCommon = useTranslations("common");
  const showToast = useToast();
  const offerInstall = useInstallNudge();
  const requireAuth = useRequireAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  /** The request sheet asks for a place on the waitlist instead of a spot */
  const [waitlistSheet, setWaitlistSheet] = useState(false);
  // When the page opened: whether an offer is still running (the store's clock drops it when it runs out).
  const [openedAt] = useState(() => new Date().toISOString());
  const tVerify = useTranslations("verification");
  const tWithdraw = useTranslations("withdraw");
  const format = useFormat();
  /** Bumped after a sent request – remounts the sheet so the next one starts empty. */
  const [requestKey, setRequestKey] = useState(0);
  function closeRequestSheet(sent: boolean) {
    setSheetOpen(false);
    if (!sent) return; // closed mid-way: keep the message for next time
    setRequestKey((k) => k + 1);
    // Only now, so the install nudge doesn't stack on top of the request sheet.
    offerInstall(hostFirstName);
  }
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  // ?invite=token – read in its own boundary, like ?preview.
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
  // Share: the system dialog where there is one, else the link is copied (see useHouseShare).
  const inviteFriends = useHouseShare(stay);

  const host = findUser(store, stay.hostId);
  const crew = getCrew(store, stay);
  // "Preview as guest" (?preview=guest, host only): render as a logged-out stranger; nothing changes data.
  const previewing = stay.hostId === store.currentUserId && previewParam;
  const myRequest = previewing ? undefined : getMyRequest(store, stay.id);
  const me = previewing ? undefined : getCurrentUser(store);
  // Requests work without a photo – but the host should see who's asking.
  const askForPhoto = myRequest?.status === "pending" && me !== undefined && me.photos.length === 0;
  const isHost = stay.hostId === store.currentUserId && !previewing;
  const isMember = !previewing && isCrewMember(store, stay, store.currentUserId);
  const spotsLeft = openSpots(stay);
  // A valid invite link (pending, not expired): reserved spot, banner, Join → account → payment. Used, expired or
  // cancelled ones simply don't match – the page is the normal one.
  const invite =
    !isHost && !isMember && !previewing && (stay.status === "published" || stay.status === "booked")
      ? validHouseInvite(store, stay.id, inviteToken)
      : undefined;
  const photos = housePhotos(stay, host);
  const summaryRef = useRef<HTMLDivElement>(null);
  const stage = previewing ? null : memberStage(store, stay, store.currentUserId);

  const { track } = store;
  const viewedByHost = stay.hostId === store.currentUserId;
  // Analytics: one view per House and browser tab (not the host looking at their own House).
  useEffect(() => {
    if (viewedByHost) return;
    const key = `simpulo:viewed:${stay.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // no session storage – count it anyway
    }
    track("house_viewed", { houseId: stay.id });
  }, [stay.id, viewedByHost, track]);

  function startRequest() {
    store.track("join_started", { houseId: stay.id });
    setWaitlistSheet(false);
    setSheetOpen(true);
  }

  /** Full House: "Join waitlist" is a request to the host too, with an optional message. */
  function startWaitlist() {
    setWaitlistSheet(true);
    setSheetOpen(true);
  }

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  const hostFirstName = host?.name.split(" ")[0] ?? t("theHost");

  /** Closed Houses: talk to the host directly (log in first if needed). */
  function messageHost() {
    if (previewing) return showToast(tPreview("noChanges"));
    requireAuth((userId) => {
      if (userId === stay.hostId) {
        router.push(`/your-houses/${stay.id}`);
        return;
      }
      // userId is passed explicitly: right after an inline login the store doesn't know the new user yet.
      router.push(`/messages/${store.openDirectThread(stay.id, stay.hostId, userId)}`);
    }, t("loginToMessage", { name: hostFirstName }));
  }

  function joinWithInvite() {
    requireAuth((userId) => {
      if (userId === stay.hostId) return showToast(t("ownHouse"));
      setInviteSheetOpen(true);
    }, t("inviteLink.loginToJoin"));
  }

  function respondToInvite(accept: boolean) {
    if (previewing) return showToast(tPreview("noChanges"));
    store.respondToInvite(stay.id, accept);
    showToast(accept ? t("invite.acceptedToast", { title: stay.title }) : t("invite.declinedToast"));
  }

  // The waitlist (src/lib/waitlist.ts): open once every spot is taken; your own place; a spot offered to you for 24h.
  const waitlist = waitlistOf(store, stay.id).flatMap((r) => findUser(store, r.userId) ?? []);
  const canJoin = !isHost && !isMember && !myRequest && stay.status === "published" && stay.acceptingRequests && spotsLeft > 0;
  // "full": the waitlist is the main action; "covered": every free spot has an open request – Request to join stays, the waitlist beside it.
  const waitlistWhy = waitlistReason(store, stay);
  const canWaitlist = !isHost && !isMember && !myRequest && stay.status === "published" && waitlistWhy !== null && waitlistOpen(store, stay);
  const myPosition = myRequest?.status === "waitlisted" ? waitlistPosition(store, stay.id, myRequest.userId) : null;
  const offer = myRequest?.status === "waitlisted" && hasOffer(myRequest, openedAt) ? myRequest : undefined;
  // Payments already due: taking the spot is paying for it.
  const payToTake = stay.accommodationStatus === "locked" && Boolean(stay.pricePerPerson) && stay.spotsFilled + 1 >= stay.spotsTotal;
  function takeSpot() {
    store.takeWaitlistSpot(stay.id);
    if (payToTake) setPaying(true);
  }
  // Only verified guests (the host's choice): no request without the check – and the way to it.
  const verifiedOnly = Boolean(stay.verifiedGuestsOnly) && !isHost && !isMember && !myRequest && !me?.verified;
  // An open request (to join or for the waitlist) can be taken back: a link under the actions, confirmed in a small popover.
  const withdrawNote =
    myRequest && !previewing && (myRequest.status === "pending" || myRequest.status === "waitlist_requested") ? (
      <ConfirmPopover
        trigger={tWithdraw(myRequest.status === "pending" ? "action" : "waitlistAction")}
        title={tWithdraw(myRequest.status === "pending" ? "title" : "waitlistTitle")}
        text={tWithdraw("text")}
        confirmLabel={tWithdraw("confirm")}
        cancelLabel={tWithdraw("keep")}
        onConfirm={() => {
          store.withdrawRequest(stay.id);
          showToast(tWithdraw("toast"));
        }}
        triggerClassName="text-small"
      />
    ) : null;
  const ctaNote = withdrawNote ?? (verifiedOnly && spotsLeft > 0
    ? tVerify.rich("verifiedOnlyHint", { link: (chunks) => <Link href="/settings#verification" className="font-semibold text-ink underline-offset-4 hover:underline">{chunks}</Link> })
    : offer?.offerExpiresAt
    ? t("page.offerUntil", { time: `${format.day(offer.offerExpiresAt)} ${format.time(offer.offerExpiresAt)}` })
    : canWaitlist && waitlistWhy === "covered" && canJoin
      ? t("page.allSpotsRequested")
      : canWaitlist || myRequest?.status === "waitlisted"
      ? t("page.waitlistMoveUp")
      : undefined);

  const ctaFor = (withSecondary: boolean) => (
    <StayCta
      withSecondary={withSecondary}
      stay={stay}
      isHost={isHost}
      request={myRequest}
      paymentDue={stage === "payment_due" && !isHost}
      onPay={() => setPaying(true)}
      spotsLeft={spotsLeft}
      invited={invite !== undefined}
      onJoinInvite={joinWithInvite}
      onRequest={startRequest}
      onMessageHost={messageHost}
      onRespond={respondToInvite}
      waitlist={{ can: canWaitlist, onJoin: startWaitlist, position: myPosition, offer: offer ? { pay: payToTake, onTake: takeSpot } : undefined }}
      verifiedOnly={verifiedOnly}
    />
  );
  const cta = ctaFor(true);

  // The crew-only and host-only panels: between the facts and the House's own story.
  const showOpenYourOwn = !isHost && !isMember && !invite && stay.status !== "closed" && stay.status !== "completed" && (myRequest?.status === "declined" || (!myRequest && (!stay.acceptingRequests || spotsLeft === 0)));
  /** A free spot: a link that holds it for 48h, on the clipboard. */
  async function inviteToSpot() {
    const created = store.createHouseInvite(stay.id, {});
    if (!created) return showToast(t("inviteLink.invalid"));
    try {
      await navigator.clipboard.writeText(houseInviteUrl(window.location.origin, stay, created));
      showToast(t("page.spotInviteCopied"));
    } catch {
      showToast(tCommon("linkCopyFailed"));
    }
  }
  const canInviteToSpot = isMember && (stay.status === "published" || stay.status === "booked");

  return (
    <PreviewProvider active={previewing}>
    <Suspense fallback={null}>
      <PreviewParam onChange={setPreviewParam} />
    </Suspense>
    {previewing && <PreviewBanner message={tPreview("house")} onExit={() => router.replace(pathname)} />}
    <Suspense fallback={null}>
      <InviteParam onChange={setInviteToken} />
    </Suspense>
    {invite && (
      <Container className="pt-4 md:pt-10">
        <InviteBanner stay={stay} invite={invite} />
      </Container>
    )}
    <Container className="pb-6 pt-4 md:pb-[calc(120px-var(--space-section))]">
      {/* The large card stays under the header; everything to read moves past it. Its column is exactly as wide as the card can be in this window. Between them the page's own margin (--page-margin): left edge = gap = right edge. */}
      <div className="grid items-start gap-x-(--page-margin) gap-y-8 split:grid-cols-[minmax(0,min(40%,560px,calc((100dvh-var(--header-h)-var(--band-h)-48px)*0.75)))_minmax(0,1fr)]">
        <HouseCard stay={stay} host={host} />
        <div className="flex min-w-0 flex-col gap-10">
          <HouseSummary
            ref={summaryRef}
            stay={stay}
            host={host}
            crew={crew}
            cta={cta}
            secondary={
              <>
                {!isHost && (
                  <Button variant="secondary" onClick={messageHost} data-preview-action aria-label={t("messageHost", { name: hostFirstName })}>
                    <MessageCircle aria-hidden />
                    {t("page.message")}
                  </Button>
                )}
                <Button variant="secondary" onClick={inviteFriends}>
                  <UserPlus aria-hidden />
                  {t("page.invite")}
                </Button>
              </>
            }
            stage={stage}
            note={ctaNote}
            showSteps={!isHost && !invite && stage !== "paid" && (stage !== null || canJoin)}
            actions={<HouseActions menu={!isHost && !previewing && <SafetyMenu target={{ kind: "stay", id: stay.id }} buttonClassName={iconButtonStyles("sm")} />} onBack={goBack} />}
          />
          <div className="space-y-6 empty:hidden">
        {/* Declined, or the crew is full (and the waitlist has no room): the same trip, as their own House. */}
        {showOpenYourOwn && !canWaitlist && <OpenYourOwn stay={stay} declined={myRequest?.status === "declined"} />}

        {/* Invited from a past crew: who asked, and that the spot waits for the answer (the buttons are the CTA). */}
        {myRequest?.status === "invited" && (
          <div className="flex items-start gap-4">
            <MailOpen className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
            <div className="min-w-0 text-body">
              <p className="font-semibold text-ink">{t("invite.title", { name: hostFirstName })}</p>
              <p className="mt-0.5 text-muted">{t("invite.text")}</p>
            </div>
          </div>
        )}

        {/* The host, right after opening it: who sees it so far. */}
        {isHost && stay.visibility === "unlisted" && <p className="text-body text-muted">{t("unlistedHint")}</p>}
        {isHost && stay.visibility !== "unlisted" && inHeadStart(stay) && <p className="text-body text-muted">{t("headStartHint", { hours: SEARCH_HEAD_START_HOURS })}</p>}

        {/* The crew's own WhatsApp / Telegram group: confirmed members only, once the crew is complete. */}
        {isMember && stay.crewGroupUrl && stay.spotsFilled >= stay.spotsTotal && (
          <Button variant="secondary" href={stay.crewGroupUrl} external>
            <ExternalLink aria-hidden />
            {t("openCrewGroup")}
          </Button>
        )}

        {/* Your own share, once paid. While it's due, the head's main action is paying. */}
        {stage === "paid" && <MyShare stay={stay} />}

        {askForPhoto && (
          <div className="flex items-center gap-4">
            <Camera className="size-5 shrink-0 text-muted" aria-hidden />
            <p className="min-w-0 flex-1 text-body text-ink">{t("photoPrompt", { name: hostFirstName })}</p>
            <Button variant="secondary" onClick={() => requireAuth(() => setPhotoSheetOpen(true), t("loginToAddPhoto"))}>
              {t("addPhoto")}
            </Button>
          </div>
        )}
      </div>

          <HouseFacts stay={stay} host={host} />
          <HouseWhy stay={stay} />
          <HouseCrew
            stay={stay}
            crew={crew}
            waitlist={waitlist}
            myWaitlist={myPosition ? { position: myPosition } : myRequest?.status === "waitlist_requested" ? { requested: true } : undefined}
            canJoin={canJoin}
            onJoin={startRequest}
            onInvite={canInviteToSpot ? () => void inviteToSpot() : undefined}
          />
          <CrewVotes stay={stay} />
          <HouseOffer stay={stay} />
          <HouseDay stay={stay} />
          <HouseFit stay={stay} />
          <HouseWhere stay={stay} canOpenChat={isMember && getCrewThread(store, stay.id) !== undefined} />
        </div>
      </div>

      <HouseMore stay={stay} />

      <HouseJoinBar stay={stay} photo={photos[0]} joinCardRef={summaryRef} cta={ctaFor(false)} />

      <PaySheet stay={stay} open={paying} onClose={() => setPaying(false)} />
      <PhotoSheet open={photoSheetOpen} onClose={() => setPhotoSheetOpen(false)} />
      {invite && <InviteJoinSheet stay={stay} invite={invite} open={inviteSheetOpen} onClose={() => setInviteSheetOpen(false)} />}
      <RequestSheet
        key={requestKey}
        waitlist={waitlistSheet}
        stay={stay}
        photo={photos[0]}
        open={sheetOpen}
        hostName={hostFirstName}
        loggedIn={me !== undefined}
        blockedNote={previewing ? tPreview("hostRequestsDisabled") : undefined}
        onClose={closeRequestSheet}
        // Called with the logged-in user – right away, or after the sheet's own login step.
        onSend={(message, userId) => {
          if (userId === stay.hostId) {
            setSheetOpen(false);
            showToast(t("ownHouse"));
            return false;
          }
          if (waitlistSheet) store.requestWaitlist(stay.id, message);
          else store.requestToJoin(stay.id, message);
          return true;
        }}
      />
    </Container>
    </PreviewProvider>
  );
}

/**
 * Reports ?preview=guest to the House page. useSearchParams makes everything up to the nearest Suspense render
 * only in the browser – here that's just this empty component, not the House.
 */
function PreviewParam({ onChange }: { onChange: (preview: boolean) => void }) {
  const preview = useSearchParams().get("preview") === "guest";
  useEffect(() => onChange(preview), [preview, onChange]);
  return null;
}

/** Old invite links (?invite=token on the House page) go to the invite's own page, /invite/[token]. */
function InviteParam({ onChange }: { onChange: (token: string | null) => void }) {
  const token = useSearchParams().get("invite");
  const router = useRouter();
  useEffect(() => {
    if (token) router.replace(`/invite/${token}`);
    else onChange(null);
  }, [token, onChange, router]);
  return null;
}

/** "Open your own House for the same dates" – prefilled in /create (region + dates). */
function OpenYourOwn({ stay, declined }: { stay: Stay; declined: boolean }) {
  const t = useTranslations("growth.ownHouse");
  const format = useFormat();
  const dates = format.stayDatesLong(stay);
  const place = format.placeName(stay);
  return (
    <div>
      <p className="font-semibold">{declined ? t("titleDeclined") : t("titleFull")}</p>
      <p className="mt-1 text-small text-muted">
        {stay.startDate && stay.endDate ? t("text", { dates, place }) : t("textNoDates", { place })}
      </p>
      <Button variant="secondary" href={createHref({ region: stay.region, from: stay.startDate, to: stay.endDate })} className="mt-4">
        <Plus aria-hidden />
        {t("action")}
      </Button>
    </div>
  );
}

interface StayCtaProps {
  stay: Stay;
  isHost: boolean;
  request?: JoinRequest;
  /** The crew is complete and the place chosen: paying is the next step */
  paymentDue: boolean;
  onPay: () => void;
  spotsLeft: number;
  /** A valid invite link: Join takes the reserved spot (account, then payment) */
  invited: boolean;
  onJoinInvite: () => void;
  onRequest: () => void;
  onMessageHost: () => void;
  /** Invited from a past crew: accept or decline */
  onRespond: (accept: boolean) => void;
  /** Full House: join the waitlist; your place on it; a spot offered to you (take it – or pay for it, once payments are due) */
  waitlist: { can: boolean; onJoin: () => void; position: number | null; offer?: { pay: boolean; onTake: () => void } };
  /** Beside "Request to join", when every free spot has an open request: secondary "Join waitlist" (not in the floating bar) */
  withSecondary: boolean;
  /** The host takes only verified guests, and the viewer isn't one */
  verifiedOnly: boolean;
}

const noSubscribe = () => () => {};
const todayIso = () => new Date().toISOString().slice(0, 10);

function StayCta({ stay, isHost, request, paymentDue, onPay, spotsLeft, invited, onJoinInvite, onRequest, onMessageHost, onRespond, waitlist, withSecondary, verifiedOnly }: StayCtaProps) {
  const t = useTranslations("request.cta");
  const tVerifyCta = useTranslations("verification");
  // Today only in the browser: the server (and the prerender) must not read the clock – "" there, so nothing has ended yet.
  const today = useSyncExternalStore(noSubscribe, todayIso, () => "");
  // Exactly one primary on the page: whichever state the CTA is in replaces "Request to join" (the default below).
  const variant = "primary";
  const size = "md";
  // Over, and you were in it (host or crew): the same House again, with the same people.
  if (stay.status === "completed" && (isHost || request?.status === "accepted")) {
    return (
      <Button variant={variant} size={size} href={againHref(stay.id)}>
        <RotateCcw aria-hidden />
        {t("again")}
      </Button>
    );
  }
  if (isHost) {
    return (
      <Button variant={variant} size={size} href={`/your-houses/${stay.id}`}>
        {t("manage")}
      </Button>
    );
  }
  if (paymentDue) {
    return (
      <Button variant={variant} size={size} onClick={onPay} data-preview-action>
        {t("pay")}
      </Button>
    );
  }
  if (request?.status === "accepted") {
    return (
      <Button variant={variant} size={size} href={`/messages/${crewThreadId(stay.id)}`}>
        {t("accepted")}
      </Button>
    );
  }
  // Closed beats a pending request – there's nothing left to wait for.
  if (stay.status === "closed") {
    return (
      <Button variant={variant} size={size} disabled>
        {t("closed")}
      </Button>
    );
  }
  // Done (or past its end date): nothing to join any more.
  if (stay.status === "completed" || (today !== "" && stay.endDate < today)) {
    return (
      <Button variant={variant} size={size} disabled>
        {t("ended")}
      </Button>
    );
  }
  // Invite link: the reserved spot is theirs to take – no request, no waiting for the host.
  if (invited) {
    return (
      <Button variant={variant} size={size} onClick={onJoinInvite} data-preview-action>
        {t("join")}
      </Button>
    );
  }
  if (request?.status === "invited") {
    return (
      <div className="flex gap-2 *:flex-1">
        <Button variant={variant} size={size} onClick={() => onRespond(true)}>
          {t("acceptInvite")}
        </Button>
        <Button variant="secondary" size={size} onClick={() => onRespond(false)}>
          {t("declineInvite")}
        </Button>
      </div>
    );
  }
  if (request?.status === "pending") {
    return (
      <Button variant={variant} size={size} disabled>
        <Check aria-hidden />
        {t("pending")}
      </Button>
    );
  }
  // The waitlist: a spot offered to you, your request, your place.
  if (waitlist.offer) {
    return (
      <Button variant={variant} size={size} onClick={waitlist.offer.onTake} data-preview-action>
        {waitlist.offer.pay ? t("payForSpot") : t("takeSpot")}
      </Button>
    );
  }
  if (request?.status === "waitlist_requested") {
    return (
      <Button variant={variant} size={size} disabled>
        <Check aria-hidden />
        {t("waitlistRequested")}
      </Button>
    );
  }
  if (request?.status === "waitlisted") {
    return (
      <Button variant={variant} size={size} disabled>
        {t("waitlisted", { position: waitlist.position ?? 1 })}
      </Button>
    );
  }
  if (request?.status === "declined") {
    return (
      <Button variant={variant} size={size} disabled>
        {t("declined")}
      </Button>
    );
  }
  // Every spot is taken: the waitlist, while it has room.
  if (spotsLeft === 0 && waitlist.can) {
    return (
      <Button variant={variant} size={size} onClick={waitlist.onJoin} data-preview-action>
        {t("waitlist")}
      </Button>
    );
  }
  if (spotsLeft === 0) {
    return (
      <Button variant={variant} size={size} disabled>
        {t("full")}
      </Button>
    );
  }
  // The host closed requests: no new request, but you can still reach the host.
  if (!stay.acceptingRequests) {
    return (
      <Button variant={variant} size={size} onClick={onMessageHost}>
        {t("crewSet")}
      </Button>
    );
  }
  if (verifiedOnly) {
    return (
      <Button variant={variant} size={size} disabled>
        {tVerifyCta("verifiedOnlyCta")}
      </Button>
    );
  }
  // The page's one primary: "Request to join". Every free spot already asked for: the waitlist beside it, secondary.
  const join = (
    <Button variant={variant} size={size} onClick={onRequest} data-preview-action>
      {t("join")}
    </Button>
  );
  if (waitlist.can && withSecondary) {
    return (
      <>
        {join}
        <Button variant="secondary" size={size} onClick={waitlist.onJoin} data-preview-action>
          {t("waitlist")}
        </Button>
      </>
    );
  }
  return join;
}

/** The confirmation stays this long, then the window closes by itself. */
const REQUEST_SENT_MS = 2400;

interface RequestSheetProps {
  /** A request for a place on the waitlist (full House) */
  waitlist?: boolean;
  stay: Stay;
  photo?: string;
  open: boolean;
  hostName: string;
  loggedIn: boolean;
  /** `sent` tells the parent whether a request went out. */
  onClose: (sent: boolean) => void;
  /** Sends the request as `userId`; false when it can't be sent (e.g. it's the user's own House). */
  onSend: (message: string, userId: string) => boolean;
  /** Preview: the sheet works, but sending only shows this note (no login step, nothing sent) */
  blockedNote?: string;
}

type RequestStep = "message" | "login" | "sent";
const REQUEST_STEPS: readonly RequestStep[] = ["message", "login", "sent"];

/**
 * One fixed-size modal, three steps sliding horizontally: message → (logged out) login → sent.
 * The message lives here, so going back from the login step – or closing mid-way – never loses it.
 */
function RequestSheet({ waitlist = false, stay, photo, open, hostName, loggedIn, onClose, onSend, blockedNote }: RequestSheetProps) {
  const t = useTranslations("request");
  const tAge = useTranslations("age");
  const store = useStore();
  const { currentUserId } = store;
  const me = store.users.find((u) => u.id === currentUserId);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<RequestStep>("message");
  const [blocked, setBlocked] = useState(false);
  // 18+: the date of birth is asked here the first time (progressive profile); under 18, a friendly no – nothing is sent.
  const [birth, setBirth] = useState("");
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const tooYoung = (iso: string) => ageOn(iso, today) < MIN_AGE;
  const refused = Boolean(me?.birthDate && tooYoung(me.birthDate));
  const [refusedNow, setRefusedNow] = useState(false);

  function send(userId: string) {
    const user = store.users.find((u) => u.id === userId);
    const date = user?.birthDate || birth;
    // Logged in just now and no date of birth yet: back to the form, which asks for it.
    if (!date) return setStep("message");
    if (tooYoung(date)) {
      setRefusedNow(true);
      return setStep("message");
    }
    if (!user?.birthDate) store.updateCurrentUser({ birthDate: date });
    if (onSend(message, userId)) setStep("sent");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (blockedNote) return setBlocked(true);
    if (loggedIn && currentUserId) send(currentUserId);
    else setStep("login");
  }

  function close() {
    const sent = step === "sent";
    if (!sent) setStep("message");
    onClose(sent);
  }

  const index = REQUEST_STEPS.indexOf(step);

  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (step !== "sent") return;
    const timer = setTimeout(() => closeRef.current(), REQUEST_SENT_MS);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <Sheet
      open={open}
      onClose={close}
      title={t(step === "login" ? "steps.login" : waitlist ? "steps.waitlist" : "steps.message")}
      subtitle={step === "login" ? t("loginSubtitle", { name: hostName }) : undefined}
      onBack={step === "login" ? () => setStep("message") : undefined}
    >
      {/* Horizontal track: each step is one full-width pane; inactive panes are inert. 4px of air at the sides for the field's focus ring. */}
      <div className="-mx-1 overflow-x-clip px-1">
        <div
          className="flex items-stretch gap-2 transition-transform duration-250 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(calc(${index} * (-100% - 8px)))` }}
        >
          <Pane active={step === "message"}>
            {refused || refusedNow ? (
              <div className="flex flex-col gap-3 py-2">
                <p className="text-h3 text-ink">{tAge("tooYoungTitle")}</p>
                <p className="text-body text-muted">{tAge("tooYoungText")}</p>
                <ModalFooter>
                  <Button variant="secondary" onClick={close}>
                    {tAge("close")}
                  </Button>
                </ModalFooter>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <RequestSummary stay={stay} photo={photo} />
              {!loggedIn && (
                <p className="flex items-center gap-2 text-small text-muted">
                  <Lock className="size-3.5 shrink-0" aria-hidden />
                  {t("loginNote")}
                </p>
              )}
              <div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  autoFocus
                  aria-label={t("messageLabel", { name: hostName })}
                  placeholder={t("placeholder")}
                  className={cn(formTextarea, "min-h-30")}
                />
                <p className="mt-2 text-small text-muted">{waitlist ? t("waitlistNote", { name: hostName }) : t("optionalNote")}</p>
              </div>
              {loggedIn && me && !me.birthDate && (
                <FormField label={tAge("label")} helper={tAge("helper")}>
                  <input type="date" required value={birth} max={today} onChange={(e) => setBirth(e.target.value)} className={formInput} />
                </FormField>
              )}
              {blocked && blockedNote && (
                <p role="alert" className="text-body text-ink">
                  {blockedNote}
                </p>
              )}
              <ModalFooter onCancel={close}>
                <Button type="submit" size="md">
                  {loggedIn ? t("send") : t("continue")}
                </Button>
              </ModalFooter>
            </form>
            )}
          </Pane>

          <Pane active={step === "login"}>
            {/* Mounted only on this step, so the provider picker always starts fresh. */}
            {step === "login" && <AuthOptions onSuccess={send} />}
          </Pane>

          <Pane active={step === "sent"}>
            <div role="status" className="flex h-full flex-col items-center justify-center gap-4 text-center">
              {step === "sent" && (
                <>
                  <span className="flex size-14 items-center justify-center rounded-full bg-ink/6 text-ink motion-safe:animate-check-in">
                    <Check className="size-7" strokeWidth={2.5} aria-hidden />
                  </span>
                  <p className="max-w-sm text-body-lg font-semibold text-ink">{t(waitlist ? "waitlistSentTo" : "sentTo", { name: hostName })}</p>
                </>
              )}
            </div>
          </Pane>
        </div>
      </div>
    </Sheet>
  );
}

function Pane({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div aria-hidden={!active} inert={!active} className="w-full shrink-0">
      {children}
    </div>
  );
}
