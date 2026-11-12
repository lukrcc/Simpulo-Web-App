"use client";

import { publicName, showsAge, showsOnHousePages } from "@/config/privacy";
import { Bookmark, CalendarDays, Home, Languages, Lock, MapPin, MoreHorizontal, Pencil, SearchX, Settings, Share2, Sparkles, UserPlus, UserX, Users, Zap } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { use, useMemo, useState } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { HouseCard } from "@/components/HouseCard";
import { InviteSheet } from "@/components/InviteSheet";
import { useMonthName } from "@/components/explore/SearchFields";
import { activeInForOf, inForPlaceName, type InFor } from "@/lib/inFor";
import { canInvite } from "@/lib/invites";
import { Container } from "@/components/layout/Container";
import { PreviewBanner, PreviewProvider, usePreviewGuard } from "@/components/PreviewMode";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { ShareSheet } from "@/components/share/ShareSheet";
import { PhotoLightbox } from "@/components/stay/PhotoLightbox";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { CardRow, RowHead } from "@/components/ui/CardRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { cardGradient, cardTextShadow } from "@/components/ui/glass";
import { iconButtonStyles } from "@/components/ui/IconButton";
import { Img } from "@/components/ui/Img";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { ProHostLabel } from "@/components/ui/ProHostLabel";
import { Sheet } from "@/components/ui/Sheet";
import { Shelf } from "@/components/ui/Shelf";
import { SocialLinks } from "@/components/SocialLinks";
import { useToast } from "@/components/ui/Toast";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { MoreList } from "@/components/views/MoreList";
import { EXPLORE_GRID } from "@/config/explore";
import { HOUSE_VIBE_SCALES, HOUSE_VIBE_STEPS } from "@/config/houseVibe";
import { useFormat } from "@/i18n/format";
import { cityPlaceIdOf, coverOf } from "@/lib/data/places";
import { inCommonWith, medianReplyMinutes, profileViewFor, sharesCrew, type ProfileView as ProfileVisibility } from "@/lib/profilePrivacy";
import { shortNameOf } from "@/lib/shortName";
import { findUser, getCrew, getCurrentUser, isBlocked, settingsOf, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { useGridColumns } from "@/lib/useGridColumns";
import { usePhotoDrag } from "@/lib/usePhotoDrag";
import { useSnapCarousel } from "@/lib/useSnapCarousel";
import { cn, firstName, housePhotos, openSpots } from "@/lib/utils";
import { yourPeople } from "@/lib/yourPeople";

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
  const tv = useTranslations("profile.view");
  const store = useStore();
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const viewerId = previewing ? null : store.currentUserId;
  const view = profileViewFor(store, user, viewerId, today);
  const { photos } = user;
  // How many cards a row shows at once – the grid's real column count.
  const [columnProbe, setColumnProbe] = useState<HTMLDivElement | null>(null);
  const cols = useGridColumns(columnProbe) || 4;
  // Turned off "Show me on House pages": only people who shared a crew with them see more (config/privacy.ts) – no photos, no Houses.
  if (!isMe && !showsOnHousePages(user) && !sharesCrew(store, user.id, viewerId)) return <PrivateProfile user={user} />;

  const cardOf = (stay: Stay) => ({ key: stay.id, node: <HouseCard stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} /> });
  // Hosting now: their open or upcoming Houses (others: the public ones). Going to: where they're a guest – only as the privacy rules allow.
  const hosting = view.hostingNow.filter((s) => s.status !== "draft");
  return (
    <Container className="explore-width explore-root pb-16 pt-6 md:pt-8">
      <div ref={setColumnProbe} aria-hidden className={cn(EXPLORE_GRID, "h-0")} />
      {/* Mobile: Settings lives behind a gear on your own profile (desktop: the avatar menu in the header). */}
      {isMe && (
        <div className="-mt-2 mb-2 flex justify-end md:hidden">
          <Link href="/settings" aria-label={t("settings")} className={iconButtonStyles("lg")}>
            <Settings className="size-5" />
          </Link>
        </div>
      )}
      <ProfileHead user={user} isMe={isMe} previewing={previewing} onPreview={onPreview} view={view} viewerId={viewerId} onOpenPhoto={(index) => photos.length > 0 && setPhotoIndex(index)} />

      {/* The rows, like Your houses: 48px under the head, 40px apart, each headed by its title (24px) and how many. */}
      <div className="mt-12 flex flex-col gap-10">
        <VibeRow user={user} isMe={isMe} />
        {hosting.length > 0 && <CardRow id="hosting-now" title={tv("rowHostingNow")} cards={hosting.map(cardOf)} cols={cols} />}
        {view.upcoming.length > 0 && <CardRow id="going-to" title={tv("rowGoingTo")} cards={view.upcoming.map(cardOf)} cols={cols} />}
        <LivedWithRow view={view} isMe={isMe} viewerId={viewerId} />
        {view.places.length > 0 && <PlacesRow places={view.places} />}
      </div>
      <PhotoLightbox photos={photos} index={photoIndex} onIndexChange={setPhotoIndex} onClose={() => setPhotoIndex(null)} alt={user.name} />
    </Container>
  );
}

/** A private profile, to everyone who wasn't in a crew with them: the first name and "This profile is private" – nothing else. */
function PrivateProfile({ user }: { user: User }) {
  const t = useTranslations("profile.view");
  return (
    <Container page className="flex min-h-[calc(100dvh-var(--header-total)-var(--space-section))] flex-col items-center justify-center pb-(--space-section) text-center">
      <span aria-hidden className="flex size-24 items-center justify-center rounded-full bg-ink/6 text-muted">
        <Lock className="size-7" />
      </span>
      <h1 className="mt-6 text-h1 text-ink">{publicName(user, null)}</h1>
      <p className="mt-2 text-body-lg text-muted">{t("private")}</p>
    </Container>
  );
}

/* ───────────────────────── Head ───────────────────────── */

interface HeadProps {
  /** Edit profile's live preview: no actions, quiet placeholders for what's empty, each part marked (data-preview-part) */
  preview?: boolean;
  /** Edit profile: no date of birth set yet – no age at all */
  hideAge?: boolean;
  user: User;
  isMe: boolean;
  previewing: boolean;
  onPreview?: () => void;
  view: ProfileVisibility;
  viewerId: string | null;
  onOpenPhoto: (index: number) => void;
}

/**
 * The head, one row of about 480px in the header's container: left a third, the photos as a 4:5 card (swipe, dots; no name on it); right two
 * thirds Ember – the name (display 40px) with the orange check and the muted "29 · Ireland · based in Lisbon", share and "…" (your own: "Edit
 * profile"); the trust chips; what you have in common (people you both lived with first); the socials; at the bottom the actions. No free
 * "Message" (direct chats start from a House). Phones: one column, the photo on top.
 */
function ProfileHead({ user, isMe, previewing, onPreview, view, viewerId, onOpenPhoto, preview = false, hideAge = false }: HeadProps) {
  const t = useTranslations("profile");
  const tv = useTranslations("profile.view");
  const f = useFormat();
  const store = useStore();
  const guard = usePreviewGuard();
  const showToast = useToast();
  const [sharing, setSharing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const monthName = useMonthName();
  const minutes = medianReplyMinutes(user);
  // "I'm in for …" (lib/inFor.ts): their running signals as chips – "In for Lisbon · Mar".
  const inFor = activeInForOf(store.inFor, user.id, today);
  const inForText = (s: InFor) =>
    tv("inForChip", { place: inForPlaceName(s), months: s.monthFrom === s.monthTo ? monthName(s.monthFrom, "bare") : `${monthName(s.monthFrom, "bare")}–${monthName(s.monthTo, "bare")}` });
  // "Save" (private, nobody is told): Your houses › Saved people, first in the invite sheet.
  const saved = !isMe && viewerId ? (settingsOf(store.users.find((u) => u.id === viewerId)).savedPeopleIds ?? []).includes(user.id) : false;
  const toggleSave = () =>
    guard(() => {
      store.toggleSavedPerson(user.id);
      showToast(saved ? tv("unsavedToast", { name: firstName(user) }) : tv("savedToast", { name: firstName(user) }));
    });
  // The compact House line under the socials: hosting now, else going (only what profilePrivacy shows).
  const houseLine = view.hostingNow.find((s) => s.status === "published" || s.status === "booked") ?? view.upcoming[0];
  const trust = [
    view.housesCount > 0 && { key: "houses", icon: Home, text: tv("chipHouses", { count: view.housesCount }) },
    view.livedWith.length > 0 && { key: "people", icon: Users, text: tv("chipLivedWith", { count: view.livedWith.length }) },
    minutes !== null && minutes <= FAST_REPLY_MINUTES && { key: "fast", icon: Zap, text: tv("chipFast") },
    view.memberSince !== null && { key: "since", icon: CalendarDays, text: tv("chipSince", { year: view.memberSince }) },
  ].filter((item) => item !== false);
  const common = isMe ? null : inCommonWith(store, user, viewerId, today);
  // Their open House (the soonest), and yours to invite them to.
  const theirOpen = view.hostingNow.find((s) => s.status === "published" && s.acceptingRequests && openSpots(s) > 0);
  // Your open Houses with a free spot they aren't in or asking for yet – "Invite to your House" opens the invite sheet with them picked
  // (several Houses: pick one first).
  const mineOpen = !isMe && viewerId
    ? store.stays
        .filter((s) => canInvite(store, s, viewerId, today) && !store.joinRequests.some((r) => r.stayId === s.id && r.userId === user.id && ["invited", "pending", "accepted", "waitlisted", "waitlist_requested"].includes(r.status)))
        .toSorted((a, b) => a.startDate.localeCompare(b.startDate))
    : [];
  const mine = mineOpen[0];
  const invite = () => guard(() => setInviting(true));
  const seeTheirs = theirOpen && (
    <Button key="see" variant="cream" size="lg" href={`/house/${theirOpen.slug}`}>
      {tv("seeHouse", { name: shortNameOf(theirOpen) })}
    </Button>
  );
  const inviteButton = (primary: boolean) =>
    mine ? (
      <Button key="invite" variant={primary ? "cream" : "creamOutline"} size="lg" onClick={invite} data-preview-action>
        <UserPlus aria-hidden />
        {tv("inviteToHouse")}
      </Button>
    ) : null;
  const actions = seeTheirs ? [seeTheirs, inviteButton(false)] : [inviteButton(true)];

  return (
    <section aria-labelledby="profile-name" className="grid gap-4 split:grid-cols-[minmax(0,min(33.333%,384px))_minmax(0,1fr)] split:gap-5">
      <div data-preview-part="photos" className="min-w-0">
        <ProfilePhotoCard user={user} onOpen={onOpenPhoto} />
      </div>
      {/* With a House line the Ember fills the photo's height; without one it's as tall as its content, top-aligned (the photo keeps 4:5). */}
      <div className={cn("ember ember-scope flex min-w-0 flex-col gap-5 rounded-3xl p-6 sm:p-8 split:p-10", !houseLine && "split:self-start")}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div data-preview-part="basics" className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 id="profile-name" className="flex min-w-0 items-center gap-2 text-name text-ink">
                <span className="truncate">{publicName(user, viewerId)}</span>
                <span data-preview-part="verify" className="inline-flex shrink-0 items-center">
                  {user.verified ? <VerifiedBadge className="shrink-0" /> : preview && <span className="ember-chip text-small font-medium text-ink/60">{tv("notVerified")}</span>}
                </span>
              </h1>
              <p className="text-body-lg text-muted">
                {hideAge ? user.country : f.ageAndCountry(user, showsAge(user, viewerId))}
                {user.city && ` · ${t("basedIn", { city: user.city })}`}
              </p>
            </div>
            <ProHostLabel user={user} className="mt-2 empty:hidden" />
          </div>
          <div className={cn("flex shrink-0 items-center gap-2", preview && "hidden")}>
            <button type="button" onClick={() => setSharing(true)} aria-label={t("share")} className={iconButtonStyles()}>
              <Share2 className="size-4" aria-hidden />
            </button>
            {!isMe && viewerId && (
              <button type="button" onClick={toggleSave} aria-pressed={saved} aria-label={saved ? tv("unsave") : tv("save")} className={iconButtonStyles()}>
                <Bookmark className={cn("size-4", saved && "fill-current")} aria-hidden />
              </button>
            )}
            {isMe ? (
              <Button variant="creamOutline" size="sm" href="/settings/profile">
                <Pencil aria-hidden />
                {t("editProfile")}
              </Button>
            ) : previewing ? (
              <button type="button" onClick={() => guard(() => undefined)} aria-label={tv("options")} className={iconButtonStyles()}>
                <MoreHorizontal className="size-5" aria-hidden />
              </button>
            ) : (
              <SafetyMenu target={{ kind: "user", id: user.id }} user={user} extraItems={viewerId ? [{ label: saved ? tv("unsave") : tv("save"), onSelect: toggleSave }] : []} buttonClassName={iconButtonStyles()} />
            )}
          </div>
        </div>

        {(trust.length > 0 || inFor.length > 0) && (
          <ul className="flex flex-wrap gap-2 text-small font-medium">
            {trust.map(({ key, icon: Icon, text }) => (
              <li key={key} className="ember-chip">
                <Icon aria-hidden className="size-3.5" />
                {text}
              </li>
            ))}
            {inFor.map((s) => (
              <li key={s.id} className="ember-chip">
                <MapPin aria-hidden className="size-3.5" />
                {inForText(s)}
              </li>
            ))}
          </ul>
        )}

        {common && (common.livedWith.length > 0 || common.languages.length > 0 || common.interests.length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-eyebrow uppercase text-ink/60">{tv("inCommon")}</span>
            {/* People you both lived with first, then a language, then what you're both into. */}
            {common.livedWith.slice(0, 2).map((person) => (
              <span key={person.id} className="ember-chip text-small">
                <PersonPhoto src={person.photos[0]} alt="" size={20} className="size-5" />
                {tv("mutual", { name: firstName(person) })}
              </span>
            ))}
            {common.languages.slice(0, 1).map((language) => (
              <span key={language} className="ember-chip text-small">
                <Languages aria-hidden className="size-3.5" />
                {tv("speaksOne", { language })}
              </span>
            ))}
            {common.interests.slice(0, 1).map((interest) => (
              <span key={interest} className="ember-chip text-small">
                <Sparkles aria-hidden className="size-3.5" />
                {tv("bothInto", { interest: f.vibe(interest) })}
              </span>
            ))}
          </div>
        )}

        <div data-preview-part="links" className="self-start">
          {(user.socials?.length ?? 0) > 0 ? <SocialLinks user={user} variant="full" tone="dark" /> : preview && <span className="ember-chip text-small font-medium text-ink/60">{tv("linksAdd")}</span>}
        </div>

        {houseLine && !preview && <HouseLine stay={houseLine} label={view.hostingNow.includes(houseLine) ? tv("hostingNow") : tv("going")} />}

        {isMe && !user.verified && (
          <p className="text-small text-muted">
            <VerifyHint />
          </p>
        )}

        <div className={cn("mt-auto flex flex-wrap items-center justify-between gap-3", preview && "hidden")}>
          <div className="flex flex-wrap gap-2">{actions}</div>
          {isMe && onPreview && (
            <button type="button" onClick={onPreview} className="text-small font-semibold text-muted underline-offset-4 transition-colors hover:text-ink hover:underline">
              {tv("previewAsOthers")}
            </button>
          )}
        </div>
      </div>
      <ShareSheet target={{ kind: "profile", user }} open={sharing} onClose={() => setSharing(false)} />
      {mineOpen.length > 0 && <InviteSheet houses={mineOpen} open={inviting} onClose={() => setInviting(false)} preselect={[user.id]} />}
    </section>
  );
}

/** "Hosting now" / "Going": one compact House line in the Ember – photo 48px, title, "date · short name"; the whole line opens the House. */
function HouseLine({ stay, label }: { stay: Stay; label: string }) {
  const f = useFormat();
  const store = useStore();
  const photo = housePhotos(stay, findUser(store, stay.hostId))[0];
  return (
    <div>
      <p className="mb-2 text-eyebrow uppercase text-ink/60">{label}</p>
      <Link href={`/h/${stay.id}`} className="group -mx-2 flex max-w-[480px] items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors duration-150 hover:bg-[#F4EEE7]/6">
        <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-[#F4EEE7]/10">{photo && <Img src={photo} alt="" fill sizes="48px" className="object-cover" />}</span>
        <span className="min-w-0">
          <span className="block truncate text-body font-semibold text-ink">{stay.title}</span>
          <span className="block truncate text-small text-muted">
            {f.stayDates(stay)} · {shortNameOf(stay)}
          </span>
        </span>
      </Link>
    </div>
  );
}

/** Your own profile without the check: one quiet line, with its link. */
function VerifyHint() {
  const tVerify = useTranslations("verification");
  return <>{tVerify.rich("profileHint", { link: (chunks) => <Link href="/settings#payments" className="font-semibold text-ink underline-offset-4 hover:underline">{chunks}</Link> })}</>;
}

/** The photos as a 4:5 card: swipe or drag, the dots at the bottom; a click opens the lightbox. No name on it – that's in the Ember part. */
function ProfilePhotoCard({ user, onOpen }: { user: User; onOpen: (index: number) => void }) {
  const t = useTranslations("profile");
  const tv = useTranslations("profile.view");
  const { photos } = user;
  const { ref, active, onScroll, scrollTo } = useSnapCarousel<HTMLDivElement>(photos.length);
  const drag = usePhotoDrag(ref, active, scrollTo, photos.length > 1);
  return (
    <div className="relative mx-auto w-full max-w-130 split:max-w-none">
      <div className="group relative aspect-4/5 w-full overflow-hidden rounded-3xl bg-linear-to-br from-(--card-blank-from) to-(--card-blank-to)">
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
              <Img src={src} alt="" fill sizes="(min-width: 1100px) 384px, 100vw" loading={i === 0 ? "eager" : undefined} className="object-cover object-[center_30%]" />
            </button>
          ))}
        </div>
        {photos.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center">
            {photos.map((src, i) => (
              <button key={src} type="button" onClick={() => scrollTo(i)} aria-label={tv("showPhoto", { number: i + 1, count: photos.length })} aria-current={i === active || undefined} data-no-tooltip className="flex h-5 items-center px-0.5">
                <span className={cn("block h-1 rounded-full transition-all", i === active ? "w-3 bg-white" : "w-1 bg-white/60")} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Rows ───────────────────────── */

/** A reply this fast (median, minutes) earns "Responds fast". */
const FAST_REPLY_MINUTES = 120;

/**
 * "Vibe": how they live in a House – four scales (config/houseVibe.ts), each its icon, where they lean in a word, and three dots with theirs
 * filled orange; beside it the bio (three lines at most) and the languages as chips. Your own without any of it: the way to Edit profile.
 */
function VibeRow({ user, isMe, preview = false }: { user: User; isMe: boolean; /** Edit profile's preview: quiet placeholders instead of gaps, the parts marked */ preview?: boolean }) {
  const tv = useTranslations("profile.view");
  const tVibe = useTranslations("profile.vibe");
  const vibe = user.houseVibe;
  if (!vibe && !user.bio && user.languages.length === 0 && !isMe && !preview) return null;
  const placeholder = (text: string) => <p className="text-body text-muted">{text}</p>;
  return (
    <section aria-labelledby="row-vibe">
      <RowHead id="row-vibe" title={tv("rowVibe")} />
      <div className="mt-4 grid gap-x-12 gap-y-6 split:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {vibe ? (
          <ul data-preview-part="vibe" className="flex flex-col gap-3">
            {HOUSE_VIBE_SCALES.map(({ key, icon: Icon }) => (
              <li key={key} className="flex items-center justify-between gap-4" aria-label={`${tVibe(`${key}.scale`)}: ${tVibe(`${key}.${vibe[key]}`)}`}>
                <span className="flex min-w-0 items-center gap-2.5 text-body text-ink">
                  <Icon aria-hidden className="size-4 shrink-0 text-ink/60" />
                  <span className="truncate">{tVibe(`${key}.${vibe[key]}`)}</span>
                </span>
                <span aria-hidden className="flex shrink-0 items-center gap-1.5">
                  {HOUSE_VIBE_STEPS.map((step) => (
                    <span key={step} className={cn("size-2.5 rounded-full", step === vibe[key] ? "bg-accent" : "bg-ink/12")} />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        ) : preview ? (
          <div data-preview-part="vibe">{placeholder(tv("vibeAdd"))}</div>
        ) : (
          isMe && (
            <Link href="/settings/profile" className="text-body font-semibold text-ink underline-offset-4 hover:underline">
              {tv("vibeAdd")}
            </Link>
          )
        )}
        <div data-preview-part="about" className="flex min-w-0 flex-col gap-3">
          {user.bio ? <p className="line-clamp-3 max-w-[640px] text-body text-ink">{user.bio}</p> : preview ? placeholder(tv("aboutAdd")) : isMe ? <Link href="/settings/profile" className="text-body font-semibold text-ink underline-offset-4 hover:underline">{tv("aboutAdd")}</Link> : null}
          {preview && user.languages.length === 0 && placeholder(tv("languagesAdd"))}
          {user.languages.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {user.languages.map((language) => (
                <li key={language} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink/6 px-3 text-small font-medium text-ink">
                  <Languages aria-hidden className="size-3.5 text-ink/60" />
                  {language}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * "Lived with · 5": faces 56px in one row, under each the first name and the short name of the House they shared. People from the viewer's
 * Your people first, with a small orange ring. Only people who confirmed it from both sides. Your own: who waits for your confirmation.
 */
function LivedWithRow({ view, isMe, viewerId }: { view: ProfileVisibility; isMe: boolean; viewerId: string | null }) {
  const tv = useTranslations("profile.view");
  const store = useStore();
  const [confirming, setConfirming] = useState(false);
  const yours = useMemo(() => new Set(viewerId && !isMe ? yourPeople(store, viewerId).map((p) => p.user.id) : []), [store, viewerId, isMe]);
  const people = view.livedWith.filter((e) => !isBlocked(store, e.user.id)).toSorted((a, b) => Number(yours.has(b.user.id)) - Number(yours.has(a.user.id)));
  const toConfirm = view.toConfirm.filter((e) => !isBlocked(store, e.user.id));
  if (people.length === 0 && toConfirm.length === 0) return null;
  return (
    <section aria-labelledby="row-lived-with">
      <RowHead
        id="row-lived-with"
        title={tv("rowLivedWith")}
        count={people.length}
        aside={
          toConfirm.length > 0 && (
            <button type="button" onClick={() => setConfirming(true)} className="text-body font-semibold text-ink underline-offset-4 hover:underline">
              {tv("confirmLink", { count: toConfirm.length })}
            </button>
          )
        }
      />
      {people.length > 0 && (
        <ul className="no-scrollbar -mx-2 mt-4 flex gap-4 overflow-x-auto px-2 py-1">
          {people.map((entry) => (
            <li key={entry.user.id} className="w-20 shrink-0">
              <Link href={`/u/${entry.user.id}`} className="flex flex-col items-center text-center">
                <PersonPhoto src={entry.user.photos[0]} alt={entry.user.name} size={56} className={cn("size-14", yours.has(entry.user.id) && "ring-2 ring-accent ring-offset-2 ring-offset-(--bg)")} />
                <span className="mt-2 max-w-full truncate text-body font-semibold text-ink">{firstName(entry.user)}</span>
                <span className="max-w-full truncate text-small text-muted">{shortNameOf(entry.house)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Sheet open={confirming} onClose={() => setConfirming(false)} title={tv("confirmTitle")}>
        <p className="text-small text-muted">{tv("toConfirm")}</p>
        <ul className="mt-4 space-y-3">
          {toConfirm.map((entry) => (
            <li key={entry.user.id} className="flex items-center gap-3">
              <Avatar user={entry.user} size="md" linked />
              <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink">{firstName(entry.user)}</span>
              <Button variant="tertiary" onClick={() => store.confirmLivedWith(entry.user.id)}>
                {tv("confirm")}
              </Button>
            </li>
          ))}
        </ul>
      </Sheet>
    </section>
  );
}

/**
 * "Places": a tile per city they lived in – the city's photo (the curated one, else the House's own), its name, the month and year (only for
 * themselves and their crews; the public sees the place alone). A click: Explore filtered on that place.
 */
function PlacesRow({ places }: { places: ProfileVisibility["places"] }) {
  const tv = useTranslations("profile.view");
  const formatter = useFormatter();
  const store = useStore();
  return (
    <section aria-labelledby="row-places">
      <RowHead id="row-places" title={tv("rowPlaces")} count={places.length} />
      <Shelf variant="flat" top="mt-4">
        {places.map(({ city, country, stay, month }) => {
          const placeId = cityPlaceIdOf(city);
          const photo = (placeId && coverOf(placeId)) || housePhotos(stay, findUser(store, stay.hostId))[0];
          const body = (
            <>
              {photo && <Img src={photo} alt="" fill sizes="320px" className="object-cover transition-transform duration-300 group-hover:scale-[1.04]" />}
              <span aria-hidden className={cn("absolute inset-0", cardGradient)} />
              <span className={cn("absolute inset-x-0 bottom-0 p-5 text-white", cardTextShadow)}>
                <span className="block truncate text-card-title">{city}</span>
                <span className="block truncate text-small text-white/85">{month ? formatter.dateTime(new Date(`${month}-01T00:00:00Z`), { month: "long", year: "numeric", timeZone: "UTC" }) : country}</span>
              </span>
            </>
          );
          const tile = "group relative block aspect-4/3 w-full overflow-hidden rounded-3xl bg-ink/6";
          return (
            <div key={city} className="explore-slide shrink-0">
              {placeId ? (
                <Link href={`/explore?place=${encodeURIComponent(placeId)}`} className={tile}>
                  {body}
                </Link>
              ) : (
                <div className={tile}>{body}</div>
              )}
            </div>
          );
        })}
      </Shelf>
    </section>
  );
}

/* ───────────────────────── Edit profile's preview ───────────────────────── */

/**
 * The public profile's own head and Vibe row, as others (logged out) see them, for Edit profile's live preview: no actions, quiet
 * placeholders for what's empty, every part marked `data-preview-part` (photos, basics, vibe, about, links, verify) so the open section can be
 * ringed. Not clickable – the caller makes it inert.
 */
export function ProfilePreviewBody({ user, hideAge }: { user: User; hideAge: boolean }) {
  const store = useStore();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const view = profileViewFor(store, user, null, today);
  return (
    <div className="flex flex-col gap-10">
      <ProfileHead user={user} isMe={false} previewing view={view} viewerId={null} onOpenPhoto={() => undefined} preview hideAge={hideAge} />
      <VibeRow user={user} isMe={false} preview />
    </div>
  );
}
