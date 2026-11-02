"use client";

import { ChevronRight, Eye, ImagePlus, MapPin, MessageCircle, Pencil, Plus, SearchX, Settings, Share2, UserX } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Suspense, type DragEvent, type ReactNode, use, useEffect, useRef, useState } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { inviteHref } from "@/components/create/model";
import { AddPlaceForm } from "@/components/explore/InterestRow";
import { Container } from "@/components/layout/Container";
import { PhotoSheet } from "@/components/PhotoSheet";
import { PhotoLightbox } from "@/components/stay/PhotoLightbox";
import { PreviewBanner, PreviewProvider } from "@/components/PreviewMode";
import { ShareSheet } from "@/components/share/ShareSheet";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { StayCard } from "@/components/StayCard";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Img } from "@/components/ui/Img";
import { LanguageChips } from "@/components/ui/LanguageChips";
import { ListRow } from "@/components/ui/ListRow";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { ProHostLabel } from "@/components/ui/ProHostLabel";
import { SocialRow } from "@/components/ui/SocialRow";
import { StayThumb } from "@/components/ui/StayThumb";
import { useToast } from "@/components/ui/Toast";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { MoreList } from "@/components/views/MoreList";
import { useFormat } from "@/i18n/format";
import { FLEXIBLE, type Interest } from "@/lib/interests";
import { findUser, getCrew, getCurrentUser, isBlocked, isCrewMember, livedWithFor, useStore, type LivedWithEntry } from "@/lib/store";
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

/** Ended Houses: closed or completed by the host, or past their end date. */
function isPast(stay: Stay, today: string): boolean {
  return stay.status === "closed" || stay.status === "completed" || stay.endDate < today;
}

const MAX_PHOTOS = 5;

/** The tabs, in order; someone else's profile (and the preview of your own) has only the first two. */
const TABS = ["houses", "photos", "livedWith", "nextStop"] as const;
type Tab = (typeof TABS)[number];
const PUBLIC_TABS: readonly Tab[] = ["houses", "photos"];

/**
 * Own profile can switch to "Preview": the same page as a logged-out stranger sees it (no owner tiles or buttons,
 * no private tabs), under a dark banner. Nothing in a preview changes data.
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

/**
 * One column over the container's full width: the profile head (no card) ending in a 1px line, then the tab row
 * (?tab=) and the tab's content.
 */
function ProfileBody({ user, isMe, previewing, onPreview }: ProfileBodyProps) {
  const t = useTranslations("profile");
  const store = useStore();
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const hosted = store.stays.filter((s) => s.hostId === user.id);
  const joined = store.joinRequests
    .filter((r) => r.userId === user.id && r.status === "accepted")
    .flatMap((r) => store.stays.filter((s) => s.id === r.stayId));

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
      <ProfileHead
        user={user}
        isMe={isMe}
        previewing={previewing}
        onPreview={onPreview}
        hosted={hosted.length}
        joined={joined.length}
        onOpenPhotos={() => user.photos.length > 0 && setPhotoIndex(0)}
      />
      {/* useSearchParams (?tab=) needs its own boundary on these prerendered pages. */}
      <Suspense fallback={null}>
        <ProfileTabs user={user} isMe={isMe} hosted={hosted} joined={joined} today={today} onOpenPhoto={setPhotoIndex} />
      </Suspense>
      <PhotoLightbox photos={user.photos} index={photoIndex} onIndexChange={setPhotoIndex} onClose={() => setPhotoIndex(null)} alt={user.name} />
    </Container>
  );
}

/* ───────────────────────── Head ───────────────────────── */

interface ProfileHeadProps {
  user: User;
  isMe: boolean;
  previewing: boolean;
  onPreview?: () => void;
  hosted: number;
  joined: number;
  onOpenPhotos: () => void;
}

/**
 * Avatar (120px, opens the photos), name + verified, "27 · Netherlands · based in Canggu", the counts as badges,
 * socials, languages and a two-line bio ("more" when it runs over). The actions top right: own profile Edit profile
 * (secondary), Preview (tertiary) and Share; someone else's Message (primary – only with a shared House or an open
 * request) and Share, plus Report / Block. A 1px line closes it.
 */
function ProfileHead({ user, isMe, previewing, onPreview, hosted, joined, onOpenPhotos }: ProfileHeadProps) {
  const t = useTranslations("profile");
  const tPreview = useTranslations("common.ui.preview");
  const f = useFormat();
  const store = useStore();
  const router = useRouter();
  const [sharing, setSharing] = useState(false);
  // A preview looks through a stranger's eyes: no viewer, so no reason to message.
  const meId = previewing ? null : store.currentUserId;

  // "Message" only with a reason to talk: a shared crew (any House, any status) or an open request between the two.
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

  return (
    <header className="flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-start">
      <button
        type="button"
        onClick={onOpenPhotos}
        disabled={user.photos.length === 0}
        aria-label={t("openPhotos")}
        className="shrink-0 self-start rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-default"
      >
        <PersonPhoto src={user.photos[0]} alt={user.name} size={120} className="size-30" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="flex items-center gap-1.5 text-3xl font-semibold tracking-tight text-ink">
          <span className="truncate">{user.name}</span>
          {user.verified && <VerifiedBadge />}
        </h1>
        <p className="mt-1 text-[15px] text-muted">
          {f.ageAndCountry(user)}
          {user.city && ` · ${t("basedIn", { city: user.city })}`}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge>{t("hostedCount", { count: hosted })}</Badge>
          <Badge>{t("joinedCount", { count: joined })}</Badge>
          <ProHostLabel user={user} />
        </div>
        <SocialRow user={user} className="mt-4" />
        <LanguageChips languages={user.languages} compact className="mt-3" />
        {user.bio && <Bio text={user.bio} />}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {isMe ? (
          <>
            <Button variant="secondary" href="/profile/edit">
              <Pencil />
              {t("editProfile")}
            </Button>
            {onPreview && (
              <Button variant="tertiary" onClick={onPreview}>
                <Eye />
                {tPreview("button")}
              </Button>
            )}
          </>
        ) : (
          messageStayId && (
            <Button onClick={() => message(messageStayId)}>
              <MessageCircle />
              {t("message")}
            </Button>
          )
        )}
        <Button variant="secondary" icon onClick={() => setSharing(true)} aria-label={t("share")} title={t("share")}>
          <Share2 />
        </Button>
        {/* Someone else's profile (never in a preview): Report / Block. */}
        {!isMe && !previewing && <SafetyMenu target={{ kind: "user", id: user.id }} user={user} />}
      </div>
      <ShareSheet target={{ kind: "profile", user }} open={sharing} onClose={() => setSharing(false)} />
    </header>
  );
}

/** The bio: two lines, "more" only when it runs over (measured), "less" to fold it again. */
function Bio({ text }: { text: string }) {
  const t = useTranslations("profile");
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      // Only measurable while clamped; once open it keeps "less".
      if (!el.classList.contains("line-clamp-2")) return;
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="mt-4 max-w-3xl">
      <p ref={ref} className={cn("text-[15px] leading-[1.6] text-ink", !open && "line-clamp-2")}>
        {text}
      </p>
      {(overflows || open) && (
        <Button variant="tertiary" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-1">
          {open ? t("less") : t("more")}
        </Button>
      )}
    </div>
  );
}

/* ───────────────────────── Tabs ───────────────────────── */

interface ProfileTabsProps {
  user: User;
  isMe: boolean;
  hosted: Stay[];
  joined: Stay[];
  today: string;
  onOpenPhoto: (index: number) => void;
}

/** Capsules like the category chips, one at a time, kept in the URL (?tab=); then the tab's content. */
function ProfileTabs({ user, isMe, hosted, joined, today, onOpenPhoto }: ProfileTabsProps) {
  const t = useTranslations("profile.tabs");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tabs = isMe ? TABS : PUBLIC_TABS;
  const requested = params.get("tab");
  const tab: Tab = tabs.find((key) => key === requested) ?? "houses";

  function select(key: Tab) {
    const next = new URLSearchParams(params.toString());
    if (key === "houses") next.delete("tab");
    else next.set("tab", key);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <>
      <div role="tablist" aria-label={t("label")} className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
        {tabs.map((key) => (
          // Every tab is a choice of its own – no check (the check marks filters).
          <Chip key={key} role="tab" id={`profile-tab-${key}`} aria-selected={tab === key} aria-controls="profile-panel" active={tab === key} check={false} onClick={() => select(key)}>
            {t(key)}
          </Chip>
        ))}
      </div>
      <div id="profile-panel" role="tabpanel" aria-labelledby={`profile-tab-${tab}`} className="mt-8">
        {tab === "houses" && <HousesTab user={user} isMe={isMe} hosted={hosted} joined={joined} today={today} />}
        {tab === "photos" && <PhotosTab user={user} isMe={isMe} onOpen={onOpenPhoto} />}
        {tab === "livedWith" && isMe && <LivedWithTab userId={user.id} />}
        {tab === "nextStop" && isMe && <NextStopTab userId={user.id} />}
      </div>
    </>
  );
}

/** A tab's section head: title + count badge on the left, one secondary action on the right. */
function TabSection({ title, count, action, children }: { title: string; count?: number; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex min-h-9 items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink">
          {title}
          {count !== undefined && <Badge>{count}</Badge>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const CARD_GRID = "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

/* Houses: Hosting and Joined as card grids, Past folded underneath. */
function HousesTab({ user, isMe, hosted, joined, today }: { user: User; isMe: boolean; hosted: Stay[]; joined: Stay[]; today: string }) {
  const t = useTranslations("profile");
  const store = useStore();
  const byEndDesc = (a: Stay, b: Stay) => b.endDate.localeCompare(a.endDate);
  // Others only see what's public; your own profile also shows drafts.
  const hosting = hosted.filter((s) => !isPast(s, today) && (isMe || s.status === "published"));
  const joining = joined.filter((s) => !isPast(s, today));
  const past = [...hosted.filter((s) => isPast(s, today) && (isMe || s.status !== "draft")), ...joined.filter((s) => isPast(s, today))].toSorted(byEndDesc);
  const cards = (stays: Stay[]) => (
    <div className={CARD_GRID}>
      {stays.map((stay) => (
        <StayCard key={stay.id} stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} />
      ))}
    </div>
  );
  const empty = (text: string) => <p className="text-[15px] text-muted">{text}</p>;

  return (
    <div className="space-y-12">
      <TabSection
        title={t("hosting")}
        count={hosting.length}
        action={
          isMe && (
            <Button variant="secondary" href="/create">
              <Plus />
              {t("openAnother")}
            </Button>
          )
        }
      >
        {hosting.length > 0 ? cards(hosting) : empty(isMe ? t("emptyHostingMe") : t("emptyHosting", { name: firstName(user) }))}
      </TabSection>
      <TabSection title={t("joined")} count={joining.length}>
        {joining.length > 0 ? cards(joining) : empty(isMe ? t("emptyJoinedMe") : t("emptyJoined"))}
      </TabSection>
      {past.length > 0 && <PastSection stays={past} />}
    </div>
  );
}

/** Ended Houses, folded by default: a row with the chevron and count, then ListRows. */
function PastSection({ stays }: { stays: Stay[] }) {
  const t = useTranslations("profile");
  const f = useFormat();
  const [open, setOpen] = useState(false);
  return (
    <section>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="profile-past" className="flex min-h-9 items-center gap-2 text-xl font-semibold tracking-tight text-ink">
        <ChevronRight className={cn("size-5 text-muted transition-transform duration-200", open && "rotate-90")} aria-hidden />
        {t("past")}
        <Badge>{stays.length}</Badge>
      </button>
      {open && (
        <ul id="profile-past" className="mt-3 divide-y divide-line border-y border-line">
          {stays.map((stay) => (
            <li key={stay.id}>
              <Link href={`/house/${stay.slug}`} className="block hover:bg-surface/60">
                <ListRow
                  lead={<StayThumb stay={stay} size={40} className="size-10" />}
                  title={stay.title}
                  subtitle={`${f.placeName(stay)} · ${f.shortRange(stay.startDate, stay.endDate)}`}
                  action={<Badge>{t(`pastStatus.${stay.status === "completed" || stay.status === "closed" ? stay.status : "ended"}`)}</Badge>}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* Photos: a 4-column grid; own profile: "Add photo" first, drag to reorder, the first one is the profile photo. */
function PhotosTab({ user, isMe, onOpen }: { user: User; isMe: boolean; onOpen: (index: number) => void }) {
  const t = useTranslations("profile");
  const store = useStore();
  const showToast = useToast();
  const [adding, setAdding] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function drop(e: DragEvent, to: number) {
    e.preventDefault();
    if (dragFrom !== null && dragFrom !== to) {
      const next = [...user.photos];
      const [moved] = next.splice(dragFrom, 1);
      next.splice(to, 0, moved);
      store.updateCurrentUser({ photos: next });
      if (to === 0 || dragFrom === 0) showToast(t("profilePhotoChanged"));
    }
    setDragFrom(null);
    setDragOver(null);
  }

  if (user.photos.length === 0 && !isMe) return <p className="text-[15px] text-muted">{t("noPhotos", { name: firstName(user) })}</p>;

  return (
    <TabSection title={t("photos")} count={user.photos.length}>
      {isMe && user.photos.length > 1 && <p className="-mt-2 mb-4 text-[13px] text-muted">{t("dragHint")}</p>}
      <ul className={CARD_GRID}>
        {isMe && user.photos.length < MAX_PHOTOS && (
          <li>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex aspect-4/5 w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-line text-base font-semibold text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-surface text-ink">
                <ImagePlus className="size-5" aria-hidden />
              </span>
              {t("addPhoto")}
            </button>
          </li>
        )}
        {user.photos.map((src, i) => (
          <li
            key={src}
            draggable={isMe}
            onDragStart={() => setDragFrom(i)}
            onDragOver={(e) => {
              if (dragFrom === null) return;
              e.preventDefault();
              setDragOver(i);
            }}
            onDragLeave={() => setDragOver((o) => (o === i ? null : o))}
            onDrop={(e) => drop(e, i)}
            onDragEnd={() => {
              setDragFrom(null);
              setDragOver(null);
            }}
            className={cn("relative", isMe && "cursor-grab active:cursor-grabbing", dragFrom === i && "opacity-50")}
          >
            <button
              type="button"
              onClick={() => onOpen(i)}
              aria-label={t("openPhoto", { index: i + 1 })}
              className={cn(
                "relative block aspect-4/5 w-full overflow-hidden rounded-3xl bg-line outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                dragOver === i && dragFrom !== i && "ring-2 ring-accent",
              )}
            >
              <Img src={src} alt="" fill sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" draggable={false} />
            </button>
            {i === 0 && (
              <Badge onPage className="pointer-events-none absolute left-3 top-3">
                {t("profileBadge")}
              </Badge>
            )}
          </li>
        ))}
      </ul>
      {isMe && <PhotoSheet open={adding} onClose={() => setAdding(false)} />}
    </TabSection>
  );
}

/* Lived with (own only): everyone from your completed Houses, each with "Open a House with …". */
function LivedWithTab({ userId }: { userId: string }) {
  const t = useTranslations("profile");
  const tCrews = useTranslations("profile.crews");
  const store = useStore();
  const entries: LivedWithEntry[] = livedWithFor(store, userId).filter((e) => !isBlocked(store, e.user.id));
  return (
    <TabSection title={tCrews("livedWith")} count={entries.length}>
      <p className="-mt-2 mb-4 text-[13px] text-muted">{tCrews("onlyYou")}</p>
      {entries.length > 0 ? (
        <ul className="max-w-3xl divide-y divide-line border-y border-line">
          {entries.map(({ user, house }) => (
            <li key={user.id}>
              <ListRow
                lead={<Avatar user={user} size="md" linked />}
                title={
                  <Link href={`/u/${user.id}`} className="hover:underline">
                    {user.name}
                  </Link>
                }
                subtitle={house.title}
                action={
                  <Button variant="tertiary" href={inviteHref(user.id)}>
                    {t("openWith", { name: firstName(user) })}
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[15px] text-muted">{t("livedWithEmpty")}</p>
      )}
    </TabSection>
  );
}

/* Next stop (own only): the places you want to go, "Remove" each, "Add a place" inline. */
function NextStopTab({ userId }: { userId: string }) {
  const t = useTranslations("profile.nextStop");
  const store = useStore();
  const format = useFormatter();
  const [adding, setAdding] = useState(false);
  const mine = store.interests.filter((i) => i.userId === userId).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));

  function period(interest: Interest): string {
    const months = interest.months.filter((m) => m !== FLEXIBLE).toSorted();
    if (months.length === 0) return t("anytime");
    const date = (month: string) => new Date(`${month}-01T00:00:00Z`);
    const options = { month: "short", year: "numeric", timeZone: "UTC" } as const;
    return months.length === 1 ? format.dateTime(date(months[0]), options) : format.dateTimeRange(date(months[0]), date(months.at(-1)!), options);
  }

  return (
    <TabSection
      title={t("title")}
      count={mine.length}
      action={
        !adding && (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Plus />
            {t("add")}
          </Button>
        )
      }
    >
      <p className="-mt-2 mb-4 text-[13px] text-muted">{t("hint")}</p>
      <div className="max-w-3xl space-y-6">
        {adding && (
          <div className="rounded-xl border border-line bg-surface p-6">
            <AddPlaceForm onDone={() => setAdding(false)} />
            <Button variant="tertiary" onClick={() => setAdding(false)} className="mt-4">
              {t("cancel")}
            </Button>
          </div>
        )}
        {mine.length > 0 ? (
          <ul className="divide-y divide-line border-y border-line">
            {mine.map((interest) => (
              <li key={interest.id}>
                <ListRow
                  lead={<MapPin aria-hidden />}
                  title={interest.country ? `${interest.placeName}, ${interest.country}` : interest.placeName}
                  aside={<Badge>{period(interest)}</Badge>}
                  action={
                    <Button
                      variant="tertiary"
                      aria-label={t("removeLabel", { place: interest.placeName })}
                      // Toggling a place you're in takes you out of it.
                      onClick={() => store.toggleInterest({ placeName: interest.placeName, country: interest.country, region: interest.region, months: [] }, userId)}
                    >
                      {t("remove")}
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          !adding && <p className="text-[15px] text-muted">{t("empty")}</p>
        )}
      </div>
    </TabSection>
  );
}
