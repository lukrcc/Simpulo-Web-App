"use client";

import { CalendarCheck, Check, ChevronDown, Clock, CreditCard, Home, Inbox, Landmark, Mail, PenLine, Plus, Sparkles, Vote, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { clearDraft, readDraft } from "@/components/create/model";
import { Container } from "@/components/layout/Container";
import { PayoutSetupSheet } from "@/components/payouts/PayoutSetup";
import { buttonStyles } from "@/components/ui/ActionButton";
import { AvatarStack } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Img } from "@/components/ui/Img";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { useToast } from "@/components/ui/Toast";
import { vibeIcons } from "@/components/ui/VibeBadge";
import { HOUSE_GRID } from "@/config/explore";
import { useFormat } from "@/i18n/format";
import { earningsFor } from "@/lib/earnings";
import { guestTasks, hostTasks, manageHref, type HouseTask, type HouseTaskKind } from "@/lib/houseTasks";
import { usePayoutAccount } from "@/lib/payments/hooks";
import { getCrew, getMyPayment, isCrewMember, useStore } from "@/lib/store";
import type { JoinRequest, Stay } from "@/lib/types";
import { cn, housePhotos } from "@/lib/utils";
import { waitlistPosition } from "@/lib/waitlist";
import { answersSlowly, didntWorkOut, responseRate, similarHouses } from "@/lib/requests";

/**
 * /your-houses – the overview, as calm as Explore: "Needs you" and Earnings as two cards on top, then Hosting · N and Joined · N in Explore's
 * grid, "Past" folded at the end. Earnings has its own page (/your-houses/earnings). The page scrolls; no footer.
 */
export function YourHouses() {
  const t = useTranslations("houses");
  return (
    <RequireLogin title={t("loginTitle")} description={t("loginDescription")}>
      <YourHousesContent />
    </RequireLogin>
  );
}

const SECTION_TITLE = "text-eyebrow uppercase text-ink/55";
const HOUR_MS = 3_600_000;

function YourHousesContent() {
  const t = useTranslations("houses.home");
  const store = useStore();
  const [now] = useState(() => new Date().toISOString());
  const today = now.slice(0, 10);
  const me = store.currentUserId;
  const earnings = earningsFor(store, me, today);

  const over = (s: Stay) => s.status === "completed" || s.endDate < today;
  // Cancelled Houses stay listed, as "Cancelled", until their dates are over.
  const hosting = store.stays.filter((s) => s.hostId === me && (s.status === "published" || s.status === "booked" || s.status === "closed") && !over(s)).toSorted((a, b) => a.startDate.localeCompare(b.startDate));
  const active = hosting.filter((s) => s.status !== "closed");
  const drafts = store.stays.filter((s) => s.hostId === me && s.status === "draft");
  // The Open a House flow's own draft (this browser), shown with the draft Houses.
  const [localDraft, setLocalDraft] = useState<ReturnType<typeof readDraft>>(() => (typeof window === "undefined" ? null : readDraft()));
  const ownLocalDraft = localDraft && (!localDraft.ownerId || localDraft.ownerId === me) ? localDraft : null;
  const joined = store.joinRequests
    .filter((r) => r.userId === me && ["accepted", "pending", "invited", "waitlist_requested", "waitlisted"].includes(r.status))
    .flatMap((r) => {
      const stay = store.stays.find((s) => s.id === r.stayId);
      return stay && !over(stay) ? [{ request: r, stay }] : [];
    })
    .toSorted((a, b) => a.stay.startDate.localeCompare(b.stay.startDate));
  const past = store.stays.filter((s) => over(s) && (s.hostId === me || isCrewMember(store, s, me))).toSorted((a, b) => b.endDate.localeCompare(a.endDate));

  // Host and guest tasks together, the most urgent first; payouts while an open House can't receive money yet.
  const payout = usePayoutAccount();
  const needsPayouts = active.length > 0 && payout.status !== null && payout.status !== "active";
  const slowReplies = Boolean(me) && active.length > 0 && answersSlowly(responseRate(store, me ?? "", Date.parse(now)));
  // Declined or expired – for the guest the same: it didn't work out. They move to Past, each with similar Houses.
  const didntWork = store.joinRequests
    .filter((r) => r.userId === me && didntWorkOut(r))
    .flatMap((r) => {
      const stay = store.stays.find((s) => s.id === r.stayId);
      return stay && !over(stay) && !joined.some((j) => j.stay.id === stay.id) ? [{ request: r, stay }] : [];
    })
    .toSorted((a, b) => b.request.createdAt.localeCompare(a.request.createdAt));
  const tasks = [...active, ...drafts].flatMap((s) => hostTasks(store, s)).concat(joined.flatMap(({ stay }) => guestTasks(store, stay, now)));
  const hasHosted = hosting.length > 0 || drafts.length > 0 || Boolean(ownLocalDraft) || earnings.any || past.some((s) => s.hostId === me);

  return (
    <Container className="pb-(--space-section) pt-8 md:pt-10">
      <div className="flex flex-col gap-12">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <NeedsYouCard tasks={tasks} needsPayouts={needsPayouts} slowReplies={slowReplies} now={now} />
          <EarningsCard thisYear={earnings.thisYear} currency={earnings.currency} housesHosted={new Set([...earnings.rows.map((r) => r.id), ...hosting.map((s) => s.id), ...past.filter((s) => s.hostId === me).map((s) => s.id)]).size} hasHosted={hasHosted} />
        </div>

        {(hosting.length > 0 || drafts.length > 0 || ownLocalDraft) && (
          <section aria-labelledby="hosting">
            {(drafts.length > 0 || ownLocalDraft) && (
              <div className="mb-12">
                <h2 className={SECTION_TITLE}>{t("draftsCount", { count: drafts.length + (ownLocalDraft ? 1 : 0) })}</h2>
                <ul className="mt-4 flex flex-wrap gap-3">
                  {ownLocalDraft && (
                    <li>
                      <DraftChip
                        title={ownLocalDraft.form.title || t("localDraft")}
                        cover={ownLocalDraft.form.photos[0]}
                        vibe={ownLocalDraft.form.vibe || "social"}
                        href="/create"
                        onDelete={() => {
                          clearDraft();
                          setLocalDraft(null);
                        }}
                      />
                    </li>
                  )}
                  {drafts.map((stay) => (
                    <li key={stay.id}>
                      <DraftChip title={stay.title} cover={housePhotos(stay)[0]} vibe={stay.vibe} href={`/your-houses/${stay.id}/edit`} onDelete={() => store.deleteDraft(stay.id)} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <h2 id="hosting" className={SECTION_TITLE}>
              {t("hostingCount", { count: hosting.length })}
            </h2>
            <ul className={cn(HOUSE_GRID, "mt-4")}>
              {hosting.map((stay) => (
                <li key={stay.id}>
                  <HouseTile stay={stay} status={<HostStatus stay={stay} />} />
                </li>
              ))}
              <li>
                <OpenHouseTile />
              </li>
            </ul>
          </section>
        )}

        {joined.length > 0 && (
          <section aria-labelledby="joined">
            <h2 id="joined" className={SECTION_TITLE}>
              {t("joinedCount", { count: joined.length })}
            </h2>
            <ul className={cn(HOUSE_GRID, "mt-4")}>
              {joined.map(({ request, stay }) => (
                <li key={stay.id}>
                  <HouseTile stay={stay} status={<GuestStatus stay={stay} request={request} />} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {hosting.length === 0 && drafts.length === 0 && !ownLocalDraft && joined.length === 0 && didntWork.length === 0 && past.length === 0 && (
          <div className="flex flex-col items-start gap-4">
            <p className="text-h2 text-ink">{t("emptyTitle")}</p>
            <p className="max-w-[640px] text-body-lg text-muted">{t("emptyText")}</p>
            <Link href="/" className={buttonStyles("secondary", "md")}>
              {t("emptyExplore")}
            </Link>
          </div>
        )}

        {(past.length > 0 || didntWork.length > 0) && <PastSection houses={past} didntWork={didntWork} />}
      </div>
    </Container>
  );
}

// ─── Needs you ─────────────────────────────────────────────────────────────────

type NeedsKind = HouseTaskKind | "payouts" | "responseRate";

const TASK_ICON: Record<NeedsKind, LucideIcon> = {
  payouts: Landmark,
  responseRate: Clock,
  finish: PenLine,
  requests: Inbox,
  choosePlace: Home,
  voting: Vote,
  paymentsOpen: Wallet,
  book: CalendarCheck,
  invite: Mail,
  pay: CreditCard,
  offer: Sparkles,
};
/** What expires first comes first (a payment, an offer, a request); without a deadline: money, then what blocks the House, then the rest. */
const URGENCY: NeedsKind[] = ["pay", "offer", "book", "paymentsOpen", "payouts", "requests", "invite", "choosePlace", "voting", "finish", "responseRate"];

/**
 * Everything that waits for you, host and guest, in one card: a row each – icon, title, a line under it, a small button inside the card – the
 * most urgent first. Nothing: one row "All caught up", and the card stays small.
 */
function NeedsYouCard({ tasks, needsPayouts, slowReplies, now }: { tasks: HouseTask[]; needsPayouts: boolean; /** Under 70 % of requests answered (last 90 days): a soft reminder, internal only */ slowReplies: boolean; now: string }) {
  const t = useTranslations("houses.home");
  const tTask = useTranslations("houses.home.needs");
  const f = useFormat();
  const [payoutSheet, setPayoutSheet] = useState(false);
  const hoursLeft = (date?: string) => Math.max(1, Math.round(((date ? Date.parse(date) : 0) - Date.parse(now)) / HOUR_MS));
  const rows: Array<{ id: string; kind: NeedsKind; title: string; sub: string; action?: string; href?: string; deadline: number }> = [
    ...(needsPayouts ? [{ id: "payouts", kind: "payouts" as const, title: tTask("payouts.title"), sub: tTask("payouts.sub"), action: tTask("payouts.action"), deadline: Infinity }] : []),
    ...(slowReplies ? [{ id: "responseRate", kind: "responseRate" as const, title: tTask("responseRate.title"), sub: tTask("responseRate.sub"), deadline: Infinity }] : []),
    ...tasks.map((task) => ({
      id: task.id,
      kind: task.kind,
      title: tTask(`${task.kind}.title`, { count: task.count ?? 0, house: task.stay.title }),
      sub: tTask(`${task.kind}.sub`, { house: task.stay.title, date: task.date ? f.day(task.date) : "", hours: task.date ? hoursLeft(task.date) : 0 }),
      action: tTask(`${task.kind}.action`),
      href: task.href,
      deadline: task.date ? Date.parse(task.date) : Infinity,
    })),
  ].toSorted((a, b) => (a.deadline === b.deadline ? 0 : a.deadline - b.deadline) || URGENCY.indexOf(a.kind) - URGENCY.indexOf(b.kind));

  return (
    <section aria-labelledby="needs-you" className="card-soft overflow-hidden rounded-3xl">
      <h2 id="needs-you" className={cn(SECTION_TITLE, "px-6 pt-5")}>
        {t("needsYou")}
      </h2>
      <ul className="mt-2 divide-y divide-ink/8">
        {rows.length === 0 ? (
          <li className="flex items-center gap-4 px-6 py-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink/6 text-ink">
              <Check className="size-4" aria-hidden />
            </span>
            <span className="text-body font-semibold text-ink">{t("allCaughtUp")}</span>
          </li>
        ) : (
          rows.map((row) => {
            const Icon = TASK_ICON[row.kind];
            return (
              <li key={row.id} className="flex items-center gap-4 px-6 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink/6 text-ink">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-ink">{row.title}</span>
                  <span className="block truncate text-small text-muted">{row.sub}</span>
                </span>
                {!row.action ? null : row.href ? (
                  <Link href={row.href} className={buttonStyles("secondary", "sm", "shrink-0")}>
                    {row.action}
                  </Link>
                ) : (
                  <button type="button" onClick={() => setPayoutSheet(true)} className={buttonStyles("secondary", "sm", "shrink-0")}>
                    {row.action}
                  </button>
                )}
              </li>
            );
          })
        )}
      </ul>
      <div className="h-2" />
      <PayoutSetupSheet open={payoutSheet} onClose={() => setPayoutSheet(false)} />
    </section>
  );
}

/** "Earnings · €6,628 · this year · 4 Houses hosted · View earnings →"; never hosted: an invitation to host instead. */
function EarningsCard({ thisYear, currency, housesHosted, hasHosted }: { thisYear: number; currency: string; housesHosted: number; hasHosted: boolean }) {
  const t = useTranslations("houses.home.earningsCard");
  const f = useFormat();
  if (!hasHosted) {
    return (
      <section className="card-soft flex flex-col items-start gap-2 rounded-3xl p-6">
        <p className="text-h3 text-ink">{t("hostTitle")}</p>
        <p className="text-body text-muted">{t("hostText")}</p>
        <Link href="/create" className={buttonStyles("primary", "sm", "mt-3")}>
          {t("hostAction")}
        </Link>
      </section>
    );
  }
  return (
    <section aria-labelledby="earnings-card" className="card-soft flex flex-col items-start rounded-3xl p-6">
      <h2 id="earnings-card" className={SECTION_TITLE}>
        {t("eyebrow")}
      </h2>
      <p className="mt-3 text-h1 tabular-nums text-ink">{f.price(thisYear, currency)}</p>
      <p className="mt-1 text-small text-muted">{t("sub", { count: housesHosted })}</p>
      <Link href="/your-houses/earnings" className="mt-5 text-body font-semibold text-ink underline-offset-4 hover:underline">
        {t("link")}
      </Link>
    </section>
  );
}

// ─── Cards ─────────────────────────────────────────────────────────────────────

/** A House as a compact card: cover 16:10, title, dates · place, the crew and "2 of 6", the status chip. */
/** `href`: where the card goes – the manage page by default, the House page for Houses you aren't part of. */
function HouseTile({ stay, status, href }: { stay: Stay; status: ReactNode; href?: string }) {
  const t = useTranslations("houses.home");
  const f = useFormat();
  const store = useStore();
  const cover = housePhotos(stay)[0];
  const VibeIcon = vibeIcons[stay.vibe];
  return (
    <Link href={href ?? manageHref(stay)} className="card-soft group flex h-full flex-col overflow-hidden rounded-3xl transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1">
      <span className="relative block aspect-16/10 overflow-hidden bg-linear-to-br from-(--card-blank-from) to-(--card-blank-to)">
        {cover ? (
          <Img src={cover} alt="" fill sizes="(min-width: 1100px) 360px, 50vw" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-ink/55">
            <VibeIcon className="size-8" aria-hidden />
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-2 p-5">
        <span className="line-clamp-2 text-h3 text-ink">{stay.title}</span>
        <span className="truncate text-small text-muted">
          {f.stayDatesLong(stay)} · {f.placeName(stay)}
        </span>
        <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
          <AvatarStack users={getCrew(store, stay)} size="xs" max={5} />
          <span className="text-small text-muted">{t("crewOf", { filled: stay.spotsFilled, total: stay.spotsTotal })}</span>
          <span className="ml-auto">{status}</span>
        </span>
      </span>
    </Link>
  );
}

/** The status chip; `attention` adds the orange dot (something to do). */
function StatusChip({ children, attention = false }: { children: ReactNode; attention?: boolean }) {
  return (
    <Badge className="bg-ink/6">
      {attention && <span aria-hidden className="size-1.5 rounded-full bg-accent" />}
      {children}
    </Badge>
  );
}

/** Hosting: "2 requests" (dot) · "Full" · "Taking requests" · "Not taking requests" · "Cancelled". */
function HostStatus({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.home.host");
  const store = useStore();
  const asked = store.joinRequests.filter((r) => r.stayId === stay.id && (r.status === "pending" || r.status === "waitlist_requested")).length;
  if (stay.status === "closed") return <StatusChip>{t("cancelled")}</StatusChip>;
  if (asked > 0) return <StatusChip attention>{t("requests", { count: asked })}</StatusChip>;
  if (stay.spotsFilled >= stay.spotsTotal) return <StatusChip>{t("full")}</StatusChip>;
  return <StatusChip>{stay.acceptingRequests ? t("taking") : t("notTaking")}</StatusChip>;
}

/** Joined, what to do: "Pay by Nov 7" (dot) · "Paid" · "Booked" · "Requested" · "Invited" · "Waitlist #2" · "Accepted" · "Cancelled". */
function GuestStatus({ stay, request }: { stay: Stay; request: JoinRequest }) {
  const t = useTranslations("houses.home.guest");
  const f = useFormat();
  const store = useStore();
  const payment = getMyPayment(store, stay.id);
  if (stay.status === "closed") return <StatusChip>{t("cancelled")}</StatusChip>;
  if (request.status === "pending") return <StatusChip>{t("requested")}</StatusChip>;
  if (request.status === "invited") return <StatusChip attention>{t("invited")}</StatusChip>;
  if (request.status === "waitlist_requested") return <StatusChip>{t("waitlistRequested")}</StatusChip>;
  if (request.status === "waitlisted") return <StatusChip>{t("waitlisted", { position: waitlistPosition(store, stay.id, request.userId) ?? 1 })}</StatusChip>;
  if (payment?.status === "pending" && stay.paymentDueAt) return <StatusChip attention>{t("payBy", { date: f.day(stay.paymentDueAt) })}</StatusChip>;
  if (stay.bookingConfirmedAt) return <StatusChip>{t("booked")}</StatusChip>;
  if (payment?.status === "paid") return <StatusChip>{t("paid")}</StatusChip>;
  return <StatusChip>{t("accepted")}</StatusChip>;
}

/** The last tile of Hosting: as high as the cards, a dashed edge, centred – a plus in a circle, "Open a House", what it means. */
function OpenHouseTile() {
  const t = useTranslations("houses.home");
  return (
    <Link
      href="/create"
      className="flex h-full min-h-72 flex-col items-center justify-center gap-3 rounded-3xl border-[1.5px] border-dashed border-ink/15 p-6 text-center transition-colors duration-150 hover:border-ink/30 hover:bg-ink/3"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-ink/6 text-ink">
        <Plus className="size-5" aria-hidden />
      </span>
      <span className="text-body font-semibold text-ink">{t("openHouse")}</span>
      <span className="text-small text-muted">{t("openHouseText")}</span>
    </Link>
  );
}

/** A draft, small: its cover or category icon, the title, "Continue"; "…" › "Delete draft" with a confirmation. */
function DraftChip({ title, cover, vibe, href, onDelete }: { title: string; cover?: string; vibe: Stay["vibe"]; href: string; onDelete: () => void }) {
  const t = useTranslations("houses.home");
  const showToast = useToast();
  const [confirming, setConfirming] = useState(false);
  const VibeIcon = vibeIcons[vibe];
  return (
    <div className="card-soft flex items-center gap-1 rounded-2xl py-2 pl-2 pr-1">
      <Link href={href} className="flex min-w-0 items-center gap-3 rounded-xl pr-2 transition-opacity duration-150 hover:opacity-80">
        <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-(--card-blank-from) to-(--card-blank-to) text-ink/55">
          {cover ? <Img src={cover} alt="" fill sizes="40px" className="object-cover" /> : <VibeIcon className="size-4.5" aria-hidden />}
        </span>
        <span className="min-w-0">
          <span className="block max-w-56 truncate text-body font-semibold text-ink">{title || t("untitled")}</span>
          <span className="block text-small text-muted">{t("continue")}</span>
        </span>
      </Link>
      <MoreMenu label={t("draftOptions")} items={[{ label: t("deleteDraft"), danger: true, onSelect: () => setConfirming(true) }]} />
      <ConfirmSheet
        open={confirming}
        title={t("deleteDraftTitle")}
        description={t("deleteDraftText")}
        confirmLabel={t("deleteDraftConfirm")}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onDelete();
          showToast(t("draftDeleted"));
        }}
      />
    </div>
  );
}

/**
 * Houses that are over, and requests that didn't work out (declined or expired – the same words for both). Folded at first – unless something
 * didn't work out: then it's open, and each of those shows its card, "This one didn't work out – here are similar Houses" and up to 3 of them.
 */
function PastSection({ houses, didntWork }: { houses: Stay[]; didntWork: Array<{ request: JoinRequest; stay: Stay }> }) {
  const t = useTranslations("houses.home");
  const [open, setOpen] = useState(didntWork.length > 0);
  return (
    <section aria-labelledby="past">
      <button type="button" id="past" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={cn(SECTION_TITLE, "-ml-2 flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-(--chip-bg)")}>
        {t("past", { count: houses.length + didntWork.length })}
        <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="mt-4 flex flex-col gap-12">
          {didntWork.map(({ request, stay }) => (
            <DidntWorkOut key={request.id} stay={stay} />
          ))}
          {houses.length > 0 && (
            <ul className={HOUSE_GRID}>
              {houses.map((stay) => (
                <li key={stay.id}>
                  <HouseTile stay={stay} status={<StatusChip>{t("pastBadge")}</StatusChip>} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

/** One request that didn't work out: its card (to the House page), then the line and a small shelf of similar open Houses. */
function DidntWorkOut({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.home");
  const store = useStore();
  const asked = new Set(store.joinRequests.filter((r) => r.userId === store.currentUserId).map((r) => r.stayId));
  const similar = similarHouses(store.stays, stay, store.currentUserId, asked);
  return (
    <div className={HOUSE_GRID}>
      <HouseTile stay={stay} href={`/house/${stay.slug}`} status={<StatusChip>{t("guest.didntWorkOut")}</StatusChip>} />
      {similar.length > 0 && (
        <>
          <p className="order-first col-span-full text-body text-muted">{t("didntWorkOutLine")}</p>
          {similar.map((s) => (
            <HouseTile key={s.id} stay={s} href={`/house/${s.slug}`} status={null} />
          ))}
        </>
      )}
    </div>
  );
}
