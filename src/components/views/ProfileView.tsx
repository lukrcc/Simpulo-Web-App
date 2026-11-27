"use client";

import { FoundingBadge } from "@/components/ui/FoundingBadge";
import { isFoundingHost } from "@/lib/founding";
import { getProfileVisibility, hostsPublicly, photoHiddenFor, profileHref, userByProfileId, visibleHostedHouses } from "@/lib/privacy";
import { completedStaysOf, currentHouseOf, profileMetrics } from "@/lib/metrics/profile";
import { placeShortOf, shortNameOf } from "@/lib/shortName";
import { BackButton } from "@/components/ui/BackButton";
import { publicName, showsAge } from "@/config/privacy";
import { Settings as SettingsIcon, Bookmark, ChevronRight, Eye, HelpCircle, Lock, MoreHorizontal, SearchX, UserX } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { use, useState, useSyncExternalStore, type ReactNode } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { useInForLine } from "@/components/InFor";
import { HeroPhotos } from "@/components/HeroBand";
import { StatsGroup, type StatsGroupBlock } from "@/components/StatsGroup";
import { crewThreadId } from "@/lib/links";
import { InviteSheet } from "@/components/InviteSheet";
import { Container } from "@/components/layout/Container";
import { PreviewProvider, usePreviewGuard } from "@/components/PreviewMode";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { ShareSheet } from "@/components/share/ShareSheet";
import { SocialLinks } from "@/components/SocialLinks";
import { PhotoLightbox } from "@/components/stay/PhotoLightbox";
import { Button } from "@/components/ui/ActionButton";
import { MoreMenu, type MoreMenuItem } from "@/components/ui/MoreMenu";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Img } from "@/components/ui/Img";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { MoreList } from "@/components/views/MoreList";
import { HOUSE_VIBE_SCALES, hasVibe } from "@/config/houseVibe";
import { PROFILE_SECTIONS, sectionDone, type ProfileSectionKey } from "@/config/profile-sections";
import { useFormat } from "@/i18n/format";
import { cityPlaceIdOf } from "@/lib/data/places";
import { placeImageOf } from "@/config/place-images";
import { activeInForOf, visibleInForOf } from "@/lib/inFor";
import { canInvite } from "@/lib/invites";
import { profileViewFor, type ProfileView as ProfileVisibility } from "@/lib/profilePrivacy";
import { findUser, getCurrentUser, isBlocked, isCrewMember, settingsOf, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { cn, firstName, housePhotos } from "@/lib/utils";
import { friendsOf, livedTogether, livedWithPeople, yourPeople } from "@/lib/yourPeople";

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
  // The URL holds the profile id (lib/privacy.ts), never the account id.
  const user = userByProfileId(store.users, userId);

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
  // "Preview as others see it" comes from the own profile's button and Edit profile as /profile?preview=1 – read once in the browser.
  const previewParam = useSyncExternalStore(noSubscribe, () => new URLSearchParams(window.location.search).get("preview") === "1", () => false);
  const [preview, setPreview] = useState(false);
  const [paramRead, setParamRead] = useState(false);
  if (previewParam && !paramRead) {
    setParamRead(true);
    setPreview(true);
  }
  const previewing = isMe && preview;
  const exit = () => {
    setPreview(false);
    if (window.location.search.includes("preview")) window.history.replaceState(window.history.state, "", window.location.pathname);
  };
  return (
    <PreviewProvider active={previewing}>
      <ProfileBody user={user} isMe={isMe && !previewing} previewing={previewing} onExitPreview={exit} />
    </PreviewProvider>
  );
}
const noSubscribe = () => () => {};

interface ProfileBodyProps {
  user: User;
  isMe: boolean;
  /** Rendering as a stranger: no viewer, nothing private */
  previewing: boolean;
  onExitPreview: () => void;
}

function ProfileBody({ user, isMe, previewing, onExitPreview }: ProfileBodyProps) {
  const tPreview = useTranslations("common.ui.preview");
  const store = useStore();
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const viewerId = previewing ? null : store.currentUserId;
  const view = profileViewFor(store, user, viewerId, today);
  const { photos } = user;
  // How much of the profile this viewer gets (lib/privacy.ts): private – nothing (logged out not even the first name); basic – first name,
  // photo, interests; host and full – the profile (lists of people only as numbers for anyone but the owner).
  const visibility = isMe ? "full" : getProfileVisibility(store, user, viewerId);
  if (visibility === "private") return <PrivateProfile user={user} showName={viewerId !== null} />;
  if (visibility === "basic") return <BasicProfile user={user} view={view} />;

  return (
    <>
      {/* The preview: one line right under the header, sticky there (never cut, never over the content's start). */}
      {previewing && (
        <p role="status" className="sticky top-(--header-total) z-30 flex h-11 items-center justify-center gap-3 border-b border-line bg-surface px-4 text-small text-ink">
          <Eye aria-hidden className="size-4 shrink-0 text-muted" />
          <span className="truncate">{tPreview("profile")}</span>
          <button type="button" onClick={onExitPreview} className="shrink-0 font-semibold underline underline-offset-2 hover:text-muted">
            {tPreview("exit")}
          </button>
        </p>
      )}
      <ProfileBento user={user} isMe={isMe} previewing={previewing} view={view} viewerId={viewerId} today={today} onOpenPhoto={(index) => photos.length > 0 && setPhotoIndex(index)} />
      <PhotoLightbox photos={photos} index={photoIndex} onIndexChange={setPhotoIndex} onClose={() => setPhotoIndex(null)} alt={user.name} />
    </>
  );
}

/** A section's heading under the stage: like the House page's section heads (text-subhead) – the window's edge cuts under it, never text. */

interface BentoProps {
  user: User;
  isMe: boolean;
  previewing: boolean;
  view: ProfileVisibility;
  viewerId: string | null;
  today: string;
  onOpenPhoto: (index: number) => void;
  /** Edit profile's live preview: no actions, quiet placeholders, every part marked (data-preview-part); a fixed height */
  preview?: boolean;
  /** Edit profile: no date of birth yet – no age */
  hideAge?: boolean;
}

/** Edit profile, opened on one section (?section=…) – the profile page itself edits nothing (CLAUDE.md "Profil neu geordnet"). */
const editHref = (section: ProfileSectionKey) => `/settings/profile?section=${section}`;

/**
 * A person's page (CLAUDE.md "Profil neu geordnet"): one centred column, at most 1100px, two columns from 744px – left the photo card (~40 %,
 * the Explore card's look, larger: radius 24, 4:5, the carousel's dots, a soft dark shade at its foot with the name large and "{country} ·
 * Hosts {n} Houses" in white – the age only with "Show my age"), right the rest: top right the actions, then (your own, incomplete) the slim
 * white line "Add {n} more to complete your profile ›", the bio, the vibe words grey in one line, the links as capsules, the numbers as a
 * white group and Your people as a white group of two rows. No pencils and nothing edited in place: Edit profile does it all.
 */
function ProfileBento({ user, isMe, previewing, view, viewerId, today, onOpenPhoto, preview = false, hideAge = false }: BentoProps) {
  const tBack = useTranslations("common");
  const tv = useTranslations("profile.view");
  const f = useFormat();
  const store = useStore();
  const photos = (!preview && photoHiddenFor(store, user, viewerId) ? [] : user.photos).slice(0, PHOTOS_SHOWN);
  const houses = preview ? [] : visibleHouses(view, user.id, today);
  const hosted = preview ? 0 : visibleHostedHouses(view, user.id, today).length;
  // "Now in …": only from a House they're in right now – and only when this viewer may see that House.
  const current = currentHouseOf(store, user.id, today);
  const nowIn = current && (isMe || houses.some((s) => s.id === current.id) || view.upcoming.some((s) => s.id === current.id)) ? placeShortOf(current) : null;
  // The age only with "Show my age" on (off by default) – the owner too sees what everyone sees (showsAge with no viewer reads the setting).
  const meta = [hideAge ? user.country : f.ageAndCountry(user, showsAge(user, null)), hosted > 0 && tv("hostsHouses", { count: hosted })].filter(Boolean).join(" · ");
  const bio = user.bio.length > SHORT_TEXT ? `${user.bio.slice(0, SHORT_TEXT - 1).trimEnd()}…` : user.bio;
  const hasLinks = (user.socials?.length ?? 0) > 0;
  return (
    <div data-profile-bento className={cn("mx-auto w-[min(100%-2*var(--page-margin),1100px)]", preview ? "py-6" : "pb-(--space-section) pt-6 md:pt-10")}>
      <div className="mb-4 md:hidden">
        <BackButton fallback="/" label={tBack("back")} />
      </div>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10">
        {/* The photo card: the Explore card's look, larger – radius 24, 4:5, the dots; the name on a soft shade at its foot. */}
        <section aria-labelledby="profile-name" data-preview-part="photos" className="relative aspect-[4/5] w-full overflow-hidden rounded-[24px] bg-surface-2">
          <HeroPhotos photos={photos} onOpen={preview ? undefined : onOpenPhoto} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-shade/70 via-shade/30 to-transparent px-6 pb-12 pt-24">
            <div data-preview-part="basics">
              <h1 id="profile-name" className="flex min-w-0 items-center gap-2 text-name text-on-image [text-shadow:0_1px_2px_rgba(0,0,0,.25)]">
                <span className="truncate">{publicName(user, viewerId)}</span>
                {user.verified && (
                  <span data-preview-part="verify" className="inline-flex shrink-0 items-center">
                    <VerifiedBadge className="shrink-0" />
                  </span>
                )}
              </h1>
              {meta && <p className="mt-1 text-body text-on-image/90">{meta}</p>}
              {nowIn && <p className="mt-0.5 text-body text-on-image/90">{tv("nowInHouse", { place: nowIn })}</p>}
            </div>
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-5">
          {!preview && <ProfileActions user={user} isMe={isMe} previewing={previewing} viewerId={viewerId} today={today} />}
          {isMe && !preview && <CompleteLine user={user} today={today} />}
          {isFoundingHost(user) && <FoundingBadge label className="text-ink" />}
          <div data-preview-part="about">
            {bio ? <p className="max-w-[56ch] text-body-lg text-ink">{bio}</p> : preview && <p className="text-body-lg text-muted">{tv("aboutAdd")}</p>}
          </div>
          <VibeLine user={user} isMe={isMe} viewerId={viewerId} preview={preview} />
          {(hasLinks || preview) && (
            <div data-preview-part="links" className="flex flex-wrap items-center gap-2">
              {hasLinks ? <SocialLinks user={user} variant="full" /> : <p className="text-body text-muted">{tv("linksAdd")}</p>}
            </div>
          )}
          {!preview && <ProfileStats user={user} isMe={isMe} today={today} view={view} />}
          {!preview && <PeopleGroup user={user} isMe={isMe} view={view} viewerId={viewerId} />}
        </div>
      </div>
    </div>
  );
}

/** At most this many photos on the card. */
const PHOTOS_SHOWN = 4;
/** The short text. */
const SHORT_TEXT = 160;

/** Your own profile, not complete yet: one slim white line – "Add 2 more to complete your profile ›" – that opens Edit profile. */
function CompleteLine({ user, today }: { user: User; today: string }) {
  const tv = useTranslations("profile.view");
  const counted = PROFILE_SECTIONS.filter((s) => s.progress !== false);
  const open = counted.filter((s) => !sectionDone(s.key, user, today));
  if (open.length === 0) return null;
  return (
    <Link href={editHref(open[0].key)} className="flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-surface px-4 text-body text-ink transition-colors duration-150 hover:bg-surface/70">
      {tv("completeMore", { count: open.length })}
      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
    </Link>
  );
}

/**
 * The vibe words in one grey line – only what's set, in the questions' order ("Night owl · Balanced · Active · Tidy"); a visitor sees what
 * they share in bold. Nothing set: no line (Edit profile's preview: "Add your vibe").
 */
function VibeLine({ user, isMe, viewerId, preview }: { user: User; isMe: boolean; viewerId: string | null; preview: boolean }) {
  const tv = useTranslations("profile.view");
  const tVibe = useTranslations("profile.vibe");
  const store = useStore();
  const vibe = hasVibe(user.houseVibe) ? user.houseVibe : undefined;
  const mine = !isMe && viewerId ? findUser(store, viewerId)?.houseVibe : undefined;
  if (!vibe && !preview) return null;
  return (
    <p data-preview-part="vibe" className="truncate text-body text-muted">
      {vibe
        ? HOUSE_VIBE_SCALES.flatMap(({ key }) => (vibe[key] ? [{ key, word: tVibe(`${key}.${vibe[key]}`), shared: mine?.[key] === vibe[key] }] : [])).map((item, i) => (
            <span key={item.key}>
              {i > 0 && " · "}
              <span className={cn(item.shared && "font-semibold text-ink")}>{item.word}</span>
            </span>
          ))
        : tv("vibeAddQuick")}
    </p>
  );
}

/** The round buttons beside "Edit profile" / "Message": the same height (40px), filled with the raised surface. */
const ROUND = "inline-flex size-10 items-center justify-center rounded-full bg-surface text-ink transition-colors duration-150 hover:bg-surface/70";
const PILL = "inline-flex h-10 items-center rounded-full bg-surface px-5 text-body font-semibold text-ink transition-colors duration-150 hover:bg-surface/70";

/**
 * Top right of the right column. Your own: the capsule "Edit profile", "···" (Preview as others see it · Share profile – a host page only)
 * and the gear to /settings – all filled, one height. Someone else's: the capsule "Message" (the crew chat of your most recent shared House –
 * no free direct chats, DIRECT_MESSAGE_POLICY) and "···" (Save · Share (hosts) · Invite to a House (your people, a House with room) · Report ·
 * Block).
 */
function ProfileActions({ user, isMe, previewing, viewerId, today }: { user: User; isMe: boolean; previewing: boolean; viewerId: string | null; today: string }) {
  const t = useTranslations("profile");
  const tv = useTranslations("profile.view");
  const store = useStore();
  const guard = usePreviewGuard();
  const showToast = useToast();
  const [sharing, setSharing] = useState(false);
  const invite = useInviteToHouse(user, viewerId, previewing, today);
  const hosts = hostsPublicly(store, user.id);
  if (isMe) {
    const items: MoreMenuItem[] = [{ label: tv("previewAsOthers"), href: "/profile?preview=1" }, ...(hosts ? [{ label: tv("shareProfile"), onSelect: () => setSharing(true) }] : [])];
    return (
      <div className="flex items-center justify-end gap-2">
        <Link href="/settings/profile" className={PILL}>
          {t("editProfile")}
        </Link>
        <MoreMenu items={items} label={tv("options")} buttonClassName={ROUND} />
        <Link href="/settings" aria-label={tv("settingsLink")} className={ROUND}>
          <SettingsIcon className="size-5" aria-hidden strokeWidth={1.75} />
        </Link>
        {hosts && <ShareSheet target={{ kind: "profile", user }} open={sharing} onClose={() => setSharing(false)} />}
      </div>
    );
  }
  const saved = viewerId ? (settingsOf(store.users.find((u) => u.id === viewerId)).savedPeopleIds ?? []).includes(user.id) : false;
  const toggleSave = () =>
    guard(() => {
      store.toggleSavedPerson(user.id);
      showToast(saved ? tv("unsavedToast", { name: firstName(user) }) : tv("savedToast", { name: firstName(user) }));
    });
  // The crew chat of the most recent House you both were in.
  const shared = viewerId
    ? store.stays
        .filter((stay) => (stay.hostId === viewerId || isCrewMember(store, stay, viewerId)) && (stay.hostId === user.id || isCrewMember(store, stay, user.id)))
        .toSorted((a, b) => b.startDate.localeCompare(a.startDate))[0]
    : undefined;
  const extra: MoreMenuItem[] = [
    ...(viewerId ? [{ label: saved ? tv("unsave") : tv("save"), onSelect: toggleSave }] : []),
    ...(hosts ? [{ label: t("share"), onSelect: () => setSharing(true) }] : []),
    ...(invite.item ? [invite.item] : []),
  ];
  return (
    <div className="flex items-center justify-end gap-2">
      {shared && !previewing && (
        <Link href={`/messages/${crewThreadId(shared.id)}`} className={PILL}>
          {tv("message")}
        </Link>
      )}
      {previewing ? (
        <button type="button" onClick={() => guard(() => undefined)} aria-label={tv("options")} className={ROUND}>
          <MoreHorizontal className="size-5" aria-hidden />
        </button>
      ) : (
        <SafetyMenu target={{ kind: "user", id: user.id }} user={user} extraItems={extra} buttonClassName={ROUND} />
      )}
      {invite.sheet}
      {hosts && <ShareSheet target={{ kind: "profile", user }} open={sharing} onClose={() => setSharing(false)} />}
    </div>
  );
}

/**
 * The numbers as a white group (components/StatsGroup.tsx): Houses · Lived with · Countries · Friends (your own) – a large number, the label,
 * a grey line ("1 to confirm"); someone else's: the first three, no goals. Your own blocks lead to /your-houses, the confirmation, /people
 * and /invite.
 */
function ProfileStats({ user, isMe, today, view }: { user: User; isMe: boolean; today: string; view: ProfileVisibility }) {
  const tv = useTranslations("profile.view");
  const store = useStore();
  const [confirming, setConfirming] = useState(false);
  const m = profileMetrics(store, user, today);
  const lived = completedStaysOf(store, user.id, today);
  const toConfirm = isMe ? view.toConfirm.filter((e) => !isBlocked(store, e.user.id)) : [];
  const countries = [...new Set(lived.map((s) => s.location.country).filter(Boolean))];
  const countryLine = countries.length > 3 ? `${countries.slice(0, 3).join(", ")} ${tv("statMore", { count: countries.length - 3 })}` : countries.join(", ");
  const friends = friendsOf(store, user.id).length;
  const blocks: StatsGroupBlock[] = [
    { key: "houses", label: tv("statHouses"), value: String(m.houses), line: lived[0] ? shortNameOf(lived[0]) : undefined, href: isMe ? "/your-houses#row-livedIn" : undefined },
    {
      key: "livedWith",
      label: tv("statLivedWith"),
      value: String(m.livedWith),
      line: toConfirm.length > 0 ? tv("statToConfirm", { count: toConfirm.length }) : undefined,
      // Housemates to confirm: the block opens the confirmation; else /people.
      ...(isMe ? (toConfirm.length > 0 ? { onClick: () => setConfirming(true) } : { href: "/people?tab=lived" }) : {}),
    },
    { key: "countries", label: tv("statCountries"), value: String(m.countries), line: countryLine || undefined, href: isMe ? "/people" : undefined },
    ...(isMe ? [{ key: "friends", label: tv("statFriends"), value: String(friends), line: friends === 0 ? tv("inviteFriendsShort") : undefined, href: friends === 0 ? "/invite" : "/people" }] : []),
  ];
  return (
    <>
      <StatsGroup blocks={blocks} />
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
    </>
  );
}

/** Someone else's profile, one of your people with a House of yours that has room: "Invite to a House" as an entry of "···", and its sheet. */
function useInviteToHouse(user: User, viewerId: string | null, previewing: boolean, today: string): { item: MoreMenuItem | null; sheet: ReactNode } {
  const tv = useTranslations("profile.view");
  const store = useStore();
  const guard = usePreviewGuard();
  const [inviting, setInviting] = useState(false);
  const yours = viewerId ? yourPeople(store, viewerId).some((p) => p.user.id === user.id) : false;
  const mineOpen =
    yours && viewerId && !previewing
      ? store.stays
          .filter((s) => canInvite(store, s, viewerId, today) && !store.joinRequests.some((r) => r.stayId === s.id && r.userId === user.id && ["invited", "pending", "accepted", "waitlisted", "waitlist_requested"].includes(r.status)))
          .toSorted((a, b) => a.startDate.localeCompare(b.startDate))
      : [];
  if (mineOpen.length === 0) return { item: null, sheet: null };
  return {
    item: { label: tv("inviteToHouse"), onSelect: () => guard(() => setInviting(true)) },
    sheet: <InviteSheet houses={mineOpen} open={inviting} onClose={() => setInviting(false)} preselect={[user.id]} />,
  };
}

/**
 * The Houses on the stage's right column, by date: the hosted ones this viewer may see (lib/privacy.ts visibleHostedHouses – the same count
 * as "Hosts {n} Houses") and the ones they're going to that this viewer may see (lib/profilePrivacy.ts).
 */
function visibleHouses(view: ProfileVisibility, userId: string, today: string): Stay[] {
  return [...new Set([...visibleHostedHouses(view, userId, today), ...view.upcoming.filter((s) => s.endDate >= today)])].toSorted((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Faces in the "Lived with" row. */
const PEOPLE_FACES = 6;

/** One row of the white people group: the whole row a link, a chevron right. */
function PeopleLine({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 rounded-[18px] px-4 py-2 transition-colors duration-150 hover:bg-ink/4">
      <span className="w-24 shrink-0 text-body font-medium text-ink">{label}</span>
      <span className="flex min-w-0 flex-1 items-center gap-3">{children}</span>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
    </Link>
  );
}

/**
 * Your people as a white group of two rows (CLAUDE.md "Profil neu geordnet"; no heading, no "See all"): Lived with – a stack of up to six
 * faces and the count (→ /people?tab=lived); Friends – the count, or "Invite friends" (→ /invite). Someone else's: their rows only when they
 * show them (Settings › Privacy "Show my people on my profile"); otherwise the people you both lived with and their total, in the same group.
 */
function PeopleGroup({ user, isMe, viewerId }: { user: User; isMe: boolean; view: ProfileVisibility; viewerId: string | null }) {
  const tv = useTranslations("profile.view");
  const store = useStore();
  const livedWith = livedWithPeople(store, user.id);
  const friends = friendsOf(store, user.id);
  const faces = (people: User[]) => (
    // Phones: four faces, so the count beside them stays whole.
    <span className="flex shrink-0 -space-x-2 max-sm:[&>*:nth-child(n+5)]:hidden">
      {people.slice(0, PEOPLE_FACES).map((person) => (
        <PersonPhoto key={person.id} src={person.photos[0]} alt="" size={32} className="size-8 ring-2 ring-surface" />
      ))}
    </span>
  );
  const group = "flex flex-col gap-0.5 rounded-[24px] bg-surface p-2";
  if (isMe || user.privacy?.showPeople) {
    const rows = [
      (isMe || livedWith.length > 0) && (
        <PeopleLine key="lived" href={isMe ? "/people?tab=lived" : profileHref(user.id)} label={tv("livedWithRow")}>
          {livedWith.length > 0 ? faces(livedWith) : null}
          <span className="truncate text-body text-muted">{livedWith.length > 0 ? tv("peopleCount", { count: livedWith.length }) : tv("peopleEmpty")}</span>
        </PeopleLine>
      ),
      (isMe || friends.length > 0) && (
        <PeopleLine key="friends" href={isMe ? (friends.length > 0 ? "/people" : "/invite") : profileHref(user.id)} label={tv("friendsRow")}>
          <span className="truncate text-body text-muted">{friends.length > 0 ? tv("peopleCount", { count: friends.length }) : tv("inviteFriendsShort")}</span>
        </PeopleLine>
      ),
    ].filter(Boolean);
    return rows.length > 0 ? <nav aria-label={tv("yourPeople")} className={group}>{rows}</nav> : null;
  }
  // Private (the default): only who you both lived with, and how many there are.
  const theirs = new Set(livedWith.map((u) => u.id));
  const known = viewerId ? livedWithPeople(store, viewerId).filter((u) => u.id !== user.id && theirs.has(u.id)) : [];
  const total = new Set([...livedWith, ...friends].map((u) => u.id)).size;
  if (known.length === 0 && total === 0) return null;
  const knownLine =
    known.length === 0
      ? null
      : known.length === 1
        ? tv("bothLivedOne", { name: firstName(known[0]) })
        : known.length === 2
          ? tv("bothLivedTwo", { a: firstName(known[0]), b: firstName(known[1]) })
          : tv("bothLivedMore", { name: firstName(known[0]), count: known.length - 1 });
  return (
    <section aria-label={tv("yourPeople")} className={cn(group, "px-6 py-4")}>
      {knownLine && (
        <div className="flex flex-wrap items-center gap-3">
          {faces(known)}
          <p className="text-body text-ink">{knownLine}</p>
        </div>
      )}
      {total > 0 && <p className={cn("text-small text-muted", knownLine && "mt-2")}>{tv("peopleTotal", { count: total })}</p>}
    </section>
  );
}

/** At most this many places with a photo (small, on the stage), then "+N". */
const PLACES_SHOWN = 3;

/** Whether "Places" has anything for this viewer: lived-in places or active "I'm in for". */
function hasPlaces(store: Parameters<typeof livedTogether>[0] & { inFor: Parameters<typeof activeInForOf>[0]; currentUserId: string | null }, view: ProfileVisibility, userId: string, today: string, isMe: boolean) {
  return view.places.length > 0 || inForFor(store, userId, today, isMe).length > 0;
}

/** "I'm in for" only between Your people (lib/inFor.ts visibleInForOf): yourself, or someone you both chose. */
function inForFor(store: Parameters<typeof livedTogether>[0] & { inFor: Parameters<typeof activeInForOf>[0]; currentUserId: string | null }, userId: string, today: string, isMe: boolean) {
  const together = Boolean(store.currentUserId && livedTogether(store, store.currentUserId, userId));
  return visibleInForOf(store.inFor, userId, today, { isMe, together });
}

/**
 * Places: where they lived (past Houses), each with a photo – from a House at that place (the one they lived in, else any House there), else
 * the place's own (config/place-images.ts), else a calm surface with the name; a place opens Explore filtered on it. Under them where
 * they're "in for" as capsules ("Lisbon · March"). Your own: the heading edits "I'm in for".
 */
function PlacesSection({ user, isMe, view, today }: { user: User; isMe: boolean; view: ProfileVisibility; today: string }) {
  const tv = useTranslations("profile.view");
  const store = useStore();
  const lineOf = useInForLine();
  const coverOf = (stay: Stay | undefined) => (stay ? housePhotos(stay, findUser(store, stay.hostId))[0] : undefined);
  const lived = view.places.map(({ city, stay }) => {
    const placeId = cityPlaceIdOf(city) ?? null;
    return { key: city, name: city, placeId, image: coverOf(stay) ?? (placeId ? placeImageOf(placeId) : null) ?? null };
  });
  const inFor = inForFor(store, user.id, today, isMe);
  if (lived.length === 0 && inFor.length === 0 && !isMe) return null;
  return (
    <section aria-labelledby="col-places" className="min-w-0">
      <h2 id="col-places" className="mb-2.5 text-eyebrow uppercase text-ink/60">
        {isMe ? (
          <Link href={editHref("inFor")} className="underline-offset-4 hover:underline">
            {tv("placesLabel")}
          </Link>
        ) : (
          tv("placesLabel")
        )}
      </h2>
      {lived.length > 0 && (
        <ul className="grid grid-cols-3 gap-x-2.5">
          {lived.slice(0, PLACES_SHOWN).map((place) => {
            const body = (
              <>
                <span className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl bg-surface-2 px-2 text-center">
                  {place.image ? <Img src={place.image} alt="" fill sizes="110px" className="object-cover" /> : <span className="line-clamp-2 text-small font-semibold text-ink/70">{place.name}</span>}
                </span>
                <span className="mt-1 block truncate text-small text-ink">{place.name}</span>
              </>
            );
            return (
              <li key={place.key} className="min-w-0">
                {place.placeId ? (
                  <Link href={`/explore?place=${encodeURIComponent(place.placeId)}`} className="block">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
      {lived.length > PLACES_SHOWN && <p className="mt-2 text-small text-muted">+{lived.length - PLACES_SHOWN}</p>}
      {/* Where they're in for, as capsules: "Lisbon · March". */}
      {inFor.length > 0 && (
        <ul className={cn("flex flex-wrap gap-2", lived.length > 0 && "mt-3")} aria-label={tv("inForLabel")}>
          {inFor.map((signal) => (
            <li key={signal.id} className="inline-flex h-8 items-center rounded-full border border-ink/12 px-3 text-small font-medium text-ink">
              {lineOf(signal)}
            </li>
          ))}
        </ul>
      )}
      {lived.length === 0 && inFor.length === 0 && (
        <Link href={editHref("inFor")} className="inline-block text-body font-semibold text-ink underline-offset-4 hover:underline">
          {tv("placesAdd")}
        </Link>
      )}
    </section>
  );
}

/**
 * Signed in, no shared House (lib/privacy.ts "basic"): first name, photo and interests – and the numbers, never the people. No bio, no
 * links, no Houses as a guest, no last name.
 */
function BasicProfile({ user, view }: { user: User; view: ProfileVisibility }) {
  const tv = useTranslations("profile.view");
  const f = useFormat();
  return (
    <Container page className="flex flex-col items-center pb-(--space-section) pt-8 text-center">
      <PersonPhoto src={user.photos[0]} alt={publicName(user, null)} size={160} className="size-40 rounded-full" />
      <h1 className="mt-6 text-name text-ink">{publicName(user, null)}</h1>
      {(user.interests ?? []).length > 0 && (
        <ul className="mt-4 flex flex-wrap justify-center gap-2" aria-label={tv("interestsLabel")}>
          {(user.interests ?? []).map((v) => (
            <li key={v} className="rounded-full border border-ink/12 px-3 py-1 text-small text-ink">
              {f.vibe(v)}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-body text-muted">{tv("basicNumbers", { houses: view.housesCount, people: view.livedWith.length })}</p>
      <p className="mt-2 max-w-[44ch] text-small text-muted">{tv("basicNote")}</p>
    </Container>
  );
}

/** A private profile: "This profile is private" – signed in with the first name, logged out not even that. Nothing else. */
function PrivateProfile({ user, showName = true }: { user: User; showName?: boolean }) {
  const t = useTranslations("profile.view");
  return (
    <Container page className="flex min-h-[calc(100dvh-var(--header-total)-var(--space-section))] flex-col items-center justify-center pb-(--space-section) text-center">
      <span aria-hidden className="flex size-24 items-center justify-center rounded-full bg-ink/6 text-muted">
        <Lock className="size-7" />
      </span>
      <h1 className="mt-6 text-h1 text-ink">{showName ? publicName(user, null) : t("privateTitle")}</h1>
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
