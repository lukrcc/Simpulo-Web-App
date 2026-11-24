"use client";

import { PageFrame } from "@/components/PageFrame";

import { profileHref } from "@/lib/privacy";
import { useOpenHouseEntry } from "@/components/platform/useOpenHouseEntry";
import { useReloadOnReturn } from "@/lib/useReloadOnReturn";
import { BackLink } from "@/components/ui/BackButton";
import { ArrowRight, Check, ChevronLeft, ChevronRight, CreditCard, MessageCircleReply, Plus, Settings2, ShieldCheck, UserRound, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useYourPeople } from "@/lib/useYourPeople";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Fragment, Suspense, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { TabBar } from "@/components/ui/TabBar";
import { YourPlaces } from "@/components/places/YourPlaces";
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
import { CardTaskAction } from "@/components/stay/CardTask";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { againHref } from "@/components/create/model";
import { TODO_GROUP, TODO_GROUPS, TODO_URGENT_HOURS, type TodoGroup, type TodoKind } from "@/config/todo";
import { activitySummary, isDiscovery, type ActivitySummary } from "@/config/activity";
import { useNotifications } from "@/components/notifications/useNotifications";
import { Sheet } from "@/components/ui/Sheet";
import { DarkBand } from "@/components/ui/DarkBand";
import { canPay, usePlatformPhase } from "@/config/platform";
import { getVisibleHouses } from "@/lib/data/visibleHouses";
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
import { focusOfTask, manageHref, stepHref } from "@/lib/houseTasks";
import { daysUntil, timelineFor, type TimelineEvent } from "@/lib/timeline";
import { Avatar } from "@/components/ui/Avatar";
import { acceptedOverlaps } from "@/lib/overlap";
import { useCardTask, useNeedsYou } from "@/lib/needsYou";
import { StripFig, StripRow } from "@/components/StripFig";
import { usePayoutAccount } from "@/lib/payments/hooks";
import { useGridColumns } from "@/lib/useGridColumns";
import { didntWorkOut } from "@/lib/requests";
import { crewInOf, crewThreadId, findUser, getCrew, getCrewThread, getCurrentUser, getMyPayment, isCrewMember, settingsOf, useStore } from "@/lib/store";
import type { JoinRequest, Stay } from "@/lib/types";
import { cn, housePhotos, openSpots } from "@/lib/utils";
import { waitlistPosition } from "@/lib/waitlist";
import { MEDIA } from "@/config/breakpoints";

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
      {/* useSearchParams (the Joining · Hosting tab) suspends while prerendering – its own boundary. */}
      <Suspense fallback={null}>
        <YourHousesContent group={group} />
      </Suspense>
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
  // Two tabs under the band (CLAUDE.md "Your houses: Joining · Hosting"), in the URL (?tab=hosting) so Back and links work.
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // The Open a House flow's own draft (this browser), shown with the draft Houses.
  const [localDraft, setLocalDraft] = useState<ReturnType<typeof readDraft>>(() => (typeof window === "undefined" ? null : readDraft()));
  const ownLocalDraft = localDraft && (!localDraft.ownerId || localDraft.ownerId === me) ? localDraft : null;

  const over = (s: Stay) => s.status === "completed" || s.endDate < today;
  // Example Houses (pre-launch, beta) belong to nobody: never yours, never "Lived in" (only the real ones count here).
  const hosting = store.stays.filter((s) => !s.isExample && s.hostId === me && (s.status === "published" || s.status === "booked" || s.status === "closed") && !over(s));
  const drafts = store.stays.filter((s) => s.hostId === me && s.status === "draft");
  const joined = store.joinRequests
    .filter((r) => r.userId === me && ["accepted", "pending", "invited", "waitlist_requested", "waitlisted"].includes(r.status))
    .flatMap((r) => {
      const stay = store.stays.find((s) => s.id === r.stayId);
      return stay && !over(stay) ? [{ request: r, stay }] : [];
    });
  const past = store.stays.filter((s) => !s.isExample && over(s) && (s.hostId === me || isCrewMember(store, s, me)));
  // Declined or expired – for the guest the same: it didn't work out. With the past ones.
  const didntWork = store.joinRequests
    .filter((r) => r.userId === me && didntWorkOut(r))
    .flatMap((r) => {
      const stay = store.stays.find((s) => s.id === r.stayId);
      return stay && !over(stay) && !joined.some((j) => j.stay.id === stay.id) ? [{ request: r, stay }] : [];
    });
  const hosts = hosting.length > 0 || drafts.length > 0 || Boolean(ownLocalDraft);
  const hasHosted = hosts || earnings.any || past.some((s) => s.hostId === me);

  const taskOf = useCardTask();
  const needsYou = useNeedsYou(now, Boolean(ownLocalDraft));
  // Before the launch and in the beta nothing is paid (config/platform.ts): no Pay column, no Payouts strip.
  const payOk = canPay(usePlatformPhase());
  const waits = (s: Stay) => taskOf(s, now) !== null;
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
  // Your own Houses' rows: 5 a row from 1440px, 4 from 1100, 3 from 744, else 2 (globals.css --my-cols) – for "See all".
  const xlUp = useMediaQuery(MEDIA.wide);
  const lgUp = useMediaQuery(MEDIA.desktop);
  const smUp = useMediaQuery(MEDIA.tabletUp);
  const myCols = xlUp ? 5 : lgUp ? 4 : smUp ? 3 : 2;
  const probe = <div ref={setColumnProbe} aria-hidden className={cn(EXPLORE_GRID, "h-0")} />;
  // Saved: the Houses you hearted, as the same compact tile as your own (CLAUDE.md "Ein Seiten-Gerüst") – no large Explore cards; "See all" → /saved.
  const savedCards = (store.users.find((u) => u.id === me)?.savedStayIds ?? [])
    .map((id) => store.stays.find((s) => s.id === id))
    .filter((stay): stay is NonNullable<typeof stay> => Boolean(stay))
    .map((stay) => ({ key: stay.id, node: <SavedTile stay={stay} now={now} /> }));
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
  // Every open task across your Houses, the payout account and the profile to set up – from lib/needsYou.ts, the same list as the header's
  // number on "Your houses" (ordered in TodoTile, config/todo.ts).
  const overlaps = acceptedOverlaps(store);
  const todo: TodoEntry[] = needsYou.map((entry): TodoEntry => {
    switch (entry.kind) {
      case "overlap":
        // Two acceptances on the same nights, neither paid: pick one (PARALLEL_POLICY). Several: ONE entry that opens all of them.
        return {
          key: entry.key,
          kind: "overlap",
          title: tDash("todo.overlap", { count: entry.overlaps.length }),
          sub: entry.overlaps.map(([a, b]) => `${a.title} · ${b.title}`).join(" · "),
          what: tDash("need.overlap", { count: entry.overlaps.length, amount: "" }),
          short: [...new Set(entry.overlaps.flat().map(shortNameOf))].join(" · "),
          photo: housePhotos(entry.overlaps[0][0], findUser(store, entry.overlaps[0][0].hostId))[0],
          onClick: () => setPicking(entry.overlaps),
        };
      case "fill":
        // A House of yours starting within 30 days and under half full: "Fill 3 spots" – the invite sheet (Reply).
        return {
          key: entry.key,
          kind: "fill",
          title: tDash("todo.fill", { count: openSpots(entry.stay) }),
          sub: entry.stay.title,
          what: tDash("need.fill", { count: openSpots(entry.stay), amount: "" }),
          short: shortNameOf(entry.stay),
          photo: housePhotos(entry.stay, findUser(store, entry.stay.hostId))[0],
          href: stepHref(entry.stay, "invite"),
        };
      case "payouts":
        // Payouts only while no payout account is set up; the ID check is part of it ("Bank account + ID check, 5 min").
        return { key: "payouts", kind: "payouts", title: tDash("todo.payouts"), sub: tDash("setUpText"), what: tDash("need.payouts", { count: 0, amount: "" }), short: tDash("payoutsSetupSub"), icon: <Wallet aria-hidden />, onClick: () => setPayoutSheet(true) };
      case "verify":
        // "Verify your ID" on its own only for guests who don't host – and only as an option.
        return { key: "verify", kind: "verify", title: tDash("todo.verify"), sub: tDash("setupWhere"), what: tDash("need.verify", { count: 0, amount: "" }), short: tDash("optional"), icon: <ShieldCheck aria-hidden />, href: "/settings#payments" };
      case "profile":
        return { key: "profile", kind: "profile", title: tDash("todo.profile"), sub: tDash("profileText"), what: tDash("need.profile", { count: 0, amount: "" }), short: tDash("setupWhere"), icon: <UserRound aria-hidden />, href: "/settings/profile" };
      default: {
        const { stay, task } = entry;
        // Pay: the own share in the viewer's currency ("Pay €315", ≈ when the House's currency differs).
        const share = task.kind === "pay" ? (getMyPayment(store, stay.id)?.total ?? stay.pricePerPerson ?? 0) : 0;
        const amount = `${stay.currency === viewer ? "" : "≈ "}${f.price(Math.round(convertApprox(share, stay.currency, viewer)), viewer)}`;
        return {
          key: entry.key,
          kind: task.kind,
          title: tDash(`todo.${task.kind}`, { count: task.count ?? 0 }),
          sub: stay.title,
          what: tDash(`need.${task.kind}`, { count: task.count ?? 0, amount }),
          short: shortNameOf(stay),
          due: task.date,
          photo: housePhotos(stay, findUser(store, stay.hostId))[0],
          href: stepHref(stay, focusOfTask(task.kind)),
        };
      }
    }
  });

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
  // Two tabs: Joining (Going · Waiting · Lived in · Saved, your saved people, For your next trip) and Hosting (your Houses and drafts with the
  // dashed "Open a House", Your places, Earnings). Empty rows are left out – Hosting always shows (at least its dashed card).
  const tabParam = params.get("tab");
  const tab: "joining" | "hosting" = tabParam === "hosting" || tabParam === "joining" ? tabParam : hosts && joined.length === 0 ? "hosting" : "joining";
  const setTab = (next: "joining" | "hosting") => router.replace(next === "joining" ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  const shown = rows.filter((row) => row.key !== "nextTrip" && (tab === "hosting" ? row.key === "hosting" : row.key !== "hosting" && row.cards.length > 0));

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
        <ul className={cn(group === "nextTrip" ? EXPLORE_GRID : MY_GRID, "mt-4")}>
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
      <PageFrame
        aria-labelledby="todo"
        // The stage rule (globals.css --stage-image-h): Up next's photo and the right side in one row of that height; the dark strip
        // across the full width under both – the photo ends on top of it. Coming up sits right on the strip (no padding under it).
        fullStrip
        mediaFit="upNext"
        // A breath of Up next's colour on the surface and the strip (lib/stageTint.ts); nothing planned: the plain tokens.
        height="split:h-(--stage-image-h)"
        bodyClassName="split:pb-0"
        // The to-dos on the page's own surface – no colour of their own (CLAUDE.md "Ein Seiten-Gerüst").
        stageClassName="stage-page"
        strip={
          <StageStrip
            today={today}
            host={hasHosted}
            earnings={earnings}
            payoutStatus={payout.status}
            hostingCount={hosting.length}
            livedIn={livedIn}
            payOk={payOk}
          />
        }
        media={<UpNextMedia stay={upNext} lastLived={livedIn[0]} request={upNext ? joined.find((j) => j.stay.id === upNext.id)?.request : undefined} now={now} news={upNext ? activity.get(upNext.id) : undefined} />}>
        <TodoTile groups={payOk ? TODO_GROUPS : TODO_GROUPS.filter((g) => g !== "pay")} entries={todo} now={now} timeline={timelineFor(store, now).filter((e) => !overlaps.some(([a, b]) => a.id === e.stay.id || b.id === e.stay.id))} />
      </PageFrame>
    <Container className={cn("explore-width explore-root", tab === "joining" && nextTripCards.length > 0 ? "pb-0" : "pb-16")}>
      {probe}
      {/* Calm rows, no heading over them: 32px under the band – the window's edge (--stage-peek) cuts under the first row's title, at most
          through the top of its images –, 40px apart. For your next trip is the dark band after them. */}
      <div className="mt-8 flex items-center justify-between gap-4">
        <TabBar
          label={tDash("tabs.label")}
          value={tab}
          onChange={setTab}
          options={[
            { value: "joining", label: tDash("tabs.joining") },
            { value: "hosting", label: tDash("tabs.hosting") },
          ]}
        />
        {tab === "hosting" && hasHosted && (
          <Link href="/your-houses/payouts" className="inline-flex shrink-0 items-center gap-1 text-small font-semibold text-muted transition-colors hover:text-ink">
            {tDash("tabs.earnings")}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        )}
      </div>
      <div className="mt-8 flex flex-col gap-10">
        {tab === "joining" && shown.length === 0 && <p className="text-body text-muted">{tDash("tabs.joiningEmpty")}</p>}
        {shown.map((row) => (
          <Fragment key={row.key}>
            <YourGrid
              id={row.key}
              title={tDash(`rows.${row.key}`)}
              cards={row.cards}
              extra={row.key === "hosting" ? (row.extra ?? (!hosts ? <OpenHouseTile /> : undefined)) : undefined}
            />
            {row.key === "hosting" && <YourPlaces today={today} />}
          </Fragment>
        ))}
        {tab === "joining" && <SavedPeople />}
      </div>
      <PayoutSetupSheet open={payoutSheet} onClose={() => setPayoutSheet(false)} />
      <PickOneSheet pairs={picking} onClose={() => setPicking(null)} />
    </Container>
    {tab === "joining" && nextTripCards.length > 0 && <NextTripBand cards={nextTripCards} cols={cols} title={tDash("rows.nextTrip")} />}
    </>
  );
}

/**
 * "For your next trip": the last section, a dark band like Explore's (ui/DarkBand – hard edges, 64px inside, title and "See all" cream), 64px of
 * the light page above it; no count beside the title.
 */
function NextTripBand({ cards, cols, title }: { cards: { key: string; node: ReactNode }[]; cols: number; title: string }) {
  return (
    <DarkBand className="mb-0 mt-16" pageEnd>
      <CardRow id="nextTrip" title={title} cards={cards} cols={cols} showCount={false} seeAll="/your-houses/all/nextTrip" />
    </DarkBand>
  );
}

/** One section of Your houses (CLAUDE.md "Ein Seiten-Gerüst"): its head ("See all" when there are more than fit), then ONE grid of equal
 *  compact tiles (photo 4:3, title, date · place, status line) – 4 a row from 1100px, 3 on tablets, 2 on phones; at most two rows here. */
const GRID_SHOWN = 8;
function YourGrid({ id, title, cards, extra }: { id: YourRowKey; title: string; cards: { key: string; node: ReactNode }[]; extra?: ReactNode }) {
  const shown = cards.slice(0, extra ? GRID_SHOWN - 1 : GRID_SHOWN);
  return (
    <section aria-labelledby={`row-${id}`}>
      <RowHead id={`row-${id}`} title={title} count={cards.length} seeAll={cards.length > shown.length ? (id === "saved" ? "/saved" : `/your-houses/all/${id}`) : undefined} />
      <ul className={cn(MY_GRID, "mt-4")}>
        {shown.map((c) => (
          <li key={c.key} className="min-w-0">
            {c.node}
          </li>
        ))}
        {extra && <li className="min-w-0">{extra}</li>}
      </ul>
    </section>
  );
}
/** The one grid of your own tiles: equal columns, 4 · 3 · 2. */
const MY_GRID = "grid grid-cols-2 gap-x-(--explore-gap) gap-y-8 md:grid-cols-3 split:grid-cols-4";

/** A saved House as the compact tile: the date left, its state right ("2 spots left", "Crew complete"). */
function SavedTile({ stay, now }: { stay: Stay; now: string }) {
  const statusText = useStatusText();
  return <MyHouseTile stay={stay} href={`/house/${stay.slug}`} status={<MyHouseStatus>{statusText(stay, now)}</MyHouseStatus>} />;
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
    // A spot reserved in the beta (no payment until launch).
    if (request?.reserved && request.status === "accepted") return t("guest.reserved");
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
  const taskOf = useCardTask();
  const task = failed ? null : taskOf(stay, now);
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
  const entry = useOpenHouseEntry();
  return (
    <Link href={entry.href} data-house-card="open" className="group block min-w-0 rounded-2xl">
      <span className="flex aspect-4/3 items-center justify-center rounded-2xl border-[1.5px] border-dashed border-ink/15 transition-colors duration-150 group-hover:border-ink/30 group-hover:bg-ink/3">
        <span className="flex size-12 items-center justify-center rounded-full bg-ink/6 text-ink">
          <Plus className="size-5" aria-hidden />
        </span>
      </span>
      <span className="mt-3 block truncate text-body-lg font-semibold text-ink">{entry.allowed ? t("openHouse") : entry.label}</span>
      <span className="block truncate text-small text-muted">{t("crewChipsIn")}</span>
    </Link>
  );
}

/** A new account: nothing hosted, nothing joined – a calm, centred invitation with the two ways in. */
function NewHere() {
  const t = useTranslations("houses.home.new");
  const entry = useOpenHouseEntry();
  return (
    <Container className="flex min-h-[calc(100dvh-var(--header-total)-var(--space-section))] flex-col items-center justify-center py-(--space-section) text-center">
      <h1 className="text-h1 text-ink">{t("title")}</h1>
      <p className="mt-3 max-w-[480px] text-body-lg text-muted">{t("text")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonStyles("primary", "md")}>
          {t("find")}
        </Link>
        <Link href={entry.href} className={buttonStyles("secondary", "md")}>
          {entry.allowed ? t("open") : entry.label}
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
function UpNextMedia({ stay, lastLived, request, now, news }: { stay?: Stay; /** Nothing next: the House you lived in last – "Do it again" (CLAUDE.md "Ein Seiten-Gerüst") */ lastLived?: Stay; request?: JoinRequest; now: string; news?: ActivitySummary | null }) {
  const t = useTranslations("houses.home");
  const td = useTranslations("houses.home.dash");
  const openEntry = useOpenHouseEntry();
  const format = useFormat();
  const store = useStore();
  const router = useRouter();
  const taskOf = useCardTask();
  // Nothing next: the last House you lived in with "Do it again"; never lived anywhere: a calm "Find your first House →".
  if (!stay && lastLived) {
    const lastPhoto = housePhotos(lastLived, findUser(store, lastLived.hostId))[0];
    return (
      <div className="absolute inset-0">
        {lastPhoto && <Img src={lastPhoto} alt="" fill sizes={`${MEDIA.desktop} 640px, 100vw`} className="object-cover" />}
        <span aria-hidden className={cn("absolute inset-0", cardGradient)} />
        <div className={cn("absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6 text-on-image sm:p-8", cardTextShadow)}>
          <span className="text-eyebrow uppercase text-on-image/85">{td("livedInLast", { month: format.stayDates({ startDate: lastLived.startDate, endDate: lastLived.startDate, datesOpen: true }) })}</span>
          <p className="line-clamp-2 text-h1">{lastLived.title}</p>
          <span className="truncate text-small text-on-image/85">{placeShortOf(lastLived)}</span>
          <div className="mt-2 flex flex-wrap gap-2 [text-shadow:none]">
            <Button variant="cream" onClick={() => router.push(againHref(lastLived.id))}>
              {td("doItAgain")}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  if (!stay) {
    return (
      <div className="absolute inset-0 flex items-end bg-linear-to-br from-(--card-blank-from) to-(--card-blank-to) p-6 sm:p-8">
        <Link href="/explore" className="text-h2 text-ink underline-offset-4 hover:underline">
          {td("findFirst")}
        </Link>
      </div>
    );
  }
  const photo = housePhotos(stay, findUser(store, stay.hostId))[0];
  const thread = getCrewThread(store, stay.id);
  const chat = thread ? `/messages/${crewThreadId(stay.id)}` : null;
  const today = now.slice(0, 10);
  const days = Math.round((Date.parse(stay.startDate) - Date.parse(today)) / 86_400_000);
  const capsule = stay.startDate <= today ? t("liveNow") : days === 0 ? td("upNextToday") : td("upNextIn", { days });
  const task = taskOf(stay, now);
  const newMessages = news?.unread ? news.messages : 0;
  void request;
  return (
    <Link href={manageHref(stay, task ? focusOfTask(task.kind) : undefined)} aria-label={stay.title} className="group absolute inset-0 block">
      {photo && <Img src={photo} alt="" fill sizes={`${MEDIA.desktop} 640px, 100vw`} className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" />}
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
function TodoTile({ groups: shownGroups = TODO_GROUPS, entries, now, timeline }: { /** The columns shown (before the launch and in the beta without Pay) */ groups?: readonly TodoGroup[]; entries: TodoEntry[]; now: string; timeline: TimelineEvent[] }) {
  const td = useTranslations("houses.home.dash");
  const [sheet, setSheet] = useState<TodoGroup | null>(null);
  const colsRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  // Only from 1100px the card has its fixed height (--hero-h): there the columns are measured; below, three entries each.
  const fixed = useMediaQuery(MEDIA.desktop);
  const total = entries.length;
  const groups = shownGroups.map((group) => ({ group, items: entries.filter((e) => TODO_GROUP[e.kind] === group).toSorted(byDeadline) }));

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
        <div ref={colsRef} className={cn("grid min-h-0 flex-1 gap-y-6 overflow-hidden sm:gap-y-0 sm:divide-x sm:divide-ink/8", groups.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
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
                  {/* Pay and Reply waiting: a small dot in the action orange ("join in") beside the number. */}
                  {items.length > 0 && (group === "pay" || group === "reply") && <span aria-hidden className="size-2 rounded-full bg-(--brand-action)" />}
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
      <ChevronRight aria-hidden className="size-4 shrink-0 text-ink/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100 pointer-coarse:opacity-100" />
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
/**
 * The dark strip under Up next and the right side, across the full width (the stage rule), at most five values with lines between:
 * left always "Next: {House} in {X} days" (a link to the House); a guest adds Houses lived in · Your people; a host earned this year · the
 * payouts status (with its dot) · Houses hosting · fill rate (before the launch and in the beta no money values); someone who's both keeps the
 * host values and Your people. The whole strip opens the host area (Payouts) or, for a guest, the profile; an arrow on the right. Phones: two
 * lines (Next, then the values).
 */
function StageStrip({ today, host, earnings, payoutStatus, hostingCount, livedIn, payOk }: { today: string; host: boolean; earnings: Earnings; payoutStatus: string | null; hostingCount: number; livedIn: Stay[]; payOk: boolean }) {
  const td = useTranslations("houses.home.dash");
  const ts = useTranslations("houses.home.dash.stage");
  const f = useFormat();
  const store = useStore();
  const viewer = usePreferredCurrency();
  const people = useYourPeople();
  const money = (eur: number) => f.price(Math.round(convertApprox(eur, "EUR", viewer)), viewer);
  const stats = host ? hostStatsFor(store, earnings, store.currentUserId ?? "", today) : null;
  // The strip carries the numbers – "Next" is in the photo already. One scale: the number --stage-bar-num, its label --stage-bar-label.
  type Fig = { key: string; value: string; label: string; sub?: string; dot?: boolean; href?: string };
  const month = earnings.months.find((m) => m.month === today.slice(0, 7))?.amount ?? 0;
  const year = stats?.type === "pro" ? stats.earningsThisYear : earnings.thisYear;
  // Payouts only when something is to do: not set up, or Stripe needs a step.
  const payoutsFig: Fig | null =
    payOk && (payoutStatus === "action_required" || payoutStatus === "none" || payoutStatus === null)
      ? { key: "payouts", value: payoutStatus === "action_required" ? ts("payoutsAction") : ts("payoutsSetUp"), label: ts("payoutsLabel"), dot: true, href: "/your-houses/payouts?setup=payouts" }
      : null;
  const peopleFig: Fig = { key: "people", value: String(people.length), label: ts("people"), href: "/people" };
  const hostFigs: Fig[] = stats
    ? [
        ...(payOk ? [{ key: "month", value: money(month), label: ts("thisMonth"), sub: ts("thisYear", { amount: money(year) }), href: "/your-houses/payouts" }] : []),
        ...(payoutsFig ? [payoutsFig] : []),
        { key: "hosting", value: String(hostingCount), label: td("strip.hosting", { count: hostingCount }), href: "/your-houses?tab=hosting#row-hosting" },
        // Never "0 % full": only once anyone's in.
        ...(stats.houses > 0 && stats.fullShare > 0 ? [{ key: "fill", value: `${Math.round(stats.fullShare * 100)} %`, label: ts("fill"), href: "/your-houses?tab=hosting#row-hosting" }] : []),
        peopleFig,
      ]
    : [];
  const countries = new Set(livedIn.map((s) => s.location.country).filter(Boolean)).size;
  const figs: Fig[] = host
    ? hostFigs.slice(0, 5)
    : [
        { key: "livedIn", value: String(livedIn.length), label: ts("livedIn", { count: livedIn.length }) },
        peopleFig,
        { key: "countries", value: String(countries), label: ts("countries", { count: countries }) },
      ];
  return (
    // Never the whole strip a link: each number is its own (→ after its label) – earnings and payouts to the Earnings page (payouts with its
    // set-up window open), hosting and fill rate to the Hosting row, Your people to /people.
    // Phones: lower than the 120px (16px above and below) and the numbers one sideways-scrolling row (StripRow).
    <div data-surface="dark" className="ember ember-strip band-inset band-inset-full flex items-center py-4 md:h-(--stage-bar-h) md:py-0">
      <StripRow className="flex-1 md:flex-nowrap">
        {figs.map((fig) => (
          <StripFig key={fig.key} value={fig.value} label={fig.label} sub={fig.sub} dot={fig.dot} href={fig.href} />
        ))}
      </StripRow>
    </div>
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
  const phase = usePlatformPhase();
  const me = store.currentUserId;
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const repo = useNotifications();
  const mine = store.stays.filter((s) => !s.isExample && involvedIn(store, s));
  const reasons = new Set<string>();
  for (const n of repo.list({ limit: Number.MAX_SAFE_INTEGER }).items) if (n.stayId && isDiscovery(n)) reasons.add(n.stayId);
  const vibes = new Set(mine.map((s) => s.vibe));
  const cities = new Set(mine.map((s) => s.location.city));
  // The Houses anyone may see in this phase (lib/data/visibleHouses.ts) – before the launch the examples.
  const open = getVisibleHouses(store.stays, phase).filter((s) => s.status === "published" && s.acceptingRequests && s.startDate >= today && s.hostId !== me && !mine.includes(s) && openSpots(s) > 0);
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
            <Link href={profileHref(user.id)} className="flex w-20 flex-col items-center text-center">
              <Avatar user={user} size="lg" />
              <span className="mt-2 max-w-full truncate text-body font-semibold text-ink">{user.name.split(" ")[0]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
