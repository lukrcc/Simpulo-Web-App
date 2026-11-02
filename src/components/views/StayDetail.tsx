"use client";

import { Camera, Check, DoorClosed, ExternalLink, Lock, MailOpen, MessageCircle, Plus, RotateCcw, SearchX, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, use, useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { AuthOptions } from "@/components/auth/AuthSheet";
import { formTextarea } from "@/components/form/FormLayout";
import { useInstallNudge } from "@/components/InstallNudge";
import { PreviewBanner, PreviewProvider } from "@/components/PreviewMode";
import { PhotoSheet } from "@/components/PhotoSheet";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { useHouseShare } from "@/components/share/HouseShare";
import { StayCard } from "@/components/StayCard";
import { MyShare } from "@/components/payments/MyShare";
import { Container } from "@/components/layout/Container";
import { AccommodationSection } from "@/components/stay/AccommodationSection";
import { HostCard } from "@/components/stay/HostCard";
import { HostGallery, HostPhotoGrid } from "@/components/stay/HostGallery";
import { HostPitch } from "@/components/stay/HostPitch";
import { InviteBanner, InviteJoinSheet } from "@/components/stay/HouseInvites";
import { InterestInvite } from "@/components/stay/InterestInvite";
import { PlaceMap } from "@/components/stay/PlaceMap";
import { Section } from "@/components/stay/Section";
import { StayFacts } from "@/components/stay/StayFacts";
import { Button } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { cardClass } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PriceLine } from "@/components/ui/PriceLine";
import { SaveButton } from "@/components/ui/SaveButton";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { againHref, createHref } from "@/components/create/model";
import { useFormat } from "@/i18n/format";
import { crewThreadId, findUser, getCrew, getCrewLinks, getCrewThread, getCurrentUser, getMyRequest, isBlocked, isCrewMember, useStore, validHouseInvite } from "@/lib/store";
import type { JoinRequest, Stay } from "@/lib/types";
import { cn, openSpots, stayNights, stayPhotos } from "@/lib/utils";

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
    .filter((s) => s.id !== exceptId && s.status === "published" && s.endDate >= today && !isBlocked(store, s.hostId))
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
          <h2 className="mb-4 text-lg font-semibold">{t("others")}</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
  const format = useFormat();
  const store = useStore();
  const router = useRouter();
  const pathname = usePathname();
  // ?preview=guest (host only) – read in its own boundary, so the page itself renders on the server for everyone.
  const [previewParam, setPreviewParam] = useState(false);
  const tPreview = useTranslations("common.ui.preview");
  const showToast = useToast();
  const offerInstall = useInstallNudge();
  const requireAuth = useRequireAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
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
  // ?invite=token – read in its own boundary, like ?preview.
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
  // Share: the system dialog where there is one, else the link is copied (see useHouseShare).
  const houseShare = useHouseShare(stay);

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
  const chatLinkCount = getCrewLinks(store, stay.id).length;

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
        router.push(`/my-stays/${stay.id}`);
        return;
      }
      // userId is passed explicitly: right after an inline login the store doesn't know the new user yet.
      router.push(`/inbox/${store.openDirectThread(stay.id, stay.hostId, userId)}`);
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

  const cta = (
    <StayCta
      stay={stay}
      isHost={isHost}
      request={myRequest}
      spotsLeft={spotsLeft}
      invited={invite !== undefined}
      onJoinInvite={joinWithInvite}
      onRequest={startRequest}
      onMessageHost={messageHost}
      onRespond={respondToInvite}
    />
  );

  return (
    // Mobile: the host gallery is full-bleed and starts at the very top, so no page top spacing below md.
    // Desktop (lg): content 7/12, sticky side cards 5/12. Below lg the sticky bottom bar carries the CTA.
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
    <Container className={cn("lg:grid lg:grid-cols-12 lg:gap-8", invite ? "pt-4 md:pt-6" : "md:pt-10")}>
      <div className="min-w-0 lg:col-span-7">
        {host && (
          <>
            <div className="-mx-4 md:mx-0 lg:hidden">
              <HostGallery host={host} photos={stayPhotos(stay, host)} onBack={goBack} onShare={houseShare.share} shareCopied={houseShare.copied} />
            </div>
            <div className="hidden lg:block">
              <HostPhotoGrid host={host} photos={stayPhotos(stay, host)} onShare={houseShare.share} shareCopied={houseShare.copied} />
            </div>
          </>
        )}

        {/* Mobile order: title + crew, host card, pitch, map, rules. Desktop: pitch, rules, map (host card on the right). */}
        <div className="flex flex-col pt-6">
          <StayFacts
            stay={stay}
            crew={crew}
            action={
              <div className="flex shrink-0 items-center gap-1">
                <SaveButton stay={stay} variant="outline" />
                {/* Not on your own House (nor in its guest preview). */}
                {!isHost && !previewing && <SafetyMenu target={{ kind: "stay", id: stay.id }} />}
              </div>
            }
          />

          {/* Declined, or the crew is full: the same trip, as their own House. */}
          {!isHost && !isMember && !invite && stay.status !== "closed" && stay.status !== "completed" && (myRequest?.status === "declined" || (!myRequest && (!stay.acceptingRequests || spotsLeft === 0))) && (
            <OpenYourOwn stay={stay} declined={myRequest?.status === "declined"} />
          )}

          {/* Invited from a past crew: who asked, and that the spot waits for the answer (the buttons are the CTA). */}
          {myRequest?.status === "invited" && (
            <div className={cn(cardClass, "mt-6 flex items-start gap-4")}>
              <MailOpen className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-ink">{t("invite.title", { name: hostFirstName })}</p>
                <p className="mt-0.5 text-muted">{t("invite.text")}</p>
              </div>
            </div>
          )}

          {/* The host, right after opening it: people who want this city and month – invite them. */}
          {isHost && <InterestInvite stay={stay} className="mt-6" />}

          {/* The crew's own WhatsApp / Telegram group: confirmed members only, once the crew is complete. */}
          {isMember && stay.crewGroupUrl && stay.spotsFilled >= stay.spotsTotal && (
            <Button variant="secondary" href={stay.crewGroupUrl} external className="mt-6 self-start">
              <ExternalLink aria-hidden />
              {t("openCrewGroup")}
            </Button>
          )}

          {/* Crew with an open share: pay right from the House page (also on mobile – this column is always shown). */}
          {isMember && <MyShare stay={stay} className="mt-6" />}

          {askForPhoto && (
            <div className={cn(cardClass, "mt-6 flex items-center gap-4")}>
              <Camera className="size-5 shrink-0 text-muted" aria-hidden />
              <p className="min-w-0 flex-1 text-sm text-ink">{t("photoPrompt", { name: hostFirstName })}</p>
              <Button variant="secondary" onClick={() => requireAuth(() => setPhotoSheetOpen(true), t("loginToAddPhoto"))}>
                {t("addPhoto")}
              </Button>
            </div>
          )}

          {host && (
            <div className={cn(cardClass, "mt-6 lg:hidden")}>
              <HostCard host={host} />
              {me && !isHost && (
                <Button variant="secondary" onClick={messageHost} className="mt-4 w-full">
                  <MessageCircle aria-hidden />
                  {t("messageHost", { name: hostFirstName })}
                </Button>
              )}
            </div>
          )}

          <div>
            <HostPitch stay={stay} />
          </div>

          {/* Only with a host fee (gone entirely when the hostPremium flag is off – the store drops both). */}
          {stay.hostFeePerPerson && stay.hostOffer && stay.hostOffer.length > 0 && <HostOffer stay={stay} offer={stay.hostOffer} />}

          {stay.houseRules.length > 0 && (
            <div className="order-1 lg:order-none">
            <Section title={t("houseRules")}>
              <ul className="grid gap-x-6 gap-y-2 lg:grid-cols-2">
                {stay.houseRules.map((rule) => (
                  <li key={rule} className="flex gap-2 text-ink">
                    <Check className="mt-1 size-4 shrink-0 text-ink" />
                    {rule}
                  </li>
                ))}
              </ul>
            </Section>
            </div>
          )}

          {/* Map and rules swap: mobile shows the map first (rules carry order-1), desktop the rules first. */}
          <div className="lg:order-1">
            <PlaceMap stay={stay} />
          </div>
        </div>
      </div>

      {/* Side cards: Join first, then host, then accommodation. On desktop the column is only as tall as its
          cards (self-start) and sticks at exactly its starting offset (the page's 40px top padding), so it
          doesn't move when scrolling starts. Below lg only the accommodation card shows: the gallery covers the
          host and the bottom bar the CTA. */}
      <aside className="mt-8 self-start lg:sticky lg:top-[calc(var(--header-h)+40px)] lg:col-span-5 lg:mt-0">
        <div className="space-y-4">
          <div className={cn(cardClass, "hidden lg:block")}>
            <PriceLine stay={stay} size="lg" />
            <p className="mt-3 text-sm text-muted">
              {t("datesAndNights", { dates: format.longRange(stay.startDate, stay.endDate), nights: format.nights(stayNights(stay)) })}
            </p>
            <div className="mt-5">{cta}</div>
            {/* A 1:1 thread with the host about this House – logged-in guests only. */}
            {me && !isHost && (
              <Button variant="secondary" size="lg" onClick={messageHost} className="mt-2 w-full">
                <MessageCircle aria-hidden />
                {t("messageHost", { name: hostFirstName })}
              </Button>
            )}
            {!me && stay.status === "published" && stay.acceptingRequests && spotsLeft > 0 && <p className="mt-2 text-center text-xs text-muted">{t("loginBeforeSending")}</p>}
          </div>
          {host && (
            <div className={cn(cardClass, "hidden lg:block")}>
              <HostCard host={host} />
            </div>
          )}
          <div className={cardClass}>
            <h2 className="mb-3 text-base font-semibold">{t("accommodation")}</h2>
            <AccommodationSection stay={stay} chatLinkCount={chatLinkCount} canOpenChat={isMember && getCrewThread(store, stay.id) !== undefined} inCard />
          </div>
        </div>
      </aside>

      {/* Mobile/tablet: sticky bottom CTA (replaces the tab bar on this route) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-4">
          <PriceLine stay={stay} compact className="shrink-0" />
          <div className="flex-1">{cta}</div>
        </div>
      </div>

      <PhotoSheet open={photoSheetOpen} onClose={() => setPhotoSheetOpen(false)} />
      {invite && <InviteJoinSheet stay={stay} invite={invite} open={inviteSheetOpen} onClose={() => setInviteSheetOpen(false)} />}
      <RequestSheet
        key={requestKey}
        open={sheetOpen}
        stay={stay}
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
          store.requestToJoin(stay.id, message);
          return true;
        }}
      />
    </Container>
    </PreviewProvider>
  );
}

/** What the host fee pays for: a neutral checklist under the pitch. */
function HostOffer({ stay, offer }: { stay: Stay; offer: string[] }) {
  const t = useTranslations("growth.premium");
  const format = useFormat();
  return (
    <Section
      title={t("offerTitle")}
      action={
        <span className="shrink-0 text-sm text-muted">
          <span className="font-medium tabular-nums text-ink">{format.price(stay.hostFeePerPerson ?? 0, stay.currency)}</span> {t("perPerson")}
        </span>
      }
    >
      <ul className="grid gap-x-6 gap-y-2 lg:grid-cols-2">
        {offer.map((item) => (
          <li key={item} className="flex gap-2 text-ink">
            <Check className="mt-1 size-4 shrink-0 text-muted" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </Section>
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

/** Reports ?invite=token to the House page (own boundary, like PreviewParam). */
function InviteParam({ onChange }: { onChange: (token: string | null) => void }) {
  const token = useSearchParams().get("invite");
  useEffect(() => onChange(token), [token, onChange]);
  return null;
}

/** "Open your own House for the same dates" – prefilled in /create (region + dates). */
function OpenYourOwn({ stay, declined }: { stay: Stay; declined: boolean }) {
  const t = useTranslations("growth.ownHouse");
  const format = useFormat();
  const dates = format.longRange(stay.startDate, stay.endDate);
  const place = format.placeName(stay);
  return (
    <div className={cn(cardClass, "mt-6")}>
      <p className="font-semibold">{declined ? t("titleDeclined") : t("titleFull")}</p>
      <p className="mt-1 text-sm text-muted">
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
  spotsLeft: number;
  /** A valid invite link: Join takes the reserved spot (account, then payment) */
  invited: boolean;
  onJoinInvite: () => void;
  onRequest: () => void;
  onMessageHost: () => void;
  /** Invited from a past crew: accept or decline */
  onRespond: (accept: boolean) => void;
}

const noSubscribe = () => () => {};
const todayIso = () => new Date().toISOString().slice(0, 10);

function StayCta({ stay, isHost, request, spotsLeft, invited, onJoinInvite, onRequest, onMessageHost, onRespond }: StayCtaProps) {
  const t = useTranslations("request.cta");
  // Today only in the browser: the server (and the prerender) must not read the clock – "" there, so nothing has ended yet.
  const today = useSyncExternalStore(noSubscribe, todayIso, () => "");
  // Exactly one primary on the page: whichever state the CTA is in replaces "Join this House" (the default below).
  const full = "w-full";
  // Over, and you were in it (host or crew): the same House again, with the same people.
  if (stay.status === "completed" && (isHost || request?.status === "accepted")) {
    return (
      <Button size="lg" href={againHref(stay.id)} className={full}>
        <RotateCcw aria-hidden />
        {t("again")}
      </Button>
    );
  }
  if (isHost) {
    return (
      <Button size="lg" href={`/my-stays/${stay.id}`} className={full}>
        {t("manage")}
      </Button>
    );
  }
  if (request?.status === "accepted") {
    return (
      <Button size="lg" href={`/inbox/${crewThreadId(stay.id)}`} className={full}>
        {t("accepted")}
      </Button>
    );
  }
  // Closed beats a pending request – there's nothing left to wait for.
  if (stay.status === "closed") {
    return (
      <Button size="lg" disabled className={full}>
        {t("closed")}
      </Button>
    );
  }
  // Done (or past its end date): nothing to join any more.
  if (stay.status === "completed" || (today !== "" && stay.endDate < today)) {
    return (
      <Button size="lg" disabled className={full}>
        {t("ended")}
      </Button>
    );
  }
  // Invite link: the reserved spot is theirs to take – no request, no waiting for the host.
  if (invited) {
    return (
      <Button size="lg" onClick={onJoinInvite} className={full}>
        {t("join")}
      </Button>
    );
  }
  if (request?.status === "invited") {
    return (
      <div className="flex gap-2">
        <Button size="lg" onClick={() => onRespond(true)} className="flex-1">
          {t("acceptInvite")}
        </Button>
        <Button variant="secondary" size="lg" onClick={() => onRespond(false)}>
          {t("declineInvite")}
        </Button>
      </div>
    );
  }
  if (request?.status === "pending") {
    return (
      <Button size="lg" disabled className={full}>
        <Check aria-hidden />
        {t("pending")}
      </Button>
    );
  }
  if (request?.status === "declined") {
    return (
      <Button size="lg" disabled className={full}>
        {t("declined")}
      </Button>
    );
  }
  // Every spot is taken: nothing to request.
  if (spotsLeft === 0) {
    return (
      <Button size="lg" disabled className={full}>
        {t("full")}
      </Button>
    );
  }
  // The host closed requests: no new request, but you can still reach the host.
  if (!stay.acceptingRequests) {
    return (
      <Button size="lg" onClick={onMessageHost} className={full}>
        {t("crewSet")}
      </Button>
    );
  }
  // The page's one primary: "Join this House".
  return (
    <Button size="lg" onClick={onRequest} className={full}>
      {t("join")}
    </Button>
  );
}

interface RequestSheetProps {
  open: boolean;
  stay: Stay;
  hostName: string;
  loggedIn: boolean;
  /** `sent` tells the parent whether a request went out. */
  onClose: (sent: boolean) => void;
  /** Sends the request as `userId`; false when it can't be sent (e.g. it's the user's own House). */
  onSend: (message: string, userId: string) => boolean;
  /** Preview: the sheet works, but sending only shows this note (no login step, nothing sent) */
  blockedNote?: string;
}

const MIN_MESSAGE_LENGTH = 20;

type RequestStep = "message" | "login" | "sent";
const REQUEST_STEPS: readonly RequestStep[] = ["message", "login", "sent"];

/**
 * One fixed-size modal, three steps sliding horizontally: message → (logged out) login → sent.
 * The message lives here, so going back from the login step – or closing mid-way – never loses it.
 */
function RequestSheet({ open, stay, hostName, loggedIn, onClose, onSend, blockedNote }: RequestSheetProps) {
  const t = useTranslations("request");
  const { currentUserId } = useStore();
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<RequestStep>("message");
  const [blocked, setBlocked] = useState(false);
  const valid = message.trim().length >= MIN_MESSAGE_LENGTH;

  function send(userId: string) {
    if (onSend(message, userId)) setStep("sent");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
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

  return (
    <Sheet
      open={open}
      onClose={close}
      title={t(`steps.${step}`)}
      subtitle={step === "login" ? t("loginSubtitle", { name: hostName }) : undefined}
      onBack={step === "login" ? () => setStep("message") : undefined}
      size="wide"
    >
      {/* Horizontal track: each step is one full-width pane; inactive panes are inert. */}
      <div className="overflow-x-clip">
        <div
          className="flex items-start transition-transform duration-250 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          <Pane active={step === "message"}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted">
                {t.rich("intro", {
                  name: hostName,
                  title: stay.title,
                  house: (chunks) => <span className="font-medium text-ink">{chunks}</span>,
                })}
              </p>
              {!loggedIn && (
                <p className="flex items-center gap-2 rounded-xl bg-bg px-3 py-2 text-[13px] text-muted">
                  <Lock className="size-3.5 shrink-0" aria-hidden />
                  {t("loginNote")}
                </p>
              )}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                autoFocus
                placeholder={t("placeholder")}
                className={formTextarea}
              />
              <div className="-mt-2 flex items-center justify-between gap-3 text-[13px] text-muted">
                <span>{valid ? t("looksGood") : t("minLength", { count: MIN_MESSAGE_LENGTH })}</span>
                <Badge>{message.trim().length}</Badge>
              </div>
              {blocked && blockedNote && (
                <p role="alert" className="rounded-xl bg-bg px-4 py-3 text-sm text-ink">
                  {blockedNote}
                </p>
              )}
              <Button type="submit" size="lg" disabled={!valid} className="w-full">
                {loggedIn ? t("send") : t("continue")}
              </Button>
            </form>
          </Pane>

          <Pane active={step === "login"}>
            {/* Mounted only on this step, so the provider picker always starts fresh. */}
            {step === "login" && <AuthOptions onSuccess={send} />}
          </Pane>

          <Pane active={step === "sent"}>
            <div className="flex flex-col items-center pt-8 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-bg text-ink">
                <Check className="size-7" strokeWidth={2.5} />
              </span>
              <p className="mt-5 text-lg font-semibold">{t("sentTitle")}</p>
              <p className="mt-1 text-muted">{t("waitingFor", { name: hostName })}</p>
              <p className="mt-1 text-sm text-muted">{t("answerInMessages")}</p>
              <Button size="lg" onClick={close} className="mt-8 w-full">
                {t("done")}
              </Button>
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
