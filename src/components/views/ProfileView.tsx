"use client";

import { BadgeCheck, Compass, Eye, ImagePlus, MessageCircle, Pencil, Plus, SearchX, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { use, useState, type ReactNode } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { Container } from "@/components/layout/Container";
import { PhotoSheet } from "@/components/PhotoSheet";
import { PastCrews, type PastCrewMate } from "@/components/profile/PastCrews";
import { PhotoLightbox } from "@/components/stay/PhotoLightbox";
import { PreviewBanner, PreviewProvider } from "@/components/PreviewMode";
import { StayCard } from "@/components/StayCard";
import { HostAlertButton } from "@/components/ui/HostAlertButton";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/button";
import { CrewContacts, useHasVisibleCrewContacts } from "@/components/ui/CrewContacts";
import { EmptyState } from "@/components/ui/EmptyState";
import { Img } from "@/components/ui/Img";
import { LanguageChips } from "@/components/ui/LanguageChips";
import { SocialRow } from "@/components/ui/SocialRow";
import { StayThumb } from "@/components/ui/StayThumb";
import { useToast } from "@/components/ui/Toast";
import { MoreList } from "@/components/views/MoreList";
import { useFormat } from "@/i18n/format";
import { findUser, getCrew, getCurrentUser, isCrewMember, useStore } from "@/lib/store";
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
            <Link href="/" className={buttonClass("dark", "sm")}>
              {t("explore")}
            </Link>
          }
        />
      </Container>
    );
  }

  return <ProfileView user={user} isMe={user.id === store.currentUserId} />;
}

/** Ended Houses: closed or completed by the host, or past their end date. */
function isPast(stay: Stay, today: string): boolean {
  return stay.status === "closed" || stay.status === "completed" || stay.endDate < today;
}

const MAX_PHOTOS = 5;

/** Smooth-scrolls to a profile section (instant with reduced motion); the sections carry a scroll margin for the sticky header. */
function scrollToSection(id: string) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

/**
 * Own profile can switch to "Preview": the same page as a logged-out stranger sees it (no owner tiles or buttons,
 * no crew-only contacts, "Notify me" instead of Edit), under a dark banner. Nothing in a preview changes data.
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
  /** Rendering as a stranger: no viewer, nothing crew-only */
  previewing: boolean;
  onPreview?: () => void;
}

function ProfileBody({ user, isMe, previewing, onPreview }: ProfileBodyProps) {
  const t = useTranslations("profile");
  const tPreview = useTranslations("common.ui.preview");
  const tCommon = useTranslations("common");
  const tContacts = useTranslations("common.ui.crewContacts");
  const f = useFormat();
  const store = useStore();
  const router = useRouter();
  const showToast = useToast();
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  // A preview looks through a stranger's eyes: no viewer, so no shared crew and no crew-only contacts.
  const meId = previewing ? null : store.currentUserId;
  const showCrewContacts = useHasVisibleCrewContacts(user) && !previewing;

  const hosted = store.stays.filter((s) => s.hostId === user.id);
  const joined = store.joinRequests
    .filter((r) => r.userId === user.id && r.status === "accepted")
    .flatMap((r) => store.stays.filter((s) => s.id === r.stayId));
  const byEndDesc = (a: Stay, b: Stay) => b.endDate.localeCompare(a.endDate);
  // Others only see what's public; your own profile also shows drafts.
  const hosting = hosted.filter((s) => !isPast(s, today) && (isMe || s.status === "published"));
  const hostedPast = hosted.filter((s) => isPast(s, today) && (isMe || s.status !== "draft")).toSorted(byEndDesc);
  const joining = joined.filter((s) => !isPast(s, today));
  const joinedPast = joined.filter((s) => isPast(s, today)).toSorted(byEndDesc);

  // Everyone from a completed House this user hosted or joined – most recent House first, each person once.
  const pastCrewMates: PastCrewMate[] = [];
  for (const stay of store.stays.filter((s) => s.status === "completed" && isCrewMember(store, s, user.id)).toSorted(byEndDesc)) {
    for (const mate of getCrew(store, stay)) {
      if (mate.id !== user.id && !pastCrewMates.some((m) => m.user.id === mate.id)) pastCrewMates.push({ user: mate, stay });
    }
  }

  // "Message" only with a reason to talk: a shared crew (any House, any status) or an open request between the two
  // of you. Without one there's no Message button – "Notify me" takes its place.
  const hostOf = (stayId: string) => store.stays.find((s) => s.id === stayId)?.hostId;
  const messageStayId =
    isMe || !meId
      ? undefined
      : (store.stays.find((s) => isCrewMember(store, s, meId) && isCrewMember(store, s, user.id))?.id ??
        store.joinRequests.find(
          (r) =>
            r.status === "pending" &&
            ((r.userId === meId && hostOf(r.stayId) === user.id) || (r.userId === user.id && hostOf(r.stayId) === meId)),
        )?.stayId);

  function message(stayId: string) {
    const threadId = store.openDirectThread(stayId, user.id);
    if (threadId) router.push(`/inbox/${threadId}`);
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/u/${user.id}`);
      showToast(t("linkCopied"));
    } catch {
      showToast(tCommon("linkCopyFailed"));
    }
  }

  const statLink = (id: string) =>
    function StatLink(chunks: ReactNode) {
      return (
        <a
          href={`#${id}`}
          onClick={(e) => {
            e.preventDefault();
            scrollToSection(id);
          }}
          className="rounded-sm underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          {chunks}
        </a>
      );
    };

  return (
    <Container page>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Sticky offset = the page's top padding (pt-10), so the card never moves when scrolling starts. */}
        <aside className="self-start lg:sticky lg:top-[calc(var(--header-h)+40px)] lg:col-span-4">
          <div className="rounded-[24px] bg-white p-6">
            <Avatar user={user} size="xl" />
            <h1 className="mt-4 flex items-center gap-1.5 text-2xl font-bold tracking-tight">
              {user.name}
              {user.verified && (
                <span title={t("verified")} className="inline-flex">
                  <BadgeCheck className="size-5 text-accent" role="img" aria-label={t("verified")} />
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {f.ageAndCountry(user)}
              {user.city && ` · ${t("basedIn", { city: user.city })}`}
            </p>
            <LanguageChips languages={user.languages} className="mt-4" />
            <SocialRow user={user} className="mt-4" />
            {/* Only for people who share an accepted crew with this user (and on your own profile). */}
            {showCrewContacts && (
              <div className="mt-4 border-t border-black/5 pt-4">
                <p className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">{tContacts("crewOnly")}</p>
                <CrewContacts user={user} />
              </div>
            )}
            {user.bio && <p className="mt-4 leading-relaxed text-neutral-700">{user.bio}</p>}
            <PastCrews user={user} mates={pastCrewMates} />
            <p className="mt-4 border-t border-black/5 pt-4 text-sm text-zinc-500">
              {t.rich("stats", {
                hosted: hosted.length,
                joined: joined.length,
                b: (chunks) => <span className="font-semibold text-ink">{chunks}</span>,
                hostedLink: statLink("hosting"),
                joinedLink: statLink("joined"),
              })}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {isMe ? (
                <>
                  <button type="button" className={buttonClass("dark", "sm")}>
                    <Pencil className="size-4" />
                    {t("editProfile")}
                  </button>
                  {onPreview && (
                    <button type="button" onClick={onPreview} className={buttonClass("ghost", "sm")}>
                      <Eye className="size-4" />
                      {tPreview("button")}
                    </button>
                  )}
                </>
              ) : messageStayId ? (
                <button type="button" onClick={() => message(messageStayId)} className={buttonClass("dark", "sm")}>
                  <MessageCircle className="size-4" />
                  {t("message")}
                </button>
              ) : (
                <HostAlertButton host={user} />
              )}
              <button type="button" onClick={share} className={buttonClass("secondary", "sm")}>
                <Share2 className="size-4" />
                {t("shareProfile")}
              </button>
            </div>
          </div>
          {isMe && <MoreList />}
        </aside>

        <section className="min-w-0 space-y-10 lg:col-span-8">
          {(user.photos.length > 0 || isMe) && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">{t("photos")}</h2>
              {/* Own profile: the add tile is pinned left, outside the scroller, so it's always in view. */}
              <div className="flex gap-3">
                {isMe && user.photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => setPhotoSheetOpen(true)}
                    className={cn(dashedTile, "h-50 w-40 shrink-0 rounded-2xl")}
                  >
                    <DashedTileContent icon={<ImagePlus className="size-5" />} label={t("addPhoto")} />
                  </button>
                )}
                <div className="no-scrollbar -mr-4 flex min-w-0 flex-1 snap-x gap-3 overflow-x-auto pr-4 md:mr-0 md:pr-0">
                  {user.photos.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setPhotoIndex(i)}
                      aria-label={t("openPhoto", { index: i + 1 })}
                      className="relative h-50 w-40 shrink-0 snap-start overflow-hidden rounded-2xl bg-neutral-200"
                    >
                      <Img src={src} alt="" fill sizes="160px" className="object-cover transition-transform duration-500 hover:scale-[1.03]" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <HouseSection
            id="hosting"
            title={t("hosting")}
            open={hosting}
            past={hostedPast}
            empty={isMe ? t("emptyHostingMe") : t("emptyHosting", { name: firstName(user) })}
            tile={isMe && <DashedCard href="/create" icon={<Plus className="size-5" />} label={t("openAnother")} />}
          />
          <HouseSection
            id="joined"
            title={t("joined")}
            open={joining}
            past={joinedPast}
            empty={isMe ? t("emptyJoinedMe") : t("emptyJoined")}
            tile={isMe && <DashedCard href="/" icon={<Compass className="size-5" />} label={t("findHouse")} />}
          />
        </section>
      </div>

      <PhotoLightbox photos={user.photos} index={photoIndex} onIndexChange={setPhotoIndex} onClose={() => setPhotoIndex(null)} alt={user.name} />
      {isMe && <PhotoSheet open={photoSheetOpen} onClose={() => setPhotoSheetOpen(false)} />}
    </Container>
  );
}

const dashedTile =
  "flex flex-col items-center justify-center gap-3 border-2 border-dashed border-black/15 text-sm font-semibold text-zinc-500 transition-colors hover:border-black/30 hover:bg-black/[0.02] hover:text-ink";

function DashedTileContent({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <>
      <span className="flex size-11 items-center justify-center rounded-full bg-white text-ink">{icon}</span>
      {label}
    </>
  );
}

/** Same footprint as a StayCard, for "Open another House" / "Find a House". */
function DashedCard({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className={cn(dashedTile, "aspect-4/5 rounded-4xl")}>
      <DashedTileContent icon={icon} label={label} />
    </Link>
  );
}

interface HouseSectionProps {
  id: string;
  title: string;
  /** Open (upcoming / running) Houses, shown as cards. */
  open: Stay[];
  /** Ended Houses, shown as compact rows under the cards. */
  past: Stay[];
  empty: string;
  /** Dashed call-to-action card at the end of the grid (own profile only). */
  tile?: ReactNode;
}

function HouseSection({ id, title, open, past, empty, tile }: HouseSectionProps) {
  const t = useTranslations("profile");
  const f = useFormat();
  const store = useStore();
  return (
    <div id={id} className="scroll-mt-[calc(var(--header-h)+24px)]">
      <h2 className="mb-3 text-lg font-semibold">
        {title} <span className="font-normal text-zinc-400">{open.length}</span>
      </h2>
      {open.length > 0 || tile ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {open.map((stay) => (
            <StayCard key={stay.id} stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} />
          ))}
          {tile}
        </div>
      ) : (
        <p className="rounded-[24px] border-2 border-dashed border-black/10 p-6 text-sm text-zinc-500">{empty}</p>
      )}

      {past.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-zinc-500">
            {t("past")} <span className="font-normal text-zinc-400">{past.length}</span>
          </h3>
          <ul className="divide-y divide-black/5 rounded-[24px] bg-white">
            {past.map((stay) => (
              <li key={stay.id}>
                <Link href={`/stays/${stay.slug}`} className="flex items-center gap-4 px-4 py-3 hover:bg-black/[0.02]">
                  <StayThumb stay={stay} size={48} className="size-12" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{stay.title}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {f.placeName(stay)} · {f.shortRange(stay.startDate, stay.endDate)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {t(`pastStatus.${stay.status === "completed" || stay.status === "closed" ? stay.status : "ended"}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
