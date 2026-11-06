"use client";

import { Landmark, CalendarCheck, ChevronDown, ChevronRight, CreditCard, Inbox, Mail, PenLine, Plus, Sparkles, Vote, Wallet, Home, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { Container } from "@/components/layout/Container";
import { StatusLine } from "@/components/stay/HouseDetail";
import { buttonStyles } from "@/components/ui/ActionButton";
import { AvatarStack } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { ChipIndicator } from "@/components/ui/ChipIndicator";
import { Img } from "@/components/ui/Img";
import { vibeIcons } from "@/components/ui/VibeBadge";
import { EarningsView } from "@/components/views/Earnings";
import { PayoutSetupSheet } from "@/components/payouts/PayoutSetup";
import { usePayoutAccount } from "@/lib/payments/hooks";
import { useFormat } from "@/i18n/format";
import { earningsFor } from "@/lib/earnings";
import { guestTasks, hostTasks, manageHref, type HouseTask, type HouseTaskKind } from "@/lib/houseTasks";
import { getCrew, getMyPayment, isCrewMember, useStore } from "@/lib/store";
import type { JoinRequest, Stay } from "@/lib/types";
import { cn, housePhotos } from "@/lib/utils";
import { waitlistPosition } from "@/lib/waitlist";
import { clearDraft, readDraft } from "@/components/create/model";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { useToast } from "@/components/ui/Toast";

type HousesTab = "houses" | "earnings";

/** /your-houses – Your houses at a glance: the numbers, what needs you, your Houses as cards. ?tab=earnings: the money. The page scrolls; no footer. */
export function YourHouses() {
  const t = useTranslations("houses");
  return (
    <RequireLogin title={t("loginTitle")} description={t("loginDescription")}>
      <YourHousesContent />
    </RequireLogin>
  );
}

const SECTION_TITLE = "text-eyebrow uppercase text-ink/55";
const CARD_GRID = "grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]";

function YourHousesContent() {
  const t = useTranslations("houses.home");
  const store = useStore();
  const [now] = useState(() => new Date().toISOString());
  const today = now.slice(0, 10);
  const me = store.currentUserId;
  const earnings = earningsFor(store, me, today);
  const param = useSearchParams().get("tab");
  const tab: HousesTab = param === "earnings" && earnings.any ? "earnings" : "houses";
  const select = (next: HousesTab) => {
    const url = new URL(window.location.href);
    if (next === "houses") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.pathname + url.search);
    window.scrollTo({ top: 0 });
  };

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
  // Hosting an open House and payouts aren't ready yet: setting them up is a task until the account is active.
  const payout = usePayoutAccount();
  const needsPayouts = hosting.some((s) => s.status !== "closed") && payout.status !== null && payout.status !== "active";
  const tasks = [...active, ...drafts].flatMap((s) => hostTasks(store, s)).concat(joined.flatMap(({ stay }) => guestTasks(store, stay, now)));
  const isHost = hosting.length > 0 || drafts.length > 0 || Boolean(ownLocalDraft) || earnings.any;
  const requestsWaiting = active.reduce((sum, s) => sum + store.joinRequests.filter((r) => r.stayId === s.id && (r.status === "pending" || r.status === "waitlist_requested")).length, 0);

  return (
    <Container className="pb-(--space-section) pt-6 md:pt-8">
      {earnings.any && (
        <div role="tablist" aria-label={t("tabsLabel")} className="relative -ml-3 mb-8 flex items-center gap-1">
          <ChipIndicator />
          {(["houses", "earnings"] as const).map((value) => (
            <Chip key={value} variant="text" role="tab" aria-selected={tab === value} active={tab === value} hoverSurface={false} onClick={() => select(value)}>
              {t(`tabs.${value}`)}
            </Chip>
          ))}
        </div>
      )}

      {tab === "earnings" ? (
        <EarningsView earnings={earnings} />
      ) : (
        <div className="flex flex-col gap-(--space-section)">
          {isHost && <StatStrip earnings={earnings} requests={requestsWaiting} active={active.length} onEarnings={earnings.any ? () => select("earnings") : undefined} />}

          <section aria-labelledby="needs-you">
            <h2 id="needs-you" className={SECTION_TITLE}>
              {t("needsYou")}
            </h2>
            {needsPayouts && <PayoutTask />}
            {tasks.length === 0 && !needsPayouts ? <p className="mt-3 text-body-lg text-muted">{t("allSet")}</p> : <TaskList tasks={tasks} />}
          </section>

          {(hosting.length > 0 || drafts.length > 0 || ownLocalDraft) && (
            <section aria-labelledby="hosting">
              {(drafts.length > 0 || ownLocalDraft) && (
                <div className="mb-8">
                  <h2 className={SECTION_TITLE}>{t("drafts")}</h2>
                  <ul className="mt-3 flex flex-wrap gap-3">
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
                {t("hosting")}
              </h2>
              <ul className={cn(CARD_GRID, "mt-4")}>
                {hosting.map((stay) => (
                  <li key={stay.id}>
                    <HouseTile stay={stay} status={<StatusLine stay={stay} className="bg-ink/6" />} attention={tasks.some((task) => task.stay.id === stay.id)} />
                  </li>
                ))}
                <li>
                  <Link href="/create" className="flex h-full min-h-56 flex-col items-center justify-center gap-2 rounded-3xl bg-ink/4 text-body font-semibold text-ink transition-colors duration-150 hover:bg-ink/7">
                    <Plus className="size-5" aria-hidden />
                    {t("openHouse")}
                  </Link>
                </li>
              </ul>
            </section>
          )}

          {joined.length > 0 && (
            <section aria-labelledby="joined">
              <h2 id="joined" className={SECTION_TITLE}>
                {t("joined")}
              </h2>
              <ul className={cn(CARD_GRID, "mt-4")}>
                {joined.map(({ request, stay }) => (
                  <li key={stay.id}>
                    <HouseTile stay={stay} status={<GuestStatus stay={stay} request={request} />} attention={tasks.some((task) => task.stay.id === stay.id)} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!isHost && joined.length === 0 && (
            <div className="flex flex-col items-start gap-4">
              <p className="text-h2 text-ink">{t("emptyTitle")}</p>
              <p className="max-w-[640px] text-body-lg text-muted">{t("emptyText")}</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/" className={buttonStyles("primary", "md")}>
                  {t("emptyExplore")}
                </Link>
                <Link href="/create" className={buttonStyles("secondary", "md")}>
                  {t("openHouse")}
                </Link>
              </div>
            </div>
          )}

          {past.length > 0 && <PastSection houses={past} />}
        </div>
      )}
    </Container>
  );
}

/** Four numbers on soft cards; the money ones lead to Earnings. */
function StatStrip({ earnings, requests, active, onEarnings }: { earnings: ReturnType<typeof earningsFor>; requests: number; active: number; onEarnings?: () => void }) {
  const t = useTranslations("houses.home.stats");
  const f = useFormat();
  const tile = "card-soft flex min-w-0 flex-col items-start gap-1 rounded-3xl p-5 text-left";
  const value = "text-h2 tabular-nums text-ink";
  const label = "text-small text-muted";
  const money = (amount: number) => f.price(amount, earnings.currency);
  const clickable = (children: ReactNode) =>
    onEarnings ? (
      <button type="button" onClick={onEarnings} className={cn(tile, "transition-transform duration-150 hover:-translate-y-0.5")}>
        {children}
      </button>
    ) : (
      <div className={tile}>{children}</div>
    );
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {clickable(
        <>
          <span className={label}>{t("earnedYear")}</span>
          <span className={value}>{money(earnings.thisYear)}</span>
        </>,
      )}
      {clickable(
        <>
          <span className={label}>{t("nextPayout")}</span>
          <span className={value}>{earnings.next ? money(earnings.next.amount) : "–"}</span>
          {earnings.next && <span className={label}>{f.day(earnings.next.date)}</span>}
        </>,
      )}
      <div className={tile}>
        <span className={label}>{t("requests")}</span>
        <span className={value}>{requests}</span>
      </div>
      <div className={tile}>
        <span className={label}>{t("active")}</span>
        <span className={value}>{active}</span>
      </div>
    </div>
  );
}

const TASK_ICON: Record<HouseTaskKind, LucideIcon> = {
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
/** Tasks with their own action word get a small secondary capsule; the rest a chevron. */
const TASK_ACTION: Partial<Record<HouseTaskKind, "finish" | "review" | "choose" | "markBooked" | "answer" | "pay" | "takeSpot">> = { finish: "finish", requests: "review", choosePlace: "choose", book: "markBooked", invite: "answer", pay: "pay", offer: "takeSpot" };

/** Everything that waits for you, over all Houses: icon, the sentence, the House small; the whole row leads there. */
function TaskList({ tasks }: { tasks: HouseTask[] }) {
  const t = useTranslations("houses.home.tasks");
  const f = useFormat();
  return (
    <ul className="-mx-3 mt-3 flex flex-col">
      {tasks.map((task) => {
        const Icon = TASK_ICON[task.kind];
        const action = TASK_ACTION[task.kind];
        return (
          <li key={task.id}>
            <Link href={task.href} className="flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors duration-150 hover:bg-(--chip-bg)">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink/6 text-ink">
                <Icon className="size-4.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold text-ink">{t(task.kind, { count: task.count ?? 0, date: task.date ? f.day(task.date) : "" })}</span>
                <span className="block truncate text-small text-muted">{task.stay.title}</span>
              </span>
              {action ? <span className={buttonStyles("secondary", "sm", "pointer-events-none shrink-0")}>{t(`actions.${action}`)}</span> : <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** "Set up payouts" as the first task: opens the short explanation, then Stripe's onboarding. */
function PayoutTask() {
  const t = useTranslations("payouts");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="-mx-3 mt-3 flex w-[calc(100%+24px)] items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors duration-150 hover:bg-(--chip-bg)">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink/6 text-ink">
          <Landmark className="size-4.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-body font-semibold text-ink">{t("task")}</span>
        <span className={buttonStyles("secondary", "sm", "pointer-events-none shrink-0")}>{t("taskAction")}</span>
      </button>
      <PayoutSetupSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** A House as a compact card: cover 16:10, title, dates · place, the crew and "2 of 6", its status; a dot when something waits. */
function HouseTile({ stay, status, attention }: { stay: Stay; status: ReactNode; attention: boolean }) {
  const t = useTranslations("houses.home");
  const f = useFormat();
  const store = useStore();
  const cover = housePhotos(stay)[0];
  const VibeIcon = vibeIcons[stay.vibe];
  return (
    <Link href={manageHref(stay)} className="card-soft group flex h-full flex-col overflow-hidden rounded-3xl transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1">
      <span className="relative block aspect-16/10 overflow-hidden bg-linear-to-br from-(--card-blank-from) to-(--card-blank-to)">
        {cover ? (
          <Img src={cover} alt="" fill sizes="(min-width: 1100px) 360px, 50vw" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-ink/55">
            <VibeIcon className="size-8" aria-hidden />
          </span>
        )}
        {attention && (
          <span className="absolute right-4 top-4 size-2.5 rounded-full bg-accent ring-2 ring-white">
            <span className="sr-only">{t("needsYouDot")}</span>
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

/** A guest's own status on the card: Requested / Invited / Waitlist / Accepted / Pay by … / Paid / Booked. */
function GuestStatus({ stay, request }: { stay: Stay; request: JoinRequest }) {
  const t = useTranslations("houses.home.guest");
  const f = useFormat();
  const store = useStore();
  const payment = getMyPayment(store, stay.id);
  const label =
    stay.status === "closed"
      ? t("cancelled")
      : request.status === "pending"
      ? t("requested")
      : request.status === "invited"
        ? t("invited")
        : request.status === "waitlist_requested"
          ? t("waitlistRequested")
          : request.status === "waitlisted"
            ? t("waitlisted", { position: waitlistPosition(store, stay.id, request.userId) ?? 1 })
            : stay.bookingConfirmedAt
              ? t("booked")
              : payment?.status === "paid"
                ? t("paid")
                : payment?.status === "pending" && stay.paymentDueAt
                  ? t("payBy", { date: f.day(stay.paymentDueAt) })
                  : t("accepted");
  return <Badge className="bg-ink/6">{label}</Badge>;
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

/** Houses that are over: closed at first, the same cards when opened. */
function PastSection({ houses }: { houses: Stay[] }) {
  const t = useTranslations("houses.home");
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="past">
      <button type="button" id="past" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={cn(SECTION_TITLE, "-ml-2 flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-(--chip-bg)")}>
        {t("past", { count: houses.length })}
        <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul className={cn(CARD_GRID, "mt-4")}>
          {houses.map((stay) => (
            <li key={stay.id}>
              <HouseTile stay={stay} status={<Badge className="bg-ink/6">{t("pastBadge")}</Badge>} attention={false} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
