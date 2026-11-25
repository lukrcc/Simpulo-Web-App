"use client";

import { FoundingBadge } from "@/components/ui/FoundingBadge";
import { isFoundingHost } from "@/lib/founding";
import { getProfileVisibility, hostsPublicly, photoHiddenFor, profileHref, userByProfileId, visibleHostedHouses } from "@/lib/privacy";
import { completedStaysOf, currentHouseOf, profileMetrics } from "@/lib/metrics/profile";
import { placeShortOf, shortNameOf } from "@/lib/shortName";
import { BackButton } from "@/components/ui/BackButton";
import { publicName, showsAge } from "@/config/privacy";
import { Bookmark, ChevronRight, Eye, HelpCircle, Lock, LogOut, MoreHorizontal, Pencil, SearchX, Settings as SettingsIcon, Share2, SunMoon, UserPlus, Users, UserX, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { use, useState, useSyncExternalStore, type ReactNode } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { useInForLine } from "@/components/InFor";
import { HeroPhotos } from "@/components/HeroBand";
import { PageFrame } from "@/components/PageFrame";
import { StatsStrip, type StatsBlock } from "@/components/StatsStrip";
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
import { openGetHelp } from "@/lib/support/feedback";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { iconButtonStyles } from "@/components/ui/IconButton";
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
import { simpuloInviteLink } from "@/lib/links";
import { profileViewFor, type ProfileView as ProfileVisibility } from "@/lib/profilePrivacy";
import { findUser, getCurrentUser, isBlocked, isCrewMember, settingsOf, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { userAccentOf } from "@/lib/stageTint";
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

/** Your own profile: a part opens its editing in Edit profile directly (?section=…). */
const editHref = (section: ProfileSectionKey) => `/settings/profile?section=${section}`;

/** A part of your own profile that opens its editing; anyone else's: just the part. */
function Editable({ section, on, label, className, children }: { section: ProfileSectionKey; on: boolean; label: string; className?: string; children: ReactNode }) {
  if (!on) return <div className={className}>{children}</div>;
  return (
    <Link href={editHref(section)} aria-label={label} className={cn("group relative -m-2 block rounded-2xl p-2 transition-colors duration-150 hover:bg-ink/4 pointer-coarse:pr-8", className)}>
      {children}
      <Pencil aria-hidden className="absolute right-2 top-2 size-4 text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 pointer-coarse:opacity-100" />
    </Link>
  );
}

/**
 * A person's page – what others see; the owner sees the same plus their buttons. The stage (like the House page): left the photos, right the
 * person in words (name + Verified · "29 · Norway · Hosts 2 Houses" · "Now in Canggu" only while they're in a House · the short text · the
 * vibe as one small line · the links as small app icons), in its right column "Hosting & going". Under both the dark strip: the numbers
 * left (lib/metrics/profile.ts), the buttons right. Below: Your people (wider) · Places.
 */
function ProfileBento({ user, isMe, previewing, view, viewerId, today, onOpenPhoto, preview = false, hideAge = false }: BentoProps) {
  const router = useRouter();
  const store = useStore();
  const photos = (!preview && photoHiddenFor(store, user, viewerId) ? [] : user.photos).slice(0, PHOTOS_SHOWN);
  const houses = preview ? [] : visibleHouses(view, user.id, today);
  const hosted = preview ? 0 : visibleHostedHouses(view, user.id, today).length;
  return (
    <div data-profile-bento>
      {/* The one page frame (CLAUDE.md "Ein Seiten-Gerüst"): the photo at the House page's width, the person on the right, the actions top
          right, the dark strip with the numbers and the buttons; it fits 1440 × 900 above the tab bar, lower windows scroll. */}
      <PageFrame
        aria-labelledby="profile-name"
        mediaFit="profile"
        // A breath of the first photo's colour (lib/stageTint.ts) – not when the photos are hidden from this viewer.
        accent={photos.length > 0 ? userAccentOf(user) : undefined}
        height={preview ? "split:h-[440px]" : undefined}
        // The same strip as Your houses (components/StatsStrip.tsx) – the same height.
        stripHeight="138px"
        media={
          <div data-preview-part="photos" className="absolute inset-0">
            {/* "Hide my photo until I'm accepted": a host with only their request sees no photos (lib/privacy.ts). Your own: a click edits them. */}
            <HeroPhotos photos={photos} captions={user.photoCaptions} onOpen={isMe && !preview ? () => router.push(editHref("photos")) : onOpenPhoto} />
          </div>
        }
        actions={preview ? undefined : <ProfileActions user={user} isMe={isMe} previewing={previewing} viewerId={viewerId} today={today} />}
        strip={<ProfileFrameStrip user={user} isMe={isMe} previewing={previewing} viewerId={viewerId} today={today} preview={preview} view={view} />}
      >
        <IdentityStage user={user} isMe={isMe} previewing={previewing} view={view} houses={houses} hosted={hosted} viewerId={viewerId} today={today} preview={preview} hideAge={hideAge} />
      </PageFrame>
    </div>
  );
}

/** The stage shows this many photos at most. */
const PHOTOS_SHOWN = 4;
/** The short text on the stage. */
const SHORT_TEXT = 160;

/**
 * The person on the stage (the light band, ink) – text, no capsules but Verified: name + Verified · "{age} · {country} · Hosts {n} Houses"
 * (n = the hosted Houses this viewer sees, lib/privacy.ts visibleHostedHouses – the same as "Hosting & going") · "Now in {place}" only while
 * they're in a House this viewer may see (never a field) · the short text · the vibe as one small line (only what's set; a visitor sees
 * what you share in bold) · the links as small app icons (32px). Top right for visitors: Share (hosts only) · Save · "…".
 */
function IdentityStage({ user, isMe, previewing, view, houses, hosted, viewerId, today, preview, hideAge }: Pick<BentoProps, "user" | "isMe" | "previewing" | "view" | "viewerId" | "today" | "preview" | "hideAge"> & { houses: Stay[]; hosted: number }) {
  const tBack = useTranslations("common");
  const t = useTranslations("profile");
  const tv = useTranslations("profile.view");
  const f = useFormat();
  const store = useStore();
  const guard = usePreviewGuard();
  const showToast = useToast();
  // "Now in …": only from a House they're in right now – and only when this viewer may see that House.
  const current = currentHouseOf(store, user.id, today);
  const nowIn = current && (isMe || houses.some((s) => s.id === current.id) || view.upcoming.some((s) => s.id === current.id)) ? placeShortOf(current) : null;
  const meta = [hideAge ? user.country : f.ageAndCountry(user, showsAge(user, viewerId)), hosted > 0 && tv("hostsHouses", { count: hosted })].filter(Boolean).join(" · ");
  const bio = user.bio.length > SHORT_TEXT ? `${user.bio.slice(0, SHORT_TEXT - 1).trimEnd()}…` : user.bio;
  const editable = isMe && !preview;

  return (
    // A column with space between: on top the person (name, facts, short text, vibe, links), at its foot "Your people".
    <div className="flex h-full min-h-0 min-w-0 flex-col justify-between gap-8">
      <div className="flex min-w-0 flex-col">
      {/* Phones: Edit profile · ⋯ wrap onto a row of their own under the name (the name keeps the line). */}
      {/* The actions sit top right in the frame (PageFrame actions): the first line keeps room for them from 768px. */}
      <div className="flex items-start gap-4 md:pr-64">
        {/* The way back: phones and the installed app. */}
        <BackButton fallback="/" label={tBack("back")} className="mt-1" />
        <Editable section="basics" on={editable} label={tv("editPart", { part: tv("partBasics") })} className="min-w-0 flex-1">
          <div data-preview-part="basics" className="min-w-0">
            <h1 id="profile-name" className="flex min-w-0 items-center gap-2 text-name text-ink">
              <span className="truncate">{publicName(user, viewerId)}</span>
              {user.verified && (
                <span data-preview-part="verify" className="inline-flex shrink-0 items-center">
                  <VerifiedBadge className="shrink-0" />
                </span>
              )}
            </h1>
            {isFoundingHost(user) && <FoundingBadge label className="mt-1 text-ink" />}
            {/* No ratings anywhere (CLAUDE.md "Profil als Netzwerk-Seite"). */}
            {meta && <p className="mt-2 text-body-lg text-muted">{meta}</p>}
            {nowIn && <p className="mt-1 text-body-lg text-ink">{tv("nowInHouse", { place: nowIn })}</p>}
          </div>
        </Editable>
      </div>


      <Editable section="about" on={editable} label={tv("editPart", { part: tv("partAbout") })} className="mt-4 max-w-[56ch]">
        <div data-preview-part="about">
          {bio ? <p className="text-body-lg text-ink">{bio}</p> : (isMe || preview) && <p className="text-body-lg text-muted">{tv("aboutAdd")}</p>}
        </div>
      </Editable>

      <VibeLine user={user} isMe={isMe} viewerId={viewerId} preview={Boolean(preview)} editable={editable} />

      {((user.socials?.length ?? 0) > 0 || isMe || preview) && (
        <Editable section="links" on={editable} label={tv("editPart", { part: tv("partLinks") })} className="mt-4 self-start">
          <div data-preview-part="links">
            {/* The links as capsules (the platform's mark + handle); your own: "+ Add link" after them. */}
            <div className="flex flex-wrap items-center gap-2">
              {(user.socials?.length ?? 0) > 0 && <SocialLinks user={user} variant="full" nested={editable} />}
              {editable && <span className="inline-flex h-9 items-center rounded-full px-3 text-small font-semibold text-ink ring-1 ring-ink/12 ring-inset">{tv("addLink")}</span>}
              {!editable && (user.socials?.length ?? 0) === 0 && preview && <p className="text-body text-muted">{tv("linksAdd")}</p>}
            </div>
          </div>
        </Editable>
      )}

      </div>
      {!preview && <PeopleSection user={user} isMe={isMe} view={view} viewerId={viewerId} />}
    </div>
  );
}

/**
 * The vibe as one small line – only what's set, in the questions' order ("Night owl · Balanced · Active · Tidy"); a visitor sees what they
 * share in bold (the same answer on a question). Nothing set: no line (your own: "Add your vibe – 15 seconds").
 */
// Phones: the vibe words come after the links (order-last) – name, short text, links, vibe.
function VibeLine({ user, isMe, viewerId, preview, editable }: { user: User; isMe: boolean; viewerId: string | null; preview: boolean; editable: boolean }) {
  const tv = useTranslations("profile.view");
  const tVibe = useTranslations("profile.vibe");
  const store = useStore();
  const vibe = hasVibe(user.houseVibe) ? user.houseVibe : undefined;
  const mine = !isMe && viewerId ? findUser(store, viewerId)?.houseVibe : undefined;
  if (!vibe && !isMe && !preview) return null;
  return (
    <Editable section="vibe" on={editable} label={tv("editPart", { part: tv("vibeLabel") })} className="mt-3 self-start max-md:order-last">
      <p data-preview-part="vibe" className="text-small text-muted">
        {vibe
          ? HOUSE_VIBE_SCALES.flatMap(({ key }) => (vibe[key] ? [{ key, word: tVibe(`${key}.${vibe[key]}`), shared: mine?.[key] === vibe[key] }] : [])).map((item, i) => (
              <span key={item.key}>
                {i > 0 && " · "}
                <span className={cn(item.shared && "font-semibold text-ink")}>{item.word}</span>
              </span>
            ))
          : tv("vibeAddQuick")}
      </p>
    </Editable>
  );
}

/**
 * Top right in the frame (CLAUDE.md "Profil als Netzwerk-Seite"). Your own: "Edit profile" as a text button (with "5 of 6" small beside it
 * while it isn't complete), "⋯" (Preview as others see it · Share profile – a host page only) and the gear to /settings, each a 40px target.
 * Someone else's: "Message" (the crew chat of your most recent shared House – no free direct chats, DIRECT_MESSAGE_POLICY), Share (hosts),
 * Save, "⋯" (report, block).
 */
function ProfileActions({ user, isMe, previewing, viewerId, today }: { user: User; isMe: boolean; previewing: boolean; viewerId: string | null; today: string }) {
  const t = useTranslations("profile");
  const tv = useTranslations("profile.view");
  const store = useStore();
  const guard = usePreviewGuard();
  const showToast = useToast();
  const [sharing, setSharing] = useState(false);
  const hosts = hostsPublicly(store, user.id);
  if (isMe) {
    const counted = PROFILE_SECTIONS.filter((s) => s.progress !== false);
    const done = counted.filter((s) => sectionDone(s.key, user, today)).length;
    const items: MoreMenuItem[] = [{ label: tv("previewAsOthers"), href: "/profile?preview=1" }, ...(hosts ? [{ label: tv("shareProfile"), onSelect: () => setSharing(true) }] : [])];
    return (
      <>
        <Link href="/settings/profile" className="inline-flex min-h-10 items-baseline gap-2 rounded-full px-3 py-2 text-body font-semibold text-ink transition-colors duration-150 hover:bg-ink/5">
          {t("editProfile")}
          {done < counted.length && <span className="text-small font-medium text-muted">{tv("progress", { done, total: counted.length })}</span>}
        </Link>
        <MoreMenu items={items} label={tv("options")} buttonClassName={iconButtonStyles("md")} />
        <Link href="/settings" aria-label={tv("settingsLink")} className={iconButtonStyles("md")}>
          <SettingsIcon className="size-5" aria-hidden strokeWidth={1.75} />
        </Link>
        {hosts && <ShareSheet target={{ kind: "profile", user }} open={sharing} onClose={() => setSharing(false)} />}
      </>
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
  return (
    <>
      <InviteToHouse user={user} viewerId={viewerId} previewing={previewing} today={today} />
      {shared && !previewing && (
        <Button variant="secondary" size="sm" href={`/messages/${crewThreadId(shared.id)}`} className="mr-1">
          {tv("message")}
        </Button>
      )}
      {hosts && (
        <button type="button" onClick={() => setSharing(true)} aria-label={t("share")} className={iconButtonStyles("md")}>
          <Share2 className="size-4" aria-hidden />
        </button>
      )}
      {viewerId && (
        <button type="button" onClick={toggleSave} aria-pressed={saved} aria-label={saved ? tv("unsave") : tv("save")} className={iconButtonStyles("md")}>
          <Bookmark className={cn("size-4", saved && "fill-current")} aria-hidden />
        </button>
      )}
      {previewing ? (
        <button type="button" onClick={() => guard(() => undefined)} aria-label={tv("options")} className={iconButtonStyles("md")}>
          <MoreHorizontal className="size-5" aria-hidden />
        </button>
      ) : (
        <SafetyMenu target={{ kind: "user", id: user.id }} user={user} extraItems={viewerId ? [{ label: saved ? tv("unsave") : tv("save"), onSelect: toggleSave }] : []} buttonClassName={iconButtonStyles("md")} />
      )}
      {hosts && <ShareSheet target={{ kind: "profile", user }} open={sharing} onClose={() => setSharing(false)} />}
    </>
  );
}

/**
 * The frame's dark strip (FrameStrip): "4 Houses · 9 Lived with · 3 Countries" on the left (lib/metrics/profile.ts – no ratings); on the
 * right your own "1 housemate to confirm" (only when there is one) and "Invite friends" (→ /invite, the light button on the dark strip);
 * someone else's: "Invite to a House" (only your people, into a House of yours with room).
 */
function ProfileFrameStrip({ user, isMe, today, preview, view }: { user: User; isMe: boolean; previewing: boolean; viewerId: string | null; today: string; preview?: boolean; view: ProfileVisibility }) {
  const tv = useTranslations("profile.view");
  const store = useStore();
  const [confirming, setConfirming] = useState(false);
  const m = profileMetrics(store, user, today);
  const lived = completedStaysOf(store, user.id, today);
  const toConfirm = isMe ? view.toConfirm.filter((e) => !isBlocked(store, e.user.id)) : [];
  const countries = [...new Set(lived.map((s) => s.location.country).filter(Boolean))];
  const countryLine = countries.length > 3 ? `${countries.slice(0, 3).join(", ")} ${tv("statMore", { count: countries.length - 3 })}` : countries.join(", ");
  const links = isMe && !preview;
  // The one numbers strip (components/StatsStrip.tsx, CLAUDE.md "Kennzahlen-Streifen"): your own four blocks, someone else's three – no
  // "to confirm", no Friends. A block leads somewhere only on your own profile.
  const blocks: StatsBlock[] = [
    { key: "houses", label: tv("statHouses"), value: String(m.houses), line: lived[0] ? shortNameOf(lived[0]) : undefined, href: links ? "/your-houses#row-livedIn" : undefined },
    {
      key: "livedWith",
      label: tv("statLivedWith"),
      value: String(m.livedWith),
      line: toConfirm.length > 0 ? tv("statToConfirm", { count: toConfirm.length }) : undefined,
      // Housemates to confirm: the block opens the confirmation (it lives here, not on /people); else /people.
      ...(links ? (toConfirm.length > 0 ? { onClick: () => setConfirming(true) } : { href: "/people?tab=lived" }) : {}),
    },
    { key: "countries", label: tv("statCountries"), value: String(m.countries), line: countryLine || undefined, href: links ? "/people" : undefined },
    ...(isMe ? [{ key: "friends", label: tv("statFriends"), value: String(friendsOf(store, user.id).length), line: tv("statInvite"), href: links ? "/invite" : undefined }] : []),
  ];
  return (
    <>
      <StatsStrip blocks={blocks} />
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

/** Someone else's profile, one of your people with a House of yours that has room: "Invite to a House" (with the actions top right). */
function InviteToHouse({ user, viewerId, previewing, today }: { user: User; viewerId: string | null; previewing: boolean; today: string }) {
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
  if (mineOpen.length === 0) return null;
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => guard(() => setInviting(true))} data-preview-action className="mr-1">
        <UserPlus aria-hidden />
        {tv("inviteToHouse")}
      </Button>
      <InviteSheet houses={mineOpen} open={inviting} onClose={() => setInviting(false)} preselect={[user.id]} />
    </>
  );
}

/** Days from today to a date (0: today). */
const daysFrom = (today: string, date: string) => Math.max(0, Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000));

/** At most this many Houses in the stage's right column, then "X more →". */
const HOUSES_SHOWN = 3;

/**
 * The Houses on the stage's right column, by date: the hosted ones this viewer may see (lib/privacy.ts visibleHostedHouses – the same count
 * as "Hosts {n} Houses") and the ones they're going to that this viewer may see (lib/profilePrivacy.ts).
 */
function visibleHouses(view: ProfileVisibility, userId: string, today: string): Stay[] {
  return [...new Set([...visibleHostedHouses(view, userId, today), ...view.upcoming.filter((s) => s.endDate >= today)])].toSorted((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Faces per row of Your people. */
const PEOPLE_FACES = 6;

/** One row of Your people: its title (and "See all →"), then up to six round faces with the first name under each. */
function PeopleRow({ title, people, seeAll, empty }: { title: string; people: User[]; seeAll?: string; empty?: ReactNode }) {
  const tv = useTranslations("profile.view");
  return (
    <div className="min-w-0">
      <div className="mb-2 flex max-w-[460px] items-baseline justify-between gap-4">
        <p className="text-small font-semibold text-ink">{title}</p>
        {seeAll && people.length > 0 && (
          <Link href={seeAll} className="shrink-0 text-small font-semibold text-ink underline-offset-4 hover:underline">
            {tv("seeAllShort")}
          </Link>
        )}
      </div>
      {people.length > 0 ? (
        <ul className="grid max-w-[460px] grid-cols-6 gap-3">
          {people.slice(0, PEOPLE_FACES).map((person) => (
            <li key={person.id} className="min-w-0">
              <Link href={profileHref(person.id)} className="group flex flex-col items-center gap-1.5">
                <PersonPhoto src={person.photos[0]} alt="" size={44} className="size-11" />
                <span className="w-full truncate text-center text-small text-muted group-hover:text-ink">{firstName(person)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        empty
      )}
    </div>
  );
}

/**
 * Your people (CLAUDE.md "Profil als Netzwerk-Seite"), at the foot of the person. Your own: two rows – "Lived with" (automatic, from shared
 * Houses, lib/yourPeople.ts livedWithPeople) and "Friends" (connected by hand through an invite, friendsOf), each with faces and "See all →";
 * no friends yet: "Invite friends to connect →". Someone else's: their lists only when they show them (Settings › Privacy "Show my people on
 * my profile", off by default); otherwise the people you both lived with ("You both lived with Hannah") and the total.
 */
function PeopleSection({ user, isMe, viewerId }: { user: User; isMe: boolean; view: ProfileVisibility; viewerId: string | null }) {
  const tv = useTranslations("profile.view");
  const store = useStore();
  const livedWith = livedWithPeople(store, user.id);
  const friends = friendsOf(store, user.id);
  const heading = (
    <h2 id="col-people" className="mb-3 text-eyebrow uppercase text-ink/60">
      {tv("yourPeople")}
    </h2>
  );
  if (isMe)
    return (
      <section aria-labelledby="col-people" className="flex min-w-0 flex-col gap-4">
        {heading}
        <PeopleRow title={tv("livedWithRow")} people={livedWith} seeAll="/people?tab=lived" empty={<p className="text-small text-muted">{tv("peopleEmpty")}</p>} />
        <PeopleRow
          title={tv("friendsRow")}
          people={friends}
          seeAll="/people"
          empty={
            <Link href="/invite" className="text-small font-semibold text-ink underline-offset-4 hover:underline">
              {tv("friendsEmpty")}
            </Link>
          }
        />
      </section>
    );
  if (user.privacy?.showPeople)
    return (
      <section aria-labelledby="col-people" className="flex min-w-0 flex-col gap-4">
        {heading}
        {livedWith.length > 0 && <PeopleRow title={tv("livedWithRow")} people={livedWith} />}
        {friends.length > 0 && <PeopleRow title={tv("friendsRow")} people={friends} />}
      </section>
    );
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
    <section aria-labelledby="col-people" className="min-w-0">
      {heading}
      {knownLine && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex -space-x-2">
            {known.slice(0, 5).map((person) => (
              <PersonPhoto key={person.id} src={person.photos[0]} alt="" size={36} className="size-9 ring-2 ring-(--band)" />
            ))}
          </span>
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
