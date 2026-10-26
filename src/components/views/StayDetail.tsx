"use client";

import { Camera, Check, DoorClosed, Lock, SearchX, UserX } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { use, useState, type FormEvent, type ReactNode } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { AuthOptions, sheetButtonClass } from "@/components/auth/AuthSheet";
import { useInstallNudge } from "@/components/InstallNudge";
import { PreviewBanner, PreviewProvider } from "@/components/PreviewMode";
import { PhotoSheet } from "@/components/PhotoSheet";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { StayCard } from "@/components/StayCard";
import { MyShare } from "@/components/payments/MyShare";
import { Container } from "@/components/layout/Container";
import { AccommodationSection } from "@/components/stay/AccommodationSection";
import { HostCard } from "@/components/stay/HostCard";
import { HostGallery, HostPhotoGrid } from "@/components/stay/HostGallery";
import { HostPitch } from "@/components/stay/HostPitch";
import { PlaceMap } from "@/components/stay/PlaceMap";
import { Section } from "@/components/stay/Section";
import { StayFacts } from "@/components/stay/StayFacts";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PriceLine } from "@/components/ui/PriceLine";
import { SaveButton } from "@/components/ui/SaveButton";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { crewThreadId, findUser, getCrew, getCrewThread, getCurrentUser, getMyRequest, isBlocked, isCrewMember, useStore } from "@/lib/store";
import type { JoinRequest, Stay } from "@/lib/types";
import { cn, findUrls, stayNights, stayPhotos } from "@/lib/utils";

/** Side column cards on the House page. */
const sideCard = "rounded-[24px] bg-white p-6";

export function StayDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const store = useStore();
  const stay = store.stays.find((s) => s.slug === slug);

  if (!stay) return <StayUnavailable reason="notFound" />;
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
            <Link href="/" className={buttonClass("dark", "sm")}>
              {t("explore")}
            </Link>
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
  const tCommon = useTranslations("common");
  const format = useFormat();
  const store = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  const host = findUser(store, stay.hostId);
  const crew = getCrew(store, stay);
  // "Preview as guest" (?preview=guest, host only): render as a logged-out stranger; nothing changes data.
  const previewing = stay.hostId === store.currentUserId && searchParams.get("preview") === "guest";
  const myRequest = previewing ? undefined : getMyRequest(store, stay.id);
  const me = previewing ? undefined : getCurrentUser(store);
  // Requests work without a photo – but the host should see who's asking.
  const askForPhoto = myRequest?.status === "pending" && me !== undefined && me.photos.length === 0;
  const isHost = stay.hostId === store.currentUserId && !previewing;
  const isMember = !previewing && isCrewMember(store, stay, store.currentUserId);
  const spotsLeft = Math.max(0, stay.spotsTotal - stay.spotsFilled);
  const chatLinkCount = (getCrewThread(store, stay.id)?.messages ?? []).reduce((count, m) => count + findUrls(m.text).length, 0);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast(tCommon("linkCopied"));
    } catch {
      showToast(tCommon("linkCopyFailed"));
    }
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

  const cta = (
    <StayCta
      stay={stay}
      isHost={isHost}
      request={myRequest}
      spotsLeft={spotsLeft}
      onRequest={() => setSheetOpen(true)}
      onMessageHost={messageHost}
    />
  );

  return (
    // Mobile: the host gallery is full-bleed and starts at the very top, so no page top spacing below md.
    // Desktop (lg): content 7/12, sticky side cards 5/12. Below lg the sticky bottom bar carries the CTA.
    <PreviewProvider active={previewing}>
    {previewing && <PreviewBanner message={tPreview("house")} onExit={() => router.replace(pathname)} />}
    <Container className="md:pt-10 lg:grid lg:grid-cols-12 lg:gap-8">
      <div className="min-w-0 lg:col-span-7">
        {host && (
          <>
            <div className="-mx-4 md:mx-0 lg:hidden">
              <HostGallery host={host} photos={stayPhotos(stay, host)} onBack={goBack} onShare={share} />
            </div>
            <div className="hidden lg:block">
              <HostPhotoGrid host={host} photos={stayPhotos(stay, host)} onShare={share} />
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

          {/* Crew with an open share: pay right from the House page (also on mobile – this column is always shown). */}
          {isMember && <MyShare stay={stay} className="mt-6" />}

          {askForPhoto && (
            <div className="mt-6 flex items-center gap-4 rounded-2xl bg-white p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Camera className="size-5" aria-hidden />
              </span>
              <p className="min-w-0 flex-1 text-sm text-neutral-700">{t("photoPrompt", { name: hostFirstName })}</p>
              <button
                type="button"
                onClick={() => requireAuth(() => setPhotoSheetOpen(true), t("loginToAddPhoto"))}
                className={buttonClass("dark", "sm", "shrink-0")}
              >
                {t("addPhoto")}
              </button>
            </div>
          )}

          {host && (
            <div className={cn(sideCard, "mt-6 lg:hidden")}>
              <HostCard host={host} />
            </div>
          )}

          <div>
            <HostPitch stay={stay} />
          </div>

          {stay.houseRules.length > 0 && (
            <div className="order-1 lg:order-none">
            <Section title={t("houseRules")}>
              <ul className="grid gap-x-6 gap-y-2 lg:grid-cols-2">
                {stay.houseRules.map((rule) => (
                  <li key={rule} className="flex gap-2 text-neutral-700">
                    <Check className="mt-1 size-4 shrink-0 text-accent" />
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
          <div className={cn(sideCard, "hidden lg:block")}>
            <PriceLine stay={stay} size="lg" />
            <p className="mt-3 text-sm text-neutral-600">
              {t("datesAndNights", { dates: format.longRange(stay.startDate, stay.endDate), nights: format.nights(stayNights(stay)) })}
            </p>
            <div className="mt-5">{cta}</div>
            {!me && stay.status !== "closed" && <p className="mt-2 text-center text-xs text-zinc-500">{t("loginBeforeSending")}</p>}
          </div>
          {host && (
            <div className={cn(sideCard, "hidden lg:block")}>
              <HostCard host={host} />
            </div>
          )}
          <div className={sideCard}>
            <h2 className="mb-3 text-base font-semibold">{t("accommodation")}</h2>
            <AccommodationSection stay={stay} chatLinkCount={chatLinkCount} canOpenChat={isMember} inCard />
          </div>
        </div>
      </aside>

      {/* Mobile/tablet: sticky bottom CTA (replaces the tab bar on this route) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-100 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-4">
          <PriceLine stay={stay} compact className="shrink-0" />
          <div className="flex-1">{cta}</div>
        </div>
      </div>

      <PhotoSheet open={photoSheetOpen} onClose={() => setPhotoSheetOpen(false)} />
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

interface StayCtaProps {
  stay: Stay;
  isHost: boolean;
  request?: JoinRequest;
  spotsLeft: number;
  onRequest: () => void;
  onMessageHost: () => void;
}

function StayCta({ stay, isHost, request, spotsLeft, onRequest, onMessageHost }: StayCtaProps) {
  const t = useTranslations("request.cta");
  const full = "w-full";
  if (isHost) {
    return (
      <Link href={`/my-stays/${stay.id}`} className={buttonClass("dark", "lg", full)}>
        {t("manage")}
      </Link>
    );
  }
  if (request?.status === "accepted") {
    return (
      <Link href={`/inbox/${crewThreadId(stay.id)}`} className={buttonClass("dark", "lg", full)}>
        {t("accepted")}
      </Link>
    );
  }
  // Closed beats a pending request – there's nothing left to wait for.
  if (stay.status === "closed") {
    return (
      <button type="button" disabled className={buttonClass("dark", "lg", full)}>
        {t("closed")}
      </button>
    );
  }
  if (request?.status === "pending") {
    return (
      <button type="button" disabled className={buttonClass("dark", "lg", full)}>
        <Check className="size-4" />
        {t("pending")}
      </button>
    );
  }
  if (request?.status === "declined") {
    return (
      <button type="button" disabled className={buttonClass("dark", "lg", full)}>
        {t("declined")}
      </button>
    );
  }
  // The host closed requests (or every spot is taken): no new request, but you can still reach the host.
  if (!stay.acceptingRequests || spotsLeft === 0) {
    return (
      <button type="button" onClick={onMessageHost} className={buttonClass("dark", "lg", full)}>
        {t("crewSet")}
      </button>
    );
  }
  // The only orange-filled button in the app.
  return (
    <button type="button" onClick={onRequest} className={buttonClass("primary", "lg", full)}>
      {t("join")}
    </button>
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
/** Same 56px pill as the login options, so all three steps read as one component. */
const darkSheetButton = "bg-ink text-white hover:bg-[#2A2A30] disabled:bg-neutral-200 disabled:text-neutral-500";

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
              <p className="text-sm text-neutral-500">
                {t.rich("intro", {
                  name: hostName,
                  title: stay.title,
                  house: (chunks) => <span className="font-medium text-ink">{chunks}</span>,
                })}
              </p>
              {!loggedIn && (
                <p className="flex items-center gap-2 rounded-xl bg-page px-3 py-2 text-[13px] text-zinc-500">
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
                className="w-full resize-none rounded-2xl border border-neutral-200 p-4 text-sm outline-none focus:border-ink"
              />
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>{valid ? t("looksGood") : t("minLength", { count: MIN_MESSAGE_LENGTH })}</span>
                <span>{message.trim().length}</span>
              </div>
              {blocked && blockedNote && (
                <p role="alert" className="rounded-xl bg-page px-4 py-3 text-sm text-ink">
                  {blockedNote}
                </p>
              )}
              <button type="submit" disabled={!valid} className={cn(sheetButtonClass, darkSheetButton)}>
                <span className="flex-1 text-center">{loggedIn ? t("send") : t("continue")}</span>
              </button>
            </form>
          </Pane>

          <Pane active={step === "login"}>
            {/* Mounted only on this step, so the provider picker always starts fresh. */}
            {step === "login" && <AuthOptions onSuccess={send} />}
          </Pane>

          <Pane active={step === "sent"}>
            <div className="flex flex-col items-center pt-8 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-zinc-100 text-ink">
                <Check className="size-7" strokeWidth={2.5} />
              </span>
              <p className="mt-5 text-lg font-semibold">{t("sentTitle")}</p>
              <p className="mt-1 text-neutral-600">{t("waitingFor", { name: hostName })}</p>
              <p className="mt-1 text-sm text-zinc-500">{t("answerInMessages")}</p>
              <button type="button" onClick={close} className={cn(sheetButtonClass, darkSheetButton, "mt-8")}>
                <span className="flex-1 text-center">{t("done")}</span>
              </button>
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
