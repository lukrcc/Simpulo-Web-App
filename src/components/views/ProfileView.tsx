"use client";

import { ChevronRight, Lock, MessageCircle, MoreHorizontal, Pencil, SearchX, Settings, Share2, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SocialTiles } from "@/components/ui/SocialRow";
import { useFormatter, useTranslations } from "next-intl";
import { use, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { Container } from "@/components/layout/Container";
import { PreviewBanner, PreviewProvider, usePreviewGuard } from "@/components/PreviewMode";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { ShareSheet } from "@/components/share/ShareSheet";
import { PhotoLightbox } from "@/components/stay/PhotoLightbox";
import { useDismiss } from "@/components/explore/Filters";
import { Button } from "@/components/ui/ActionButton";
import { Anchored } from "@/components/ui/Anchored";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { listItemStyles } from "@/components/ui/listSelection";
import { Panel } from "@/components/ui/Panel";
import { Sheet } from "@/components/ui/Sheet";
import { iconButtonStyles } from "@/components/ui/IconButton";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Img } from "@/components/ui/Img";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { ProHostLabel } from "@/components/ui/ProHostLabel";
import { cardGradient, cardTextShadow } from "@/components/ui/glass";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useToast } from "@/components/ui/Toast";
import { MoreList } from "@/components/views/MoreList";
import { useFormat } from "@/i18n/format";
import { profileViewFor, type ProfileView as ProfileVisibility } from "@/lib/profilePrivacy";
import { findUser, getCurrentUser, isBlocked, isCrewMember, useStore, type LivedWithEntry } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { usePhotoDrag } from "@/lib/usePhotoDrag";
import { useSnapCarousel } from "@/lib/useSnapCarousel";
import { cn, firstName, housePhotos, openSpots } from "@/lib/utils";

export function MyProfile() {
  const t = useTranslations("profile");
  return (
    // Logged out: the prompt, plus the "More" links (install guide, legal) that otherwise live on the profile.
    <RequireLogin title={t("loginTitle")} after={<MoreList />}>
      <MyProfileContent />
    </RequireLogin>
  );
}

function MyProfileContent() {
  const me = getCurrentUser(useStore());
  return me ? <ProfileView user={me} isMe /> : null;
}

export function PublicProfile({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const t = useTranslations("profile");
  const store = useStore();
  const user = findUser(store, userId);

  if (!user) {
    return (
      <Container page width="narrow">
        <EmptyState
          icon={SearchX}
          title={t("notFound")}
          action={
            <Button variant="primary" href="/">
              {t("explore")}
            </Button>
          }
        />
      </Container>
    );
  }

  if (isBlocked(store, user.id)) return <BlockedProfile user={user} />;

  return <ProfileView user={user} isMe={user.id === store.currentUserId} />;
}

/** Someone you blocked: no profile, just the way back. */
function BlockedProfile({ user }: { user: User }) {
  const t = useTranslations("safety.blockedProfile");
  const { unblockUser } = useStore();
  const showToast = useToast();
  const name = firstName(user);
  return (
    <Container page width="narrow">
      <EmptyState
        icon={UserX}
        title={t("title", { name })}
        description={t("description")}
        action={
          <Button
            variant="primary"
            onClick={() => {
              unblockUser(user.id);
              showToast(t("unblocked", { name }));
            }}
          >
            {t("unblock")}
          </Button>
        }
      />
    </Container>
  );
}

/**
 * A person's page, one screen from 1100px: who they are, what they offer, what speaks for them. A tile with nothing in it isn't there, and the
 * others take its room. What's in them: src/lib/profilePrivacy.ts.
 * Own profile: "Preview" renders the stranger's page, under a band, and nothing in it changes data.
 */
function ProfileView({ user, isMe }: { user: User; isMe: boolean }) {
  const tPreview = useTranslations("common.ui.preview");
  const [preview, setPreview] = useState(false);
  const previewing = isMe && preview;

  return (
    <PreviewProvider active={previewing}>
      {previewing && <PreviewBanner message={tPreview("profile")} onExit={() => setPreview(false)} />}
      <ProfileBody user={user} isMe={isMe && !previewing} previewing={previewing} onPreview={isMe ? () => setPreview(true) : undefined} />
    </PreviewProvider>
  );
}

interface ProfileBodyProps {
  user: User;
  isMe: boolean;
  /** Rendering as a stranger: no viewer, nothing private */
  previewing: boolean;
  onPreview?: () => void;
}

function ProfileBody({ user, isMe, previewing, onPreview }: ProfileBodyProps) {
  const t = useTranslations("profile");
  const store = useStore();
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const viewerId = previewing ? null : store.currentUserId;
  const view = profileViewFor(store, user, viewerId, today);
  const { photos } = user;

  return (
    <Container className={cn("pb-6 pt-6 split:pb-0 split:pt-0", previewing ? "split:h-[calc(100dvh-var(--header-total)-48px-40px)]" : "split:h-[calc(100dvh-var(--header-total)-48px)]")}>
      {/* Mobile: Settings lives behind a gear on your own profile (desktop: the avatar menu in the header). */}
      {isMe && (
        <div className="-mt-2 mb-2 flex justify-end md:hidden">
          <Link href="/settings" aria-label={t("settings")} className={iconButtonStyles("lg")}>
            <Settings className="size-5" />
          </Link>
        </div>
      )}
      <div
        data-profile-bento
        className={cn(
          // Three columns of the same width and height (grid items stretch), each a Panel.
          "flex flex-col gap-5 split:grid split:h-full split:grid-cols-3 split:items-stretch",
        )}
      >
        <IdentityTile user={user} isMe={isMe} previewing={previewing} onPreview={onPreview} view={view} onOpenPhotos={(index) => photos.length > 0 && setPhotoIndex(index)} />
        <AboutTile user={user} isMe={isMe} houses={view.hostingNow} />
        <ProofTile view={view} isMe={isMe} />
      </div>
      <PhotoLightbox photos={photos} index={photoIndex} onIndexChange={setPhotoIndex} onClose={() => setPhotoIndex(null)} alt={user.name} />
    </Container>
  );
}

const MAX_FACES = 8;
const ROUND_BUTTON = iconButtonStyles();

/* ───────────────────────── Who ───────────────────────── */

interface IdentityProps {
  user: User;
  isMe: boolean;
  previewing: boolean;
  onPreview?: () => void;
  view: ProfileVisibility;
  onOpenPhotos: (index: number) => void;
}

/**
 * Who they are, as high as the page (a Panel). On top their photos, landscape, as wide as the tile (45 % of its height from 1100px, else
 * 4:3): swipe or drag and the dots – no arrows, no zoom; a click opens the lightbox. Over the photo, bottom left as on the cards: name,
 * "34 · Spain · based in Ibiza", the verified check. Under it the numbers; the actions stay at the bottom.
 */
function IdentityTile({ user, isMe, previewing, onPreview, view, onOpenPhotos }: IdentityProps) {
  const t = useTranslations("profile");
  const tVerify = useTranslations("verification");
  const tView = useTranslations("profile.view");
  const store = useStore();
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const guard = usePreviewGuard();
  const [sharing, setSharing] = useState(false);
  const meId = previewing ? null : store.currentUserId;

  // A thread needs a House: one you share, an open request between you, or else one they're hosting right now.
  const hostOf = (stayId: string) => store.stays.find((s) => s.id === stayId)?.hostId;
  const messageStayId = isMe
    ? undefined
    : ((meId
        ? (store.stays.find((s) => isCrewMember(store, s, meId) && isCrewMember(store, s, user.id))?.id ??
          store.joinRequests.find((r) => r.status === "pending" && ((r.userId === meId && hostOf(r.stayId) === user.id) || (r.userId === user.id && hostOf(r.stayId) === meId)))?.stayId)
        : undefined) ?? view.hostingNow[0]?.id);

  function message(stayId: string) {
    guard(() =>
      requireAuth((userId) => {
        const threadId = store.openDirectThread(stayId, user.id, userId);
        if (threadId) router.push(`/messages/${threadId}`);
      }, { reason: "message", hostName: firstName(user) }),
    );
  }

  return (
    <Panel flush className="flex min-h-0 min-w-0 flex-col overflow-hidden">
      <ProfilePhotos user={user} onOpen={onOpenPhotos} />
      <div className="flex min-h-0 flex-1 flex-col gap-5 p-8 pt-6">
        <div className="flex min-h-0 flex-1 flex-col gap-4 split:scroll-pane">
          <ProHostLabel user={user} className="empty:hidden" />
          {/* Your own profile without the check: a quiet nudge. Someone else's never says anything about it. */}
          {isMe && !user.verified && (
            <p className="text-small text-muted">
              {tVerify.rich("profileHint", { link: (chunks) => <Link href="/settings#verification" className="font-semibold text-ink underline-offset-4 hover:underline">{chunks}</Link> })}
            </p>
          )}
          <TrustBand view={view} />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {isMe ? (
            <>
              <Button size="md" href="/profile/edit" className="flex-1">
                <Pencil aria-hidden />
                {t("editProfile")}
              </Button>
              <button type="button" onClick={() => setSharing(true)} aria-label={t("share")} className={ROUND_BUTTON}>
                <Share2 className="size-4" aria-hidden />
              </button>
              <MoreMenu
                label={tView("options")}
                buttonClassName={ROUND_BUTTON}
                items={onPreview ? [{ label: tView("previewAsOthers"), onSelect: onPreview }] : []}
              />
            </>
          ) : (
            <>
              {messageStayId && (
                <Button size="md" onClick={() => message(messageStayId)} data-preview-action className="flex-1">
                  <MessageCircle aria-hidden />
                  {t("message")}
                </Button>
              )}
              <button type="button" onClick={() => setSharing(true)} aria-label={t("share")} className={ROUND_BUTTON}>
                <Share2 className="size-4" aria-hidden />
              </button>
              {previewing ? (
                <button type="button" onClick={() => guard(() => undefined)} aria-label={tView("options")} className={ROUND_BUTTON}>
                  <MoreHorizontal className="size-5" aria-hidden />
                </button>
              ) : (
                <SafetyMenu target={{ kind: "user", id: user.id }} user={user} buttonClassName={ROUND_BUTTON} />
              )}
            </>
          )}
        </div>
      </div>
      <ShareSheet target={{ kind: "profile", user }} open={sharing} onClose={() => setSharing(false)} />
    </Panel>
  );
}

/** The profile photos, landscape, one at a time; the name and where they're from lie on the bottom left. */
function ProfilePhotos({ user, onOpen }: { user: User; onOpen: (index: number) => void }) {
  const t = useTranslations("profile");
  const tView = useTranslations("profile.view");
  const f = useFormat();
  const { photos } = user;
  const { ref, active, onScroll, scrollTo } = useSnapCarousel<HTMLDivElement>(photos.length);
  const drag = usePhotoDrag(ref, active, scrollTo, photos.length > 1);
  return (
    <div className="group relative aspect-4/3 w-full shrink-0 overflow-hidden rounded-t-3xl bg-linear-to-br from-(--card-blank-from) to-(--card-blank-to) split:aspect-auto split:h-[45%]">
      <div ref={ref} onScroll={onScroll} {...drag.props} className={cn("no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto", drag.className)}>
        {photos.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => !drag.dragged() && onOpen(i)}
            aria-label={t("openPhoto", { index: i + 1 })}
            aria-hidden={i !== active || undefined}
            tabIndex={i === active ? 0 : -1}
            data-no-tooltip
            className="relative block h-full w-full shrink-0 snap-center snap-always outline-none"
          >
            <Img src={src} alt="" fill sizes="(min-width: 1100px) 34vw, 100vw" loading={i === 0 ? "eager" : undefined} className="object-cover object-[center_30%]" />
          </button>
        ))}
      </div>
      <div className={cn("pointer-events-none absolute inset-0", cardGradient)} />
      <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-5 text-white", cardTextShadow)}>
        <h1 className="flex min-w-0 items-center gap-2 text-h2 text-white">
          <span className="truncate">{user.name}</span>
          {user.verified && <VerifiedBadge className="shrink-0" />}
        </h1>
        <p className="mt-1 truncate text-body text-white/85">
          {f.ageAndCountry(user)}
          {user.city && ` · ${t("basedIn", { city: user.city })}`}
        </p>
      </div>
      {photos.length > 1 && (
        <>
          {/* Dots at the top: the name has the bottom. */}
          <div className="absolute inset-x-0 top-3 flex justify-center">
            {photos.map((src, i) => (
              <button key={src} type="button" onClick={() => scrollTo(i)} aria-label={tView("showPhoto", { number: i + 1, count: photos.length })} aria-current={i === active || undefined} data-no-tooltip className="flex h-5 items-center px-0.5">
                <span className={cn("block h-1 rounded-full transition-all", i === active ? "w-3 bg-surface" : "w-1 bg-white/50")} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Four lines at most; if it's longer, "More" opens the rest in a popover. */

function Bio({ text }: { text: string }) {
  const t = useTranslations("profile.view");
  const textRef = useRef<HTMLParagraphElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [clipped, setClipped] = useState(false);
  const [open, setOpen] = useState(false);
  useDismiss(open, () => setOpen(false), moreRef, moreRef, panelRef);
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const measure = () => setClipped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);
  return (
    <div>
      <p ref={textRef} className="line-clamp-4 text-body text-ink">
        {text}
      </p>
      {clipped && (
        <button ref={moreRef} type="button" onClick={() => setOpen((on) => !on)} aria-expanded={open} className="mt-1 text-small font-semibold text-ink underline-offset-4 hover:underline">
          {t("bioMore")}
        </button>
      )}
      {open && (
        <Anchored anchor={moreRef} ref={panelRef} align="start" width={360}>
          <GlassPanel role="dialog" aria-label={t("bioMore")} className="animate-fade-in max-h-80 w-[min(360px,calc(100vw-32px))] overflow-y-auto overscroll-contain rounded-[20px]! p-4 text-body text-ink">
            {text}
          </GlassPanel>
        </Anchored>
      )}
    </div>
  );
}

/** What speaks for them, the label small over the value: Houses hosted, Member since, and People lived with when there are any. (Verified sits on the photo.) */
function TrustBand({ view }: { view: ProfileVisibility }) {
  const t = useTranslations("profile.view");
  const items = [
    { label: t("trustHosted", { count: view.hostedCount }), value: String(view.hostedCount) },
    view.memberSince !== null && { label: t("memberSince"), value: String(view.memberSince) },
    view.livedWith.length > 0 && { label: t("trustPeople", { count: view.livedWith.length }), value: String(view.livedWith.length) },
  ].filter((item) => item !== false);
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2">
      {items.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-small text-muted">{label}</dt>
          <dd className="mt-0.5 text-body font-semibold tabular-nums text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ───────────────────────── About ───────────────────────── */

/** "Hosting now" shows this many rows at most. */
const MAX_HOSTING_ROWS = 3;

/**
 * The middle column (a Panel): About – the bio, the languages, the socials – and under it "Hosting now", only with an open House: a compact
 * row each (picture 56px, title, dates · place, "2 spots left", an arrow), the whole row opening the House, 3 at most.
 */
function AboutTile({ user, isMe, houses }: { user: User; isMe: boolean; houses: Stay[] }) {
  const t = useTranslations("profile.view");
  const f = useFormat();
  const store = useStore();
  const hasAbout = Boolean(user.bio) || user.languages.length > 0 || (user.socials?.length ?? 0) > 0;
  return (
    <Panel className="flex min-h-0 min-w-0 flex-col gap-8">
      <section className="flex min-h-0 flex-col gap-4 split:scroll-pane">
        <h2 className="text-eyebrow uppercase text-ink/55">{t("about")}</h2>
        {user.bio && <Bio text={user.bio} />}
        {user.languages.length > 0 && <p className="text-small text-muted">{t("speaks", { languages: user.languages.join(", ") })}</p>}
        <SocialTiles user={user} />
        {!hasAbout && (
          <p className="text-body text-muted">
            {isMe ? (
              <Link href="/profile/edit" className="font-semibold text-ink underline-offset-4 hover:underline">
                {t("aboutAdd")}
              </Link>
            ) : (
              t("aboutEmpty")
            )}
          </p>
        )}
      </section>
      {houses.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-eyebrow uppercase text-ink/55">{t("hostingNow")}</h2>
          <ul className="-mx-2">
            {houses.slice(0, MAX_HOSTING_ROWS).map((stay) => {
              const cover = housePhotos(stay, findUser(store, stay.hostId))[0];
              const spots = openSpots(stay);
              return (
                <li key={stay.id}>
                  <Link href={`/house/${stay.slug}`} className={listItemStyles(false, "flex items-center gap-4 rounded-2xl p-2")}>
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-ink/6">{cover && <Img src={cover} alt="" fill sizes="56px" className="object-cover" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-semibold text-ink">{stay.title}</span>
                      <span className="block truncate text-small text-muted">
                        {f.stayDatesLong(stay)} · {f.placeName(stay)}
                      </span>
                      {spots > 0 && <span className="block text-small text-ink">{t("spotsLeft", { count: spots })}</span>}
                    </span>
                    <ChevronRight className="size-4.5 shrink-0 text-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Panel>
  );
}

/** One face, with their name on hover, linking to their profile. */
function Face({ entry }: { entry: LivedWithEntry }) {
  return (
    <Link href={`/u/${entry.user.id}`} aria-label={firstName(entry.user)} data-tooltip={firstName(entry.user)} className="relative block rounded-full ring-2 ring-bg hover:z-10 focus-visible:z-10">
      <PersonPhoto src={entry.user.photos[0]} alt={entry.user.name} size={44} className="size-11" />
    </Link>
  );
}

const strong = (chunks: ReactNode) => <span className="font-semibold text-ink">{chunks}</span>;

/**
 * The right column. LIVED WITH: "Lived with 8 people in 3 Houses" and the faces – only people who confirmed it from both sides, "+N" for the rest;
 * your own also has who's waiting for you to confirm. PLACES: the cities, no dates. Nothing lived yet: only "New to Simpulo · joined {month}". Your
 * own page keeps "Upcoming: N Houses →" at the bottom.
 */
function ProofTile({ view, isMe }: { view: ProfileVisibility; isMe: boolean }) {
  const t = useTranslations("profile.view");
  const formatter = useFormatter();
  const store = useStore();
  const [confirming, setConfirming] = useState(false);
  const people = view.livedWith.filter((e) => !isBlocked(store, e.user.id));
  const toConfirm = view.toConfirm.filter((e) => !isBlocked(store, e.user.id));
  const waiting = view.waitingForThem.filter((e) => !isBlocked(store, e.user.id));
  const rest = people.length - MAX_FACES;
  const empty = people.length === 0 && view.livedInCount === 0 && toConfirm.length === 0;
  return (
    <Panel className="flex min-h-0 min-w-0 flex-col gap-8">
      {empty ? (
        <div>
          <p className="text-body font-semibold text-ink">{t("newHere", { date: view.joinedAt ? formatter.dateTime(new Date(view.joinedAt), { month: "long", year: "numeric" }) : "" })}</p>
          <p className="mt-1 text-small text-muted">{t("newHereLine")}</p>
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-eyebrow uppercase text-ink/55">{t("livedWith")}</h2>
            <p className="text-body text-muted">
              {people.length > 0 ? t.rich("livedWithLine", { people: people.length, houses: view.livedInCount, b: strong }) : t.rich("livedInLine", { houses: view.livedInCount, b: strong })}
            </p>
            {people.length > 0 && (
              <div className="flex flex-wrap items-center -space-x-2">
                {people.slice(0, MAX_FACES).map((entry) => (
                  <Face key={entry.user.id} entry={entry} />
                ))}
                {rest > 0 && <span className="flex size-11 items-center justify-center rounded-full bg-(--chip-bg) text-small font-semibold text-ink ring-2 ring-bg">{t("more", { count: rest })}</span>}
              </div>
            )}
            {(toConfirm.length > 0 || waiting.length > 0) && (
              <p className="flex flex-wrap items-center gap-x-3 text-small text-muted">
                {toConfirm.length > 0 && (
                  <button type="button" onClick={() => setConfirming(true)} className="font-semibold text-ink underline-offset-4 hover:underline">
                    {t("confirmLink", { count: toConfirm.length })}
                  </button>
                )}
                {waiting.length > 0 && <span>{t("waitingForThem", { count: waiting.length })}</span>}
              </p>
            )}
          </section>
          {view.livedInPlaces.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-eyebrow uppercase text-ink/55">{t("places")}</h2>
              <p className="text-body text-ink">{view.livedInPlaces.join(" · ")}</p>
            </section>
          )}
        </>
      )}
      {isMe && view.upcoming.length > 0 && (
        <Link href="/your-houses" className="mt-auto flex items-center gap-1.5 text-small font-semibold text-ink underline-offset-4 hover:underline">
          <Lock className="size-3.5 shrink-0 text-muted" aria-hidden />
          {t("upcomingLine", { count: view.upcoming.length })}
        </Link>
      )}
      <Sheet open={confirming} onClose={() => setConfirming(false)} title={t("confirmTitle")}>
        <p className="text-small text-muted">{t("toConfirm")}</p>
        <ul className="mt-4 space-y-3">
          {toConfirm.map((entry) => (
            <li key={entry.user.id} className="flex items-center gap-3">
              <Avatar user={entry.user} size="md" linked />
              <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink">{firstName(entry.user)}</span>
              <Button variant="tertiary" onClick={() => store.confirmLivedWith(entry.user.id)}>
                {t("confirm")}
              </Button>
            </li>
          ))}
        </ul>
      </Sheet>
    </Panel>
  );
}
