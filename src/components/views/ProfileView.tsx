"use client";

import { BackButton } from "@/components/ui/BackButton";
import { publicName, showsAge, showsOnHousePages } from "@/config/privacy";
import { Bell, Bookmark, Eye, Languages, Lock, MapPin, MoreHorizontal, Pencil, SearchX, Settings, Share2, Smartphone, Sparkles, UserPlus, Users, UserX, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { use, useMemo, useState, type ReactNode } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { useInForLine } from "@/components/InFor";
import { HeroBand, HeroPhotos } from "@/components/HeroBand";
import { InviteSheet } from "@/components/InviteSheet";
import { Container } from "@/components/layout/Container";
import { PreviewProvider, usePreviewGuard } from "@/components/PreviewMode";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { ShareSheet } from "@/components/share/ShareSheet";
import { SocialLinks } from "@/components/SocialLinks";
import { PhotoLightbox } from "@/components/stay/PhotoLightbox";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { iconButtonStyles } from "@/components/ui/IconButton";
import { Img } from "@/components/ui/Img";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { ProHostBadge } from "@/components/ui/ProHostLabel";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { MoreList } from "@/components/views/MoreList";
import { HOUSE_VIBE_SCALES } from "@/config/houseVibe";
import { PROFILE_SECTIONS, sectionDone } from "@/config/profile-sections";
import { useFormat } from "@/i18n/format";
import { cityPlaceIdOf } from "@/lib/data/places";
import { placeImageOf } from "@/config/place-images";
import { activeInForOf, inForPlaceName } from "@/lib/inFor";
import { canInvite } from "@/lib/invites";
import { inCommonWith, medianReplyMinutes, profileViewFor, sharesCrew, type ProfileView as ProfileVisibility } from "@/lib/profilePrivacy";
import { shortNameOf } from "@/lib/shortName";
import { findUser, getCurrentUser, isBlocked, settingsOf, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { cn, firstName, housePhotos, languageCode } from "@/lib/utils";
import { yourPeople } from "@/lib/yourPeople";
import { useYourPeople } from "@/lib/useYourPeople";
import { useIsStandalone } from "@/lib/install";

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
 * A person's page as one bento grid on one screen (from 1100px: 12 columns, 2 rows, 16px apart, as high as the window allows – 640 to 820px –
 * no scrolling). Row 1: Photo (3) · Identity, Ember (6) · Now (3). Row 2: About (3) · Vibe (3) · Find me (3) · People & places (3). The tiles
 * lie right on the page (two levels at most, no tile in a tile). What's in them: src/lib/profilePrivacy.ts.
 * Own profile: "Preview" renders the stranger's page, a slim line above the grid says so.
 */
function ProfileView({ user, isMe }: { user: User; isMe: boolean }) {
  const [preview, setPreview] = useState(false);
  const previewing = isMe && preview;
  return (
    <PreviewProvider active={previewing}>
      <ProfileBody user={user} isMe={isMe && !previewing} previewing={previewing} onPreview={isMe ? () => setPreview(true) : undefined} onExitPreview={() => setPreview(false)} />
    </PreviewProvider>
  );
}

interface ProfileBodyProps {
  user: User;
  isMe: boolean;
  /** Rendering as a stranger: no viewer, nothing private */
  previewing: boolean;
  onPreview?: () => void;
  onExitPreview: () => void;
}

function ProfileBody({ user, isMe, previewing, onPreview, onExitPreview }: ProfileBodyProps) {
  const tPreview = useTranslations("common.ui.preview");
  const store = useStore();
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const viewerId = previewing ? null : store.currentUserId;
  const view = profileViewFor(store, user, viewerId, today);
  const { photos } = user;
  // Turned off "Show me on House pages": only people who shared a crew with them see more (config/privacy.ts) – no photos, no Houses.
  if (!isMe && !showsOnHousePages(user) && !sharesCrew(store, user.id, viewerId)) return <PrivateProfile user={user} />;

  return (
    <>
      {/* The preview: one slim line above the band – not sticky, not over the content. */}
      {previewing && (
        <p role="status" className="flex h-10 items-center justify-center gap-3 bg-ink/6 px-4 text-small text-ink md:-mt-4 md:mb-4">
          <Eye aria-hidden className="size-4 shrink-0 text-muted" />
          <span className="truncate">{tPreview("profile")}</span>
          <button type="button" onClick={onExitPreview} className="shrink-0 font-semibold underline underline-offset-2 hover:text-muted">
            {tPreview("exit")}
          </button>
        </p>
      )}
      <ProfileBento
        user={user}
        isMe={isMe}
        previewing={previewing}
        onPreview={onPreview}
        view={view}
        viewerId={viewerId}
        today={today}
        onOpenPhoto={(index) => photos.length > 0 && setPhotoIndex(index)}
      />
      <PhotoLightbox photos={photos} index={photoIndex} onIndexChange={setPhotoIndex} onClose={() => setPhotoIndex(null)} alt={user.name} />
    </>
  );
}

/** A column under the band: right on the page's background, its label like every eyebrow. */
const COLUMN_LABEL = "text-eyebrow uppercase text-ink/55";

interface BentoProps {
  user: User;
  isMe: boolean;
  previewing: boolean;
  onPreview?: () => void;
  view: ProfileVisibility;
  viewerId: string | null;
  today: string;
  onOpenPhoto: (index: number) => void;
  /** Edit profile's live preview: no actions, quiet placeholders, every part marked (data-preview-part); a fixed height */
  preview?: boolean;
  /** Edit profile: no date of birth yet – no age */
  hideAge?: boolean;
}

/**
 * A person's page on one screen (from 1100px wide and 760px high – the `fit` variant): exactly 100vh minus the header (and the 32px legal
 * line under it), no scrolling. The person as a band right under the header (components/HeroBand), clamp(380px, 54vh, 540px) high: the photos
 * (clamp(320px, 28 %, 560px) wide, cut to the face), Ember with the identity, and "Hosting & going" in its right column. Below it, 32px down,
 * four columns right on the page's background, 1px lines ink 8 % between them, exactly as high as what's left: About · Vibe · Find me ·
 * People & places – what doesn't fit is cut, with "more" for the rest; empty ones are left out. Smaller or lower windows: the same order,
 * scrolling allowed. Phones: one under the other.
 */
function ProfileBento({ user, isMe, previewing, onPreview, view, viewerId, today, onOpenPhoto, preview = false, hideAge = false }: BentoProps) {
  const store = useStore();
  const links = (user.socials?.length ?? 0) > 0;
  const inFor = activeInForOf(store.inFor, user.id, today);
  const columns = [
    (user.bio || user.languages.length > 0 || isMe || preview) && { key: "about", node: <AboutColumn user={user} isMe={isMe} preview={preview} /> },
    (user.houseVibe || isMe || preview) && { key: "vibe", node: <VibeTile user={user} isMe={isMe} preview={preview} /> },
    (links || inFor.length > 0 || preview) && { key: "find", node: <FindColumn user={user} today={today} preview={preview} /> },
    (view.livedWith.length > 0 || view.places.length > 0 || (isMe && view.toConfirm.length > 0)) && { key: "people", node: <PeoplePlacesTile view={view} isMe={isMe} viewerId={viewerId} /> },
  ].filter((c) => c !== false && c !== "") as { key: string; node: ReactNode }[];
  return (
    <div data-profile-bento className={cn(!preview && "fit:flex fit:h-[calc(100dvh-var(--header-h)-var(--band-h)-32px)] fit:flex-col fit:overflow-hidden")}>
      <HeroBand
        aria-labelledby="profile-name"
        // As high as its content (no big empty field), at least enough for the photos.
        height="split:min-h-[clamp(360px,44vh,480px)] fit:shrink-0"
        mediaWidth="split:w-[clamp(320px,28%,560px)]"
        media={
          <div data-preview-part="photos" className="absolute inset-0">
            <HeroPhotos photos={user.photos} onOpen={onOpenPhoto} />
          </div>
        }
        rightColumn={<HostingGoing user={user} isMe={isMe} view={view} today={today} preview={preview} />}
      >
        <IdentityTile user={user} isMe={isMe} previewing={previewing} onPreview={onPreview} view={view} viewerId={viewerId} today={today} preview={preview} hideAge={hideAge} />
      </HeroBand>
      <Container className={cn("explore-width explore-root fit:min-h-0 fit:flex-1", preview ? "pb-8" : "pb-12 fit:pb-6")}>
        <div className="mt-8 fit:h-[calc(100%-32px)]">
          {/* No lines between the columns: 64px apart, top-aligned, each as high as its content. */}
          <div className="flex flex-col gap-8 split:flex-row split:items-start split:gap-16 fit:max-h-full">
            {columns.map((column) => (
              <div key={column.key} className="min-w-0 flex-1 fit:max-h-full fit:min-h-0 fit:overflow-hidden">
                {column.node}
              </div>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}

/**
 * Identity (the global Ember): the name 40px + Verified, beside it the Pro host badge and muted "29 · Norway · Lisbon"; top right Share ·
 * Save · "…". In the middle three numbers, large (32px), each its label under it – Houses · lived with · since – no capsules. Then ONE line
 * with icons: "Responds fast · You both speak English · Both into Party" (at most 3). At the bottom "Invite to your House" when that's
 * possible. Your own: Share, then at the bottom "Edit profile" (outline) with the progress ring "4 of 6" (gone at 6/6), no in-common line.
 */
function IdentityTile({ user, isMe, previewing, onPreview, view, viewerId, today, preview, hideAge }: Omit<BentoProps, "onOpenPhoto">) {
  const tBack = useTranslations("common");
  const t = useTranslations("profile");
  const tv = useTranslations("profile.view");
  const f = useFormat();
  const store = useStore();
  const guard = usePreviewGuard();
  const showToast = useToast();
  const [sharing, setSharing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const minutes = medianReplyMinutes(user);
  const saved = !isMe && viewerId ? (settingsOf(store.users.find((u) => u.id === viewerId)).savedPeopleIds ?? []).includes(user.id) : false;
  const toggleSave = () =>
    guard(() => {
      store.toggleSavedPerson(user.id);
      showToast(saved ? tv("unsavedToast", { name: firstName(user) }) : tv("savedToast", { name: firstName(user) }));
    });
  const common = isMe ? null : inCommonWith(store, user, viewerId, today);
  // One line: replies fast, a language you share, something you're both into – at most three, the rest left out.
  const line = [
    minutes !== null && minutes <= FAST_REPLY_MINUTES && { key: "fast", icon: Zap, text: tv("chipFast") },
    common?.languages[0] && { key: "lang", icon: Languages, text: tv("bothSpeak", { language: common.languages[0] }) },
    common?.interests[0] && { key: "into", icon: Sparkles, text: tv("bothInto", { interest: f.vibe(common.interests[0]) }) },
  ]
    .filter((item) => item !== false && item !== undefined && item !== "")
    .slice(0, 3) as { key: string; icon: LucideIcon; text: string }[];
  // Your Houses with a free spot they aren't in or asking for yet: "Invite to your House" (several: the sheet asks which first).
  const mineOpen = !isMe && viewerId
    ? store.stays
        .filter((s) => canInvite(store, s, viewerId, today) && !store.joinRequests.some((r) => r.stayId === s.id && r.userId === user.id && ["invited", "pending", "accepted", "waitlisted", "waitlist_requested"].includes(r.status)))
        .toSorted((a, b) => a.startDate.localeCompare(b.startDate))
    : [];
  // Nobody lived with yet: no "0" – a sparkle where the number would be, and "New on Simpulo" as its label.
  const numbers: { key: string; value: ReactNode; label: string }[] = [
    { key: "houses", value: String(view.housesCount), label: tv("numHouses", { count: view.housesCount }) },
    view.livedWith.length > 0
      ? { key: "people", value: String(view.livedWith.length), label: tv("numLivedWith") }
      : { key: "people", value: <Sparkles aria-hidden className="size-8" strokeWidth={1.75} />, label: tv("newOnSimpulo") },
    { key: "since", value: view.memberSince !== null ? String(view.memberSince) : "–", label: tv("numSince") },
  ];
  // Your own: how far the profile is ("4 of 6", the sections counted in Edit profile).
  const counted = PROFILE_SECTIONS.filter((s) => s.progress !== false);
  const done = counted.filter((s) => sectionDone(s.key, user, today)).length;

  return (
    // Stacked from the top – name and meta · 24px · the numbers · 16px · the in-common line · 24px · the action; what's left stays free below.
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex items-start justify-between gap-4">
        {/* The way back: phones and the installed app. */}
        <BackButton fallback="/" label={tBack("back")} className="mt-1" />
        <div data-preview-part="basics" className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <h1 id="profile-name" className="flex min-w-0 items-center gap-2 text-name text-ink">
            <span className="truncate">{publicName(user, viewerId)}</span>
            <span data-preview-part="verify" className="inline-flex shrink-0 items-center">
              {user.verified ? <VerifiedBadge className="shrink-0" /> : preview && <span className="ember-chip text-small font-medium text-ink/60">{tv("notVerified")}</span>}
            </span>
          </h1>
          <ProHostBadge user={user} />
          <p className="text-body-lg text-muted">
            {hideAge ? user.country : f.ageAndCountry(user, showsAge(user, viewerId))}
            {user.city && ` · ${user.city}`}
          </p>
        </div>
        <div className={cn("flex shrink-0 items-center gap-1", preview && "hidden")}>
          <button type="button" onClick={() => setSharing(true)} aria-label={t("share")} className={iconButtonStyles("sm")}>
            <Share2 className="size-4" aria-hidden />
          </button>
          {!isMe && viewerId && (
            <button type="button" onClick={toggleSave} aria-pressed={saved} aria-label={saved ? tv("unsave") : tv("save")} className={iconButtonStyles("sm")}>
              <Bookmark className={cn("size-4", saved && "fill-current")} aria-hidden />
            </button>
          )}
          {!isMe &&
            (previewing ? (
              <button type="button" onClick={() => guard(() => undefined)} aria-label={tv("options")} className={iconButtonStyles("sm")}>
                <MoreHorizontal className="size-5" aria-hidden />
              </button>
            ) : (
              <SafetyMenu target={{ kind: "user", id: user.id }} user={user} extraItems={viewerId ? [{ label: saved ? tv("unsave") : tv("save"), onSelect: toggleSave }] : []} buttonClassName={iconButtonStyles("sm")} />
            ))}
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-4">
        {numbers.map((n) => (
          <div key={n.key} className="min-w-0">
            <dd className="flex h-10 items-end text-section tabular-nums text-ink">{n.value}</dd>
            <dt className="mt-1 truncate text-small text-muted">{n.label}</dt>
          </div>
        ))}
      </dl>

      {line.length > 0 && (
        <p className="mt-4 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink">
          {line.map(({ key, icon: Icon, text }, i) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              {i > 0 && <span aria-hidden className="mr-1.5 text-muted">·</span>}
              <Icon aria-hidden className="size-3.5 text-ink/70" />
              {text}
            </span>
          ))}
        </p>
      )}

      {!preview && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {isMe ? (
            <span className="flex items-center gap-3">
              <Button variant="creamOutline" size="md" href="/settings/profile">
                <Pencil aria-hidden />
                {t("editProfile")}
              </Button>
              {done < counted.length && <ProgressRing done={done} total={counted.length} />}
            </span>
          ) : (
            mineOpen.length > 0 && (
              <Button variant="cream" size="lg" onClick={() => guard(() => setInviting(true))} data-preview-action>
                <UserPlus aria-hidden />
                {tv("inviteToHouse")}
              </Button>
            )
          )}
          {isMe && onPreview && (
            <button type="button" onClick={onPreview} className="text-small font-semibold text-muted underline-offset-4 transition-colors hover:text-ink hover:underline">
              {tv("previewAsOthers")}
            </button>
          )}
        </div>
      )}
      {/* Your own only (never someone else's, never "Preview as others"): the quick way to what the avatar menu used to hold. */}
      {isMe && !preview && !previewing && <QuickTiles user={user} />}
      <ShareSheet target={{ kind: "profile", user }} open={sharing} onClose={() => setSharing(false)} />
      {mineOpen.length > 0 && <InviteSheet houses={mineOpen} open={inviting} onClose={() => setInviting(false)} preselect={[user.id]} />}
    </div>
  );
}

/**
 * Your own profile's quick way in (under "Edit profile · 4 of 6 · Preview as others see it"): four tiles, equally wide, 88px high, --surface,
 * radius 20 – icon 22px top left, title semibold, the subtitle muted. Saved → Your houses › Saved · Your people → a sheet · Settings · Get the
 * app (installed: Notifications · On/Off → Settings › Notifications).
 */
function QuickTiles({ user }: { user: User }) {
  const tq = useTranslations("profile.view.quick");
  const tp = useTranslations("people.page");
  const people = useYourPeople();
  const standalone = useIsStandalone();
  const [peopleOpen, setPeopleOpen] = useState(false);
  const notificationsOn = Object.values(settingsOf(user).notifications).some((p) => p.push);
  const saved = user.savedStayIds?.length ?? 0;
  const tile = "flex h-22 min-w-0 flex-col justify-between rounded-[20px] bg-surface p-3.5 text-left transition-colors duration-150 hover:bg-surface-2";
  const body = (Icon: LucideIcon, title: string, sub?: string) => (
    <>
      <Icon aria-hidden className="size-5.5 text-ink" strokeWidth={1.75} />
      <span className="min-w-0">
        <span className="block truncate text-body font-semibold text-ink">{title}</span>
        {sub && <span className="block truncate text-small text-muted">{sub}</span>}
      </span>
    </>
  );
  return (
    // Four in a row where the head is wide enough (from 1440px); narrower 2 × 2, so no title is cut.
    <div className="mt-6 grid grid-cols-2 gap-3 min-[90rem]:grid-cols-4">
      <Link href="/your-houses#row-saved" className={tile}>
        {body(Bookmark, tq("saved"), tq("savedCount", { count: saved }))}
      </Link>
      <button type="button" onClick={() => setPeopleOpen(true)} className={tile}>
        {body(Users, tq("people"), tq("peopleCount", { count: people.length }))}
      </button>
      <Link href="/settings" className={tile}>
        {body(Settings, tq("settings"))}
      </Link>
      {standalone ? (
        <Link href="/settings/notifications" className={tile}>
          {body(Bell, tq("notifications"), notificationsOn ? tq("on") : tq("off"))}
        </Link>
      ) : (
        <Link href="/get" className={tile}>
          {body(Smartphone, tq("getApp"), tq("getAppSub"))}
        </Link>
      )}
      <Sheet variant="panel" open={peopleOpen} onClose={() => setPeopleOpen(false)} title={tp("title")}>
        <div className="px-6 pb-6">
          {people.length === 0 ? (
            <p className="text-body text-muted">{tq("peopleEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {people.map(({ user: person, house }) => (
                <li key={person.id}>
                  <Link href={`/u/${person.id}`} onClick={() => setPeopleOpen(false)} className="flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-ink/5">
                    <Avatar user={person} size="md" />
                    <span className="min-w-0">
                      <span className="block truncate text-body font-semibold text-ink">{firstName(person)}</span>
                      <span className="block truncate text-small text-muted">{tp("livedIn", { place: shortNameOf(house) })}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/people" onClick={() => setPeopleOpen(false)} className="mt-4 inline-block text-small font-semibold text-ink underline-offset-4 hover:underline">
            {tq("peopleAll")}
          </Link>
        </div>
      </Sheet>
    </div>
  );
}

/** "4 of 6": a small orange ring and the count. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const tv = useTranslations("profile.view");
  const r = 10;
  const c = 2 * Math.PI * r;
  return (
    <span className="inline-flex items-center gap-2 text-small text-muted">
      <svg viewBox="0 0 24 24" className="size-6 -rotate-90" aria-hidden>
        <circle cx="12" cy="12" r={r} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={2.5} />
        <circle cx="12" cy="12" r={r} fill="none" className="stroke-accent" strokeWidth={2.5} strokeLinecap="round" strokeDasharray={`${(done / total) * c} ${c}`} />
      </svg>
      {tv("progress", { done, total })}
    </span>
  );
}

/** Days from today to a date (0: today). */
const daysFrom = (today: string, date: string) => Math.max(0, Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000));

/** At most this many Houses in the band's list, then "+N more". */
const HOUSES_SHOWN = 3;

/**
 * "HOSTING & GOING", the band's right column: at most three rows of 64px – photo 48px (rounded square), the title (one line), right the state
 * muted ("Day 3 of 14" · "Next · in 78 days" · "Hosting · Mar 20" · "Going · Jan 17"), by date; a row opens the House (/h/[id]). More: "+N
 * more" → a sheet with all. Nothing to swipe. Empty: a large place icon + "In for Lisbon · Mar", or "Open to Houses". Your own: "Manage in
 * Your houses →" under it.
 */
function HostingGoing({ user, isMe, view, today, preview }: { user: User; isMe: boolean; view: ProfileVisibility; today: string; preview: boolean }) {
  const tv = useTranslations("profile.view");
  const f = useFormat();
  const store = useStore();
  const lineOf = useInForLine();
  const [all, setAll] = useState(false);
  const houses = preview
    ? []
    : [...new Set([...view.hostingNow.filter((s) => s.status === "published" || s.status === "booked"), ...view.upcoming])]
        .filter((s) => s.endDate >= today)
        .toSorted((a, b) => a.startDate.localeCompare(b.startDate));
  const inFor = activeInForOf(store.inFor, user.id, today);
  const firstUpcoming = houses.find((s) => s.startDate > today);
  const stateOf = (stay: Stay) => {
    if (stay.startDate <= today) return tv("dayOf", { day: daysFrom(stay.startDate, today) + 1, days: daysFrom(stay.startDate, stay.endDate) });
    if (isMe && stay === firstUpcoming) return tv("nextShort", { in: tv("inDays", { count: daysFrom(today, stay.startDate) }) });
    return stay.hostId === user.id ? tv("hostingOn", { date: f.day(stay.startDate) }) : tv("goingOn", { date: f.day(stay.startDate) });
  };
  const row = (stay: Stay, dark: boolean) => {
    const photo = housePhotos(stay, findUser(store, stay.hostId))[0];
    return (
      <Link href={`/h/${stay.id}`} className={cn("-mx-2 flex h-16 items-center gap-3 rounded-xl px-2 transition-colors duration-150", dark ? "hover:bg-ink/6" : "hover:bg-ink/5")}>
        <span className={cn("relative size-12 shrink-0 overflow-hidden rounded-xl", dark ? "bg-ink/10" : "bg-ink/6")}>{photo && <Img src={photo} alt="" fill sizes="48px" className="object-cover" />}</span>
        <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink">{stay.title}</span>
        <span className="shrink-0 text-small text-muted">{stateOf(stay)}</span>
      </Link>
    );
  };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <h2 className="mb-2 text-eyebrow uppercase text-ink/60">{tv("hostingGoing")}</h2>
      {houses.length > 0 ? (
        <ul>
          {houses.slice(0, HOUSES_SHOWN).map((stay) => (
            <li key={stay.id}>{row(stay, true)}</li>
          ))}
          {houses.length > HOUSES_SHOWN && (
            <li>
              <button type="button" onClick={() => setAll(true)} className="mt-1 text-small font-semibold text-ink underline-offset-4 hover:underline">
                {tv("moreHouses", { count: houses.length - HOUSES_SHOWN })}
              </button>
            </li>
          )}
        </ul>
      ) : inFor.length > 0 ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-ink/10 text-ink">
            <MapPin aria-hidden className="size-6" />
          </span>
          <p className="text-h3 text-ink">{tv("inForChip", { place: inForPlaceName(inFor[0]), months: lineOf(inFor[0]).split(" · ").slice(1).join(" · ") })}</p>
        </div>
      ) : (
        <p className="flex flex-1 items-center text-body text-muted">{tv("openToHouses")}</p>
      )}
      {isMe && !preview && (
        <Link href="/your-houses" className="mt-auto pt-4 text-small font-semibold text-ink underline-offset-4 hover:underline">
          {tv("manageInYourHouses")}
        </Link>
      )}
      <Sheet open={all} onClose={() => setAll(false)} title={tv("hostingGoing")}>
        <ul className="-mx-2">
          {houses.map((stay) => (
            <li key={stay.id} className="px-2">
              {row(stay, false)}
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

/** About: the bio (five lines at most, else "more" opens it whole) and the languages as short codes with an icon ("NO · EN"). */
function AboutColumn({ user, isMe, preview }: { user: User; isMe: boolean; preview: boolean }) {
  const tv = useTranslations("profile.view");
  const [open, setOpen] = useState(false);
  const codes = user.languages.map((name) => (languageCode(name) ?? name.slice(0, 2)).toUpperCase());
  const long = user.bio.length > 190;
  return (
    <section aria-labelledby="col-about" data-preview-part="about" className="flex min-w-0 flex-col gap-3">
      <h2 id="col-about" className={COLUMN_LABEL}>
        {tv("about")}
      </h2>
      {user.bio ? (
        <>
          <p className="line-clamp-4 text-body text-ink">{user.bio}</p>
          {/* The languages right under the bio (12px). */}
      {codes.length > 0 && (
        <p className="flex items-center gap-1.5 text-small font-semibold text-ink" aria-label={user.languages.join(", ")}>
          <Languages aria-hidden className="size-3.5 text-ink/60" />
          {codes.join(" · ")}
        </p>
      )}
          {long && (
            <button type="button" onClick={() => setOpen(true)} className="self-start text-small font-semibold text-ink underline-offset-4 hover:underline">
              {tv("readMore")}
            </button>
          )}
        </>
      ) : isMe && !preview ? (
        <Link href="/settings/profile" className="text-body font-semibold text-ink underline-offset-4 hover:underline">
          {tv("aboutAdd")}
        </Link>
      ) : (
        <p className="text-body text-muted">{preview ? tv("aboutAdd") : tv("aboutEmpty")}</p>
      )}
      {!user.bio && codes.length > 0 && (
        <p className="flex items-center gap-1.5 text-small font-semibold text-ink" aria-label={user.languages.join(", ")}>
          <Languages aria-hidden className="size-3.5 text-ink/60" />
          {codes.join(" · ")}
        </p>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={tv("about")}>
        <p className="whitespace-pre-line text-body text-ink">{user.bio}</p>
      </Sheet>
    </section>
  );
}

/** Find me: the links as rows (each mark in its own colour in a white circle, the handle, ↗); without links what they're in for. */
function FindColumn({ user, today, preview }: { user: User; today: string; preview: boolean }) {
  const tv = useTranslations("profile.view");
  const store = useStore();
  const line = useInForLine();
  const links = (user.socials?.length ?? 0) > 0;
  const inFor = links ? [] : activeInForOf(store.inFor, user.id, today);
  return (
    <section aria-labelledby="col-find" data-preview-part="links" className="min-w-0">
      <h2 id="col-find" className={COLUMN_LABEL}>
        {links || preview ? tv("findMe") : tv("inForLabel")}
      </h2>
      {links ? (
        <SocialLinks user={user} variant="rows" className="mt-2" />
      ) : inFor.length > 0 ? (
        <ul className="mt-2 flex flex-col">
          {inFor.map((s) => (
            <li key={s.id} className="flex h-12 items-center gap-3 text-body text-ink">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-ink/6 bg-plate">
                <MapPin aria-hidden className="size-5 text-accent" />
              </span>
              <span className="truncate">{line(s)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-body text-muted">{tv("linksAdd")}</p>
      )}
    </section>
  );
}

/** Scales shown from this end on the left (Chill ↔ Active, Relaxed ↔ Tidy); the others from step 1 (Early bird ↔ Night owl, Quiet ↔ Social). */
const FLIPPED: ReadonlySet<string> = new Set(["energy", "tidy"]);

/**
 * Vibe: the four scales with both ends' words (Early bird ↔ Night owl, Quiet ↔ Social, Chill ↔ Active, Relaxed ↔ Tidy), a line ink 10 % and
 * an orange dot where they are (three steps). Without: "No vibe yet" muted (your own: "Add your vibe").
 */
function VibeTile({ user, isMe, preview }: { user: User; isMe: boolean; preview: boolean }) {
  const tv = useTranslations("profile.view");
  const tVibe = useTranslations("profile.vibe");
  const vibe = user.houseVibe;
  return (
    <section aria-labelledby="tile-vibe" data-preview-part="vibe" className="min-w-0">
      <h2 id="tile-vibe" className={COLUMN_LABEL}>
        {tv("vibeLabel")}
      </h2>
      {vibe ? (
        <ul className="mt-3 flex flex-col">
          {HOUSE_VIBE_SCALES.map(({ key }) => {
            const flip = FLIPPED.has(key);
            const left = tVibe(`${key}.${flip ? 3 : 1}`);
            const right = tVibe(`${key}.${flip ? 1 : 3}`);
            const position = ((flip ? 4 - vibe[key] : vibe[key]) - 1) / 2;
            return (
              <li key={key} aria-label={`${tVibe(`${key}.scale`)}: ${tVibe(`${key}.${vibe[key]}`)}`} className="flex h-10 flex-col justify-center">
                <span aria-hidden className="flex justify-between gap-2 text-small text-muted">
                  <span className={cn("truncate", position < 0.5 && "font-semibold text-ink")}>{left}</span>
                  <span className={cn("truncate text-right", position > 0.5 && "font-semibold text-ink")}>{right}</span>
                </span>
                {/* The line 4px ink 8 %, filled from the left to the dot (the signal at 45 % → the signal), the dot 14px orange with a 2px white edge. */}
                <span aria-hidden className="relative mt-1.5 block h-1 rounded-full bg-ink/8">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(to_right,color-mix(in_srgb,var(--signal)_45%,var(--plate)),var(--signal))]" style={{ width: `${position * 100}%` }} />
                  <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-plate bg-accent shadow-[0_1px_2px_rgba(0,0,0,0.12)]" style={{ left: `${position * 100}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
      ) : isMe && !preview ? (
        <Link href="/settings/profile" className="mt-4 text-body font-semibold text-ink underline-offset-4 hover:underline">
          {tv("vibeAdd")}
        </Link>
      ) : (
        <p className="mt-4 text-body text-muted">{preview ? tv("vibeAdd") : tv("noVibe")}</p>
      )}
    </section>
  );
}

/** At most this many faces in the stack, then "+N". */
const PEOPLE_FACES = 5;
/** At most this many places by name, then "+N". */
const PLACES_SHOWN = 3;

/**
 * People & places: "LIVED WITH {n}" – a stack of faces (six at most + "+N"); a click opens the sheet with each name and the House you shared
 * (only confirmed both ways; your own: who waits for your confirmation). Under it "PLACES" as a text list (three at most, "+N"), no photos;
 * each place opens Explore filtered on it.
 */
function PeoplePlacesTile({ view, isMe, viewerId }: { view: ProfileVisibility; isMe: boolean; viewerId: string | null }) {
  const tv = useTranslations("profile.view");
  const store = useStore();
  const [sheet, setSheet] = useState<"people" | "confirm" | null>(null);
  const yours = useMemo(() => new Set(viewerId && !isMe ? yourPeople(store, viewerId).map((p) => p.user.id) : []), [store, viewerId, isMe]);
  const people = view.livedWith.filter((e) => !isBlocked(store, e.user.id)).toSorted((a, b) => Number(yours.has(b.user.id)) - Number(yours.has(a.user.id)));
  const toConfirm = isMe ? view.toConfirm.filter((e) => !isBlocked(store, e.user.id)) : [];
  const places = view.places;
  return (
    <section aria-labelledby="tile-people" className="flex min-w-0 flex-col gap-6">
      <div>
        <h2 id="tile-people" className={COLUMN_LABEL}>
          {tv("livedWithLabel", { count: people.length })}
        </h2>
        {people.length > 0 ? (
          <button type="button" onClick={() => setSheet("people")} className="mt-3 flex items-center rounded-full" aria-label={tv("livedWithLabel", { count: people.length })} data-no-tooltip>
            <span className="flex -space-x-2">
              {people.slice(0, PEOPLE_FACES).map((entry) => (
                <PersonPhoto key={entry.user.id} src={entry.user.photos[0]} alt="" size={40} className={cn("size-10 ring-2 ring-(--surface)", yours.has(entry.user.id) && "ring-accent")} />
              ))}
            </span>
            {people.length > PEOPLE_FACES && <span className="ml-2 text-small font-semibold text-ink">+{people.length - PEOPLE_FACES}</span>}
          </button>
        ) : (
          <p className="mt-3 text-body text-muted">{tv("peopleEmpty")}</p>
        )}
        {toConfirm.length > 0 && (
          <button type="button" onClick={() => setSheet("confirm")} className="mt-2 block text-small font-semibold text-ink underline-offset-4 hover:underline">
            {tv("confirmLink", { count: toConfirm.length })}
          </button>
        )}
      </div>
      {places.length > 0 && (
        <div className="min-h-0">
          <h3 className={COLUMN_LABEL}>{tv("placesLabel")}</h3>
          {/* Up to three places: a small photo 56px (only from config/place-images.ts, else the place icon) with the name under it. */}
          <ul className="mt-3 flex items-start gap-3">
            {places.slice(0, PLACES_SHOWN).map(({ city }) => {
              const placeId = cityPlaceIdOf(city);
              const photo = placeId ? placeImageOf(placeId) : null;
              const body = (
                <>
                  <span className="relative flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-ink/6 text-ink/60">
                    {photo ? <Img src={photo} alt="" fill sizes="56px" className="object-cover" /> : <MapPin aria-hidden className="size-5" />}
                  </span>
                  <span className="mt-1.5 block max-w-14 truncate text-small text-ink">{city}</span>
                </>
              );
              return (
                <li key={city} className="w-14">
                  {placeId ? (
                    <Link href={`/explore?place=${encodeURIComponent(placeId)}`} className="block">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
            {places.length > PLACES_SHOWN && <li className="flex h-14 items-center text-small font-semibold text-muted">+{places.length - PLACES_SHOWN}</li>}
          </ul>
        </div>
      )}
      <Sheet open={sheet === "people"} onClose={() => setSheet(null)} title={tv("livedWithLabel", { count: people.length })}>
        <ul className="space-y-2">
          {people.map((entry) => (
            <li key={entry.user.id}>
              <Link href={`/u/${entry.user.id}`} className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-ink/5">
                <Avatar user={entry.user} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-ink">{firstName(entry.user)}</span>
                  <span className="block truncate text-small text-muted">{shortNameOf(entry.house)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Sheet>
      <Sheet open={sheet === "confirm"} onClose={() => setSheet(null)} title={tv("confirmTitle")}>
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

/** A reply this fast (median, minutes) earns "Responds fast". */
const FAST_REPLY_MINUTES = 120;

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

/* ───────────────────────── Edit profile's preview ───────────────────────── */

/**
 * The public profile's bento, as others (logged out) see it, for Edit profile's live preview: no actions, quiet placeholders for what's empty,
 * every part marked `data-preview-part` (photos, basics, vibe, about, links, verify) so the open section can be ringed; a fixed height of
 * 640px. Not clickable – the caller makes it inert.
 */
export function ProfilePreviewBody({ user, hideAge }: { user: User; hideAge: boolean }) {
  const store = useStore();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const view = profileViewFor(store, user, null, today);
  return <ProfileBento user={user} isMe={false} previewing view={view} viewerId={null} today={today} onOpenPhoto={() => undefined} preview hideAge={hideAge} />;
}
