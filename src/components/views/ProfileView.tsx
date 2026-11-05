"use client";

import { BadgeCheck, Lock, MessageCircle, MoreHorizontal, Pencil, SearchX, Settings, Share2, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { use, useState } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { Container } from "@/components/layout/Container";
import { PreviewBanner, PreviewProvider, usePreviewGuard } from "@/components/PreviewMode";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { ShareSheet } from "@/components/share/ShareSheet";
import { PhotoLightbox } from "@/components/stay/PhotoLightbox";
import { StayCard } from "@/components/StayCard";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { iconButtonStyles } from "@/components/ui/IconButton";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Img } from "@/components/ui/Img";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { ProHostLabel } from "@/components/ui/ProHostLabel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SOCIAL_ICONS } from "@/components/ui/socialIcons";
import { useToast } from "@/components/ui/Toast";
import { MoreList } from "@/components/views/MoreList";
import { HOUSE_GRID } from "@/config/explore";
import { useFormat } from "@/i18n/format";
import { profileViewFor, type ProfileView as ProfileVisibility } from "@/lib/profilePrivacy";
import { socialUrl } from "@/lib/socialLinks";
import { findUser, getCrew, getCurrentUser, isBlocked, isCrewMember, useStore, type LivedWithEntry } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { cn, firstName } from "@/lib/utils";

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
 * A person's page, one column: who they are, then what they host, who they lived with, their photos, where they want to go
 * and, for the crew, where they're going. Empty sections don't exist. What's in them: src/lib/profilePrivacy.ts.
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
  const photos = user.photos.slice(0, MAX_PHOTOS);

  return (
    <Container page>
      {/* Mobile: Settings lives behind a gear on your own profile (desktop: the avatar menu in the header). */}
      {isMe && (
        <div className="-mt-2 mb-2 flex justify-end md:hidden">
          <Link href="/settings" aria-label={t("settings")} className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-ink/5">
            <Settings className="size-5" />
          </Link>
        </div>
      )}
      <ProfileHead user={user} isMe={isMe} previewing={previewing} onPreview={onPreview} view={view} onOpenPhotos={() => photos.length > 0 && setPhotoIndex(0)} />
      <HostingNow houses={view.hostingNow} isMe={isMe} />
      <LivedWithSection view={view} isMe={isMe} />
      <PhotosSection photos={photos} onOpen={setPhotoIndex} />
      <UpcomingSection houses={view.upcoming} isMe={isMe} />
      <PhotoLightbox photos={photos} index={photoIndex} onIndexChange={setPhotoIndex} onClose={() => setPhotoIndex(null)} alt={user.name} />
    </Container>
  );
}

/** Profile photos in the masonry, at most. */
const MAX_PHOTOS = 9;
const MAX_LINKS = 4;
const MAX_FACES = 12;
const SECTION = "mt-(--space-section)";
const CONTENT = "mt-(--space-inner)";
const ROUND_BUTTON = iconButtonStyles();

/* ───────────────────────── Head ───────────────────────── */

interface ProfileHeadProps {
  user: User;
  isMe: boolean;
  previewing: boolean;
  onPreview?: () => void;
  view: ProfileVisibility;
  onOpenPhotos: () => void;
}

/**
 * No frame: the avatar, then name, where they're from, the trust band, links, languages and bio. Top right never a filled
 * button: the page's main action is the House below. Someone else: Message, share, "…". You: Edit profile and "…".
 */
function ProfileHead({ user, isMe, previewing, onPreview, view, onOpenPhotos }: ProfileHeadProps) {
  const t = useTranslations("profile");
  const tView = useTranslations("profile.view");
  const f = useFormat();
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
        if (threadId) router.push(`/inbox/${threadId}`);
      }, t("loginToMessage", { name: firstName(user) })),
    );
  }

  return (
    <header className="relative flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
      <button
        type="button"
        onClick={onOpenPhotos}
        disabled={user.photos.length === 0}
        aria-label={t("openPhotos")}
        className="shrink-0 self-start rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-default"
      >
        <PersonPhoto src={user.photos[0]} alt={user.name} size={144} className="size-36" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="text-h1 text-ink">{user.name}</h1>
        <p className="mt-1 text-body-lg text-muted">
          {f.ageAndCountry(user)}
          {user.city && ` · ${t("basedIn", { city: user.city })}`}
        </p>
        <ProHostLabel user={user} className="mt-2" />
        <TrustBand user={user} view={view} />
        <SocialCapsules user={user} />
        {user.languages.length > 0 && <p className="mt-3 text-small text-muted">{tView("speaks", { languages: user.languages.join(", ") })}</p>}
        {user.bio && <p className="mt-4 max-w-[640px] text-body-lg text-ink">{user.bio}</p>}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {isMe ? (
          <>
            <Button variant="secondary" size="mid" href="/profile/edit">
              <Pencil aria-hidden />
              {t("editProfile")}
            </Button>
            <MoreMenu
              label={tView("options")}
              buttonClassName={ROUND_BUTTON}
              items={[
                ...(onPreview ? [{ label: tView("previewAsOthers"), onSelect: onPreview }] : []),
                { label: tView("shareProfile"), onSelect: () => setSharing(true) },
              ]}
            />
          </>
        ) : (
          <>
            {messageStayId && (
              <Button variant="secondary" size="mid" onClick={() => message(messageStayId)} data-preview-action>
                <MessageCircle aria-hidden />
                {t("message")}
              </Button>
            )}
            <button type="button" onClick={() => setSharing(true)} aria-label={t("share")} title={t("share")} className={ROUND_BUTTON}>
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
      <ShareSheet target={{ kind: "profile", user }} open={sharing} onClose={() => setSharing(false)} />
    </header>
  );
}

/** What speaks for them, in one row: the label small over the value. What's at zero isn't there. */
function TrustBand({ user, view }: { user: User; view: ProfileVisibility }) {
  const t = useTranslations("profile.view");
  const items = [
    view.hostedCount > 0 && { label: t("trustHosted", { count: view.hostedCount }), value: view.hostedCount },
    view.livedInCount > 0 && { label: t("trustLivedIn", { count: view.livedInCount }), value: view.livedInCount },
    view.livedWith.length > 0 && { label: t("trustPeople", { count: view.livedWith.length }), value: view.livedWith.length },
  ].filter((item) => item !== false);
  if (!user.verified && items.length === 0) return null;
  return (
    <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3">
      {user.verified && (
        <div>
          <dt className="text-small text-muted">{t("trustVerifiedLabel")}</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-body font-semibold text-ink">
            <BadgeCheck className="size-4 text-accent" aria-hidden />
            {t("trustVerified")}
          </dd>
        </div>
      )}
      {items.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-small text-muted">{label}</dt>
          <dd className="mt-0.5 text-body font-semibold tabular-nums text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Public links as capsules: the mark in its brand colour + the handle. At most four, then "+N" shows the rest. */
function SocialCapsules({ user }: { user: User }) {
  const t = useTranslations("profile.view");
  const [all, setAll] = useState(false);
  const links = user.socials ?? [];
  if (links.length === 0) return null;
  const shown = all ? links : links.slice(0, MAX_LINKS);
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      {shown.map((link) => {
        const { icon: Icon, brand, hex, onInk } = SOCIAL_ICONS[link.platform];
        const handle = link.platform === "website" ? link.value.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : `@${link.value.replace(/^@/, "")}`;
        return (
          <a key={`${link.platform}-${link.value}`} href={socialUrl(link)} target="_blank" rel="noopener" title={brand ?? undefined} className="inline-flex h-9 max-w-full items-center gap-2 rounded-full bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-3 text-small text-ink transition-colors hover:bg-bg">
            <span className={cn("flex shrink-0 items-center justify-center", onInk && "size-5 rounded-full bg-ink")} style={{ color: hex ?? "var(--ink)" }}>
              <Icon className={onInk ? "size-3" : "size-4"} color="currentColor" />
            </span>
            <span className="truncate">{handle}</span>
          </a>
        );
      })}
      {!all && links.length > MAX_LINKS && (
        <button type="button" onClick={() => setAll(true)} className="inline-flex h-9 items-center rounded-full bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-3 text-small text-ink transition-colors hover:bg-bg">
          {t("moreLinks", { count: links.length - MAX_LINKS })}
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── Sections ───────────────────────── */

function HouseCards({ houses }: { houses: Stay[] }) {
  const store = useStore();
  return (
    <div className={cn(HOUSE_GRID, CONTENT)}>
      {houses.map((stay) => (
        <StayCard key={stay.id} stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} />
      ))}
    </div>
  );
}

/** Open Houses. Without one: nothing for others, one plain line on your own profile. */
function HostingNow({ houses, isMe }: { houses: Stay[]; isMe: boolean }) {
  const t = useTranslations("profile.view");
  if (houses.length === 0) {
    return isMe ? (
      <p className={cn(SECTION, "text-body text-muted")}>
        {t("noOpenHouse")} ·{" "}
        <Link href="/create" className="font-semibold text-ink underline-offset-4 hover:underline">
          {t("openHouse")}
        </Link>
      </p>
    ) : null;
  }
  return (
    <section aria-labelledby="profile-hosting" className={SECTION}>
      <SectionHeader
        id="profile-hosting"
        eyebrow={t("hostingNow")}
        action={
          isMe && (
            <Link href="/create" className={buttonStyles("tertiary", "md")}>
              {t("openAnother")}
            </Link>
          )
        }
      />
      <HouseCards houses={houses} />
    </section>
  );
}

/** One face, with their name on hover, linking to their profile. */
function Face({ entry, muted = false }: { entry: LivedWithEntry; muted?: boolean }) {
  return (
    <Link href={`/u/${entry.user.id}`} className="group/face relative block rounded-full ring-2 ring-bg hover:z-10 focus-visible:z-10">
      <PersonPhoto src={entry.user.photos[0]} alt={entry.user.name} size={48} className={cn("size-12", muted && "opacity-60")} />
      <span aria-hidden className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap glass-panel rounded-lg! px-2.5 py-1 text-small text-ink opacity-0 transition-opacity duration-150 group-hover/face:opacity-100 group-focus-visible/face:opacity-100">
        {firstName(entry.user)}
      </span>
    </Link>
  );
}

/**
 * Who they lived with, only people who confirmed it from both sides, and where: only the cities. Your own also shows who's
 * waiting for you to confirm, and who hasn't yet.
 */
function LivedWithSection({ view, isMe }: { view: ProfileVisibility; isMe: boolean }) {
  const t = useTranslations("profile.view");
  const store = useStore();
  const people = view.livedWith.filter((e) => !isBlocked(store, e.user.id));
  const toConfirm = view.toConfirm.filter((e) => !isBlocked(store, e.user.id));
  const waiting = view.waitingForThem.filter((e) => !isBlocked(store, e.user.id));
  const hasPlaces = view.livedInCount > 0;
  if (people.length === 0 && !hasPlaces && toConfirm.length === 0 && waiting.length === 0) return null;
  const rest = people.length - MAX_FACES;
  return (
    <section aria-labelledby="profile-lived" className={SECTION}>
      <SectionHeader id="profile-lived" eyebrow={t("livedWith")} />
      {people.length > 0 && (
        <div className={cn(CONTENT, "flex flex-wrap items-center -space-x-2")}>
          {people.slice(0, MAX_FACES).map((entry) => (
            <Face key={entry.user.id} entry={entry} />
          ))}
          {rest > 0 && <span className="flex size-12 items-center justify-center rounded-full bg-surface text-small font-semibold text-ink ring-2 ring-bg">{t("more", { count: rest })}</span>}
        </div>
      )}
      {hasPlaces && (
        <p className={cn("text-small text-muted", people.length > 0 ? "mt-3" : CONTENT)}>
          {t("livedInSummary", { count: view.livedInCount, places: view.livedInPlaces.join(", ") })}
          {isMe && (
            <>
              {" · "}
              <Link href="/my-stays" className="font-semibold text-ink underline-offset-4 hover:underline">
                {t("seePast")}
              </Link>
            </>
          )}
        </p>
      )}
      {toConfirm.length > 0 && (
        <div className="mt-6">
          <p className="text-small text-muted">{t("toConfirm")}</p>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
            {toConfirm.map((entry) => (
              <li key={entry.user.id} className="flex items-center gap-3">
                <Avatar user={entry.user} size="md" linked />
                <span className="text-body font-semibold text-ink">{firstName(entry.user)}</span>
                <Button variant="tertiary" onClick={() => store.confirmLivedWith(entry.user.id)}>
                  {t("confirm")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {waiting.length > 0 && <p className="mt-3 text-small text-muted">{t("waitingForThem", { count: waiting.length })}</p>}
    </section>
  );
}

/** A quiet masonry: the column layout breaks the rows, three heights keep it from reading as a grid. */
const MASONRY_SHAPES = ["aspect-4/5", "aspect-square", "aspect-3/4"];

function PhotosSection({ photos, onOpen }: { photos: string[]; onOpen: (index: number) => void }) {
  const t = useTranslations("profile");
  const tView = useTranslations("profile.view");
  if (photos.length === 0) return null;
  return (
    <section aria-labelledby="profile-photos" className={SECTION}>
      <SectionHeader id="profile-photos" eyebrow={tView("photos")} />
      <ul className={cn(CONTENT, "columns-2 gap-3 md:columns-3 md:gap-4 split:columns-4")}>
        {photos.map((src, i) => (
          <li key={src} className="mb-3 break-inside-avoid md:mb-4">
            <button type="button" onClick={() => onOpen(i)} aria-label={t("openPhoto", { index: i + 1 })} className={cn("relative block w-full overflow-hidden rounded-3xl bg-line outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2", MASONRY_SHAPES[i % MASONRY_SHAPES.length])}>
              <Img src={src} alt="" fill sizes="(min-width: 1100px) 25vw, (min-width: 768px) 33vw, 50vw" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Upcoming as a guest. Only ever filled for you and for people in those crews; your own always shows, with the lock. */
function UpcomingSection({ houses, isMe }: { houses: Stay[]; isMe: boolean }) {
  const t = useTranslations("profile.view");
  if (houses.length === 0 && !isMe) return null;
  return (
    <section aria-labelledby="profile-upcoming" className={SECTION}>
      <SectionHeader id="profile-upcoming" eyebrow={t("upcoming")} />
      <p className="mt-1 flex items-center gap-1.5 text-small text-muted">
        <Lock className="size-3.5 shrink-0" aria-hidden />
        {isMe ? t("upcomingOwnHint") : t("upcomingCrewHint")}
      </p>
      {houses.length > 0 ? <HouseCards houses={houses} /> : <p className={cn(CONTENT, "text-body text-muted")}>{t("upcomingEmpty")}</p>}
    </section>
  );
}
