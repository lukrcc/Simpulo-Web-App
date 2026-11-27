"use client";

import { HeaderViews } from "@/components/layout/header/HeaderViews";
import { usePageView } from "@/lib/pageViews";
import { FrameStrip, PageFrame } from "@/components/PageFrame";
import { StripFig } from "@/components/StripFig";

// /h/[id] for members (a guest with a request, a yes or a paid share) and the host – the House area (CLAUDE.md "House-Bereich"): the stage on
// top in the HeroBand pattern (photo, title, dates · place, the crew's faces, where the House stands: "Starts in 12 days" / "Day 4 of 14" /
// "Ended"), under it the tabs as capsules – Chat · Crew · Plan · Moments · Me, the host also Manage – their state in the URL (?tab=plan).
// Visitors keep the public House page (views/StayDetail.tsx). Everything from the store (mock); nothing here is a second copy of Messages.
import { placeShortOf } from "@/lib/shortName";
import { similarHouses } from "@/lib/requests";
import { HostHelpChecklist } from "./HostHelpChecklist";
import { HostChecklist } from "@/components/onboarding/HostOnboarding";
import { ProgramEditor, ProgramFeedbackSummary, ProgramView } from "./ProgramParts";
import { CalendarDays, Check, Images, ListChecks, MessageCircle, Plus, RotateCcw, Share, Users, Wallet, type LucideIcon } from "lucide-react";
import { useHouseShareSheet } from "@/components/share/HouseShare";
import { InviteSheet } from "@/components/InviteSheet";
import { useCanInvite } from "@/lib/invites";
import { againHref } from "@/components/create/model";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CrewCount, CrewRow } from "@/components/CrewRow";
import { HeroBand, HeroPhotos } from "@/components/HeroBand";
import { HelpSheet, helpAvailable } from "@/components/help/HelpSheet";
import { MyShare } from "@/components/payments/MyShare";
import { PaymentsSection } from "@/components/payments/PaymentsCard";
import { Receipt } from "@/components/payments/Receipt";
import { RefundNotice } from "@/components/payments/Refund";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { HostKit } from "@/components/share/HostKit";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { BackButton } from "@/components/ui/BackButton";
import { guestPrice } from "@/lib/pricing";
import { useViewerPrice } from "@/components/ui/PriceLine";
import { openGetHelp } from "@/lib/support/feedback";
import { PanelCapsule } from "@/components/ui/PanelCapsule";
import type { ArcPhase } from "@/config/arc";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Img } from "@/components/ui/Img";
import { iconButtonStyles } from "@/components/ui/IconButton";
import { useToast } from "@/components/ui/Toast";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { HOUSE_VIBE_SCALES, hasVibe } from "@/config/houseVibe";
import { useFormat } from "@/i18n/format";
import { hostOverlapOf } from "@/lib/overlap";
import { profileHref } from "@/lib/privacy";
import { crewInOf, crewThreadId, findUser, getCrew, getCrewThread, getMyPayment, getPayments, paymentProgress, paymentStatus, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { cn, housePhotos, openSpots, typicalDayOf } from "@/lib/utils";
import { yourPeople } from "@/lib/yourPeople";
import { afterAt, arcDateLabel, arrivalOf, chosenAt, intentionOf, thirtyAt, useArc, useArcNow } from "@/lib/arc";
import { CrewMenu, CloseStayConfirm } from "./CrewMenu";
import { CrewVotes } from "./CrewVotes";
import { HostInvitesSection } from "./HouseInvites";
import { ChatBody, CrewRows, openRequestsOf, RequestsTab, WaitlistRows } from "./HouseManageParts";
import { GuestProgress, HostProgress } from "./HouseProgress";
import { ArcBar, ArcMute, ArcStepPanel, useArcEmails } from "./ArcParts";
import { GettingThere, HostTasks, IntentionForm, IntentionView, Practical, sayHiDraft, useHostTaskList } from "./ArcBefore";
import { Sheet } from "@/components/ui/Sheet";
import { IconTile } from "@/components/settings/SettingsList";
import { paymentSplit } from "@/lib/fees";
import { albumOf } from "@/lib/memories";
import { openVote } from "@/lib/crewVotes";
import { AgreementPanel, ArrivedPanel, FirstNightPanel } from "./ArcArrival";
import { AgreedMoments, HalftimeAverage, HalftimeForm, PeakPanel } from "./ArcMiddle";
import { AlbumReady, AlbumSection } from "./Album";
import { DoItAgainPanel, ThirtyDaysForm } from "./ArcAfterwards";
import { AfterForm, ChosenPanel, ClosingPanel, CrewWordsList, HostAfterSummary, useChosenReveal } from "./ArcGoodbye";
import { LockSheet } from "./LockSheet";
import { PaySheet } from "./PaySheet";

// CLAUDE.md "Klare Ziele für alle House-Karten": Chat · Plan · Crew · Moments, the host also Manage; no "Me" – its content ("Your stay": your
// payment, getting there, leaving) is a section of Plan. Before and during the House Chat comes first; after it Moments.
/** The House area (CLAUDE.md "House-Bereich mit Übersicht"): the overview with its cards, and one page per area (?tab=…). */
type View = "overview" | "chat" | "plan" | "crew" | "money" | "moments" | "todo";
const VIEWS: readonly View[] = ["overview", "chat", "plan", "crew", "money", "moments", "todo"];
const DAY_MS = 86_400_000;
const dayOf = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

/** Where the House stands, from its dates: before (days to go), during (day n of total), after. */
function phaseOf(stay: Stay, today: string): { key: "starts"; days: number } | { key: "running"; day: number; total: number } | { key: "ended" } {
  const now = dayOf(today);
  const start = dayOf(stay.startDate);
  const end = dayOf(stay.endDate);
  if (stay.status === "completed" || now > end) return { key: "ended" };
  if (now < start) return { key: "starts", days: Math.round((start - now) / DAY_MS) };
  return { key: "running", day: Math.round((now - start) / DAY_MS) + 1, total: Math.round((end - start) / DAY_MS) + 1 };
}

/**
 * The House area. `ended`: the guest was removed by the host or their 48 hours to pay ran out – they still see it, Me opens with what
 * happened (also a line in Messages, the direct chat with the host).
 */
/** The House area's views in the bar – no Manage (its parts live in the views), Money and To do open from the overview's cards. */
const BAR_VIEWS = ["overview", "chat", "plan", "crew", "moments"] as const;
type BarView = (typeof BAR_VIEWS)[number];

export function HouseArea({ stay, role, ended }: { stay: Stay; role: "member" | "host"; ended?: "removed" | "paymentLapsed" | "moderation" }) {
  const t = useTranslations("house.area");
  const tBack = useTranslations("common");
  const f = useFormat();
  const store = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const host = findUser(store, stay.hostId);
  const crew = getCrew(store, stay);
  const isHost = role === "host";
  const request = store.joinRequests.findLast((r) => r.stayId === stay.id && r.userId === store.currentUserId);
  const thread = getCrewThread(store, stay.id);
  const inChat = Boolean(thread) && (isHost || request?.status === "accepted");
  // Today – or the Dev menu's simulated House day (lib/arc.ts useArcNow, never in production).
  const nowMs = useArcNow(stay);
  const today = new Date(nowMs).toISOString().slice(0, 10);
  const phase = phaseOf(stay, today);
  useArcEmails(stay);
  // A day after the day after: mutual "with you again" become Your people.
  useChosenReveal(stay);
  // A Simpulo card opened this tab (?arc=step): the step on top of it.
  const arcStep = params.get("arc");

  // The tab: ?tab= (the browser's back walks through them); without one, where you'd look first.
  const over = phase.key === "ended";
  const focus = params.get("focus");
  const fromFocus: View | null = focus === "pay" ? "money" : focus === "chat" ? "chat" : isHost && (focus === "requests" || focus === "invite") ? "crew" : isHost && focus === "booking" ? "money" : null;
  // Old links: "Me" opens Plan; "Manage" (and /h/[id]/manage) the overview.
  const askedRaw = params.get("tab");
  const asked = (askedRaw === "me" ? "plan" : askedRaw === "manage" ? "overview" : askedRaw) as View | null;
  // The bar's views for this House (CLAUDE.md "Kopfleiste als Seitenwerkzeug"): Overview · Chat · Plan · Crew · Moments – the last one chosen is
  // kept for the session (per House) and opens again without a ?tab.
  const [remembered, remember] = usePageView<BarView>(`house:${stay.id}`, BAR_VIEWS, ended ? "plan" : "overview");
  const fallback: View = remembered;
  const tab: View = asked && VIEWS.includes(asked) && (asked !== "todo" || isHost) ? asked : (fromFocus ?? fallback);
  const setTab = (next: View) => {
    if ((BAR_VIEWS as readonly string[]).includes(next)) remember(next as BarView);
    const q = new URLSearchParams(params.toString());
    if (next === "overview") q.delete("tab");
    else q.set("tab", next);
    q.delete("focus");
    q.delete("arc");
    const query = q.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    window.scrollTo({ top: 0 });
  };
  // ?focus=pay opens the pay sheet once.
  const [paying, setPaying] = useState(false);
  const focusedPay = useRef(false);
  useEffect(() => {
    if (focus === "pay" && !focusedPay.current) {
      focusedPay.current = true;
      setPaying(true);
    }
  }, [focus]);

  const place = stay.location.area ? `${stay.location.area}, ${stay.location.city || stay.city}` : stay.location.city || stay.city || stay.region.split(",")[0];
  const share = useHouseShareSheet(stay);
  // ?focus=invite (a member: "Invite a friend", Needs you "Fill spots"): the invite sheet once – the host's goes to Manage.
  const canBring = useCanInvite(stay.id);
  const [inviting, setInviting] = useState(false);
  const focusedInvite = useRef(false);
  useEffect(() => {
    if (focus === "invite" && !isHost && canBring && !focusedInvite.current) {
      focusedInvite.current = true;
      setInviting(true);
    }
  }, [focus, isHost, canBring]);
  const tShare = useTranslations("growth.share");
  // Plan: the Arc phase shown – the current one by default (a tap on another phase shows its blocks).
  const arcNow = useArc(stay);
  const [pickedPhase, setPlanPhase] = useState<ArcPhase | null>(null);
  const planPhase: ArcPhase = pickedPhase ?? arcNow?.phase ?? "before";
  // "···" › Need help with this House?: the case form in its window (3 days before to a day after), Get help otherwise.
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpNow] = useState(() => Date.now());
  const openHelp = () => (helpAvailable(stay, helpNow) ? setHelpOpen(true) : openGetHelp({ houseId: stay.id }));
  /** The host's empty states in Plan lead to the task (To do) or the programme (Plan). */
  const openManage = (anchor: string) => {
    setTab(anchor === "manage-program" ? "plan" : "todo");
    window.setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };
  const tMenu = useTranslations("houses.crewMenu");
  const [kitOpen, setKitOpen] = useState(false);
  const phaseText = phase.key === "starts" ? t("phase.starts", { days: phase.days }) : phase.key === "running" ? t("phase.running", { day: phase.day, total: phase.total }) : t("phase.ended");

  return (
    // .house-area: the shared UI rule (CLAUDE.md "House-Bereich – gemeinsame UI-Regel"): capsules, white surfaces, filled fields.
    <div className="house-area">
      {share.sheet}
      {!isHost && canBring && <InviteSheet stay={stay} open={inviting} onClose={() => setInviting(false)} />}
      {isHost && (
        <Sheet open={kitOpen} onClose={() => setKitOpen(false)} title={tShare("button")}>
          <HostKit stays={[stay]} />
        </Sheet>
      )}
      {/* The stage: the HeroBand pattern (CLAUDE.md "Vollbild-Band") – the photos left, the House on the light band right. Only on the overview. */}
      {tab === "overview" && <PageFrame fullStrip={false} media={<HeroPhotos photos={housePhotos(stay, host)} />} mediaFit="house" height="split:h-[clamp(320px,40vh,420px)]" aria-labelledby="house-area-title">
        <div className="flex h-full min-w-0 flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BackButton fallback="/your-houses" label={tBack("back")} />
                <p className="text-eyebrow uppercase text-ink/60">{stay.customVibe?.trim() || f.vibe(stay.vibe)}</p>
              </div>
              <h1 id="house-area-title" className="mt-2 line-clamp-2 text-hero text-ink">
                {stay.title}
              </h1>
              <p className="mt-3 text-h3 font-normal text-muted md:truncate">
                {f.stayDatesLong(stay)} · {place}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {/* Share: the one share sheet (components/share/HouseShare.tsx) – the link carries your ref and the channel. */}
              {/* The host: the host kit (story, bio link, community post) in a sheet; guests the one share sheet. */}
              <button type="button" onClick={isHost ? () => setKitOpen(true) : share.open} aria-label={tShare("button")} className={iconButtonStyles("sm")}>
                <Share aria-hidden />
              </button>
              <Link href={isHost ? `/house/${stay.slug}?preview=guest` : `/house/${stay.slug}`} className="panel-cap">
                {t("viewPage")}
              </Link>
              {/* "···": help with this House and "Mute Simpulo tips" (a switch on top – the menu stays open) beside the usual entries. */}
              {isHost ? (
                <CrewMenu stay={stay} afterLeaveHref="/your-houses" minimal top={<ArcMute compact />} extraItems={[{ label: tMenu("edit"), href: `/your-houses/${stay.id}/edit` }, { label: t("me.helpLine"), onSelect: openHelp }]} buttonClassName={iconButtonStyles("sm")} />
              ) : (
                <SafetyMenu target={{ kind: "stay", id: stay.id }} top={<ArcMute compact />} extraItems={[{ label: t("me.helpLine"), onSelect: openHelp }]} buttonClassName={iconButtonStyles("sm")} />
              )}
              {helpAvailable(stay, helpNow) && <HelpSheet stay={stay} open={helpOpen} onClose={() => setHelpOpen(false)} />}
            </div>
          </div>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <p className={cn("inline-flex items-center gap-2 text-h2", phase.key === "ended" ? "text-muted" : "text-ink")}>
              {phase.key === "running" && <span aria-hidden className="size-2.5 rounded-full bg-success" />}
              {phaseText}
            </p>
            <div className="flex flex-col items-end gap-2">
              <CrewRow stay={stay} crew={crew} size="md" max={7} filled />
              <CrewCount stay={stay} />
            </div>
          </div>
        </div>
      </PageFrame>}
      {/* Lived in (the House is over): the dark strip with "Do it again" – Open a House from this one, the crew of then invited. */}
      {tab === "overview" && over && !ended && (
        <FrameStrip
          figures={<StripFig value={f.stayDates({ startDate: stay.startDate, endDate: stay.startDate, datesOpen: true })} label={t("livedInLabel")} />}
          buttons={
            <Button variant="cream" href={againHref(stay.id)}>
              {t("doItAgain")}
            </Button>
          }
        />
      )}

      <div className="page-container explore-width">
        {/* The bar's views; a detail page keeps only its big title – no "‹ {House}" (the bar navigates), the head isn't repeated. */}
        <HeaderViews label={t("viewsLabel")} value={(BAR_VIEWS as readonly string[]).includes(tab) ? (tab as BarView) : null} onChange={setTab} views={BAR_VIEWS.map((value) => ({ value, label: t(`tabs.${value}`) }))} />
        {tab !== "overview" && (
          <div className="pt-8">
            <h2 className="text-h1 text-ink">{t(`tabs.${tab}`)}</h2>
          </div>
        )}
        <div className="pt-8">
          {arcStep && (
            <div className="mb-8 max-w-[760px]">
              <ArcStepPanel key={arcStep} stay={stay} stepId={arcStep} />
            </div>
          )}
          {tab === "overview" && <AreaOverview stay={stay} crew={crew} isHost={isHost} over={over} nowMs={nowMs} onOpen={setTab} />}
          {/* No guest yet: the empty state in the middle (and the host's "Invite friends"); otherwise the crew's chat. */}
          {tab === "chat" && (crew.length <= 1 ? <ChatEmpty stay={stay} isHost={isHost} /> : <ChatBody stay={stay} empty={isHost ? t("chat.emptyHost") : t("chat.emptyMember")} />)}
          {tab === "crew" && (
            <div className="flex flex-col gap-12">
              <CrewTab stay={stay} crew={crew} inChat={inChat} />
              {isHost && <HostCrewParts stay={stay} />}
            </div>
          )}
          {tab === "money" && (isHost ? <HostMoneyParts stay={stay} /> : <div className="max-w-[760px]"><MeTab part="booking" stay={stay} isHost={isHost} over={over} onPay={() => setPaying(true)} chat={null} /></div>)}
          {tab === "todo" && isHost && <HostTodoParts stay={stay} />}
          {tab === "plan" && (
            // CLAUDE.md "Plan-Reiter": the Arc → Your booking → Getting there → Your intention → (the House's plan) → help → Mute Simpulo tips.
            // No "Your stay" heading. #your-stay stays as the anchor of "Your stay" links.
            // CLAUDE.md "Plan nach Arc-Phasen": the Arc on top, its phases tappable (default the current one); under it only that phase's
            // blocks. Help and "Mute Simpulo tips" live in the head's "···".
            <div id="your-stay" className="flex max-w-[760px] scroll-mt-40 flex-col gap-10">
              {ended ? (
                <MeTab part="booking" stay={stay} isHost={isHost} ended={ended} over={over} onPay={() => setPaying(true)} chat={null} />
              ) : (
                <>
                  <ArcBar stay={stay} selected={planPhase} onSelect={setPlanPhase} />
                  {planPhase === "before" && (
                    <>
                      <MeTab part="step" stay={stay} isHost={isHost} over={over} onPay={() => setPaying(true)} chat={inChat ? `/messages/${crewThreadId(stay.id)}` : null} />
                      <MeTab part="intention" stay={stay} isHost={isHost} over={over} onPay={() => setPaying(true)} chat={null} />
                      {/* A week before: how everyone gets there – nothing is booked. */}
                      <Part id="plan-getting-there" title={t("plan.gettingThere")}>
                        <GettingThere stay={stay} />
                      </Part>
                    </>
                  )}
                  <PlanTab stay={stay} isHost={isHost} phase={planPhase} onManage={openManage} />
                  {isHost && <HostPlanParts stay={stay} phase={planPhase} />}
                  {planPhase === "before" && <MeTab part="cancel" stay={stay} isHost={isHost} over={over} onPay={() => setPaying(true)} chat={null} />}
                  {planPhase === "together" && <MeTab part="halftime" stay={stay} isHost={isHost} over={over} onPay={() => setPaying(true)} chat={null} />}
                  {planPhase === "after" && (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <p className="text-body text-ink">{t("plan.afterLine")}</p>
                        <PanelCapsule onClick={() => setTab("moments")}>{t("plan.toMoments")}</PanelCapsule>
                      </div>
                      <MeTab part="after" stay={stay} isHost={isHost} over={over} onPay={() => setPaying(true)} chat={null} />
                    </>
                  )}
                </>
              )}
            </div>
          )}
          {tab === "moments" && (
            <div className="flex flex-col gap-12">
              <MomentsTab stay={stay} />
              {isHost && <HostMomentsParts stay={stay} />}
            </div>
          )}
        </div>
      </div>
      <PaySheet stay={stay} open={paying} onClose={() => setPaying(false)} />
    </div>
  );
}

/**
 * "Your House page · N % complete": the parts that were taken out of Open a House – About the space, description, photos of the place,
 * languages, who, crew age, house rules – each a row with its state and a link into editing (the layout of Manage follows separately).
 */
function HousePageParts({ stay }: { stay: Stay }) {
  const t = useTranslations("house.area.pageParts");
  const parts: Array<{ key: "space" | "description" | "placePhoto" | "languages" | "who" | "age" | "rules"; done: boolean; detail: "space" | "extras" }> = [
    { key: "space", done: Object.keys(stay.space ?? {}).length > 0, detail: "space" },
    { key: "description", done: Boolean(stay.whyText?.trim() || stay.description?.trim()), detail: "extras" },
    { key: "placePhoto", done: Boolean(stay.accommodationPhoto), detail: "extras" },
    { key: "languages", done: (stay.languages ?? []).length > 0, detail: "extras" },
    { key: "who", done: stay.who === "women", detail: "extras" },
    { key: "age", done: Boolean(stay.ageRange), detail: "extras" },
    { key: "rules", done: (stay.houseRules ?? []).length > 0, detail: "extras" },
  ];
  const percent = Math.round((parts.filter((p) => p.done).length / parts.length) * 100);
  return (
    <Part id="manage-page" title={t("title", { percent })}>
      <ul className="divide-y divide-ink/6">
        {parts.map((part) => (
          <li key={part.key}>
            <Link href={`/your-houses/${stay.id}/edit?detail=${part.detail}`} className="flex min-h-11 items-center gap-3 py-2 text-body text-ink hover:underline">
              <span aria-hidden className={cn("flex size-5 shrink-0 items-center justify-center rounded-full", part.done ? "bg-ink text-inverse" : "border-2 border-ink/20")}>
                {part.done && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">{t(`parts.${part.key}`)}</span>
              <span className="text-small text-muted">{part.done ? t("edit") : t("add")} →</span>
            </Link>
          </li>
        ))}
      </ul>
    </Part>
  );
}

/** A part of a tab: a heading (text-subhead, as on the House page) and its content. */
function Part({ title, id, children, aside }: { title: string; id?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-[calc(var(--header-total)+88px)]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-subhead text-ink">{title}</h2>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

// ── Crew ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Everyone in: photo, first name, vibe, where they stand (paid / waiting for payment / in), how you know them; the host first, in blue. */
function CrewTab({ stay, crew, inChat }: { stay: Stay; crew: User[]; inChat: boolean }) {
  const t = useTranslations("house.area.crew");
  const tBefore = useTranslations("house.before");
  const tVibe = useTranslations("profile.vibe");
  const store = useStore();
  const router = useRouter();
  const me = store.currentUserId;
  const myName = findUser(store, me ?? "")?.name.split(" ")[0] ?? "";
  const mine = useMemo(() => new Set(me ? yourPeople(store, me).map((p) => p.user.id) : []), [store, me]);
  const lived = (id: string) => Boolean(me) && store.livedWith.some((l) => (l.userId === me && l.otherUserId === id) || (l.userId === id && l.otherUserId === me));
  const ordered = [...crew.filter((u) => u.id === stay.hostId), ...crew.filter((u) => u.id !== stay.hostId)];
  const locked = stay.accommodationStatus === "locked";
  // Only the host in: the host's row and one row per open spot (a filled grey circle with "+"); the host gets "Invite friends" under it.
  if (ordered.length <= 1) return <CrewOpen stay={stay} host={ordered[0]} />;
  return (
    <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(320px,100%),1fr))]">
      {ordered.map((member) => {
        const isHost = member.id === stay.hostId;
        const vibe = hasVibe(member.houseVibe) ? member.houseVibe : undefined;
        const paid = paymentStatus(store, stay.id, member.id) === "paid";
        const status = isHost ? null : paid ? t("paid") : locked && stay.paymentDueAt ? t("waitingPayment") : t("in");
        const known = member.id === me ? null : mine.has(member.id) ? t("yourPeople") : lived(member.id) ? t("livedWith") : null;
        return (
          <li key={member.id} className={cn("flex items-start gap-3 rounded-[20px] p-4", isHost ? "card-host text-on-image" : "card-soft")}>
            <Avatar user={member} size="lg" linked />
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-1 text-body font-semibold">
                <Link href={profileHref(member.id)} className="truncate hover:underline">
                  {member.id === me ? `${member.name.split(" ")[0]} (${t("you")})` : member.name.split(" ")[0]}
                </Link>
                {member.verified && <VerifiedBadge />}
              </p>
              <p className={cn("mt-0.5 text-small", isHost ? "text-on-image/80" : "text-muted")}>{vibe ? HOUSE_VIBE_SCALES.flatMap(({ key }) => (vibe[key] ? [tVibe(`${key}.${vibe[key]}`)] : [])).join(" · ") : t("noVibe")}</p>
              <div className="mt-3">
                <IntentionView intention={intentionOf(store, member, stay)} onImage={isHost} />
              </div>
              {member.id !== me && inChat && (
                <Button
                  size="sm"
                  variant={isHost ? "cream" : "secondary"}
                  className="mt-3"
                  onClick={() => {
                    sayHiDraft(crewThreadId(stay.id), tBefore("crew.hiDraft", { name: myName }));
                    router.push(`/messages/${crewThreadId(stay.id)}`);
                  }}
                >
                  {tBefore("crew.sayHi")}
                </Button>
              )}
              <p className="mt-2 flex flex-wrap gap-1.5">
                {isHost && <span className="rounded-full bg-on-image/20 px-2.5 py-0.5 text-small font-semibold">{t("host")}</span>}
                {status && <span className={cn("rounded-full px-2.5 py-0.5 text-small", paid ? "bg-success/15 text-ink" : "bg-ink/6 text-ink")}>{status}</span>}
                {known && <span className={cn("rounded-full px-2.5 py-0.5 text-small", isHost ? "bg-on-image/20" : "bg-ink/6 text-ink")}>{known}</span>}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** The Chat tab before the first guest: a symbol, "The crew chat starts when the first guest joins." and, for the host, "Invite friends". */
function ChatEmpty({ stay, isHost }: { stay: Stay; isHost: boolean }) {
  const t = useTranslations("house.area.chat");
  const tInvite = useTranslations("invite");
  const [inviting, setInviting] = useState(false);
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-(--chip-bg) text-muted">
        <MessageCircle className="size-6" strokeWidth={1.75} />
      </span>
      <p className="max-w-[36ch] text-body-lg text-ink">{t("emptyHost")}</p>
      {isHost && openSpots(stay) > 0 && (
        <>
          <PanelCapsule onClick={() => setInviting(true)}>{tInvite("inviteFriends")}</PanelCapsule>
          <InviteSheet stay={stay} open={inviting} onClose={() => setInviting(false)} />
        </>
      )}
    </div>
  );
}

/** The Crew tab while only the host is in: the host (photo, name, country, "Host"), "Open spot" per free place, the host's "Invite friends". */
function CrewOpen({ stay, host }: { stay: Stay; host?: User }) {
  const t = useTranslations("house.area.crew");
  const tInvite = useTranslations("invite");
  const store = useStore();
  const [inviting, setInviting] = useState(false);
  const isHost = store.currentUserId === stay.hostId;
  const free = openSpots(stay);
  return (
    <div className="flex max-w-[640px] flex-col gap-6">
      <ul className="flex flex-col gap-1">
        {host && (
          <li className="flex items-center gap-3 py-2">
            <Avatar user={host} size="md" linked />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-semibold text-ink">{host.name.split(" ")[0]}</p>
              <p className="truncate text-small text-muted">{host.country}</p>
            </div>
            <span className="text-small text-muted">{t("host")}</span>
          </li>
        )}
        {Array.from({ length: free }, (_, i) => (
          <li key={i} className="flex items-center gap-3 py-2">
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--chip-bg) text-muted">
              <Plus className="size-4" strokeWidth={2} />
            </span>
            <p className="text-body text-muted">{t("openSpot")}</p>
          </li>
        ))}
      </ul>
      {isHost && free > 0 && (
        <div>
          <PanelCapsule onClick={() => setInviting(true)}>{tInvite("inviteFriends")}</PanelCapsule>
          <InviteSheet stay={stay} open={inviting} onClose={() => setInviting(false)} />
        </div>
      )}
    </div>
  );
}

// ── Plan ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The House's arc (Bogen) – Block 2: before (intention), arriving (question cards), in the middle (halftime), the closing round, after. Not
 * built yet and not visible: each slot renders nothing, so the Plan tab already has its places (config/depth.ts ARC_MODULES says which).
 */
export const ARC_SLOTS = ["before", "arrive", "middle", "closing", "after"] as const;
export type ArcSlotKey = (typeof ARC_SLOTS)[number];
/** Block 2 fills this per slot (and per depth, ARC_MODULES); until then it renders nothing – the users see no trace of it. */
function ArcSlot({ slot, stay }: { slot: ArcSlotKey; stay: Stay }) {
  void slot;
  void stay;
  return null;
}

/** Dates · getting there (the exact place once you've paid) · the rhythm of a day · votes. */
function PlanTab({ stay, isHost, phase, onManage }: { stay: Stay; isHost: boolean; /** Only this Arc phase's blocks */ phase: ArcPhase; /** The host's empty states: to Manage (its anchor) */ onManage: (anchor: string) => void }) {
  const t = useTranslations("house.area.plan");
  const tProgram = useTranslations("program");
  const tBefore = useTranslations("house.before");
  const tArrival = useTranslations("house.arrival");
  const tFirst = useTranslations("house.firstNight");
  const tAgreement = useTranslations("house.agreement");
  const tMiddle = useTranslations("house.middle");
  const tGoodbye = useTranslations("house.goodbye");
  const stops = typicalDayOf(stay);
  return (
    <>
      {/* The Arc (top of the tab), the dates (Your booking) and Getting there stand above – CLAUDE.md "Plan-Reiter". */}
      {phase === "before" && (
        <>
      {/* Two days before: the exact address, check-in, House rules, what to bring (and the Pro host's programme). */}
      <Part id="plan-practical" title={tBefore("practical.title")}>
        <Practical stay={stay} isHost={isHost} onHostAdd={() => onManage("manage-tasks")} />
      </Part>
      {/* A Pro host's programme: in full from two days before, a preview until then. */}
      {/* The host edits the programme right below (HostPlanParts) – the crew's preview only for guests. */}
      {stay.hostFeePerPerson && !isHost ? (
        <Part id="plan-program" title={tProgram("planTitle")}>
          <ProgramView stay={stay} isHost={isHost} onHostAdd={() => onManage("manage-program")} />
        </Part>
      ) : null}
        </>
      )}
      {phase === "arrival" && (
        <>
      {/* Day 1: who's here · the first night's cards · Day 1–2: the House agreement (kept here, the crew sees it). */}
      <Part id="plan-arrived" title={tArrival("title")}>
        <ArrivedPanel stay={stay} />
      </Part>
      <Part id="plan-first-night" title={tFirst("title")}>
        <FirstNightPanel stay={stay} isHost={isHost} />
      </Part>
      <Part id="plan-agreement" title={tAgreement("title")}>
        <AgreementPanel stay={stay} isHost={isHost} />
      </Part>
        </>
      )}
      {phase === "together" && (
        <>
      <Part id="plan-rhythm" title={t("rhythm")}>
        {/* What the crew agreed on (the moment of the day), then the House's usual day. */}
        <div className="mb-5">
          <AgreedMoments stay={stay} />
        </div>
        {/* Empty: guests read "The host hasn't shared a rhythm yet"; the host has no place to set one here – no line for them. */}
        {stops.length === 0 ? (
          isHost ? null : <p className="text-body text-muted">{t("rhythmEmpty")}</p>
        ) : (
          <dl className="grid grid-cols-[80px_minmax(0,1fr)] items-baseline gap-x-4 gap-y-3 md:grid-cols-[128px_minmax(0,1fr)]">
            {stops.map((stop) => (
              <div key={`${stop.time}-${stop.label}`} className="contents">
                <dt className="whitespace-nowrap text-body-lg tabular-nums text-muted">{stop.time}</dt>
                <dd className="text-body-lg text-ink">{stop.label}</dd>
              </div>
            ))}
          </dl>
        )}
      </Part>
      {/* The high point (second half): the Pro host's own – or the crew's vote on a proposal. */}
      <Part id="plan-peak" title={tMiddle("peakTitle")}>
        <PeakPanel stay={stay} isHost={isHost} />
      </Part>
      <Part title={t("votes")}>{stay.accommodationVote || stay.datesVote ? <CrewVotes stay={stay} /> : <p className="text-body text-muted">{t("votesEmpty")}</p>}</Part>
        </>
      )}
      {/* The last evening: the closing circle (three questions out loud) and, optional, a few words for the crew. */}
      {phase === "goodbye" && (
        <Part id="plan-closing" title={tGoodbye("closingTitle")}>
          <ClosingPanel stay={stay} isHost={isHost} />
        </Part>
      )}
    </>
  );
}

// ── Moments ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Photos from the time together: none stored yet – what you add stays on this device for now; under them the place's own photos. */
function MomentsTab({ stay }: { stay: Stay }) {
  const tGoodbye = useTranslations("house.goodbye");
  return (
    <div className="flex flex-col gap-10">
      {/* The album: photos and clips from the crew – only the crew sees it (Album.tsx). */}
      <AlbumSection stay={stay} />
      {/* The crew's words from the last evening – only the crew sees them. */}
      <Part id="moments-words" title={tGoodbye("wordsMoments")}>
        <CrewWordsList stay={stay} />
      </Part>
    </div>
  );
}

// ── Me ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Your booking (dates, your share), where your payment stands, the receipt, cancelling with its rules, help, leaving – or what happened. */
function MeTab({ part, stay, isHost, ended, over, onPay, chat }: { /** Which of your stay's parts, in the Plan tab's order: the step and Your booking · Your intention · the rest (halftime … the day after, cancelling) */ part: "step" | "booking" | "intention" | "halftime" | "cancel" | "after"; stay: Stay; isHost: boolean; ended?: "removed" | "paymentLapsed" | "moderation"; /** The House is over: "Lived in" and the ways on instead of the step */ over: boolean; onPay: () => void; chat: string | null }) {
  const t = useTranslations("house.area.me");
  const tHelp = useTranslations("help");
  const tWithdraw = useTranslations("withdraw");
  const tHouses = useTranslations("houses");
  const tView = useTranslations("houses.view");
  const tBefore = useTranslations("house.before");
  const tMiddle = useTranslations("house.middle");
  const arc = useArc(stay);
  const halfDue = Boolean(arc?.due.some((d) => d.step.id === "halftime"));
  // The day after (private) – for everyone in the crew; the reveal of mutual choices a day later.
  const afterDue = Boolean(arc && arc.now >= afterAt(stay));
  const tGoodbye = useTranslations("house.goodbye");
  const tAlbum = useTranslations("house.album");
  const albumReady = Boolean(arc?.due.some((d) => d.step.id === "albumReady"));
  // A week after (with a mutual choice): Do it again · 30 days after: the private question.
  const againDue = Boolean(arc?.due.some((d) => d.step.id === "doItAgain"));
  const thirtyDue = Boolean(arc && arc.now >= thirtyAt(stay));
  const tAfterwards = useTranslations("house.afterwards");
  const format = useFormatter();
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const router = useRouter();
  const host = findUser(store, stay.hostId);
  const [now] = useState(() => Date.now());
  const [leaving, setLeaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const request = store.joinRequests.findLast((r) => r.stayId === stay.id && r.userId === store.currentUserId);
  const accepted = request?.status === "accepted";
  const payment = getMyPayment(store, stay.id);
  const refunded = !payment ? store.payments.findLast((p) => p.stayId === stay.id && p.userId === store.currentUserId && p.status === "refunded") : undefined;
  const locked = stay.accommodationStatus === "locked";
  const owes = !isHost && accepted && locked && payment?.status === "pending" && Boolean(stay.paymentDueAt);
  const waiting = request?.status === "pending" || request?.status === "waitlist_requested";
  const refundReason = refunded ? (refunded.refundedAmount !== undefined ? "spot_transferred" : stay.status === "closed" ? "host_cancelled" : !locked ? "booking_not_confirmed" : "cancelled") : null;
  const nights = Math.max(0, Math.round((dayOf(stay.endDate) - dayOf(stay.startDate)) / DAY_MS));

  if (ended) {
    const hostName = host?.name.split(" ")[0] ?? "";
    const removedNote = store.joinRequests.findLast((r) => r.stayId === stay.id && r.userId === store.currentUserId && r.endedReason === "removed")?.endedNote;
    // Where to go instead: up to three similar Houses with a free spot (the same as in the notification's email).
    const similar = similarHouses(store.stays, stay, store.currentUserId);
    return (
      <div className="flex max-w-[640px] flex-col gap-6">
        <div className="card-soft rounded-[20px] p-6">
          <h2 className="text-h3 text-ink">{ended === "paymentLapsed" ? t("lapsedTitle") : t("removedTitle")}</h2>
          <p className="mt-2 text-body text-muted">{ended === "removed" ? t("removedText", { host: hostName, title: stay.title }) : ended === "moderation" ? t("moderationText", { title: stay.title }) : t("lapsedText", { title: stay.title })}</p>
          {/* The host's reason, if they gave one (the removal's notification says it too). */}
          {ended === "removed" && removedNote && <p className="mt-2 text-body text-ink">“{removedNote}”</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button href={`/explore?category=${stay.vibe}`}>{t("similar")}</Button>
            {refunded && refundReason && <RefundNotice payment={refunded} currency={stay.currency} reason={refundReason} />}
          </div>
        </div>
        {similar.length > 0 && (
          <section data-similar-houses aria-labelledby="similar-houses" className="flex flex-col gap-3">
            <h2 id="similar-houses" className="text-subhead text-ink">
              {t("similarTitle")}
            </h2>
            <ul className="flex flex-col gap-2">
              {similar.map((s) => (
                <li key={s.id}>
                  <Link href={`/house/${s.slug}`} className="flex items-center gap-3 rounded-2xl p-1 pr-3 transition-colors duration-150 hover:bg-ink/5">
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-ink/6">{housePhotos(s)[0] && <Img src={housePhotos(s)[0]} alt="" fill sizes="56px" className="object-cover" />}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-body font-semibold text-ink">{s.title}</span>
                      <span className="block truncate text-small text-muted">{f.stayDates(s)} · {placeShortOf(s)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }
  const share = guestPrice(stay);

  return (
    <>
      {/* Where you stand right now – the same step card as before (waiting, pay, booked, arriving), with its one action. */}
      {part === "step" && (over ? (
        <div className="card-soft flex flex-wrap items-center justify-between gap-4 rounded-[20px] p-6">
          <p className="text-h3 text-ink">{tView("livedIn", { date: format.dateTime(new Date(`${stay.startDate.slice(0, 7)}-01T00:00:00Z`), { month: "long", year: "numeric", timeZone: "UTC" }) })}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" href={againHref(stay.id)}>
              <RotateCcw aria-hidden />
              {tView("doItAgain")}
            </Button>
            <Button variant="tertiary" href={`/explore?category=${stay.vibe}`}>
              {tView("housesLike")}
            </Button>
          </div>
        </div>
      ) : !isHost && (
        <GuestProgress
          stay={stay}
          request={request}
          host={host}
          onPay={owes ? onPay : undefined}
          onWithdraw={waiting ? () => setWithdrawing(true) : undefined}
          chat={chat}
          extra={refunded && refundReason ? <RefundNotice payment={refunded} currency={stay.currency} reason={refundReason} /> : undefined}
        />
      ))}
      {part === "booking" && (
        <Part title={t("booking")}>
          {/* Dates · Payment · Your share (per person, the viewer's currency, "est." while it may move – the Open a House price); no share
              yet: no column. */}
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
            <div>
              <dt className="text-small text-muted">{t("dates")}</dt>
              <dd className="mt-0.5 text-body font-semibold text-ink">
                {f.stayDatesLong(stay)} · {f.nights(nights)}
              </dd>
            </div>
            <div>
              <dt className="text-small text-muted">{t("payment")}</dt>
              <dd className="mt-0.5 text-body font-semibold text-ink">{payment?.status === "paid" ? t("paid") : owes ? t("due") : t("notYet")}</dd>
            </div>
            {share && (
              <div>
                <dt className="text-small text-muted">{t("share")}</dt>
                <dd className="mt-0.5 text-body font-semibold tabular-nums text-ink">
                  <ShareAmount stay={stay} />
                </dd>
              </div>
            )}
          </dl>
          {isHost && <p className="mt-3 text-small text-muted">{t("hostShare")}</p>}
          {payment?.status === "paid" && (
            <div className="mt-6">
              <Receipt stay={stay} payment={payment} />
            </div>
          )}
        </Part>
      )}
      {part === "intention" && !over && (
        <Part id="me-intention" title={tBefore("intention.title")}>
          <IntentionForm stay={stay} />
        </Part>
      )}
      {/* Halftime – private (guests): from the middle of the House. */}
      {part === "halftime" && !isHost && halfDue && !afterDue && (
        <Part id="me-halftime" title={tMiddle("halftimeTitle")}>
          <HalftimeForm stay={stay} />
        </Part>
      )}
      {part === "after" && (arc?.mutual.length ?? 0) > 0 && arc!.now >= chosenAt(stay) && (
        <Part id="me-chosen" title={tGoodbye("chosenHeading")}>
          <ChosenPanel stay={stay} />
        </Part>
      )}
      {part === "after" && thirtyDue && (
        <Part id="me-thirty" title={tAfterwards("thirtyTitle")}>
          <ThirtyDaysForm stay={stay} />
        </Part>
      )}
      {part === "after" && againDue && (
        <Part id="me-again" title={tAfterwards("againTitle")}>
          <DoItAgainPanel stay={stay} />
        </Part>
      )}
      {/* From "Your album is ready" on, Me links to the album for good. */}
      {part === "after" && albumReady && (
        <Part id="me-album" title={tAlbum("readyTitle")}>
          <AlbumReady stay={stay} />
        </Part>
      )}
      {part === "after" && afterDue && (
        <Part id="me-after" title={tGoodbye("afterTitle")}>
          <AfterForm stay={stay} isHost={isHost} />
        </Part>
      )}
      {part === "cancel" && !isHost && !over && (
        <Part title={t("cancel")}>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/cancellation" className="text-body font-semibold text-ink underline-offset-4 hover:underline">
              {t("cancelRules")} →
            </Link>
            {accepted && (
              <Button variant="secondary" size="sm" onClick={() => setLeaving(true)}>
                {t("leave")}
              </Button>
            )}
            {waiting && (
              <Button variant="secondary" size="sm" onClick={() => setWithdrawing(true)}>
                {t("withdraw")}
              </Button>
            )}
          </div>
        </Part>
      )}

      <ConfirmSheet
        open={leaving}
        title={tHouses("crewMenu.leaveTitle")}
        description={payment?.status === "paid" ? tHouses("crewMenu.leavePaidDescription") : tHouses("crewMenu.leaveDescription")}
        confirmLabel={tHouses("crewMenu.leaveConfirm")}
        onClose={() => setLeaving(false)}
        onConfirm={() => {
          setLeaving(false);
          router.push("/your-houses");
          store.leaveStay(stay.id);
          showToast(tHouses("crewMenu.leftToast", { title: stay.title }));
        }}
      />
      <ConfirmSheet
        open={withdrawing}
        title={tWithdraw(request?.status === "pending" ? "title" : "waitlistTitle")}
        description={tWithdraw("text")}
        confirmLabel={tWithdraw("confirm")}
        onClose={() => setWithdrawing(false)}
        onConfirm={() => {
          setWithdrawing(false);
          store.withdrawRequest(stay.id);
          showToast(tWithdraw("toast"));
        }}
      />
    </>
  );
}

/** Your share per person – the card's price (lib/pricing guestPrice): the viewer's currency, the fee included, "est." while it may move. */
function ShareAmount({ stay }: { stay: Stay }) {
  const tCommon = useTranslations("common");
  const price = useViewerPrice(stay);
  return (
    <>
      {price.label}
      {price.estimated && <span className="ml-1 text-small font-normal text-muted">{tCommon("estimated")}</span>}
    </>
  );
}

// ── Host parts (what Manage was, CLAUDE.md "House-Bereich mit Übersicht") ───────────────────────────────────────────────────────

/** To do: onboarding's checklist, Simpulo's tips, the host's tasks and the House page's optional parts. */
function HostTodoParts({ stay }: { stay: Stay }) {
  const tTasks = useTranslations("house.before.tasks");
  const tOverlap = useTranslations("overlap");
  const store = useStore();
  return (
    <div className="flex max-w-[860px] flex-col gap-12">
      {hostOverlapOf(store, stay) && <p className="text-small text-muted">{tOverlap("hostTwo")}</p>}
      {/* Host onboarding's checklist (welcome · place · payouts · first House) until it's done. */}
      <HostChecklist />
      {/* Simpulo's tips from Admin › Houses › Host helfen – ticked off here. */}
      <HostHelpChecklist stay={stay} />
      <Part id="manage-tasks" title={tTasks("title")}>
        <HostTasks stay={stay} />
      </Part>
      {/* What moved out of Open a House: the House page's optional parts, for now as a list. */}
      <HousePageParts stay={stay} />
    </div>
  );
}

/** Crew (host): the requests (and the waitlist), the crew with its "…", the invites and spots for friends. */
function HostCrewParts({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.view");
  const store = useStore();
  const { requests, waitlistRequests } = openRequestsOf(store, stay);
  const open = stay.status === "published" || stay.status === "booked";
  return (
    <div className="flex max-w-[860px] flex-col gap-12">
      <Part id="manage-requests" title={t("requests")}>
        <RequestsTab stay={stay} requests={requests} waitlistRequests={waitlistRequests} />
      </Part>
      <Part id="manage-crew" title={t("crewList")}>
        <CrewRows stay={stay} manage />
        <WaitlistRows stay={stay} />
      </Part>
      {open && (
        <Part id="manage-share" title={t("invites")}>
          <HostInvitesSection stay={stay} />
        </Part>
      )}
    </div>
  );
}

/** Money (host): the payments and the payout; choosing the place once the crew is complete. */
function HostMoneyParts({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.view");
  const [locking, setLocking] = useState(false);
  const open = stay.status === "published" || stay.status === "booked";
  const full = stay.spotsFilled >= stay.spotsTotal;
  return (
    <div className="flex max-w-[860px] flex-col gap-12">
      <Part id="manage-payments" title={t("payments")}>
        <PaymentsSection stay={stay} onLock={open && full ? () => setLocking(true) : undefined} />
      </Part>
      {locking && <LockSheet stay={stay} onClose={() => setLocking(false)} />}
    </div>
  );
}

/** Plan (host, a Pro House): the programme editor and the crew's progress (halftime, anonymous) – with the phase they belong to. */
function HostPlanParts({ stay, phase }: { stay: Stay; phase: ArcPhase }) {
  const tProgram = useTranslations("program");
  if (!stay.hostFeePerPerson) return null;
  return (
    <>
      {phase === "before" && (
        <Part id="manage-program" title={tProgram("title")}>
          <ProgramEditor stay={stay} />
        </Part>
      )}
      {phase === "together" && (
        <Part id="manage-halftime" title={tProgram("crewProgress")}>
          <HalftimeAverage stay={stay} />
        </Part>
      )}
    </>
  );
}

/** Moments (host, after the House): the crew's ratings (averages, no names) and their sentences; a Pro host's programme feedback. */
function HostMomentsParts({ stay }: { stay: Stay }) {
  const tGoodbye = useTranslations("house.goodbye");
  const tProgram = useTranslations("program");
  const afterOpen = useArcNow(stay) >= afterAt(stay);
  if (!afterOpen) return null;
  return (
    <>
      <Part id="manage-after" title={tGoodbye("hostTitle")}>
        <HostAfterSummary stay={stay} />
      </Part>
      {stay.hostFeePerPerson ? (
        <Part id="manage-program-feedback" title={tProgram("feedbackTitle")}>
          <ProgramFeedbackSummary stay={stay} />
        </Part>
      ) : null}
    </>
  );
}

// ── Overview ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The one card of the overview (CLAUDE.md "House-Bereich mit Übersicht"): white (dark: raised), radius 24, no edge, no shadow; top left a
 * neutral icon square and the title, top right a small accent dot only when something changed or waits; a large statement, under it at most
 * two rows label / value. The whole card opens its page; hover a touch darker.
 */
function AreaCard({ icon: Icon, title, dot = false, statement, sub, rows = [], onOpen, className }: { icon: LucideIcon; title: string; dot?: boolean; statement: ReactNode; sub?: ReactNode; rows?: Array<{ label: string; value: ReactNode } | null | false>; onOpen: () => void; className?: string }) {
  const shown = rows.filter((r): r is { label: string; value: ReactNode } => Boolean(r)).slice(0, 2);
  return (
    <button type="button" onClick={onOpen} data-area-card className={cn("area-card press flex min-h-56 flex-col rounded-3xl p-7 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)", className)}>
      <span className="flex items-center gap-3">
        <IconTile>
          <Icon aria-hidden strokeWidth={1.75} />
        </IconTile>
        <span className="flex-1 text-body font-semibold text-ink">{title}</span>
        {dot && <span aria-hidden className="size-2.5 rounded-full bg-(--brand-action)" />}
      </span>
      <span className="mt-6 block text-h3 text-ink">{statement}</span>
      {sub && <span className="mt-1 block truncate text-small text-muted">{sub}</span>}
      {shown.length > 0 && (
        <dl className="mt-auto flex flex-col gap-1.5 pt-6">
          {shown.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4 text-small">
              <dt className="shrink-0 text-muted">{row.label}</dt>
              <dd className="min-w-0 truncate text-right text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </button>
  );
}

/** The overview: the host's To do (only with open tasks), then Chat · Plan · Crew and Money · Moments – from the data there is. */
function AreaOverview({ stay, crew, isHost, over, nowMs, onOpen }: { stay: Stay; crew: User[]; isHost: boolean; over: boolean; nowMs: number; onOpen: (view: View) => void }) {
  const t = useTranslations("house.area.cards");
  const tTabs = useTranslations("house.area.tabs");
  const tArc = useTranslations("house.arc");
  const tTasks = useTranslations("house.before.tasks");
  const tCommon = useTranslations("common");
  const f = useFormat();
  const store = useStore();
  const me = store.currentUserId;
  const arc = useArc(stay);
  const tasks = useHostTaskList(stay);
  const price = useViewerPrice(stay);
  // Chat: the messages from others after my last read mark.
  const thread = getCrewThread(store, stay.id);
  const readAt = thread && me ? [thread.lastReadAt?.[me], store.lastReadAt[thread.id]].filter((m): m is string => Boolean(m)).sort().at(-1) : undefined;
  const unread = thread && me ? thread.messages.filter((m) => m.senderId !== me && m.senderId !== "system" && (!readAt || m.createdAt > readAt)).length : 0;
  const last = thread?.messages.findLast((m) => m.senderId !== "system" && m.text);
  const lastName = last ? (findUser(store, last.senderId)?.name.split(" ")[0] ?? "") : "";
  const noGuest = crew.length <= 1;
  // Plan
  const myArrival = me ? arrivalOf(store, findUser(store, me)!, stay) : null;
  const votesOpen = [openVote(stay, "accommodation"), openVote(stay, "dates")].filter(Boolean).length;
  // Crew
  const { requests, waitlistRequests } = openRequestsOf(store, stay);
  const pending = requests.length + waitlistRequests.length;
  const invitesOpen = store.joinRequests.filter((r) => r.stayId === stay.id && r.status === "invited").length;
  const arrivalsSet = crew.filter((u) => arrivalOf(store, u, stay)).length;
  // Money
  const progress = paymentProgress(store, stay.id);
  const payout = getPayments(store, stay.id).reduce((sum, p) => sum + paymentSplit(p.share, p.hostFee).hostReceives, 0);
  const myPayment = getMyPayment(store, stay.id);
  const owes = !isHost && myPayment?.status === "pending" && Boolean(stay.paymentDueAt);
  // Moments
  const photos = albumOf(store, stay, nowMs).length;
  const words = Object.keys(stay.crewWords ?? {}).length;
  return (
    <div className="flex flex-col gap-4">
      {isHost && tasks.active && (
        <button type="button" onClick={() => onOpen("todo")} data-area-card className="area-card press flex flex-wrap items-center justify-between gap-4 rounded-3xl p-7 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)">
          <span className="flex min-w-0 items-center gap-3">
            <IconTile>
              <ListChecks aria-hidden strokeWidth={1.75} />
            </IconTile>
            <span className="min-w-0">
              <span className="block text-body font-semibold text-ink">{tTabs("todo")}</span>
              <span className="block truncate text-body text-ink">
                {tTasks(`items.${tasks.active.task.id}.title` as "items.checkIn.title")}
                {tasks.active.due !== null && <span className="text-muted"> · {tTasks("due", { date: arcDateLabel(stay, tasks.active.due) })}</span>}
              </span>
            </span>
          </span>
          <span className="flex items-center gap-3 text-small text-muted">
            {tTasks("progress", { done: tasks.doneCount, total: tasks.tasks.length })}
            <span aria-hidden className="size-2.5 rounded-full bg-(--brand-action)" />
          </span>
        </button>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 split:grid-cols-3">
        <AreaCard
          icon={MessageCircle}
          title={tTabs("chat")}
          dot={unread > 0}
          statement={noGuest || !thread ? t("chatEmpty") : unread > 0 ? t("unread", { count: unread }) : t("allRead")}
          rows={[!noGuest && last ? { label: t("lastMessage"), value: `${lastName}: ${last.text}` } : null]}
          onOpen={() => onOpen("chat")}
        />
        <AreaCard
          icon={CalendarDays}
          title={tTabs("plan")}
          statement={arc ? tArc(`phases.${arc.phase}`) : over ? t("over") : "–"}
          sub={arc?.next ? tArc("next", { title: tArc(`steps.${arc.next.step.id}.title` as "steps.welcome.title", { title: stay.title }), date: arcDateLabel(stay, arc.next.at) }) : undefined}
          rows={[
            { label: t("arrival"), value: myArrival?.date ? `${f.day(myArrival.date)}${myArrival.time ? ` · ${myArrival.time}` : ""}` : t("notSet") },
            { label: t("votesOpen"), value: String(votesOpen) },
          ]}
          onOpen={() => onOpen("plan")}
        />
        <AreaCard
          icon={Users}
          title={tTabs("crew")}
          dot={isHost && pending > 0}
          statement={t("crewLine", { in: crewInOf(store, stay), total: stay.spotsTotal, left: openSpots(stay) })}
          rows={
            isHost
              ? [
                  { label: t("requests"), value: String(pending) },
                  { label: t("invitesOpen"), value: String(invitesOpen) },
                ]
              : [{ label: t("arrivalsSet"), value: t("ofCount", { done: arrivalsSet, total: crew.length }) }]
          }
          onOpen={() => onOpen("crew")}
        />
        <AreaCard
          icon={Wallet}
          title={tTabs("money")}
          dot={owes}
          statement={
            isHost ? (
              progress.count > 0 ? t("paidOf", { paid: progress.paidCount, total: progress.count }) : t("noPayments")
            ) : (
              <>
                {price.label}
                {price.estimated && <span className="ml-1.5 text-body text-muted">{tCommon("estimated")}</span>}
              </>
            )
          }
          rows={
            isHost
              ? [progress.count > 0 && { label: t("payout"), value: `${f.price(payout, stay.currency)} ${tCommon("estimated")}` }]
              : [{ label: t("status"), value: myPayment?.status === "paid" ? t("paid") : owes ? t("due") : t("notYet") }]
          }
          onOpen={() => onOpen("money")}
        />
        <AreaCard
          icon={Images}
          title={tTabs("moments")}
          statement={photos > 0 ? t("photos", { count: photos }) : t("noPhotos")}
          rows={[{ label: t("words"), value: String(words) }]}
          onOpen={() => onOpen("moments")}
        />
      </div>
    </div>
  );
}
