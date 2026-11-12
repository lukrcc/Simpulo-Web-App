"use client";

import { useDevSetting } from "@/lib/devSettings";
import { paidOverlapOf } from "@/lib/overlap";
import { shortNameOf } from "@/lib/shortName";
import Link from "next/link";
import { Camera, Check, DoorClosed, ExternalLink, Lock, MailOpen, MessageCircle, Plus, RotateCcw, SearchX, Share, UserPlus, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, use, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { ConfirmPopover } from "@/components/ui/ConfirmPopover";
import { ageOn, MIN_AGE } from "@/lib/birthDate";
import { audienceFit, didntWorkOut } from "@/lib/requests";
import { hasOffer, waitlistOf, waitlistOpen, waitlistPosition, waitlistReason } from "@/lib/waitlist";
import { AuthOptions } from "@/components/auth/AuthSheet";
import { FormField, formInput, formTextarea } from "@/components/form/FormLayout";
import { useOfferInstall } from "@/components/installPromptContext";
import { PreviewBanner, PreviewProvider } from "@/components/PreviewMode";
import { PhotoSheet } from "@/components/PhotoSheet";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { HouseQrSheet } from "@/components/stay/HouseQrSheet";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { useHouseShare } from "@/components/share/HouseShare";
import { HouseCard } from "@/components/HouseCard";
import { MyShare } from "@/components/payments/MyShare";
import { Container } from "@/components/layout/Container";
import { CrewVotes } from "@/components/stay/CrewVotes";
import { HouseHero } from "@/components/stay/HouseHero";
import { LeaveSheet, MemberHero, MemberSections, useStepContent } from "@/components/stay/MemberHouse";
import { InviteSheet } from "@/components/InviteSheet";
import { useCanInvite } from "@/lib/invites";
import { guestJourney } from "@/config/house-steps";
import { useHouseRole } from "@/lib/useHouseRole";
import { HouseActions, HouseCrew, HouseDay, HouseLooking, HouseRules, HouseJoinBar, HouseMore, HouseOffer, HouseWhere, HouseWhy, RequestSummary } from "@/components/stay/HouseSections";
import { PaySheet } from "@/components/stay/PaySheet";
import { InviteBanner, InviteJoinSheet } from "@/components/stay/HouseInvites";
import { Button } from "@/components/ui/ActionButton";
import { iconButtonStyles } from "@/components/ui/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { againHref, createHref } from "@/components/create/model";
import { useFormat } from "@/i18n/format";
import { crewInOf, crewThreadId, findUser, getCrew, getCrewThread, getCurrentUser, getMyRequest, isBlocked, isCrewMember, settingsOf, useStore, validHouseInvite } from "@/lib/store";
import type { JoinRequest, Stay } from "@/lib/types";
import { useHouseStage } from "@/lib/houseTransition";
import { memberStage } from "@/lib/joinFlow";
import { cn, housePhotos, openSpots } from "@/lib/utils";
import { SEARCH_HEAD_START_HOURS } from "@/config/explore";
import { inHeadStart, isListedStay } from "@/lib/launch";

export function StayDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const store = useStore();
  // /h/[id] takes the id or the slug; /house/[slug] the slug.
  const stay = store.stays.find((s) => s.slug === slug || s.id === slug);

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
              <HouseCard key={s.id} stay={s} host={findUser(store, s.hostId)} crew={getCrew(store, s)} />
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}

function StayDetailContent({ stay }: { stay: Stay }) {
  const t = useTranslations("house");
  const tOverlap = useTranslations("overlap");
  const store = useStore();
  const router = useRouter();
  const pathname = usePathname();
  useHouseStage();
  // ?preview=guest (host only) – read in its own boundary, so the page itself renders on the server for everyone.
  const [previewParam, setPreviewParam] = useState(false);
  const tPreview = useTranslations("common.ui.preview");
  const tCommon = useTranslations("common");
  const showToast = useToast();
  const offerInstall = useOfferInstall();
  const requireAuth = useRequireAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  /** The request asks for two spots ("Request with a friend") */
  const [withFriend, setWithFriend] = useState(false);
  /** The invite sheet (components/InviteSheet) – the one way to bring people in */
  const [inviting, setInviting] = useState(false);
  /** ?with=<request id>: a friend's link – confirm to request together */
  const [friendParam, setFriendParam] = useState<string | null>(null);
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
    setFocusParam(null);
    if (!sent) return; // closed mid-way: keep the message for next time
    setRequestKey((k) => k + 1);
    // Only now, so the install prompt doesn't stack on top of the request sheet.
    offerInstall("request", { hostName: hostFirstName });
  }
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const tInstall = useTranslations("install");
  const [paying, setPaying] = useState(false);
  // ?invite=token – read in its own boundary, like ?preview.
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
  // Share: the system dialog where there is one, else the link is copied (see useHouseShare).
  const inviteFriends = useHouseShare(stay);
  const tInvite = useTranslations("invite");
  // Host or crew, a free spot, not started: the invite sheet (lib/invites.ts).
  const canBring = useCanInvite(stay.id);
  // A friend's link (?with=): their open "with a friend" request in this House.
  const friendRequest = friendParam ? store.joinRequests.find((r) => r.id === friendParam && r.stayId === stay.id && r.withFriend && (r.status === "pending" || r.status === "accepted")) : undefined;
  const friendOwner = friendRequest ? findUser(store, friendRequest.userId) : undefined;
  const friendName = friendOwner ? friendOwner.name.split(" ")[0] : "";

  const host = findUser(store, stay.hostId);
  const crew = getCrew(store, stay);
  // "Preview as guest" (?preview=guest, host only): render as a logged-out stranger; nothing changes data.
  const previewing = stay.hostId === store.currentUserId && previewParam;
  // Dev menu "House role" (dev only; "auto" elsewhere): the page acts as that role, whatever the real one is – a visitor has no request.
  const devRole = useDevSetting("houseRole");
  const myRequest = previewing || devRole === "visitor" ? undefined : getMyRequest(store, stay.id);
  // Who invited me (the host or someone in the crew) – for "Don't invite me again".
  const inviterId = myRequest?.status === "invited" ? (myRequest.invitedBy ?? stay.hostId) : stay.hostId;
  const inviterName = findUser(store, inviterId)?.name.split(" ")[0] ?? "";
  const me = previewing ? undefined : getCurrentUser(store);
  // Requests work without a photo – but the host should see who's asking.
  const askForPhoto = myRequest?.status === "pending" && me !== undefined && me.photos.length === 0;
  const isHost = !previewing && (devRole === "auto" ? stay.hostId === store.currentUserId : devRole === "host");
  const isMember = !previewing && (devRole === "auto" ? isCrewMember(store, stay, store.currentUserId) : devRole === "member");
  const spotsLeft = openSpots(stay);
  // A valid invite link (pending, not expired): reserved spot, banner, Join → account → payment. Used, expired or
  // cancelled ones simply don't match – the page is the normal one.
  const invite =
    !isHost && !isMember && !previewing && (stay.status === "published" || stay.status === "booked")
      ? validHouseInvite(store, stay.id, inviteToken)
      : undefined;
  const photos = housePhotos(stay, host);
  const summaryRef = useRef<HTMLElement>(null);
  const stage = previewing ? null : memberStage(store, stay, store.currentUserId);
  // Who's looking (lib/useHouseRole.ts): a member (requested, accepted, paying, paid) gets their way through the House instead of "Request to join".
  const { role: liveRole } = useHouseRole(stay.id);
  const role = previewing ? "visitor" : liveRole;
  const [leaving, setLeaving] = useState(false);
  const journey = guestJourney(stay, myRequest, store.payments.find((p) => p.stayId === stay.id && p.userId === store.currentUserId && p.status !== "refunded"), openedAt, crewInOf(store, stay));
  const crewThread = getCrewThread(store, stay.id);
  // ?focus= (Needs you, notifications): a member's "pay" opens the pay sheet; the host is sent on to the management page with it.
  const [focusParam, setFocusParam] = useState<string | null>(null);
  useEffect(() => {
    if (!focusParam) return;
    // The step in view: the head (the member's Ember step, the host's status) scrolls up under the header.
    summaryRef.current?.scrollIntoView({ block: "start" });
    // The host: to the management page – except "invite", which opens the invite sheet right here.
    if (role === "host" && focusParam !== "invite") router.replace(`/h/${stay.id}/manage?focus=${focusParam}`);
  }, [focusParam, role, router, stay.id]);
  // A member's ?focus=pay opens the pay sheet once (closing it clears the focus).
  const payOpen = paying || (role === "member" && focusParam === "pay");
  // ?focus=invite (host or crew, "Fill 3 spots"): the invite sheet; ?focus=request (a visitor, "Join them"): the request sheet.
  const clearFocus = () => setFocusParam(null);

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
    setWithFriend(false);
    setWaitlistSheet(false);
    setSheetOpen(true);
  }

  /** "Request with a friend": the same request, for two spots; the friend confirms through a link afterwards. */
  function startRequestWithFriend() {
    store.track("join_started", { houseId: stay.id });
    setWithFriend(true);
    setWaitlistSheet(false);
    setSheetOpen(true);
  }

  /** The friend's link: /h/[id]?with=<request id>. */
  async function copyFriendLink(requestId: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/h/${stay.id}?with=${requestId}`);
      showToast(tInvite("copied", { hours: 48 }));
    } catch {
      showToast(tCommon("linkCopyFailed"));
    }
  }

  /** Opened from a friend's link: request too, paired with theirs. */
  function confirmWithFriend(pairedWith: string) {
    requireAuth((userId) => {
      if (userId === stay.hostId) return showToast(t("ownHouse"));
      store.requestToJoin(stay.id, "", { pairedWith });
      setFriendParam(null);
      showToast(tInvite("friendDone", { name: friendName }));
    }, { reason: "join", hostName: host?.name.split(" ")[0] });
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
        router.push(`/h/${stay.id}/manage`);
        return;
      }
      // userId is passed explicitly: right after an inline login the store doesn't know the new user yet.
      const threadId = store.openDirectThread(stay.id, stay.hostId, userId);
      if (threadId) router.push(`/messages/${threadId}`);
    }, { reason: "message", hostName: host?.name.split(" ")[0] });
  }

  function joinWithInvite() {
    requireAuth((userId) => {
      if (userId === stay.hostId) return showToast(t("ownHouse"));
      setInviteSheetOpen(true);
    }, { reason: "join", hostName: host?.name.split(" ")[0] });
  }

  function respondToInvite(accept: boolean) {
    if (previewing) return showToast(tPreview("noChanges"));
    store.respondToInvite(stay.id, accept);
    // In: "Bring someone?" right away – the toast's action opens the invite sheet (it shows once there's a free spot).
    // (The invite's spot was held already: accepting leaves the open spots as they are.)
    if (accept && openSpots(stay) > 0) showToast(t("invite.acceptedToast", { title: stay.title }), undefined, undefined, { ms: 8000, action: { label: tInvite("bringSomeone", { count: openSpots(stay) }), onClick: () => setInviting(true) } });
    else showToast(accept ? t("invite.acceptedToast", { title: stay.title }) : t("invite.declinedToast"));
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
  // An audience House (women only): a calm line above the button. The profile says otherwise → the button stays, but can't be pressed;
  // the profile doesn't say (or logged out) → the same line, and the request goes through – the host decides.
  const audience = !isHost && !isMember && !myRequest ? audienceFit(stay, me) : "none";
  // Blocked by the host (DIRECT_MESSAGE_POLICY): no request to their House – the button stays, not pressable, with a neutral line.
  const blockedByHost = !isHost && !isMember && !myRequest && me !== undefined && settingsOf(findUser(store, stay.hostId)).blockedUserIds.includes(me.id);
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
  // Already in another House on these dates (paid): said calmly; the request still goes out (PARALLEL_POLICY).
  const paidClash = !isHost ? paidOverlapOf(store, stay) : null;
  const overlapNotice = paidClash ? tOverlap("alreadyIn", { name: shortNameOf(paidClash) }) : undefined;
  const ctaNote = withdrawNote ?? (blockedByHost
    ? t("page.notForYou")
    : verifiedOnly && spotsLeft > 0
    ? tVerify.rich("verifiedOnlyHint", { link: (chunks) => <Link href="/settings#payments" className="font-semibold text-ink underline-offset-4 hover:underline">{chunks}</Link> })
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
      big={withSecondary}
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
      audienceBlocked={audience === "blocked" || blockedByHost}
    />
  );
  const cta = ctaFor(true);

  // The crew-only and host-only panels: between the facts and the House's own story.
  const showOpenYourOwn = !isHost && !isMember && !invite && stay.status !== "closed" && stay.status !== "completed" && (didntWorkOut(myRequest) || (!myRequest && (!stay.acceptingRequests || spotsLeft === 0)));
  const stepContent = useStepContent(stay, host, journey, { onPay: () => setPaying(true), onInvite: () => (canBring ? setInviting(true) : inviteFriends()), now: openedAt });
  // The host's line in the head: "3 of 6 in · 2 requests" (management lives at /h/[id]/manage).
  const openRequests = store.joinRequests.filter((r) => r.stayId === stay.id && (r.status === "pending" || r.status === "waitlist_requested")).length;
  // Under the host's price only what needs them: "● 1 request to review" (orange dot) → Manage. The crew stands in the right column.
  const hostStatus =
    openRequests > 0 ? (
      <Link href={`/h/${stay.id}/manage?focus=requests`} className="inline-flex items-center gap-2 font-semibold text-ink underline-offset-4 hover:underline">
        <span aria-hidden className="size-2 rounded-full bg-accent" />
        {t("page.requestsToReview", { count: openRequests })}
      </Link>
    ) : undefined;

  return (
    <PreviewProvider active={previewing}>
    <Suspense fallback={null}>
      <PreviewParam onChange={setPreviewParam} />
    </Suspense>
    {previewing && <PreviewBanner message={tPreview("house")} onExit={() => router.replace(pathname)} />}
    <Suspense fallback={null}>
      <InviteParam onChange={setInviteToken} />
    </Suspense>
    <Suspense fallback={null}>
      <FocusParam onChange={setFocusParam} />
    </Suspense>
    <Suspense fallback={null}>
      <FriendParam onChange={setFriendParam} />
    </Suspense>
    {friendRequest && !myRequest && role === "visitor" && (
      <Container className="pt-4 md:pb-8 md:pt-6">
        <div className="card-soft flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6">
          <div className="min-w-0 max-w-[560px]">
            <p className="text-h3 text-ink">{tInvite("friendTitle", { name: friendName })}</p>
            <p className="mt-1 text-body text-muted">{tInvite("friendText", { name: friendName, host: hostFirstName, title: stay.title })}</p>
          </div>
          <Button onClick={() => confirmWithFriend(friendRequest.id)}>{tInvite("friendConfirm")}</Button>
        </div>
      </Container>
    )}
    {invite && (
      <Container className="pt-4 md:pb-8 md:pt-10">
        <InviteBanner stay={stay} invite={invite} />
      </Container>
    )}
    {/* The House as the page's main object: the full-width band under the header (components/HeroBand). */}
      {role === "member" ? (
        <MemberHero ref={summaryRef} stay={stay} host={host} crew={crew} journey={journey} content={stepContent} chatHref={myRequest?.status === "accepted" && crewThread ? `/messages/${crewThreadId(stay.id)}` : null} onLeave={() => setLeaving(true)} />
      ) : (
      <HouseHero
          ref={summaryRef}
          stay={stay}
          host={host}
          crew={crew}
          cta={cta}
          // Several spots open and the visitor can still ask: the crew tile offers asking together too.
          onRequestWithFriend={!isHost && canJoin && !myRequest ? startRequestWithFriend : undefined}
          secondary={
            <>
              {/* One row for visitors: "Request to join" (cream) · "Request with a friend" (outline) · Message host as a round 48px icon.
                  The host and crew invite through the crew's "+" circles (components/CrewRow); sharing sits top right beside "…". */}
              {!isHost && canJoin && !myRequest && (
                <Button variant="creamOutline" size="lg" onClick={startRequestWithFriend} data-preview-action>
                  <UserPlus aria-hidden />
                  {tInvite("requestWithFriend")}
                </Button>
              )}
              {!isHost && (
                <Button variant="creamOutline" size="lg" icon onClick={messageHost} data-preview-action aria-label={t("messageHost", { name: hostFirstName })}>
                  <MessageCircle aria-hidden />
                </Button>
              )}
            </>
          }
          stage={stage}
          note={ctaNote}
          notice={isHost ? hostStatus : audience === "blocked" || audience === "unknown" ? t("page.audienceWomen") : overlapNotice}
          showSteps={!isHost && !invite && stage !== "paid" && (stage !== null || canJoin)}
          actions={
            <HouseActions
              share={
                previewing ? undefined : (
                  <button type="button" onClick={inviteFriends} aria-label={tInvite("share")} className={iconButtonStyles("sm")}>
                    <Share className="size-4" aria-hidden />
                  </button>
                )
              }
              menu={
                previewing ? undefined : isHost ? (
                  <MoreMenu items={[{ label: tInstall("qrMenu"), onSelect: () => setQrOpen(true) }]} label={tCommon("ui.moreMenu.moreOptions")} buttonClassName={iconButtonStyles("sm")} />
                ) : (
                  <SafetyMenu target={{ kind: "stay", id: stay.id }} extraItems={[{ label: tInstall("qrMenu"), onSelect: () => setQrOpen(true) }]} buttonClassName={iconButtonStyles("sm")} />
                )
              }
              onBack={goBack}
            />
          }
        />
      )}
    <Container className="explore-width">
      {/* Under the band, 48px down: the sections in one order, 40px apart, right on the page's background. Text reads at most 760px wide. */}
      <div className="mt-12 flex flex-col gap-10">
        {/* What only applies to you right now: declined or full, an invite, the host's hints, the crew group, your share, a photo. */}
        {role === "member" && <MemberSections stay={stay} crew={crew} />}
        <div className="flex max-w-[760px] flex-col gap-6 empty:hidden">
          {/* Declined, or the crew is full (and the waitlist has no room): the same trip, as their own House. */}
          {showOpenYourOwn && !canWaitlist && <OpenYourOwn stay={stay} declined={didntWorkOut(myRequest)} />}

          {/* Invited from a past crew: who asked, and that the spot waits for the answer (the buttons are the CTA). */}
          {myRequest?.status === "invited" && (
            <div className="flex items-start gap-4">
              <MailOpen className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
              <div className="min-w-0 text-body">
                <p className="font-semibold text-ink">{t("invite.title", { name: inviterName })}</p>
                <p className="mt-0.5 text-muted">{t("invite.text")}</p>
                {/* "Don't invite me again": no more invites from this person – this one is declined, nobody is told. */}
                <button
                  type="button"
                  onClick={() => {
                    if (previewing) return showToast(tPreview("noChanges"));
                    store.stopInvitesFrom(inviterId);
                    showToast(tInvite("stopped", { name: inviterName }));
                  }}
                  className="mt-2 text-small font-semibold text-muted underline-offset-4 transition-colors duration-150 hover:text-ink hover:underline"
                >
                  {tInvite("dontInviteAgain")}
                </button>
              </div>
            </div>
          )}

          {/* The host, right after opening it: who sees it so far. */}
          {isHost && stay.visibility === "unlisted" && <p className="text-body text-muted">{t("unlistedHint")}</p>}
          {isHost && stay.visibility !== "unlisted" && inHeadStart(stay) && <p className="text-body text-muted">{t("headStartHint", { hours: SEARCH_HEAD_START_HOURS })}</p>}

          {/* The crew's own WhatsApp / Telegram group: confirmed members only, once the crew is complete. */}
          {isMember && stay.crewGroupUrl && stay.spotsFilled >= stay.spotsTotal && (
            <Button variant="secondary" href={stay.crewGroupUrl} external className="self-start">
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
              <Button variant="secondary" onClick={() => requireAuth(() => setPhotoSheetOpen(true), { reason: "login" })}>
                {t("addPhoto")}
              </Button>
            </div>
          )}
        </div>

        {/* Two columns from 1100px on the 12-column grid, right on the page's background: left 7 – Why I'm hosting · A typical day · Who I'm
            looking for; right 5, after a 1px line ink 8 % – The crew · House rules · What's included, lines between them. No boxes. */}
        <div className="grid gap-10 split:grid-cols-12 split:gap-0">
          <div className="flex min-w-0 flex-col gap-10 split:col-span-7 split:pr-12">
            <div className="empty:hidden">
              <HouseWhy stay={stay} />
            </div>
            <div className="empty:hidden">
              <HouseDay stay={stay} />
            </div>
            <div className="empty:hidden">
              <HouseLooking stay={stay} />
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-8 split:col-span-5 split:border-l split:border-ink/8 split:pl-12 [&>:not(:empty)~:not(:empty)]:border-t [&>:not(:empty)~:not(:empty)]:border-ink/8 [&>:not(:empty)~:not(:empty)]:pt-8">
            {/* A member has the crew (and the vote on the place) above already. */}
            {role !== "member" && (
              <div className="flex flex-col gap-8">
                <HouseCrew
                  stay={stay}
                  crew={crew}
                  waitlist={waitlist}
                  myWaitlist={myPosition ? { position: myPosition } : myRequest?.status === "waitlist_requested" ? { requested: true } : undefined}
                  canJoin={canJoin}
                  onJoin={startRequest}
                  onInvite={canBring ? () => setInviting(true) : undefined}
                />
                <CrewVotes stay={stay} />
              </div>
            )}
            <div className="empty:hidden">
              <HouseRules stay={stay} />
            </div>
            <div className="empty:hidden">
              <HouseOffer stay={stay} />
            </div>
          </div>
        </div>
      </div>
    </Container>

    <Container className="explore-width pb-24 md:pb-[calc(120px-var(--space-section))]">
      {/* Where you'll be: the static map left, the area and how the place is picked right. */}
      <div className="mt-14">
        <HouseWhere stay={stay} />
      </div>
      <HouseMore stay={stay} />

      {/* The floating bar: a member sees the current step and its action instead of "Request to join". */}
      <HouseJoinBar
        stay={stay}
        photo={photos[0]}
        joinCardRef={summaryRef}
        line={role === "member" ? stepContent.title : undefined}
        cta={
          role === "member" ? (
            stepContent.action ? (
              stepContent.action.href ? (
                <Button size="md" href={stepContent.action.href} external={stepContent.action.external}>
                  {stepContent.action.label}
                </Button>
              ) : (
                <Button size="md" onClick={stepContent.action.onClick}>
                  {stepContent.action.label}
                </Button>
              )
            ) : null
          ) : (
            ctaFor(false)
          )
        }
      />
      <LeaveSheet stay={stay} open={leaving} onClose={() => setLeaving(false)} />

      <PaySheet
        stay={stay}
        open={payOpen}
        onClose={() => {
          setPaying(false);
          setFocusParam(null);
        }}
      />
      <PhotoSheet open={photoSheetOpen} onClose={() => setPhotoSheetOpen(false)} />
      {canBring && (
        <InviteSheet
          stay={stay}
          open={inviting || focusParam === "invite"}
          onClose={() => {
            setInviting(false);
            clearFocus();
          }}
        />
      )}
      <HouseQrSheet stay={stay} open={qrOpen} onClose={() => setQrOpen(false)} />
      {invite && <InviteJoinSheet stay={stay} invite={invite} open={inviteSheetOpen} onClose={() => setInviteSheetOpen(false)} />}
      <RequestSheet
        key={requestKey}
        waitlist={waitlistSheet}
        stay={stay}
        photo={photos[0]}
        open={sheetOpen || (focusParam === "request" && role === "visitor" && canJoin && !myRequest)}
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
          else {
            const id = store.requestToJoin(stay.id, message, { withFriend });
            // Two spots: the friend confirms through a link – offered right away.
            if (withFriend) showToast(tInvite("withFriendSent"), undefined, undefined, { ms: 10000, action: { label: tInvite("withFriendCopy"), onClick: () => void copyFriendLink(id) } });
          }
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

/** ?with= on the House page (a friend's "Request with a friend" link) – in its own boundary, like ?focus. */
function FriendParam({ onChange }: { onChange: (requestId: string | null) => void }) {
  const requestId = useSearchParams().get("with");
  useEffect(() => onChange(requestId), [requestId, onChange]);
  return null;
}

/** ?focus= on the House page (from Needs you and notifications) – in its own boundary, like ?preview. */
function FocusParam({ onChange }: { onChange: (focus: string | null) => void }) {
  // ?step= (Needs you: the step to show) and the older ?focus= mean the same.
  const params = useSearchParams();
  const focus = params.get("step") ?? params.get("focus");
  useEffect(() => onChange(focus), [focus, onChange]);
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
  /** Women-only House, and the profile says otherwise */
  audienceBlocked?: boolean;
  /** The head's large buttons (48px); the floating bar keeps 44px */
  big?: boolean;
}

const noSubscribe = () => () => {};
const todayIso = () => new Date().toISOString().slice(0, 10);

function StayCta({ stay, isHost, request, paymentDue, onPay, spotsLeft, invited, onJoinInvite, onRequest, onMessageHost, onRespond, waitlist, withSecondary, verifiedOnly, audienceBlocked, big = false }: StayCtaProps) {
  const t = useTranslations("request.cta");
  const tVerifyCta = useTranslations("verification");
  // Today only in the browser: the server (and the prerender) must not read the clock – "" there, so nothing has ended yet.
  const today = useSyncExternalStore(noSubscribe, todayIso, () => "");
  // Exactly one main action on the page: whichever state the CTA is in replaces "Request to join" (the default below). In the head (Ember) it's
  // cream with ink words, a second choice beside it a cream outline; in the floating glass bar ink, the usual primary.
  const variant = big ? "cream" : "primary";
  const outline = big ? "creamOutline" : "secondary";
  const size = big ? "lg" : "md";
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
      <Button variant={variant} size={size} href={`/h/${stay.id}/manage`}>
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
        <Button variant={outline} size={size} onClick={() => onRespond(false)}>
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
  // Declined or expired: the same calm words – never which of the two.
  if (didntWorkOut(request)) {
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
  // An audience House the profile doesn't fit: the same button, not pressable – the line above it says why.
  if (audienceBlocked) {
    return (
      <Button variant={variant} size={size} disabled>
        {t("join")}
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
        <Button variant={outline} size={size} onClick={waitlist.onJoin} data-preview-action>
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
