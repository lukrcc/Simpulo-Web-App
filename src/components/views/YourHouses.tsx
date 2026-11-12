"use client";

import { useReloadOnReturn } from "@/lib/useReloadOnReturn";
import { BackLink } from "@/components/ui/BackButton";
import { ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, CreditCard, MessageCircleReply, Plus, Settings2, ShieldCheck, UserRound, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { clearDraft, readDraft, toInput } from "@/components/create/model";
import { CardStatusChip, HouseCard } from "@/components/HouseCard";
import { Container } from "@/components/layout/Container";
import { HeroBand } from "@/components/HeroBand";
import { MyHouseStatus, MyHouseTile } from "@/components/MyHouseTile";
import { CrewRow } from "@/components/CrewRow";
import { UP_NEXT_EMPTY_IMAGE, upNextOf } from "@/config/upnext";
import { cardGradient, cardTextShadow } from "@/components/ui/glass";
import { PayoutSetupSheet } from "@/components/payouts/PayoutSetup";
import { CardTaskAction, cardTaskOf } from "@/components/stay/CardTask";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { againHref } from "@/components/create/model";
import { TODO_GROUP, TODO_GROUPS, TODO_URGENT_HOURS, type TodoGroup, type TodoKind } from "@/config/todo";
import { activitySummary, isDiscovery, type ActivitySummary } from "@/config/activity";
import { useNotifications } from "@/components/notifications/useNotifications";
import { Sheet } from "@/components/ui/Sheet";
import { DarkBand } from "@/components/ui/DarkBand";
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
import { placeShortOf, shortNameOf } from "@/lib/shortName";
import { useFormat } from "@/i18n/format";
import { locationOf } from "@/lib/catalog";
import { earningsFor, type Earnings } from "@/lib/earnings";
import { hostStatsFor } from "@/lib/hostStats";
import { focusOfTask, manageHref, needsFill, stepHref } from "@/lib/houseTasks";
import { daysUntil, timelineFor, type TimelineEvent } from "@/lib/timeline";
import { Avatar } from "@/components/ui/Avatar";
import { acceptedOverlaps } from "@/lib/overlap";
import { usePayoutAccount } from "@/lib/payments/hooks";
import { useGridColumns } from "@/lib/useGridColumns";
import { didntWorkOut } from "@/lib/requests";
import { crewInOf, crewThreadId, findUser, getCrew, getCrewThread, getCurrentUser, getMyPayment, isCrewMember, settingsOf, useStore } from "@/lib/store";
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
  // The installed app coming back to the front: read again (no pull-to-refresh there).
  useReloadOnReturn();
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
  // Up next: exactly one House (config/upnext.ts) – on right now, else the next to start; no carousel.
  const upNext = upNextOf([...hosting, ...joined.filter((j) => j.request.status === "accepted").map((j) => j.stay)], today);
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
  // Your own Houses' rows: 5 a row from 1440px, 4 from 1100, 3 from 768, else 2 (globals.css --my-cols) – for "See all".
  const xlUp = useMediaQuery("(min-width: 90rem)");
  const lgUp = useMediaQuery("(min-width: 68.75rem)");
  const smUp = useMediaQuery("(min-width: 48rem)");
  const myCols = xlUp ? 5 : lgUp ? 4 : smUp ? 3 : 2;
  const probe = <div ref={setColumnProbe} aria-hidden className={cn(EXPLORE_GRID, "h-0")} />;
  // Saved: the Houses you hearted (the avatar menu is gone – this row is where they live), as Explore's cards; "See all" → /saved.
  const savedCards = (store.users.find((u) => u.id === me)?.savedStayIds ?? [])
    .map((id) => store.stays.find((s) => s.id === id))
    .filter((stay): stay is NonNullable<typeof stay> => Boolean(stay))
    .map((stay) => ({ key: stay.id, node: <HouseCard stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} /> }));
  const nextTripCards = nextTrip.map((stay) => ({ key: stay.id, node: <HouseCard stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} /> }));

  // Never hosted, never joined: no dashboard, no cards – one calm invitation, and Houses for the first trip.
  if (!hasHosted && joined.length === 0 && past.length === 0 && didntWork.length === 0)
    return (
      <>
        <NewHere />
        <Container className="explore-width explore-root">{probe}</Container>
        {nextTripCards.length > 0 && <NextTripBand cards={nextTripCards} cols={cols} title={tDash("rows.nextTrip")} />}
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
            href: stepHref(item.stay, focusOfTask(task.kind)),
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
        href: stepHref(stay, "invite"),
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

  // The rows, in their order: Hosting (ending with the dashed "Open a House") · Going · Waiting · Lived in (with "Do it again") · For your next trip.
  const groupCards = (key: "hosting" | "going" | "waiting") => groups.find((g) => g.key === key)!.items.map((item) => ({ key: item.key, node: card(item) }));
  const rows: { key: YourRowKey; cards: { key: string; node: ReactNode }[]; extra?: ReactNode }[] = [
    // The dashed "Open a House" only while you host fewer than two.
    { key: "hosting", cards: groupCards("hosting"), extra: hosting.length < 2 ? <OpenHouseTile /> : undefined },
    { key: "going", cards: groupCards("going") },
    { key: "waiting", cards: groupCards("waiting") },
    { key: "livedIn", cards: livedIn.map((stay) => ({ key: stay.id, node: <LivedInCard stay={stay} /> })) },
    { key: "saved", cards: savedCards },
    { key: "nextTrip", cards: nextTripCards },
  ];
  // Empty rows are left out – Hosting stays while you host (its dashed card); not hosting at all, the dashed card closes the last of yours.
  const shown = rows.filter((row) => row.key !== "nextTrip" && (row.cards.length > 0 || (row.key === "hosting" && hosts)));

  // "See all": one row as a grid, under the way back.
  if (group) {
    const row = rows.find((r) => r.key === group)!;
    return (
      <Container className="explore-width explore-root pb-16 pt-8 md:pt-10">
        <BackLink href="/your-houses" className="inline-flex items-center gap-1 text-small font-semibold text-muted transition-colors hover:text-ink">
          <ChevronLeft aria-hidden className="size-4" />
          {tDash("rows.back")}
        </BackLink>
        <RowHead id={`row-${group}`} title={tDash(`rows.${group}`)} count={row.cards.length} className="mt-3" />
        {/* Your own Houses as MyHouseTiles (5 · 4 · 3 a row; Lived in two more); For your next trip as Explore's grid. */}
        <ul className={cn(group === "nextTrip" || group === "saved" ? EXPLORE_GRID : group === "livedIn" ? "grid grid-cols-3 gap-(--explore-gap) sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7" : "grid grid-cols-2 gap-x-(--explore-gap) gap-y-8 md:grid-cols-3 split:grid-cols-4 [@media(min-width:90rem)]:grid-cols-5", "mt-4")}>
          {row.cards.map((c) => (
            <li key={c.key}>{c.node}</li>
          ))}
          {row.extra && <li>{row.extra}</li>}
        </ul>
      </Container>
    );
  }

  return (
    <>
      {/* The dashboard as a full-width band under the header (components/HeroBand): left Up next – exactly one House, its photo to the edge –,
          right Ember to the window's edge: Needs you (the fixed columns), Coming up and the Payouts footer, --hero-h high. */}
      <HeroBand
        aria-labelledby="todo"
        // Right of the photo: the band tone (#EAE4DD, like the House page's head); Coming up sits right on the dark Payouts strip (no padding under it).
        bodyClassName="split:pb-0"
        footer={<PayoutsFooter hosts={hasHosted} earnings={earnings} hostingCount={hosting.length} setUp={payout.status === null || !payoutSetup} hasRequests={store.joinRequests.some((r) => store.stays.some((s) => s.id === r.stayId && s.hostId === me))} openRequests={store.joinRequests.filter((r) => r.status === "pending" && store.stays.some((s) => s.id === r.stayId && s.hostId === me)).length} />}
        media={<UpNextMedia stay={upNext} request={upNext ? joined.find((j) => j.stay.id === upNext.id)?.request : undefined} now={now} news={upNext ? activity.get(upNext.id) : undefined} />}>
        <TodoTile entries={todo} now={now} timeline={timelineFor(store, now).filter((e) => !overlaps.some(([a, b]) => a.id === e.stay.id || b.id === e.stay.id))} />
      </HeroBand>
    <Container className={cn("explore-width explore-root", nextTripCards.length > 0 ? "pb-0" : "pb-16")}>
      {probe}
      {/* Calm rows, no heading over them: 48px under the band, 40px apart. For your next trip is the dark band after them. */}
      <div className="mt-12 flex flex-col gap-10">
        {shown.map((row, i) => (
          <YourRow
            key={row.key}
            id={row.key}
            title={tDash(`rows.${row.key}`)}
            cards={row.cards}
            extra={row.extra ?? (!hosts && i === shown.findLastIndex((r) => r.key !== "livedIn" && r.key !== "saved" && r.key !== "nextTrip") ? <OpenHouseTile /> : undefined)}
            cols={row.key === "nextTrip" || row.key === "saved" ? cols : row.key === "livedIn" ? myCols + 2 : myCols}
          />
        ))}
        <SavedPeople />
      </div>
      <PayoutSetupSheet open={payoutSheet} onClose={() => setPayoutSheet(false)} />
      <PickOneSheet pairs={picking} onClose={() => setPicking(null)} />
    </Container>
    {nextTripCards.length > 0 && <NextTripBand cards={nextTripCards} cols={cols} title={tDash("rows.nextTrip")} />}
    </>
  );
}

/**
 * "For your next trip": the last section, a dark band like Explore's (ui/DarkBand – hard edges, 64px inside, title and "See all" cream), 64px of
 * the light page above it; no count beside the title.
 */
function NextTripBand({ cards, cols, title }: { cards: { key: string; node: ReactNode }[]; cols: number; title: string }) {
  return (
    <DarkBand className="mb-0 mt-16">
      <CardRow id="nextTrip" title={title} cards={cards} cols={cols} showCount={false} seeAll="/your-houses/all/nextTrip" />
    </DarkBand>
  );
}

/** One row of Your houses: the shared CardRow, "See all" to its own grid page. */
function YourRow({ id, title, cards, extra, cols }: { id: YourRowKey; title: string; cards: { key: string; node: ReactNode }[]; extra?: ReactNode; cols: number }) {
  // Your own Houses: MyHouseTile slots (5 · 4 · 3 a row, Lived in smaller); For your next trip: Explore's shelf cards.
  const slide = id === "nextTrip" || id === "saved" ? "explore-slide" : id === "livedIn" ? "my-slide-small" : "my-slide";
  return <CardRow id={id} title={title} cards={cards} extra={extra} cols={cols} seeAll={id === "saved" ? "/saved" : `/your-houses/all/${id}`} slideClass={slide} />;
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
 * One of your Houses (Hosting · Going · Waiting): a MyHouseTile – no notch. Right in its status line exactly one thing: what's asked of you
 * ("● Review 4 requests", "Pay · 48h" in orange; it opens the action) or the status muted ("Waiting for host", "You're in", "Booked", "2 spots
 * left"). Unread news: an orange dot before the status. Opening it marks it read.
 */
function YourHouseCard({ stay, now, request, unread = false, onRead }: { stay: Stay; now: string; request?: JoinRequest; unread?: boolean; onRead?: () => void }) {
  const t = useTranslations("houses.home");
  const format = useFormat();
  const store = useStore();
  const statusText = useStatusText();
  const failed = request ? didntWorkOut(request) : false;
  const task = failed ? null : cardTaskOf(store, stay, now);
  const hosting = stay.hostId === store.currentUserId;
  const today = now.slice(0, 10);
  const days = stay.startDate ? Math.round((Date.parse(stay.startDate) - Date.parse(today)) / 86_400_000) : null;
  // Left: Hosting "2 of 4 in"; Going/Waiting "in 66 days" (running or no date: the date). No faces, no "+" circles.
  const meta = hosting ? t("tileCrewIn", { filled: crewInOf(store, stay), total: stay.spotsTotal }) : days !== null && days >= 0 ? t("tileInDays", { days }) : stay.startDate ? format.stayDates(stay) : null;
  // Hosting without a task: "Open for requests" while spots are open, else the status (complete, booked, happening).
  const calm = hosting && openSpots(stay) > 0 && stay.acceptingRequests && stay.startDate > today ? t("tileOpen") : statusText(stay, now, request);
  return (
    <MyHouseTile
      stay={stay}
      href={manageHref(stay, task ? focusOfTask(task.kind) : undefined)}
      onClickCapture={unread ? onRead : undefined}
      meta={meta}
      status={task ? <CardTaskAction stay={stay} task={task} now={now} text /> : <MyHouseStatus attention={unread}>{calm}</MyHouseStatus>}
    />
  );
}

/**
 * A draft as a MyHouseTile: "● Continue draft"; without a photo the calm placeholder; "…" › "Delete draft" with a small
 * confirmation. The card and Continue lead into the flow.
 */
function DraftCard({ stay, href, onDelete }: { stay: Stay; href: string; onDelete: () => void }) {
  const t = useTranslations("houses.home");
  const router = useRouter();
  const showToast = useToast();
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <MyHouseTile
        stay={stay}
        href={href}
        menu={<MoreMenu label={t("draftOptions")} buttonClassName={iconButtonStyles("sm", undefined, "onImage")} items={[{ label: t("deleteDraft"), danger: true, onSelect: () => setConfirming(true) }]} />}
        status={
          <button type="button" onClick={() => router.push(href)} className="inline-flex items-center gap-1.5 text-small font-semibold text-ink underline-offset-4 hover:underline">
            <span aria-hidden className="size-1.5 rounded-full bg-accent" />
            {t("continueDraft")}
          </button>
        }
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

/** Under Hosting, last (only while you host fewer than two): a MyHouseTile's size – the picture area dashed ink 15 % with "+", under it "Open a House" and "Your crew chips in". */
function OpenHouseTile() {
  const t = useTranslations("houses.home");
  return (
    <Link href="/create" data-house-card="open" className="group block min-w-0 rounded-2xl">
      <span className="flex aspect-16/10 items-center justify-center rounded-2xl border-[1.5px] border-dashed border-ink/15 transition-colors duration-150 group-hover:border-ink/30 group-hover:bg-ink/3">
        <span className="flex size-12 items-center justify-center rounded-full bg-ink/6 text-ink">
          <Plus className="size-5" aria-hidden />
        </span>
      </span>
      <span className="mt-3 block truncate text-body-lg font-semibold text-ink">{t("openHouse")}</span>
      <span className="block truncate text-small text-muted">{t("crewChipsIn")}</span>
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
 * Up next as the band's media: the House's photo to the edge – no rounding, no notch, no swiping, no dots; the whole photo opens the House
 * (/h/[id]). On it, bottom left: the capsule "Up next · in 66 days" (on now: "Happening now"), the title, "date · short name", the crew
 * (components/CrewRow) and "{in} of {total}"; right "Open chat". Nothing planned: the calm default picture (config/upnext.ts), "Nothing
 * planned yet" and "Explore" (cream) and "Open a House" (outline).
 */
function UpNextMedia({ stay, request, now, news }: { stay?: Stay; request?: JoinRequest; now: string; news?: ActivitySummary | null }) {
  const t = useTranslations("houses.home");
  const td = useTranslations("houses.home.dash");
  const format = useFormat();
  const store = useStore();
  const router = useRouter();
  if (!stay) {
    return (
      <div className="absolute inset-0">
        {UP_NEXT_EMPTY_IMAGE && <Img src={UP_NEXT_EMPTY_IMAGE} alt="" fill sizes="(min-width: 1100px) 640px, 100vw" className="object-cover" />}
        <span aria-hidden className={cn("absolute inset-0", cardGradient)} />
        <div className={cn("absolute inset-x-0 bottom-0 flex flex-col gap-4 p-6 text-on-image sm:p-8", cardTextShadow)}>
          <p className="text-h2">{td("nothingPlanned")}</p>
          <div className="flex flex-wrap gap-2 [text-shadow:none]">
            <Button variant="cream" href="/">
              {td("explore")}
            </Button>
            <Button variant="creamOutline" href="/create">
              {t("openHouse")}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  const photo = housePhotos(stay, findUser(store, stay.hostId))[0];
  const thread = getCrewThread(store, stay.id);
  const chat = thread ? `/messages/${crewThreadId(stay.id)}` : null;
  const today = now.slice(0, 10);
  const days = Math.round((Date.parse(stay.startDate) - Date.parse(today)) / 86_400_000);
  const capsule = stay.startDate <= today ? t("liveNow") : days === 0 ? td("upNextToday") : td("upNextIn", { days });
  const task = cardTaskOf(store, stay, now);
  const newMessages = news?.unread ? news.messages : 0;
  void request;
  return (
    <Link href={manageHref(stay, task ? focusOfTask(task.kind) : undefined)} aria-label={stay.title} className="group absolute inset-0 block">
      {photo && <Img src={photo} alt="" fill sizes="(min-width: 1100px) 640px, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" />}
      <span aria-hidden className={cn("absolute inset-0", cardGradient)} />
      <span className={cn("absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6 text-on-image sm:p-8", cardTextShadow)}>
        <span className="on-image self-start rounded-full px-3 py-1.5 text-eyebrow uppercase text-on-image [text-shadow:none]">{capsule}</span>
        <span className="line-clamp-2 text-h1">{stay.title}</span>
        <span className="truncate text-small text-on-image/85">
          {format.stayDates(stay)} · {placeShortOf(stay)}
        </span>
        <span className="mt-2 flex items-center justify-between gap-3 [text-shadow:none]">
          <span className="flex min-w-0 items-center gap-2">
            <CrewRow stay={stay} crew={getCrew(store, stay)} size="xs" tone="image" max={5} className="shrink-0" />
            <span className="truncate text-small text-on-image/85">{t("crewOf", { filled: crewInOf(store, stay), total: stay.spotsTotal })}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {newMessages > 0 && <CardStatusChip attention>{td("newMessages", { count: newMessages })}</CardStatusChip>}
            {chat && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(chat);
                }}
                className="press inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-on-image/85 px-4 text-small font-semibold text-stage shadow-[0_1px_2px_rgba(0,0,0,0.12)] backdrop-blur-md transition-colors duration-150 hover:bg-on-image"
              >
                {t("openChat")}
              </button>
            )}
          </span>
        </span>
      </span>
    </Link>
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
/** A column's head: icon, word and how many open (32px + 8px air). */
const NEEDS_HEAD_H = 40;
/** Phones: at most this many entries per column, then "+N more". */
const NEEDS_PHONE_ROWS = 3;
/** Coming up: at most this many events beside its label. */
const UP_MAX = 3;

/** A column's order: the shortest deadline first (none last). */
const byDeadline = (a: TodoEntry, b: TodoEntry) => (a.due ?? "9999").localeCompare(b.due ?? "9999");

/**
 * "Needs you · N", Ember (the global class), two thirds wide and exactly as high as Up next; Payouts its footer. Three fixed columns of the same
 * width – Pay · Reply · Set up (config/todo.ts): each headed by its icon 20px, the word and how many are open; an empty one says only "All
 * done ✓". Entries of 64px (photo 48px, what, "short name · deadline", under 24h orange) – as many as fit the column's height (measured); more:
 * the last row "+N more →", which opens a sheet "{Column} · {n}" with all of them. An entry leads to its House (/h/[id]?step=…). Under the
 * columns one line "COMING UP" (56px). Phones: the columns under each other, three entries each at most.
 */
function TodoTile({ entries, now, timeline }: { entries: TodoEntry[]; now: string; timeline: TimelineEvent[] }) {
  const td = useTranslations("houses.home.dash");
  const [sheet, setSheet] = useState<TodoGroup | null>(null);
  const colsRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  // Only from 1100px the card has its fixed height (--hero-h): there the columns are measured; below, three entries each.
  const fixed = useMediaQuery("(min-width: 68.75rem)");
  const total = entries.length;
  const groups = TODO_GROUPS.map((group) => ({ group, items: entries.filter((e) => TODO_GROUP[e.kind] === group).toSorted(byDeadline) }));

  // The columns' height (the card minus its head, Coming up and the footer), measured.
  useLayoutEffect(() => {
    const el = colsRef.current;
    if (!el) return;
    const measure = () => setHeight(el.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const fit = fixed ? Math.max(1, Math.floor((height - NEEDS_HEAD_H) / NEEDS_ROW_H)) : NEEDS_PHONE_ROWS;
  const sheetGroup = groups.find((g) => g.group === sheet);

  return (
    <section aria-labelledby="todo" className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        {/* No visible label: the three columns say it. */}
        <h2 id="todo" className="sr-only">
          {total > 0 ? td("needsCount", { count: total }) : td("needsTitle")}
        </h2>
        {/* Three equal columns across the whole Ember width, 1px cream 8 % between them, 32px inside each; heads all 32px high. */}
        <div ref={colsRef} className="grid min-h-0 flex-1 gap-y-6 overflow-hidden sm:grid-cols-3 sm:gap-y-0 sm:divide-x sm:divide-ink/8">
          {groups.map(({ group, items }) => {
            const Icon = GROUP_ICONS[group];
            const overflow = items.length > fit;
            const visible = overflow ? items.slice(0, Math.max(0, fit - 1)) : items;
            return (
              <section key={group} aria-labelledby={`todo-${group}`} className="flex min-h-0 min-w-0 flex-col sm:px-8 sm:first:pl-0 sm:last:pr-0">
                <h3 id={`todo-${group}`} className="flex h-8 shrink-0 items-center gap-2 text-ink">
                  <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
                  <span className="text-body-lg font-semibold">{td(`group.${group}`)}</span>
                  {items.length > 0 && <span className="text-body-lg tabular-nums text-ink/60">{items.length}</span>}
                </h3>
                {items.length === 0 ? (
                  <p className="mt-2 flex items-center gap-1.5 text-small text-ink/60">
                    {td("allDone")}
                    <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
                  </p>
                ) : (
                  <ul className="mt-2">
                    {visible.map((entry) => (
                      <li key={entry.key} className="border-b border-ink/6">
                        <NeedsRow entry={entry} now={now} />
                      </li>
                    ))}
                    {overflow && (
                      <li className="border-b border-ink/6">
                        <button type="button" onClick={() => setSheet(group)} className="flex h-16 w-full items-center gap-1 px-0 text-body font-semibold text-ink/85 transition-colors hover:text-ink">
                          {td("moreCount", { count: items.length - visible.length })}
                          <ArrowRight aria-hidden className="size-4" />
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>
      {timeline.length > 0 && <ComingUp events={timeline.slice(0, UP_MAX)} now={now} />}
      <Sheet open={sheetGroup !== undefined} onClose={() => setSheet(null)} title={sheetGroup ? td("sheetTitle", { group: td(`group.${sheetGroup.group}`), count: sheetGroup.items.length }) : ""}>
        <ul className="-mx-2">
          {sheetGroup?.items.map((entry) => (
            <li key={entry.key}>
              <TodoRow entry={entry} now={now} onDone={() => setSheet(null)} />
            </li>
          ))}
        </ul>
      </Sheet>
    </section>
  );
}

/**
 * "COMING UP" as one line (56px): the label left, beside it up to three events – a dot (orange within 7 days, else cream 30 %), the date,
 * what · short name; each opens its House. Nothing coming: no line.
 */
function ComingUp({ events, now }: { events: TimelineEvent[]; now: string }) {
  const td = useTranslations("houses.home.dash");
  const f = useFormat();
  return (
    <section aria-labelledby="coming-up" className="flex h-14 shrink-0 items-center gap-6 border-t border-ink/6">
      <h3 id="coming-up" className="shrink-0 text-eyebrow uppercase text-ink/60">
        {td("comingUp")}
      </h3>
      <ul className="flex min-w-0 flex-1 items-center gap-6 overflow-hidden">
        {/* Phones: only the next one (three don't fit in one line). */}
        {events.map((event, i) => (
          <li key={event.key} className={cn("min-w-0 shrink", i > 0 && "max-sm:hidden")}>
            <Link href={`/h/${event.stay.id}`} className="flex min-w-0 items-center gap-2 rounded-lg text-small transition-colors duration-150 hover:text-ink">
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", daysUntil(event.at, now) <= 7 ? "bg-accent" : "bg-ink/30")} />
              <span className="shrink-0 tabular-nums text-ink/60">{f.day(event.at)}</span>
              <span className="min-w-0 truncate text-ink">
                <span className="font-semibold">{td(`timeline.${event.kind}`)}</span>
                <span className="text-ink/60"> · {shortNameOf(event.stay)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A task in the list: 64px – the photo (48px, rounded square), what, "short name · deadline" (under 24h orange), a chevron on hover. */
function NeedsRow({ entry, now }: { entry: TodoEntry; now: string }) {
  const left = countdownOf(entry.due, now);
  const body = (
    <>
      <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink/10 text-ink [&_svg]:size-5">
        {entry.photo ? <Img src={entry.photo} alt="" fill sizes="48px" className="object-cover" /> : entry.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-semibold text-ink">{entry.what}</span>
        <span className="block truncate text-small text-ink/60">
          {entry.short}
          {left && (
            <>
              {" · "}
              <span className={cn("tabular-nums", left.urgent && "font-semibold text-accent")}>{left.text}</span>
            </>
          )}
        </span>
      </span>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-ink/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
    </>
  );
  const row = "group -mx-2 flex h-16 w-[calc(100%+16px)] items-center gap-3 rounded-xl px-2 text-left transition-colors duration-150 hover:bg-ink/6";
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
      <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden [&_svg]:size-4", dark ? "size-9 rounded-[9px] bg-ink/10 text-ink" : "size-10 rounded-[10px] bg-ink/6 text-ink")}>
        {entry.photo ? <Img src={entry.photo} alt="" fill sizes="40px" className="object-cover" /> : entry.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-body", dark ? "font-semibold text-ink" : "text-ink")}>{entry.what}</span>
        <span className={cn("block truncate text-small", dark ? "text-ink/60" : "text-muted")}>{entry.short}</span>
      </span>
      {left && <span className={cn("shrink-0 text-small tabular-nums", left.urgent ? "font-semibold text-accent" : dark ? "text-ink/60" : "text-muted")}>{left.text}</span>}
      {!dark && <ChevronRight aria-hidden className="size-4 shrink-0 text-ink/30" />}
    </>
  );
  const row = cn("flex items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors duration-150", dark ? "-mx-2 w-[calc(100%+16px)] hover:bg-ink/8" : "w-full hover:bg-ink/4");
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
function PayoutsFooter({ hosts, earnings, hostingCount, setUp, hasRequests, openRequests }: { hosts: boolean; earnings: Earnings; hostingCount: number; /** A payout account exists: else "Payouts not set up" instead of the next payout */ setUp: boolean; /** Anyone ever asked to join one of the Houses */ hasRequests: boolean; /** Requests waiting for an answer now */ openRequests: number }) {
  const td = useTranslations("houses.home.dash");
  const t = useTranslations("houses.home");
  const f = useFormat();
  const store = useStore();
  const viewer = usePreferredCurrency();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  // A dark strip (the global Ember: ember-band.png) across the whole band from the photo's edge to the window's, a hard edge on top, 120px,
  // its foot flush with the photo's; numbers cream 40px, labels cream 65 %, dividers cream 12 %, the arrow cream. The content on the grid.
  const foot = "ember ember-strip band-inset flex h-30 shrink-0 items-center gap-6 text-left";
  if (!hosts) {
    return (
      <div className={foot}>
        <p className="min-w-0 flex-1 truncate text-body text-muted">
          <span className="font-semibold text-ink">{td("hostOwnTitle")}</span> · {t("openHouseText")}
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
  // `words`: a phrase in the value's place ("Next payout · Feb 13", "Open for requests") – a step smaller than the 40px numbers.
  const figures: { key: string; value: string; label: string; big?: boolean; wide?: boolean; dot?: boolean; words?: boolean }[] = [
    pro ? { key: "earned", value: money(stats.earningsThisYear), label: td("strip.earned"), big: true } : { key: "paid", value: money(earnings.thisYear), label: td("strip.paidOut"), big: true },
    // The next payout: the same number as on Payouts (lib/earnings next – everything still to be paid out, with the next date).
    ...(!setUp ? [{ key: "next", value: td("payoutsNotSetUp"), label: "", dot: true, words: true }] : earnings.next ? [{ key: "next", value: money(earnings.next.amount), label: td("nextPayoutChip", { date: f.day(earnings.next.date) }) }] : []),
    { key: "hosting", value: String(hostingCount), label: td("strip.hosting", { count: hostingCount }) },
    // Never "0 % full": with nobody in yet "Open for requests" (no request at all) or "{n} requests" (some waiting); "N % full" once anyone's in.
    ...(stats.houses > 0
      ? [
          stats.fullShare > 0
            ? { key: "full", value: `${Math.round(stats.fullShare * 100)} %`, label: td("strip.full"), wide: true }
            : hasRequests && openRequests > 0
              ? { key: "full", value: String(openRequests), label: td("strip.requests", { count: openRequests }), wide: true }
              : { key: "full", value: td("openForRequests"), label: "", wide: true, words: true },
        ]
      : []),
  ];
  return (
    <Link href="/your-houses/payouts" aria-label={td("payoutsTitle")} className={cn(foot, "transition-[filter] duration-150 hover:brightness-110")}>
      <span className="flex min-w-0 flex-1 items-center overflow-hidden whitespace-nowrap">
        {figures.map((fig, i) => (
          <span key={fig.key} className={cn("flex shrink-0 items-baseline gap-2 px-4 first:pl-0 xl:px-6", i > 0 && "border-l border-ink/12", fig.wide && "hidden xl:flex")}>
            {fig.dot && <span aria-hidden className="size-2 shrink-0 self-center rounded-full bg-accent" />}
            {/* Numbers 40px (h1); words in the value's place ("Next payout · Feb 13", "Open for requests") a step smaller. */}
            <span className={cn("tabular-nums text-ink", fig.words ? "text-h3" : "text-h1")}>{fig.value}</span>
            {fig.label && <span className="text-small text-muted">{fig.label}</span>}
          </span>
        ))}
      </span>
      <ArrowUpRight aria-hidden className="size-5 shrink-0 text-ink" />
    </Link>
  );
}

/**
 * Lived in: the one HouseCard (the host's tab, or "You"), footer "memory": left the crew's faces and "Lived with · Nov 2026", right the light
 * glass "Do it again" (Open a House filled in from it, the crew of then invited). Same size as the grid's cards, on a shelf.
 */
function LivedInCard({ stay }: { stay: Stay }) {
  const td = useTranslations("houses.home.dash");
  const router = useRouter();
  // Smaller (1:1), its status "Do it again" – Open a House with everything but the dates, the old crew picked in "Fill your House".
  return (
    <MyHouseTile
      stay={stay}
      square
      href={manageHref(stay)}
      status={
        <button type="button" onClick={() => router.push(againHref(stay.id))} className="text-small font-semibold text-ink underline-offset-4 hover:underline">
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
