"use client";

// /h/[id] for members (a guest with a request, a yes or a paid share) and the host – the House area (CLAUDE.md "House-Bereich"): the stage on
// top in the HeroBand pattern (photo, title, dates · place, the crew's faces, where the House stands: "Starts in 12 days" / "Day 4 of 14" /
// "Ended"), under it the tabs as capsules – Chat · Crew · Plan · Moments · Me, the host also Manage – their state in the URL (?tab=plan).
// Visitors keep the public House page (views/StayDetail.tsx). Everything from the store (mock); nothing here is a second copy of Messages.
import { ProgramEditor, ProgramFeedbackSummary, ProgramView } from "./ProgramParts";
import { RotateCcw, Share } from "lucide-react";
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
import { ContextHelp } from "@/components/help/HelpFeedback";
import { HelpButton, helpAvailable } from "@/components/help/HelpSheet";
import { MyShare } from "@/components/payments/MyShare";
import { PaymentsSection } from "@/components/payments/PaymentsCard";
import { Receipt } from "@/components/payments/Receipt";
import { RefundNotice } from "@/components/payments/Refund";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { HostKit } from "@/components/share/HostKit";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { BackButton } from "@/components/ui/BackButton";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { Img } from "@/components/ui/Img";
import { iconButtonStyles } from "@/components/ui/IconButton";
import { useToast } from "@/components/ui/Toast";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { HOUSE_VIBE_SCALES, hasVibe } from "@/config/houseVibe";
import { useFormat } from "@/i18n/format";
import { hostOverlapOf } from "@/lib/overlap";
import { profileHref } from "@/lib/privacy";
import { crewThreadId, findUser, getCrew, getCrewThread, getMyPayment, paymentStatus, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { cn, housePhotos, typicalDayOf } from "@/lib/utils";
import { yourPeople } from "@/lib/yourPeople";
import { afterAt, chosenAt, intentionOf, thirtyAt, useArc, useArcNow } from "@/lib/arc";
import { CrewMenu, CloseStayConfirm } from "./CrewMenu";
import { CrewVotes } from "./CrewVotes";
import { HostInvitesSection } from "./HouseInvites";
import { ChatBody, CrewRows, openRequestsOf, RequestsTab, WaitlistRows } from "./HouseManageParts";
import { GuestProgress, HostProgress } from "./HouseProgress";
import { ArcBar, ArcMute, ArcStepPanel, useArcEmails } from "./ArcParts";
import { GettingThere, HostTasks, IntentionForm, IntentionView, Practical, sayHiDraft } from "./ArcBefore";
import { AgreementPanel, ArrivedPanel, FirstNightPanel, QuestionCardsEntry } from "./ArcArrival";
import { AgreedMoments, HalftimeAverage, HalftimeForm, PeakPanel } from "./ArcMiddle";
import { AlbumReady, AlbumSection } from "./Album";
import { DoItAgainPanel, ThirtyDaysForm } from "./ArcAfterwards";
import { AfterForm, ChosenPanel, ClosingPanel, CrewWordsList, HostAfterSummary, useChosenReveal } from "./ArcGoodbye";
import { LockSheet } from "./LockSheet";
import { PaySheet } from "./PaySheet";

type Tab = "chat" | "crew" | "plan" | "moments" | "me" | "manage";
const MEMBER_TABS: readonly Tab[] = ["chat", "crew", "plan", "moments", "me"];
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
  const tabs: readonly Tab[] = isHost ? [...MEMBER_TABS, "manage"] : MEMBER_TABS;
  const focus = params.get("focus");
  const fromFocus: Tab | null = focus === "pay" ? "me" : focus === "chat" ? "chat" : isHost && (focus === "requests" || focus === "booking" || focus === "invite") ? "manage" : null;
  const asked = params.get("tab") as Tab | null;
  const fallback: Tab = ended ? "me" : isHost ? "manage" : inChat ? "chat" : "me";
  const tab: Tab = asked && tabs.includes(asked) ? asked : (fromFocus ?? fallback);
  const setTab = (next: Tab) => {
    const q = new URLSearchParams(params.toString());
    q.set("tab", next);
    q.delete("focus");
    q.delete("arc");
    router.push(`${pathname}?${q}`, { scroll: false });
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
  const phaseText = phase.key === "starts" ? t("phase.starts", { days: phase.days }) : phase.key === "running" ? t("phase.running", { day: phase.day, total: phase.total }) : t("phase.ended");

  return (
    <>
      {share.sheet}
      {!isHost && canBring && <InviteSheet stay={stay} open={inviting} onClose={() => setInviting(false)} />}
      {/* The stage: the HeroBand pattern (CLAUDE.md "Vollbild-Band") – the photos left, the House on the light band right. */}
      <HeroBand media={<HeroPhotos photos={housePhotos(stay, host)} />} mediaFit="house" height="split:h-[clamp(320px,40vh,420px)]" aria-labelledby="house-area-title">
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
              <button type="button" onClick={share.open} aria-label={tShare("button")} className={iconButtonStyles("sm")}>
                <Share aria-hidden />
              </button>
              <Button variant="secondary" size="sm" href={isHost ? `/house/${stay.slug}?preview=guest` : `/house/${stay.slug}`}>
                {t("viewPage")}
              </Button>
              {isHost ? <CrewMenu stay={stay} afterLeaveHref="/your-houses" minimal extraItems={[{ label: t("tabs.manage"), onSelect: () => setTab("manage") }]} buttonClassName={iconButtonStyles("sm")} /> : <SafetyMenu target={{ kind: "stay", id: stay.id }} buttonClassName={iconButtonStyles("sm")} />}
            </div>
          </div>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <p className={cn("inline-flex items-center gap-2 text-h2", phase.key === "ended" ? "text-muted" : "text-ink")}>
              {phase.key === "running" && <span aria-hidden className="size-2.5 rounded-full bg-success" />}
              {phaseText}
            </p>
            <div className="flex flex-col items-end gap-2">
              <CrewRow stay={stay} crew={crew} size="md" max={7} />
              <CrewCount stay={stay} />
            </div>
          </div>
        </div>
      </HeroBand>

      <div className="page-container explore-width">
        {/* The tabs as capsules (product style); on phones the row scrolls sideways and sticks under the header. */}
        <div data-house-tabs className="sticky top-(--header-total) z-20 -mx-(--page-margin) bg-(--bg) px-(--page-margin) py-4">
          <CapsuleGroup
            label={t("tabsLabel")}
            value={tab}
            onChange={setTab}
            className="w-fit max-w-full"
            options={tabs.map((value) => ({ value, content: t(`tabs.${value}`) }))}
          />
        </div>
        <div className="pb-(--space-section) pt-4">
          {arcStep && (
            <div className="mb-8 max-w-[760px]">
              <ArcStepPanel key={arcStep} stay={stay} stepId={arcStep} />
            </div>
          )}
          {tab === "chat" && <ChatBody stay={stay} empty={isHost ? t("chat.emptyHost") : t("chat.emptyMember")} />}
          {tab === "crew" && <CrewTab stay={stay} crew={crew} inChat={inChat} />}
          {tab === "plan" && <PlanTab stay={stay} isHost={isHost} />}
          {tab === "moments" && <MomentsTab stay={stay} />}
          {tab === "me" && <MeTab stay={stay} isHost={isHost} ended={ended} over={phase.key === "ended"} onPay={() => setPaying(true)} chat={inChat ? `/messages/${crewThreadId(stay.id)}` : null} />}
          {tab === "manage" && isHost && <ManageTab stay={stay} />}
        </div>
      </div>
      <PaySheet stay={stay} open={paying} onClose={() => setPaying(false)} />
    </>
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
  if (ordered.length <= 1) return <EmptyState title={t("onlyHost")} />;
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
function PlanTab({ stay, isHost }: { stay: Stay; isHost: boolean }) {
  const t = useTranslations("house.area.plan");
  const tProgram = useTranslations("program");
  const tBefore = useTranslations("house.before");
  const tArrival = useTranslations("house.arrival");
  const tFirst = useTranslations("house.firstNight");
  const tAgreement = useTranslations("house.agreement");
  const tMiddle = useTranslations("house.middle");
  const tGoodbye = useTranslations("house.goodbye");
  const f = useFormat();
  const nights = Math.max(0, Math.round((dayOf(stay.endDate) - dayOf(stay.startDate)) / DAY_MS));
  const stops = typicalDayOf(stay);
  return (
    <div className="flex max-w-[760px] flex-col gap-10">
      {/* The Arc: where the House stands (Before · Arrival · Together · Goodbye · After) and the next step. */}
      <ArcBar stay={stay} />
      <ArcSlot slot="before" stay={stay} />
      <Part title={t("dates")}>
        <p className="text-body-lg text-ink">
          {f.stayDatesLong(stay)} · {t("nights", { count: nights })}
        </p>
      </Part>
      {/* A week before: how everyone gets there – nothing is booked. */}
      <Part id="plan-getting-there" title={t("gettingThere")}>
        <GettingThere stay={stay} />
      </Part>
      {/* Two days before: the exact address, check-in, House rules, what to bring (and the Pro host's programme). */}
      <Part id="plan-practical" title={tBefore("practical.title")}>
        <Practical stay={stay} isHost={isHost} />
      </Part>
      {/* A Pro host's programme: in full from two days before, a preview until then. */}
      {stay.hostFeePerPerson ? (
        <Part id="plan-program" title={tProgram("planTitle")}>
          <ProgramView stay={stay} isHost={isHost} />
        </Part>
      ) : null}
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
      <ArcSlot slot="arrive" stay={stay} />
      <Part id="plan-rhythm" title={t("rhythm")}>
        {/* What the crew agreed on (the moment of the day), then the House's usual day. */}
        <div className="mb-5">
          <AgreedMoments stay={stay} />
        </div>
        {stops.length === 0 ? (
          <p className="text-body text-muted">{t("rhythmEmpty")}</p>
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
      <ArcSlot slot="middle" stay={stay} />
      {/* The high point (second half): the Pro host's own – or the crew's vote on a proposal. */}
      <Part id="plan-peak" title={tMiddle("peakTitle")}>
        <PeakPanel stay={stay} isHost={isHost} />
      </Part>
      <Part title={t("votes")}>{stay.accommodationVote || stay.datesVote ? <CrewVotes stay={stay} /> : <p className="text-body text-muted">{t("votesEmpty")}</p>}</Part>
      {/* The last evening: the closing circle (three questions out loud) and, optional, a few words for the crew. */}
      <Part id="plan-closing" title={tGoodbye("closingTitle")}>
        <ClosingPanel stay={stay} isHost={isHost} />
      </Part>
      <ArcSlot slot="closing" stay={stay} />
      <ArcSlot slot="after" stay={stay} />
    </div>
  );
}

// ── Moments ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Photos from the time together: none stored yet – what you add stays on this device for now; under them the place's own photos. */
function MomentsTab({ stay }: { stay: Stay }) {
  const t = useTranslations("house.area.moments");
  const tGoodbye = useTranslations("house.goodbye");
  const store = useStore();
  const photos = housePhotos(stay, findUser(store, stay.hostId));
  return (
    <div className="flex flex-col gap-10">
      {/* The album: photos and clips from the crew – only the crew sees it (Album.tsx). */}
      <AlbumSection stay={stay} />
      {/* The first night's question cards – any evening. */}
      <QuestionCardsEntry />
      {/* The crew's words from the last evening – only the crew sees them. */}
      <Part id="moments-words" title={tGoodbye("wordsMoments")}>
        <CrewWordsList stay={stay} />
      </Part>
      {photos.length > 0 && (
        <Part title={t("place")}>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {photos.map((src) => (
              <li key={src} className="relative aspect-4/5 overflow-hidden rounded-2xl bg-ink/6">
                <Img src={src} alt="" fill sizes="(min-width: 744px) 25vw, 50vw" className="object-cover" />
              </li>
            ))}
          </ul>
        </Part>
      )}
    </div>
  );
}

// ── Me ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Your booking (dates, your share), where your payment stands, the receipt, cancelling with its rules, help, leaving – or what happened. */
function MeTab({ stay, isHost, ended, over, onPay, chat }: { stay: Stay; isHost: boolean; ended?: "removed" | "paymentLapsed" | "moderation"; /** The House is over: "Lived in" and the ways on instead of the step */ over: boolean; onPay: () => void; chat: string | null }) {
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
    return (
      <div className="flex max-w-[640px] flex-col gap-6">
        <div className="card-soft rounded-[20px] p-6">
          <h2 className="text-h3 text-ink">{ended === "paymentLapsed" ? t("lapsedTitle") : t("removedTitle")}</h2>
          <p className="mt-2 text-body text-muted">{ended === "removed" ? t("removedText", { host: hostName, title: stay.title }) : ended === "moderation" ? t("moderationText", { title: stay.title }) : t("lapsedText", { title: stay.title })}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button href={`/explore?category=${stay.vibe}`}>{t("similar")}</Button>
            {refunded && refundReason && <RefundNotice payment={refunded} currency={stay.currency} reason={refundReason} />}
          </div>
        </div>
        <ContextHelp houseId={stay.id} action={tHelp("houseHelp")} />
      </div>
    );
  }

  return (
    <div className="flex max-w-[760px] flex-col gap-10">
      {/* Where you stand right now – the same step card as before (waiting, pay, booked, arriving), with its one action. */}
      {over ? (
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
      )}
      {!over && (
        <Part id="me-intention" title={tBefore("intention.title")}>
          <IntentionForm stay={stay} />
        </Part>
      )}
      {/* Halftime – private (guests): from the middle of the House. */}
      {!isHost && halfDue && !afterDue && (
        <Part id="me-halftime" title={tMiddle("halftimeTitle")}>
          <HalftimeForm stay={stay} />
        </Part>
      )}
      {(arc?.mutual.length ?? 0) > 0 && arc!.now >= chosenAt(stay) && (
        <Part id="me-chosen" title={tGoodbye("chosenHeading")}>
          <ChosenPanel stay={stay} />
        </Part>
      )}
      {thirtyDue && (
        <Part id="me-thirty" title={tAfterwards("thirtyTitle")}>
          <ThirtyDaysForm stay={stay} />
        </Part>
      )}
      {againDue && (
        <Part id="me-again" title={tAfterwards("againTitle")}>
          <DoItAgainPanel stay={stay} />
        </Part>
      )}
      {/* From "Your album is ready" on, Me links to the album for good. */}
      {albumReady && (
        <Part id="me-album" title={tAlbum("readyTitle")}>
          <AlbumReady stay={stay} />
        </Part>
      )}
      {afterDue && (
        <Part id="me-after" title={tGoodbye("afterTitle")}>
          <AfterForm stay={stay} isHost={isHost} />
        </Part>
      )}
      <Part title={t("booking")}>
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
        </dl>
        {isHost && <p className="mt-3 text-small text-muted">{t("hostShare")}</p>}
      </Part>
      <Part title={t("share")} aside={owes ? <Button size="sm" onClick={onPay}>{t("pay")}</Button> : undefined}>
        {locked ? <MyShare stay={stay} variant="panel" /> : <p className="text-body text-muted">{t("shareOpen")}</p>}
        {payment?.status === "paid" && (
          <div className="mt-6">
            <Receipt stay={stay} payment={payment} />
          </div>
        )}
      </Part>
      {!isHost && !over && (
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
      <Part title={t("help")}>{helpAvailable(stay, now) ? <HelpButton stay={stay} /> : <ContextHelp houseId={stay.id} action={tHelp("houseHelp")} />}</Part>
      <ArcMute />

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
    </div>
  );
}

// ── Manage (host) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The host's management, as a tab (it was /h/[id]/manage): the current step with its one action, the requests (and the waitlist), the crew
 * with its "…", the payments, sharing, and the House's settings – taking requests, edit, cancel. ?focus= scrolls to its part.
 */
function ManageTab({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.view");
  const tMenu = useTranslations("houses.crewMenu");
  const tOverlap = useTranslations("overlap");
  const tDetail = useTranslations("houses.detail");
  const tArea = useTranslations("house.area");
  const tTasks = useTranslations("house.before.tasks");
  const tGoodbyeM = useTranslations("house.goodbye");
  const tProgram = useTranslations("program");
  const afterOpen = useArcNow(stay) >= afterAt(stay);
  const store = useStore();
  const showToast = useToast();
  const params = useSearchParams();
  const [locking, setLocking] = useState(false);
  const [closing, setClosing] = useState(false);
  const { requests, waitlistRequests } = openRequestsOf(store, stay);
  const chat = getCrewThread(store, stay.id) ? `/messages/${crewThreadId(stay.id)}` : null;
  const open = stay.status === "published" || stay.status === "booked";
  const full = stay.spotsFilled >= stay.spotsTotal;
  const draft = stay.status === "draft";
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const focus = params.get("focus");
  useEffect(() => {
    if (focus === "requests") scrollTo("manage-requests");
    else if (focus === "booking") scrollTo("manage-payments");
    else if (focus === "invite") scrollTo("manage-share");
  }, [focus]);

  return (
    <div className="flex max-w-[860px] flex-col gap-12">
      {hostOverlapOf(store, stay) && <p className="text-small text-muted">{tOverlap("hostTwo")}</p>}
      <HostProgress stay={stay} requests={requests} chat={chat} onSheet={(sheet) => scrollTo(sheet === "requests" ? "manage-requests" : "manage-payments")} onLock={() => setLocking(true)} />
      <Part id="manage-tasks" title={tTasks("title")}>
        <HostTasks stay={stay} />
      </Part>
      {/* A Pro host: the programme (day plan, templates, own arc moments) and the crew's progress – halftime as the anonymous average, never
          anyone's own number (from 3 answers). */}
      {stay.hostFeePerPerson ? (
        <>
          <Part id="manage-program" title={tProgram("title")}>
            <ProgramEditor stay={stay} />
          </Part>
          <Part id="manage-halftime" title={tProgram("crewProgress")}>
            <HalftimeAverage stay={stay} />
          </Part>
        </>
      ) : null}
      {/* After the House: the crew's rating (averages, without names) and their sentences for the host. */}
      {afterOpen && (
        <Part id="manage-after" title={tGoodbyeM("hostTitle")}>
          <HostAfterSummary stay={stay} />
        </Part>
      )}
      {afterOpen && stay.hostFeePerPerson ? (
        <Part id="manage-program-feedback" title={tProgram("feedbackTitle")}>
          <ProgramFeedbackSummary stay={stay} />
        </Part>
      ) : null}
      <Part id="manage-requests" title={t("requests")}>
        <RequestsTab stay={stay} requests={requests} waitlistRequests={waitlistRequests} />
      </Part>
      <Part id="manage-crew" title={t("crew")}>
        <CrewRows stay={stay} manage />
        <WaitlistRows stay={stay} />
      </Part>
      <Part id="manage-payments" title={t("payments")}>
        <PaymentsSection stay={stay} onLock={open && full ? () => setLocking(true) : undefined} />
      </Part>
      {!draft && (
        <Part id="manage-share" title={t("share")}>
          {open && <HostInvitesSection stay={stay} />}
          {/* The host kit: story, bio link, community post – filled in, Copy and Download (?src=hostkit). */}
          <HostKit stays={[stay]} />
        </Part>
      )}
      <Part title={tArea("settings")}>
        <div className="flex flex-wrap gap-2">
          {open && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                store.setAcceptingRequests(stay.id, !stay.acceptingRequests);
                showToast(stay.acceptingRequests ? tMenu("stopRequests") : tMenu("takeRequests"));
              }}
            >
              {stay.acceptingRequests ? tMenu("stopRequests") : tMenu("takeRequests")}
            </Button>
          )}
          <Button variant="secondary" size="sm" href={`/your-houses/${stay.id}/edit`}>
            {tMenu("edit")}
          </Button>
          {stay.status !== "closed" && (
            <Button variant="danger" size="sm" onClick={() => setClosing(true)}>
              {tMenu("close")}
            </Button>
          )}
        </div>
      </Part>
      {locking && <LockSheet stay={stay} onClose={() => setLocking(false)} />}
      <CloseStayConfirm
        open={closing}
        onClose={() => setClosing(false)}
        onConfirm={() => {
          setClosing(false);
          store.closeStay(stay.id);
          showToast(tDetail("closedToast"));
        }}
      />
    </div>
  );
}
