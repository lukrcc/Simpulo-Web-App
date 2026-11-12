"use client";

import { ArrowUpRight, Check, ChevronLeft, ChevronRight, CreditCard, MessageCircleReply, Plus, Settings2, ShieldCheck, UserRound, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { clearDraft, readDraft, toInput } from "@/components/create/model";
import { CardStatusAction, CardStatusChip, HouseCard } from "@/components/HouseCard";
import { Container } from "@/components/layout/Container";
import { PayoutSetupSheet } from "@/components/payouts/PayoutSetup";
import { CardTaskAction, cardTaskOf } from "@/components/stay/CardTask";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { againHref } from "@/components/create/model";
import { TODO_GROUP, TODO_GROUPS, TODO_URGENT_HOURS, type TodoGroup, type TodoKind } from "@/config/todo";
import { activitySummary, isDiscovery, type ActivitySummary } from "@/config/activity";
import { useNotifications } from "@/components/notifications/useNotifications";
import { Sheet } from "@/components/ui/Sheet";
import { CardRow, RowHead } from "@/components/ui/CardRow";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { convertApprox } from "@/lib/rates";
import { usePreferredCurrency } from "@/lib/usePreferredCurrency";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { iconButtonStyles } from "@/components/ui/IconButton";
import { Img } from "@/components/ui/Img";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { useToast } from "@/components/ui/Toast";
import { EXPLORE_GRID } from "@/config/explore";
import type { YourRowKey } from "@/config/yourHouses";
import { useSnapCarousel } from "@/lib/useSnapCarousel";
import { shortNameOf } from "@/lib/shortName";
import { useFormat } from "@/i18n/format";
import { locationOf } from "@/lib/catalog";
import { earningsFor, type Earnings } from "@/lib/earnings";
import { hostStatsFor } from "@/lib/hostStats";
import { focusOfTask, manageHref, needsFill } from "@/lib/houseTasks";
import { daysUntil, timelineFor, type TimelineEvent } from "@/lib/timeline";
import { InviteSheet } from "@/components/InviteSheet";
import { Avatar } from "@/components/ui/Avatar";
import { acceptedOverlaps, runningNow } from "@/lib/overlap";
import { usePayoutAccount } from "@/lib/payments/hooks";
import { useGridColumns } from "@/lib/useGridColumns";
import { didntWorkOut } from "@/lib/requests";
import { crewThreadId, findUser, getCrew, getCrewThread, getCurrentUser, getMyPayment, isCrewMember, settingsOf, useStore } from "@/lib/store";
import type { JoinRequest, Stay } from "@/lib/types";
import { cn, housePhotos, openSpots } from "@/lib/utils";
import { waitlistPosition } from "@/lib/waitlist";

/**
 * /your-houses – everything you're part of, as calm as Explore. On top "Up next": the House that starts next (hosted or joined) as one
 * Panel row as high as a HouseCard, with its one action. Under it "All · Hosting · Joined · Past" (?tab=, text tabs with an underline) and ONE grid of HouseCards
 * (footer="status": crew + "N of M", one pill – the action or the status; All leaves out Up next and what didn't work out) – what asks something of you first, then by start date (Past: the
 * newest first). Drafts are cards too ("Draft" + Continue, "…" › Delete draft); the dashed "Open a House" card only under Hosting. The
 * money ("€7,510 received · View payouts →") beside the segment, for hosts. A new account: one calm empty state.
 */
export function YourHouses({ group }: { /** "See all": only this row, as a grid */ group?: YourRowKey } = {}) {
  const t = useTranslations("houses");
  return (
    <RequireLogin title={t("loginTitle")} description={t("loginDescription")}>
      <YourHousesContent group={group} />
    </RequireLogin>
  );
}

interface Item {
  key: string;
  stay: Stay;
  /** Starts the sort: something to do first */
  waits: boolean;
  kind: "draft" | "hosting" | "joined" | "past";
  /** A request that was declined or ran out: only under Past */
  failed?: boolean;
  node: ReactNode;
}

function YourHousesContent({ group }: { group?: YourRowKey }) {
  const t = useTranslations("houses.home");
  const store = useStore();
  const [now] = useState(() => new Date().toISOString());
  const today = now.slice(0, 10);
  const me = store.currentUserId;
  const meUser = getCurrentUser(store);
  const earnings = earningsFor(store, me, today);
  const payout = usePayoutAccount();
  const tDash = useTranslations("houses.home.dash");
  const f = useFormat();
  const viewer = usePreferredCurrency();
  const [payoutSheet, setPayoutSheet] = useState(false);
  const [picking, setPicking] = useState<[Stay, Stay][] | null>(null);
  /** "Fill 3 spots": the House whose invite sheet is open */
  const [filling, setFilling] = useState<Stay | null>(null);
  const repo = useNotifications();

  // The Open a House flow's own draft (this browser), shown with the draft Houses.
  const [localDraft, setLocalDraft] = useState<ReturnType<typeof readDraft>>(() => (typeof window === "undefined" ? null : readDraft()));
  const ownLocalDraft = localDraft && (!localDraft.ownerId || localDraft.ownerId === me) ? localDraft : null;

  const over = (s: Stay) => s.status === "completed" || s.endDate < today;
  const hosting = store.stays.filter((s) => s.hostId === me && (s.status === "published" || s.status === "booked" || s.status === "closed") && !over(s));
  const drafts = store.stays.filter((s) => s.hostId === me && s.status === "draft");
  const joined = store.joinRequests
    .filter((r) => r.userId === me && ["accepted", "pending", "invited", "waitlist_requested", "waitlisted"].includes(r.status))
    .flatMap((r) => {
      const stay = store.stays.find((s) => s.id === r.stayId);
      return stay && !over(stay) ? [{ request: r, stay }] : [];
    });
  const past = store.stays.filter((s) => over(s) && (s.hostId === me || isCrewMember(store, s, me)));
  // Declined or expired – for the guest the same: it didn't work out. With the past ones.
  const didntWork = store.joinRequests
    .filter((r) => r.userId === me && didntWorkOut(r))
    .flatMap((r) => {
      const stay = store.stays.find((s) => s.id === r.stayId);
      return stay && !over(stay) && !joined.some((j) => j.stay.id === stay.id) ? [{ request: r, stay }] : [];
    });
  const hosts = hosting.length > 0 || drafts.length > 0 || Boolean(ownLocalDraft);
  const hasHosted = hosts || earnings.any || past.some((s) => s.hostId === me);

  const waits = (s: Stay) => cardTaskOf(store, s, now) !== null;
  const localStay: Stay | null = ownLocalDraft
    ? {
        ...toInput(ownLocalDraft.form, { me: meUser, today, preferredCurrency: "EUR" }),
        title: ownLocalDraft.form.title || t("localDraft"),
        location: locationOf(ownLocalDraft.form.city.trim(), ownLocalDraft.form.region.trim()),
        id: "local-draft",
        slug: "",
        hostId: me ?? "",
        lat: 0,
        lng: 0,
        mapPreviewUrl: "",
        spotsFilled: 1,
        currency: "EUR",
        status: "draft",
        acceptingRequests: false,
        featured: false,
        createdAt: "",
      }
    : null;

  const items: Item[] = [
    ...(localStay
      ? [{ key: "local-draft", stay: localStay, waits: false, kind: "draft" as const, node: <DraftCard stay={localStay} href="/create" onDelete={() => { clearDraft(); setLocalDraft(null); }} /> }]
      : []),
    ...drafts.map((stay) => ({ key: stay.id, stay, waits: false, kind: "draft" as const, node: <DraftCard stay={stay} href={`/your-houses/${stay.id}/edit`} onDelete={() => store.deleteDraft(stay.id)} /> })),
    ...hosting.map((stay) => ({ key: stay.id, stay, waits: waits(stay), kind: "hosting" as const, node: <YourHouseCard stay={stay} now={now} /> })),
    ...joined.map(({ request, stay }) => ({ key: stay.id, stay, waits: waits(stay), kind: "joined" as const, node: <YourHouseCard stay={stay} now={now} request={request} /> })),
  ];
  // Up next: the House you're in (hosting or joined) that starts next – or is on now.
  const upNext = [...hosting.filter((s) => s.status !== "closed"), ...joined.filter((j) => j.request.status === "accepted").map((j) => j.stay)].toSorted((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const upNextRequest = upNext ? joined.find((j) => j.stay.id === upNext.id)?.request : undefined;
  // Two (or more) Houses on right now: Up next swipes through them.
  const running = runningNow(store, today);
  // Each House's news of the last days (config/activity.ts): for its card's line, dot and ring – and the order.
  const notifications = repo.list({ limit: Number.MAX_SAFE_INTEGER }).items;
  const activity = new Map(items.map((item) => [item.stay.id, activitySummary(notifications.filter((n) => n.stayId === item.stay.id), now)]));
  const unread = (item: Item) => Boolean(activity.get(item.stay.id)?.unread);
  // Lived in: the past Houses you were part of, the newest first. What didn't work out appears nowhere.
  const livedIn = past.toSorted((a, b) => b.startDate.localeCompare(a.startDate));

  const nextTrip = useNextTripPicks();
  // How many cards a row shows at once: the grid's real column count (4 at 1440px) – "See all" only with more.
  const [columnProbe, setColumnProbe] = useState<HTMLDivElement | null>(null);
  const cols = useGridColumns(columnProbe) || 4;
  const probe = <div ref={setColumnProbe} aria-hidden className={cn(EXPLORE_GRID, "h-0")} />;
  const nextTripCards = nextTrip.map((stay) => ({ key: stay.id, node: <HouseCard stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} /> }));

  // Never hosted, never joined: no dashboard, no cards – one calm invitation, and Houses for the first trip.
  if (!hasHosted && joined.length === 0 && past.length === 0 && didntWork.length === 0)
    return (
      <>
        <NewHere />
        <Container className="explore-width explore-root pb-16">
          {probe}
          <YourRow id="nextTrip" title={tDash("rows.nextTrip")} cards={nextTripCards} cols={cols} />
        </Container>
      </>
    );
  // Every open task across your Houses, the payout account and the profile to set up (ordered in TodoTile, config/todo.ts).
  // No payout account yet (or Stripe still needs something): then, and only then, "Set up payouts".
  const payoutSetup = hasHosted && (payout.status === "none" || payout.status === "action_required");
  const profileSetup = meUser !== undefined && (!meUser.bio.trim() || meUser.photos.length < 2);
  const overlaps = acceptedOverlaps(store);
  const todo: TodoEntry[] = [
    ...items
      .filter((item) => item.kind === "hosting" || item.kind === "joined")
      .flatMap((item): TodoEntry[] => {
        const task = cardTaskOf(store, item.stay, now);
        if (!task) return [];
        // Pay: the own share in the viewer's currency ("Pay €315", ≈ when the House's currency differs).
        const share = task.kind === "pay" ? (getMyPayment(store, item.stay.id)?.total ?? item.stay.pricePerPerson ?? 0) : 0;
        const amount = `${item.stay.currency === viewer ? "" : "≈ "}${f.price(Math.round(convertApprox(share, item.stay.currency, viewer)), viewer)}`;
        return [
          {
            key: item.key,
            kind: task.kind,
            title: tDash(`todo.${task.kind}`, { count: task.count ?? 0 }),
            sub: item.stay.title,
            what: tDash(`need.${task.kind}`, { count: task.count ?? 0, amount }),
            short: shortNameOf(item.stay),
            due: task.date,
            photo: housePhotos(item.stay, findUser(store, item.stay.hostId))[0],
            href: manageHref(item.stay, focusOfTask(task.kind)),
          },
        ];
      }),
    // Two acceptances on the same nights, neither paid: pick one (PARALLEL_POLICY) – the other spot is given up. Several: ONE entry, "Sort 3
    // overlaps", that opens all of them.
    ...(overlaps.length > 0
      ? [
          {
            key: "overlaps",
            kind: "overlap" as const,
            title: tDash("todo.overlap", { count: overlaps.length }),
            sub: overlaps.map(([a, b]) => `${a.title} · ${b.title}`).join(" · "),
            what: tDash("need.overlap", { count: overlaps.length, amount: "" }),
            short: [...new Set(overlaps.flat().map(shortNameOf))].join(" · "),
            photo: housePhotos(overlaps[0][0], findUser(store, overlaps[0][0].hostId))[0],
            onClick: () => setPicking(overlaps),
          },
        ]
      : []),
    // A House of yours starting within 30 days and under half full: "Fill 3 spots" – the invite sheet (Reply).
    ...hosting
      .filter((stay) => needsFill(stay, now.slice(0, 10)))
      .map((stay) => ({
        key: `${stay.id}-fill`,
        kind: "fill" as const,
        title: tDash("todo.fill", { count: openSpots(stay) }),
        sub: stay.title,
        what: tDash("need.fill", { count: openSpots(stay), amount: "" }),
        short: shortNameOf(stay),
        photo: housePhotos(stay, findUser(store, stay.hostId))[0],
        onClick: () => setFilling(stay),
      })),
    // Payouts only while no payout account is set up; the ID check is part of it ("Bank account + ID check, 5 min").
    ...(payoutSetup ? [{ key: "payouts", kind: "payouts" as const, title: tDash("todo.payouts"), sub: tDash("setUpText"), what: tDash("need.payouts", { count: 0, amount: "" }), short: tDash("payoutsSetupSub"), icon: <Wallet aria-hidden />, onClick: () => setPayoutSheet(true) }] : []),
    // "Verify your ID" on its own only for guests who don't host – and only as an option.
    ...(meUser && !meUser.verified && !hasHosted ? [{ key: "verify", kind: "verify" as const, title: tDash("todo.verify"), sub: tDash("setupWhere"), what: tDash("need.verify", { count: 0, amount: "" }), short: tDash("optional"), icon: <ShieldCheck aria-hidden />, href: "/settings#payments" }] : []),
    ...(profileSetup ? [{ key: "profile", kind: "profile" as const, title: tDash("todo.profile"), sub: tDash("profileText"), what: tDash("need.profile", { count: 0, amount: "" }), short: tDash("setupWhere"), icon: <UserRound aria-hidden />, href: "/settings/profile" }] : []),
  ];

  // Your houses in three groups (empty ones hidden): Hosting (yours, drafts too), Going (accepted – paid and booked as well), Waiting
  // (requested, invited, on the waitlist). In each, what asks something of you first, then by start date.
  const order = (a: Item, b: Item) => Number(b.waits) - Number(a.waits) || (a.stay.startDate || "9999").localeCompare(b.stay.startDate || "9999");
  const requestOf = (stay: Stay) => joined.find((j) => j.stay.id === stay.id)?.request;
  const groups: { key: "hosting" | "going" | "waiting"; items: Item[] }[] = [
    { key: "hosting" as const, items: items.filter((item) => item.kind === "hosting" || item.kind === "draft").toSorted(order) },
    { key: "going" as const, items: items.filter((item) => item.kind === "joined" && requestOf(item.stay)?.status === "accepted").toSorted(order) },
    { key: "waiting" as const, items: items.filter((item) => item.kind === "joined" && requestOf(item.stay)?.status !== "accepted").toSorted(order) },
  ];
  const card = (item: Item) => (item.kind === "draft" ? item.node : <YourHouseCard stay={item.stay} now={now} request={requestOf(item.stay)} unread={unread(item)} onRead={() => activity.get(item.stay.id)?.events.forEach((e) => !e.readAt && repo.markRead(e.id))} />);
  const upNextNews = upNext ? activity.get(upNext.id) : undefined;

  // The rows, in their order: Hosting (ending with the dashed "Open a House") · Going · Waiting · Lived in (with "Do it again") · For your next trip.
  const groupCards = (key: "hosting" | "going" | "waiting") => groups.find((g) => g.key === key)!.items.map((item) => ({ key: item.key, node: card(item) }));
  const rows: { key: YourRowKey; cards: { key: string; node: ReactNode }[]; extra?: ReactNode }[] = [
    { key: "hosting", cards: groupCards("hosting"), extra: <OpenHouseTile /> },
    { key: "going", cards: groupCards("going") },
    { key: "waiting", cards: groupCards("waiting") },
    { key: "livedIn", cards: livedIn.map((stay) => ({ key: stay.id, node: <LivedInCard stay={stay} /> })) },
    { key: "nextTrip", cards: nextTripCards },
  ];
  // Empty rows are left out – Hosting stays while you host (its dashed card); not hosting at all, the dashed card closes the last of yours.
  const shown = rows.filter((row) => row.cards.length > 0 || (row.key === "hosting" && hosts));

  // "See all": one row as a grid, under the way back.
  if (group) {
    const row = rows.find((r) => r.key === group)!;
    return (
      <Container className="explore-width explore-root pb-16 pt-8 md:pt-10">
        <Link href="/your-houses" className="inline-flex items-center gap-1 text-small font-semibold text-muted transition-colors hover:text-ink">
          <ChevronLeft aria-hidden className="size-4" />
          {tDash("rows.back")}
        </Link>
        <RowHead id={`row-${group}`} title={tDash(`rows.${group}`)} count={row.cards.length} className="mt-3" />
        <ul className={cn(EXPLORE_GRID, "mt-4")}>
          {row.cards.map((c) => (
            <li key={c.key}>{c.node}</li>
          ))}
          {row.extra && <li>{row.extra}</li>}
        </ul>
      </Container>
    );
  }

  return (
    // The same width, grid and shelf cards as Explore (at most 1440px): a row's card is exactly one grid column wide.
    <Container className="explore-width explore-root pb-16 pt-8 md:pt-10">
      {probe}
      {/* The dashboard: Up next (1/3) beside Needs you (2/3), exactly the same height (520px); Payouts is the Needs you card's footer. */}
      <div className="grid gap-5 lg:h-130 lg:grid-cols-3">
        {running.length > 1 ? (
          <UpNextCarousel stays={running} now={now} requestOf={requestOf} newsOf={(id) => activity.get(id)} />
        ) : upNext ? (
          <UpNextTile stay={upNext} request={upNextRequest} now={now} news={upNextNews} />
        ) : (
          <div className="hidden lg:block" />
        )}
        <TodoTile entries={todo} now={now} timeline={timelineFor(store, now)} footer={<PayoutsFooter hosts={hasHosted} earnings={earnings} hostingCount={hosting.length} setUp={payout.status === null || !payoutSetup} hasRequests={store.joinRequests.some((r) => store.stays.some((s) => s.id === r.stayId && s.hostId === me))} />} />
      </div>

      {/* Calm rows, no heading over them: 48px under the dashboard, 40px apart. */}
      <div className="mt-12 flex flex-col gap-10">
        {shown.map((row, i) => (
          <YourRow
            key={row.key}
            id={row.key}
            title={tDash(`rows.${row.key}`)}
            cards={row.cards}
            extra={row.extra ?? (!hosts && i === shown.findLastIndex((r) => r.key !== "livedIn" && r.key !== "nextTrip") ? <OpenHouseTile /> : undefined)}
            cols={cols}
          />
        ))}
        <SavedPeople />
      </div>
      <PayoutSetupSheet open={payoutSheet} onClose={() => setPayoutSheet(false)} />
      <PickOneSheet pairs={picking} onClose={() => setPicking(null)} />
      {filling && <InviteSheet stay={filling} open onClose={() => setFilling(null)} />}
    </Container>
  );
}

/** One row of Your houses: the shared CardRow, "See all" to its own grid page. */
function YourRow({ id, title, cards, extra, cols }: { id: YourRowKey; title: string; cards: { key: string; node: ReactNode }[]; extra?: ReactNode; cols: number }) {
  return <CardRow id={id} title={title} cards={cards} extra={extra} cols={cols} seeAll={`/your-houses/all/${id}`} />;
}

/**
 * The card pill's text when nothing is asked of you – short, so it never needs an ellipsis: "Cancelled", "Didn't work out", "Waiting for host",
 * "Waitlist #2", "Happening now", "Booked", "You're in", "2 spots left", "Crew complete".
 */
function useStatusText() {
  const t = useTranslations("houses.home");
  const store = useStore();
  return (stay: Stay, now: string, request?: JoinRequest): string => {
    const today = now.slice(0, 10);
    if (stay.status === "closed") return t("guest.cancelled");
    if (request && didntWorkOut(request)) return t("guest.didntWorkOut");
    if (request?.status === "pending" || request?.status === "waitlist_requested") return t("guest.waitingForHost");
    if (request?.status === "waitlisted") return t("guest.waitlisted", { position: waitlistPosition(store, stay.id, request.userId) ?? 1 });
    if (stay.startDate <= today) return t("liveNow");
    if (stay.bookingConfirmedAt) return t("guest.booked");
    // A guest who's in (accepted, paid or not): "You're in". The host: the spots still open, else the crew is complete.
    if (request) return t("guest.youreIn");
    const spots = openSpots(stay);
    if (spots > 0 && stay.acceptingRequests) return t("liveSpotsLeft", { count: spots });
    return t("host.complete");
  };
}



/**
 * A House in Your houses: the one HouseCard, footer="status" – left the crew and "N of M", right exactly ONE pill: what's asked of you
 * ("Pay · 48h", "Review 4 requests", "Answer invite"; it opens the action) or the status ("Waiting for host", "You're in", "Booked", "2 spots
 * left"). Unread news: only an orange dot in that pill – no frame around the card. Opening the card marks it read.
 */
function YourHouseCard({ stay, now, request, unread = false, onRead }: { stay: Stay; now: string; request?: JoinRequest; unread?: boolean; onRead?: () => void }) {
  const store = useStore();
  const statusText = useStatusText();
  const failed = request ? didntWorkOut(request) : false;
  const task = failed ? null : cardTaskOf(store, stay, now);
  const own = stay.hostId === store.currentUserId;
  return (
    <div onClickCapture={unread ? onRead : undefined}>
      <HouseCard
        stay={stay}
        host={findUser(store, stay.hostId)}
        crew={getCrew(store, stay)}
        notch={own ? "you" : "host"}
        footer="status"
        href={manageHref(stay, task ? focusOfTask(task.kind) : undefined)}
        status={task ? <CardTaskAction stay={stay} task={task} now={now} /> : <CardStatusChip attention={unread}>{statusText(stay, now, request)}</CardStatusChip>}
      />
    </div>
  );
}

/**
 * A draft as a HouseCard: chip "Draft" and "Continue"; without a photo the calm placeholder; "…" › "Delete draft" with a small
 * confirmation. The card and Continue lead into the flow.
 */
function DraftCard({ stay, href, onDelete }: { stay: Stay; href: string; onDelete: () => void }) {
  const t = useTranslations("houses.home");
  const store = useStore();
  const router = useRouter();
  const showToast = useToast();
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <HouseCard
        stay={stay}
        host={getCurrentUser(store)}
        crew={[]}
        notch="you"
        footer="status"
        href={href}
        menu={<MoreMenu label={t("draftOptions")} buttonClassName={iconButtonStyles("sm", undefined, "onImage")} items={[{ label: t("deleteDraft"), danger: true, onSelect: () => setConfirming(true) }]} />}
        status={<CardStatusAction onClick={() => router.push(href)}>{t("continueDraft")}</CardStatusAction>}
      />
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
    </>
  );
}

/** Under Hosting, last: exactly a HouseCard's size (4:5, the grid's height cap), a dashed edge, centred – a plus in a circle, "Open a House". */
function OpenHouseTile() {
  const t = useTranslations("houses.home");
  return (
    <Link
      href="/create"
      data-house-card="open"
      className="flex aspect-4/5 w-full flex-col items-center justify-center gap-3 rounded-3xl border-[1.5px] border-dashed border-ink/15 p-6 text-center transition-colors duration-150 hover:border-ink/30 hover:bg-ink/3"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-ink/6 text-ink">
        <Plus className="size-5" aria-hidden />
      </span>
      <span className="text-body font-semibold text-ink">{t("openHouse")}</span>
      <span className="text-small text-muted">{t("openHouseText")}</span>
    </Link>
  );
}

/** A new account: nothing hosted, nothing joined – a calm, centred invitation with the two ways in. */
function NewHere() {
  const t = useTranslations("houses.home.new");
  return (
    <Container className="flex min-h-[calc(100dvh-var(--header-total)-var(--space-section))] flex-col items-center justify-center py-(--space-section) text-center">
      <h1 className="text-h1 text-ink">{t("title")}</h1>
      <p className="mt-3 max-w-[480px] text-body-lg text-muted">{t("text")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonStyles("primary", "md")}>
          {t("find")}
        </Link>
        <Link href="/create" className={buttonStyles("secondary", "md")}>
          {t("open")}
        </Link>
      </div>
    </Container>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────────

interface TodoEntry {
  key: string;
  kind: TodoKind;
  title: string;
  /** The House it's about, small under the title */
  sub: string;
  /** ISO date or time it's due by */
  due?: string;
  /** What, with its number or amount, at most 3 words ("Pay €315", "4 requests", "Confirm booking") */
  what: string;
  /** Where: the House's short name (or "Your account" for setting up) */
  short: string;
  photo?: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
}

/**
 * "Up next" as the one HouseCard (photo, the host's tab or "You", gradient, title, dates · place, the crew and its state), a third of the
 * dashboard and as high as it. Top right its eyebrow chip ("Up next · in 21 days", "Happening now"). No chat message word for word: at the
 * bottom right "3 new messages" (only while unread) and the light glass "Open chat". The whole card opens the House.
 */
function UpNextTile({ stay, request, now, news }: { stay: Stay; request?: JoinRequest; now: string; news?: ActivitySummary | null }) {
  const t = useTranslations("houses.home");
  const td = useTranslations("houses.home.dash");
  const store = useStore();
  const router = useRouter();
  const statusText = useStatusText();
  const thread = getCrewThread(store, stay.id);
  const chat = thread ? `/messages/${crewThreadId(stay.id)}` : null;
  const today = now.slice(0, 10);
  const days = Math.round((Date.parse(stay.startDate) - Date.parse(today)) / 86_400_000);
  const eyebrow = stay.startDate <= today ? t("liveNow") : days === 0 ? td("upNextToday") : td("upNextIn", { days });
  const task = cardTaskOf(store, stay, now);
  const newMessages = news?.unread ? news.messages : 0;
  return (
    <div className="relative min-w-0 lg:h-full [&_[data-house-card]]:lg:aspect-auto [&_[data-house-card]]:lg:h-full">
      <HouseCard
        stay={stay}
        host={findUser(store, stay.hostId)}
        crew={getCrew(store, stay)}
        notch={stay.hostId === store.currentUserId ? "you" : "host"}
        footer="status"
        href={manageHref(stay, task ? focusOfTask(task.kind) : undefined)}
        live={`${t("crewOf", { filled: stay.spotsFilled, total: stay.spotsTotal })} · ${statusText(stay, now, request)}`}
        menu={<span className="on-image rounded-full px-3 py-1.5 text-eyebrow uppercase text-white">{eyebrow}</span>}
        status={
          <>
            {newMessages > 0 && <CardStatusChip attention>{td("newMessages", { count: newMessages })}</CardStatusChip>}
            {chat && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(chat);
                }}
                className="press inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full bg-white/80 px-3.5 text-small font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)] backdrop-blur-md transition-colors duration-150 hover:bg-white"
              >
                {t("openChat")}
              </button>
            )}
          </>
        }
      />
    </div>
  );
}

/** Several Houses on at the same time: Up next swipes through them (snap), its dots and "1 / 2" at the top. */
function UpNextCarousel({ stays, now, requestOf, newsOf }: { stays: Stay[]; now: string; requestOf: (stay: Stay) => JoinRequest | undefined; newsOf: (id: string) => ActivitySummary | null | undefined }) {
  const td = useTranslations("houses.home.dash");
  const { ref, active, onScroll, scrollTo } = useSnapCarousel<HTMLDivElement>(stays.length);
  return (
    <div className="relative min-w-0 lg:h-full">
      <div ref={ref} onScroll={onScroll} className="no-scrollbar flex h-full snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain">
        {stays.map((stay) => (
          <div key={stay.id} className="w-full shrink-0 snap-center [&>div]:h-full">
            <UpNextTile stay={stay} request={requestOf(stay)} now={now} news={newsOf(stay.id)} />
          </div>
        ))}
      </div>
      <div className="on-image absolute left-1/2 top-16 flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-1.5 text-white">
        {stays.map((stay, i) => (
          <button key={stay.id} type="button" onClick={() => scrollTo(i)} aria-label={td("showHouse", { index: i + 1, count: stays.length })} aria-current={i === active || undefined} className={cn("block h-1.5 rounded-full transition-all", i === active ? "w-3 bg-white" : "w-1.5 bg-white/50")} />
        ))}
        <span className="text-small tabular-nums">{td("pageOf", { index: active + 1, count: stays.length })}</span>
      </div>
    </div>
  );
}

/** "12h left", "2 days left", "due now" – and whether it's under 24 hours. */
function useTimeLeft() {
  const td = useTranslations("houses.home.dash");
  return (due: string, now: string): { text: string; urgent: boolean } => {
    // A date alone is due at the end of that day.
    const at = Date.parse(due.length === 10 ? `${due}T23:59:59Z` : due);
    const hours = (at - Date.parse(now)) / 3_600_000;
    if (hours <= 0) return { text: td("dueNow"), urgent: true };
    if (hours < TODO_URGENT_HOURS) return { text: td("hoursLeft", { count: Math.max(1, Math.floor(hours)) }), urgent: true };
    return { text: td("daysLeft", { count: Math.floor(hours / 24) }), urgent: false };
  };
}

/** The three tiles' icons. */
const GROUP_ICONS: Record<TodoGroup, LucideIcon> = { pay: CreditCard, reply: MessageCircleReply, setup: Settings2 };

/** Every row of Needs you: 64px, and its 1px divider. */
const NEEDS_ROW_H = 65;
/** Phones: at most this many rows, then "+N more". */
const NEEDS_PHONE_ROWS = 4;
/** Coming up: rows of 44px; its label and the gap above it. */
const UP_ROW_H = 44;
const UP_HEAD_H = 40;
/** Coming up only with room for at least this many rows – otherwise Needs you takes the whole card. */
const UP_MIN_ROWS = 2;
/** Phones: at most this many events. */
const UP_PHONE_ROWS = 3;
/** "You're all set": one line. */
const ALL_SET_H = 40;

/** The list's order: the shortest deadline first (none last), then money before answers before setting up. */
function needsOrder(a: TodoEntry, b: TodoEntry): number {
  return (a.due ?? "9999").localeCompare(b.due ?? "9999") || TODO_GROUPS.indexOf(TODO_GROUP[a.kind]) - TODO_GROUPS.indexOf(TODO_GROUP[b.kind]);
}

/**
 * "Needs you · N", Ember, two thirds wide and exactly as high as Up next; Payouts its footer. ONE list without filters: every open task, two
 * columns, rows of 64px, the category as an eyebrow on each (PAY / REPLY / SET UP, orange under 24h). Needs you takes the height it needs;
 * under it "Coming up" (lib/timeline.ts) fills the rest of the card with as many 44px rows as fit (measured) – at least two, otherwise it's
 * left out and Needs you takes the whole card, with "+N more" when that's still too little. No task: one line "You're all set", then Coming up.
 */
function TodoTile({ entries, now, timeline, footer }: { entries: TodoEntry[]; now: string; timeline: TimelineEvent[]; /** Across the card's foot: Payouts */ footer?: ReactNode }) {
  const td = useTranslations("houses.home.dash");
  const [sheet, setSheet] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const wide = useMediaQuery("(min-width: 40rem)");
  const sorted = entries.toSorted(needsOrder);
  const total = entries.length;

  // The room under the eyebrow (the card minus its head and the footer), measured.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setHeight(el.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // How the room is shared: Needs you as much as it needs, Coming up the rest (at least two rows), or Needs you all of it.
  const cols = wide ? 2 : 1;
  const needsH = total === 0 ? ALL_SET_H : Math.ceil(total / cols) * NEEDS_ROW_H;
  const upFits = wide ? Math.floor((height - needsH - UP_HEAD_H) / UP_ROW_H) : UP_PHONE_ROWS;
  const showUp = timeline.length > 0 && (upFits >= UP_MIN_ROWS || (height === 0 && !wide));
  const capacity = wide ? (showUp ? total : Math.max(1, Math.floor(height / NEEDS_ROW_H)) * cols) : NEEDS_PHONE_ROWS;
  const overflow = sorted.length > capacity;
  const visible = overflow ? sorted.slice(0, Math.max(0, capacity - 1)) : sorted;
  const upcoming = timeline.slice(0, Math.max(0, upFits));

  return (
    <section aria-labelledby="todo" className="ember flex min-h-0 flex-col overflow-hidden rounded-[20px] lg:col-span-2">
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-6">
        <h2 id="todo" className="text-eyebrow uppercase text-white/60">
          {total > 0 ? td("needsCount", { count: total }) : td("needsTitle")}
        </h2>
        <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {total === 0 ? (
            <p className="flex h-10 shrink-0 items-center gap-2 text-body font-semibold text-white">
              <Check aria-hidden className="size-4" strokeWidth={2.5} />
              {td("allSet")}
            </p>
          ) : (
            <ul className="grid shrink-0 gap-x-6 sm:grid-cols-2">
              {visible.map((entry) => (
                <li key={entry.key} className="border-b border-[#F4EEE7]/6">
                  <NeedsRow entry={entry} now={now} />
                </li>
              ))}
              {overflow && (
                <li className="border-b border-[#F4EEE7]/6">
                  <button type="button" onClick={() => setSheet(true)} className="flex h-16 w-full items-center px-2 text-body font-semibold text-white/85 transition-colors hover:text-white">
                    {td("moreCount", { count: sorted.length - visible.length })}
                  </button>
                </li>
              )}
            </ul>
          )}
          {showUp && upcoming.length > 0 && <ComingUp events={upcoming} now={now} />}
        </div>
      </div>
      {footer}
      <Sheet open={sheet} onClose={() => setSheet(false)} title={td("needsTitle")}>
        <ul className="-mx-2">
          {sorted.map((entry) => (
            <li key={entry.key}>
              <TodoRow entry={entry} now={now} onDone={() => setSheet(false)} />
            </li>
          ))}
        </ul>
      </Sheet>
    </section>
  );
}

/**
 * "COMING UP": the next events of your sure Houses, rows of 44px – a dot (orange within 7 days, else cream 30 %), the date (72px), what +
 * short name, and on the very next one "in N days" muted on the right. A row opens the House (/h/[id]).
 */
function ComingUp({ events, now }: { events: TimelineEvent[]; now: string }) {
  const td = useTranslations("houses.home.dash");
  const f = useFormat();
  return (
    <section aria-labelledby="coming-up" className="mt-4 flex min-h-0 flex-col">
      <h3 id="coming-up" className="flex h-6 shrink-0 items-center text-eyebrow uppercase text-white/60">
        {td("comingUp")}
      </h3>
      <ul className="mt-2.5">
        {events.map((event, i) => {
          const days = daysUntil(event.at, now);
          return (
            <li key={event.key}>
              <Link href={`/h/${event.stay.id}`} className="group -mx-2 flex h-11 items-center gap-3 rounded-xl px-2 transition-colors duration-150 hover:bg-white/6">
                <span aria-hidden className={cn("size-2 shrink-0 rounded-full", days <= 7 ? "bg-accent" : "bg-[#F4EEE7]/30")} />
                <span className="w-18 shrink-0 text-small tabular-nums text-white/60">{f.day(event.at)}</span>
                <span className="min-w-0 flex-1 truncate text-body text-white">
                  <span className="font-semibold">{td(`timeline.${event.kind}`)}</span>
                  <span className="text-white/60"> · {shortNameOf(event.stay)}</span>
                </span>
                {i === 0 && <span className="shrink-0 text-small text-white/60">{days === 0 ? td("timeline.today") : td("timeline.inDays", { count: days })}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** A task in the list: 64px – the photo (48px, rounded square), what, "short name · deadline" (under 24h orange), a chevron on hover. */
function NeedsRow({ entry, now }: { entry: TodoEntry; now: string }) {
  const td = useTranslations("houses.home.dash");
  const left = countdownOf(entry.due, now);
  const group = TODO_GROUP[entry.kind];
  const GroupIcon = GROUP_ICONS[group];
  const body = (
    <>
      <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 text-white [&_svg]:size-5">
        {entry.photo ? <Img src={entry.photo} alt="" fill sizes="48px" className="object-cover" /> : entry.icon}
      </span>
      <span className="min-w-0 flex-1">
        {/* The category: icon + PAY / REPLY / SET UP, cream 50 % – orange when it's due within 24h. */}
        <span className={cn("flex items-center gap-1 text-eyebrow uppercase leading-4", left?.urgent ? "text-accent" : "text-white/50")}>
          <GroupIcon aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
          {td(`group.${group}`)}
        </span>
        <span className="block truncate text-body font-semibold leading-5 text-white">{entry.what}</span>
        <span className="block truncate text-small leading-4 text-white/60">
          {entry.short}
          {left && (
            <>
              {" · "}
              <span className={cn("tabular-nums", left.urgent && "font-semibold text-accent")}>{left.text}</span>
            </>
          )}
        </span>
      </span>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-white/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
    </>
  );
  const row = "group -mx-2 flex h-16 w-[calc(100%+16px)] items-center gap-3 rounded-xl px-2 text-left transition-colors duration-150 hover:bg-white/6";
  return entry.href ? (
    <Link href={entry.href} className={row}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={entry.onClick} className={row}>
      {body}
    </button>
  );
}

/** The countdown chip's text: "48h" under three days, else "5d"; under 24h urgent (orange). */
function countdownOf(due: string | undefined, now: string): { text: string; urgent: boolean } | null {
  if (!due) return null;
  const at = Date.parse(due.length === 10 ? `${due}T23:59:59Z` : due);
  const hours = Math.max(0, (at - Date.parse(now)) / 3_600_000);
  return { text: hours < 72 ? `${Math.max(1, Math.floor(hours))}h` : `${Math.floor(hours / 24)}d`, urgent: hours < TODO_URGENT_HOURS };
}

/** A task as a row: House photo (36px on Ember, else 40px), what, short name, deadline. `dark`: inside Needs you (Ember), no chevron. */
function TodoRow({ entry, now, onDone, dark = false }: { entry: TodoEntry; now: string; onDone?: () => void; dark?: boolean }) {
  const timeLeft = useTimeLeft();
  const left = entry.due ? timeLeft(entry.due, now) : null;
  const body = (
    <>
      <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden [&_svg]:size-4", dark ? "size-9 rounded-[9px] bg-white/10 text-white" : "size-10 rounded-[10px] bg-ink/6 text-ink")}>
        {entry.photo ? <Img src={entry.photo} alt="" fill sizes="40px" className="object-cover" /> : entry.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-body", dark ? "font-semibold text-white" : "text-ink")}>{entry.what}</span>
        <span className={cn("block truncate text-small", dark ? "text-white/60" : "text-muted")}>{entry.short}</span>
      </span>
      {left && <span className={cn("shrink-0 text-small tabular-nums", left.urgent ? "font-semibold text-accent" : dark ? "text-white/60" : "text-muted")}>{left.text}</span>}
      {!dark && <ChevronRight aria-hidden className="size-4 shrink-0 text-ink/30" />}
    </>
  );
  const row = cn("flex items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors duration-150", dark ? "-mx-2 w-[calc(100%+16px)] hover:bg-white/8" : "w-full hover:bg-ink/4");
  return entry.href ? (
    <Link href={entry.href} onClick={onDone} className={row}>
      {body}
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => {
        onDone?.();
        entry.onClick?.();
      }}
      className={row}
    >
      {body}
    </button>
  );
}

/**
 * Payouts as the Needs you card's footer: across its whole width, a 1px cream 12 % line above it, 96px high. The figures side by side with
 * thin lines between them – "€1,251 earned this year" (large; a share host: "paid out this year"), "Next payout · Feb 13", "1 House hosting",
 * "100 % full" – and the arrow on the right; the whole footer opens Payouts (hover: a little lighter). Never hosted: "Host your own House ·
 * Your crew chips in for the stay" and the outline button "Open a House".
 */
function PayoutsFooter({ hosts, earnings, hostingCount, setUp, hasRequests }: { hosts: boolean; earnings: Earnings; hostingCount: number; /** A payout account exists: else "Payouts not set up" instead of the next payout */ setUp: boolean; /** Anyone ever asked to join one of the Houses */ hasRequests: boolean }) {
  const td = useTranslations("houses.home.dash");
  const t = useTranslations("houses.home");
  const f = useFormat();
  const store = useStore();
  const viewer = usePreferredCurrency();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const foot = "flex h-24 shrink-0 items-center gap-6 border-t border-[#F4EEE7]/12 px-6 text-left";
  if (!hosts) {
    return (
      <div className={foot}>
        <p className="min-w-0 flex-1 truncate text-body text-white/80">
          <span className="font-semibold text-white">{td("hostOwnTitle")}</span> · {t("openHouseText")}
        </p>
        <Button variant="creamOutline" href="/create">
          <Plus aria-hidden />
          {td("hostOwnAction")}
        </Button>
      </div>
    );
  }
  const stats = hostStatsFor(store, earnings, store.currentUserId ?? "", today);
  const pro = stats.type === "pro";
  const money = (eur: number) => f.price(Math.round(convertApprox(eur, "EUR", viewer)), viewer);
  // One line always: below 1280px the values a step smaller and "N % full" left out.
  const figures: { key: string; value: string; label: string; big?: boolean; wide?: boolean; dot?: boolean }[] = [
    pro ? { key: "earned", value: money(stats.earningsThisYear), label: td("strip.earned"), big: true } : { key: "paid", value: money(earnings.thisYear), label: td("strip.paidOut"), big: true },
    ...(!setUp ? [{ key: "next", value: td("payoutsNotSetUp"), label: "", dot: true }] : earnings.next ? [{ key: "next", value: td("nextPayoutChip", { date: f.day(earnings.next.date) }), label: "" }] : []),
    { key: "hosting", value: String(hostingCount), label: td("strip.hosting", { count: hostingCount }) },
    // "N % full" only once anyone has asked to join; before that the Houses are simply open for requests.
    ...(stats.houses > 0 ? [hasRequests ? { key: "full", value: `${Math.round(stats.fullShare * 100)} %`, label: td("strip.full"), wide: true } : { key: "full", value: td("openForRequests"), label: "", wide: true }] : []),
  ];
  return (
    <Link href="/your-houses/payouts" aria-label={td("payoutsTitle")} className={cn(foot, "transition-colors duration-150 hover:bg-white/5")}>
      <span className="flex min-w-0 flex-1 items-center overflow-hidden whitespace-nowrap">
        {figures.map((fig, i) => (
          <span key={fig.key} className={cn("flex shrink-0 items-baseline gap-2 px-4 first:pl-0 xl:px-6", i > 0 && "border-l border-[#F4EEE7]/15", fig.wide && "hidden xl:flex")}>
            {fig.dot && <span aria-hidden className="size-2 shrink-0 self-center rounded-full bg-accent" />}
            <span className={cn("tabular-nums text-white", fig.big ? "text-h2" : "text-body-lg font-semibold xl:text-h3")}>{fig.value}</span>
            {fig.label && <span className="text-small text-white/65">{fig.label}</span>}
          </span>
        ))}
      </span>
      <ArrowUpRight aria-hidden className="size-5 shrink-0 text-white/70" />
    </Link>
  );
}

/**
 * Lived in: the one HouseCard (the host's tab, or "You"), footer "memory": left the crew's faces and "Lived with · Nov 2026", right the light
 * glass "Do it again" (Open a House filled in from it, the crew of then invited). Same size as the grid's cards, on a shelf.
 */
function LivedInCard({ stay }: { stay: Stay }) {
  const td = useTranslations("houses.home.dash");
  const format = useFormatter();
  const store = useStore();
  const router = useRouter();
  const me = store.currentUserId;
  const host = findUser(store, stay.hostId);
  const faces = [...(host && host.id !== me ? [host] : []), ...getCrew(store, stay).filter((u) => u.id !== me && u.id !== stay.hostId)];
  const month = format.dateTime(new Date(`${stay.startDate.slice(0, 7)}-01T00:00:00Z`), { month: "short", year: "numeric", timeZone: "UTC" });
  return (
    <HouseCard
      stay={stay}
      host={host}
      crew={faces}
      notch={stay.hostId === me ? "you" : "host"}
      footer="memory"
      href={manageHref(stay)}
      live={td("livedWithMonth", { month })}
      status={
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(againHref(stay.id));
          }}
          className="press inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full bg-white/80 px-3.5 text-small font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)] backdrop-blur-md transition-colors duration-150 hover:bg-white"
        >
          {td("doItAgain")}
        </button>
      }
    />
  );
}

/** Houses you're part of: hosting, in the crew, or with a request or an invite of yours (any state). */
function involvedIn(store: ReturnType<typeof useStore>, stay: Stay): boolean {
  const me = store.currentUserId;
  if (!me) return false;
  return stay.hostId === me || isCrewMember(store, stay, me) || store.joinRequests.some((r) => r.userId === me && r.stayId === stay.id);
}

/** How many Houses the "For your next trip" row offers. */
const NEXT_TRIP_MAX = 12;

/**
 * "For your next trip", always the last row: open Houses that fit the categories and places of your own Houses (else simply the soonest), none
 * of your own. New Houses you were told about (near your searches, from a host you follow) come first – no label over the card.
 */
function useNextTripPicks(): Stay[] {
  const store = useStore();
  const me = store.currentUserId;
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const repo = useNotifications();
  const mine = store.stays.filter((s) => involvedIn(store, s));
  const reasons = new Set<string>();
  for (const n of repo.list({ limit: Number.MAX_SAFE_INTEGER }).items) if (n.stayId && isDiscovery(n)) reasons.add(n.stayId);
  const vibes = new Set(mine.map((s) => s.vibe));
  const cities = new Set(mine.map((s) => s.location.city));
  const open = store.stays.filter((s) => s.status === "published" && s.acceptingRequests && s.startDate >= today && s.hostId !== me && !mine.includes(s) && openSpots(s) > 0);
  const score = (s: Stay) => (reasons.has(s.id) ? 10 : 0) + Number(vibes.has(s.vibe)) + Number(cities.has(s.location.city));
  return open.toSorted((a, b) => score(b) - score(a) || a.startDate.localeCompare(b.startDate)).slice(0, NEXT_TRIP_MAX);
}

/**
 * "Pick one": two acceptances on the same nights, neither paid. Each House a row (photo, short name, dates) with "Keep …" – keeping one
 * leaves the other (its spot goes to the waitlist, or is open again).
 */
function PickOneSheet({ pairs, onClose }: { pairs: [Stay, Stay][] | null; onClose: () => void }) {
  const t = useTranslations("overlap");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  // Each conflict its own small list; a kept one closes the sheet once nothing's left to pick.
  const [settled, setSettled] = useState<string[]>([]);
  const open = (pairs ?? []).filter(([a, b]) => !settled.includes(`${a.id}-${b.id}`));
  return (
    <Sheet open={pairs !== null && open.length > 0} onClose={onClose} title={t("pickTitle")}>
      <p className="text-body text-muted">{t("pickText")}</p>
      {open.map((pair) => (
        <ul key={`${pair[0].id}-${pair[1].id}`} className="mt-5 flex flex-col gap-3">
          {pair.map((stay, i) => {
            const other = pair[1 - i];
            const cover = housePhotos(stay, findUser(store, stay.hostId))[0];
            return (
              <li key={stay.id} className="flex items-center gap-3">
                <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-ink/6">{cover && <Img src={cover} alt="" fill sizes="48px" className="object-cover" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-ink">{shortNameOf(stay)}</span>
                  <span className="block truncate text-small text-muted">{f.stayDatesLong(stay)}</span>
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    store.leaveStay(other.id);
                    showToast(t("kept", { name: shortNameOf(stay) }));
                    setSettled((done) => [...done, `${pair[0].id}-${pair[1].id}`]);
                    if (open.length <= 1) onClose();
                  }}
                >
                  {t("keep", { name: shortNameOf(stay) })}
                </Button>
              </li>
            );
          })}
        </ul>
      ))}
    </Sheet>
  );
}


/** "Saved people" (Save on a profile – private): avatars 56px with the first name, each to their profile. Only when there's someone. */
function SavedPeople() {
  const tRows = useTranslations("houses.rows");
  const store = useStore();
  const me = getCurrentUser(store);
  const saved = (settingsOf(me).savedPeopleIds ?? []).flatMap((id) => findUser(store, id) ?? []);
  if (saved.length === 0) return null;
  return (
    <section aria-labelledby="row-savedPeople">
      <RowHead id="row-savedPeople" title={tRows("savedPeople")} count={saved.length} />
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-5">
        {saved.map((user) => (
          <li key={user.id}>
            <Link href={`/u/${user.id}`} className="flex w-20 flex-col items-center text-center">
              <Avatar user={user} size="lg" />
              <span className="mt-2 max-w-full truncate text-body font-semibold text-ink">{user.name.split(" ")[0]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
