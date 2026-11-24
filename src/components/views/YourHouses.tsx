"use client";

import { FRAME_BODY_TOP, PageFrame } from "@/components/PageFrame";

import { profileHref } from "@/lib/privacy";
import { useOpenHouseEntry } from "@/components/platform/useOpenHouseEntry";
import { useReloadOnReturn } from "@/lib/useReloadOnReturn";
import { BackLink } from "@/components/ui/BackButton";
import { ArrowRight, Check, ChevronLeft, ChevronRight, CreditCard, MessageCircleReply, Plus, Settings2, ShieldCheck, UserRound, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useYourPeople } from "@/lib/useYourPeople";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Fragment, Suspense, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { usePlaceCards } from "@/components/places/YourPlaces";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { clearDraft, readDraft, toInput } from "@/components/create/model";
import { CardStatusChip, HouseCard } from "@/components/HouseCard";
import { Container } from "@/components/layout/Container";
import { MyHouseTile } from "@/components/MyHouseTile";
import { CrewRow } from "@/components/CrewRow";
import { UP_NEXT_EMPTY_IMAGE, upNextOf } from "@/config/upnext";
import { cardGradient, cardTextShadow } from "@/components/ui/glass";
import { PayoutSetupSheet } from "@/components/payouts/PayoutSetup";
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
import { areaHref, focusOfTask, hostManageHref, manageHref, stepHref } from "@/lib/houseTasks";
import { Avatar } from "@/components/ui/Avatar";
import { useCardTask, useNeedsYou } from "@/lib/needsYou";
import { StripRow } from "@/components/StripFig";
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
  const lgUp = useMediaQuery(MEDIA.desktop);
  const smUp = useMediaQuery(MEDIA.tabletUp);
  // Rows show four tiles from 1100px (two and a bit on tablets, one on phones) – "See all" only with more.
  const myCols = lgUp ? 4 : smUp ? 2 : 1;
  const tPlaces = useTranslations("houses.places");
  const placeCards = usePlaceCards(today);
  const probe = <div ref={setColumnProbe} aria-hidden className={cn(EXPLORE_GRID, "h-0")} />;
  // Saved: the Houses you hearted, as the same compact tile as your own (CLAUDE.md "Ein Seiten-Gerüst") – no large Explore cards; "See all" → /saved.
  const savedCards = (store.users.find((u) => u.id === me)?.savedStayIds ?? [])
    .map((id) => store.stays.find((s) => s.id === id))
    .filter((stay): stay is NonNullable<typeof stay> => Boolean(stay))
    .map((stay) => ({ key: stay.id, node: <SavedTile stay={stay} now={now} /> }));
  const nextTripCards = nextTrip.map((stay) => ({ key: stay.id, node: <HouseCard variant="shelf" stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} /> }));

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
    { key: "going", cards: groupCards("going") },
    { key: "waiting", cards: groupCards("waiting") },
    // Hosting ends with "Open a House" in the same size (a light placeholder with a plus).
    { key: "hosting", cards: groupCards("hosting"), extra: <OpenHouseTile /> },
    { key: "livedIn", cards: livedIn.map((stay) => ({ key: stay.id, node: <LivedInCard stay={stay} /> })) },
    { key: "saved", cards: savedCards },
    { key: "nextTrip", cards: nextTripCards },
  ];
  // No tabs (CLAUDE.md "Your houses – Reihen statt Reiter"): under the strip the rows Going · Waiting · Hosting · Your places · Lived in · Saved,
  // a title without a count each; empty rows left out (Hosting only with Houses or drafts of your own).
  const shown = rows.filter((row) => row.key !== "nextTrip" && row.cards.length > 0);

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
          {/* For your next trip in its grid: the grid's card with its gallery (the row's card shows the cover only). */}
          {(group === "nextTrip" ? nextTrip.map((stay) => ({ key: stay.id, node: <HouseCard stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} /> })) : row.cards).map((c) => (
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
        // The strip: its content (~82px) with 28px above and below (CLAUDE.md "PageFrame – erster Bildschirm immer geschlossen").
        stripHeight="138px"
        bodyClassName="split:pb-0"
        // The to-dos on the page's own surface – no colour of their own (CLAUDE.md "Ein Seiten-Gerüst").
        stageClassName="stage-page"
        strip={
          <StageStrip
            today={today}
            host={hasHosted}
            earnings={earnings}
            hosting={hosting}
            going={groups.find((g) => g.key === "going")!.items.map((item) => item.stay)}
            waiting={groups.find((g) => g.key === "waiting")!.items.map((item) => item.stay)}
            livedIn={livedIn}
            payOk={payOk}
          />
        }
        media={<UpNextMedia stay={upNext} lastLived={livedIn[0]} request={upNext ? joined.find((j) => j.stay.id === upNext.id)?.request : undefined} now={now} news={upNext ? activity.get(upNext.id) : undefined} />}>
        <TodoTile groups={payOk ? TODO_GROUPS : TODO_GROUPS.filter((g) => g !== "pay")} entries={todo} now={now} />
      </PageFrame>
    <Container className={cn("explore-width explore-root", nextTripCards.length > 0 ? "pb-0" : "pb-16")}>
      {probe}
      {/* The rows right under the strip: 32px down, 40px apart – each four tiles, more scroll sideways (the shelf of Explore) with "See all →". */}
      <div className={cn(FRAME_BODY_TOP, "flex flex-col gap-10")}>
        {shown.map((row) => (
          <Fragment key={row.key}>
            <CardRow
              id={row.key}
              title={tDash(`rows.${row.key}`)}
              cards={row.cards}
              extra={row.extra}
              cols={myCols}
              showCount={false}
              slideClass="my-slide"
              seeAll={row.key === "saved" ? "/saved" : `/your-houses/all/${row.key}`}
            />
            {row.key === "hosting" && placeCards.length > 0 && <CardRow id="places" title={tPlaces("title")} cards={placeCards} cols={myCols} showCount={false} slideClass="my-slide" />}
          </Fragment>
        ))}
        {/* Your places also without Houses of your own (the hosting row left out). */}
        {!shown.some((row) => row.key === "hosting") && placeCards.length > 0 && <CardRow id="places" title={tPlaces("title")} cards={placeCards} cols={myCols} showCount={false} slideClass="my-slide" />}
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
    <DarkBand className="mb-0 mt-16" pageEnd>
      <CardRow id="nextTrip" title={title} cards={cards} cols={cols} showCount={false} seeAll="/your-houses/all/nextTrip" />
    </DarkBand>
  );
}

/** The one grid of your own tiles: equal columns, 4 · 3 · 2. */
const MY_GRID = "grid grid-cols-2 gap-x-(--explore-gap) gap-y-8 md:grid-cols-3 split:grid-cols-4";

/** A saved House as the tile: its label "2 spots left" (or "Crew complete", "Happening now"). */
function SavedTile({ stay, now }: { stay: Stay; now: string }) {
  const statusText = useStatusText();
  return <MyHouseTile stay={stay} href={`/house/${stay.slug}`} label={statusText(stay, now)} />;
}

/** What a task asks, as the tile's label: "Review 4 requests", "Pay · 48h", "Answer invite" (houses.home.task.*.action). */
function useTaskLabel() {
  const t = useTranslations("houses.home.task");
  return (task: NonNullable<ReturnType<ReturnType<typeof useCardTask>>>, now: string) => {
    const hours = task.date ? Math.max(1, Math.ceil((Date.parse(task.date) - Date.parse(now)) / 3_600_000)) : 0;
    return t(`${task.kind}.action`, { count: task.count ?? 0, hours });
  };
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
 * One of your Houses (Going · Waiting · Hosting) as the tile (CLAUDE.md "Your houses – Reihen statt Reiter"). Its label, top left: what's
 * asked of you with the small orange dot ("Review 4 requests", "Pay · 48h", "Answer invite" – the tile opens the House right there), else
 * Going "in 66 days" (on now: "Happening now"), Waiting "Waiting for host" / "Waitlist #2", Hosting "2 of 4 in". Unread news: the dot too;
 * opening it marks it read.
 */
function YourHouseCard({ stay, now, request, unread = false, onRead }: { stay: Stay; now: string; request?: JoinRequest; unread?: boolean; onRead?: () => void }) {
  const t = useTranslations("houses.home");
  const store = useStore();
  const statusText = useStatusText();
  const taskLabel = useTaskLabel();
  const failed = request ? didntWorkOut(request) : false;
  const taskOf = useCardTask();
  const task = failed ? null : taskOf(stay, now);
  const hosting = stay.hostId === store.currentUserId;
  const today = now.slice(0, 10);
  const days = stay.startDate ? Math.round((Date.parse(stay.startDate) - Date.parse(today)) / 86_400_000) : null;
  const going = request?.status === "accepted";
  const calm = hosting
    ? t("tileCrewIn", { filled: crewInOf(store, stay), total: stay.spotsTotal })
    : going && days !== null && days > 0
      ? t("tileInDays", { days })
      : statusText(stay, now, request);
  return (
    <MyHouseTile
      stay={stay}
      // Where each row leads (CLAUDE.md "Klare Ziele für alle House-Karten"): Hosting → the area's Manage tab; Going → the area's Chat (a task
      // opens its place: Pay → Plan with the pay window); Waiting (asked, invited, waitlist) → the public House page, at its top.
      href={
        hosting
          ? hostManageHref(stay, task ? focusOfTask(task.kind) : undefined)
          : going
            ? task
              ? areaHref(stay, undefined, focusOfTask(task.kind))
              : areaHref(stay, "chat")
            : `/house/${stay.slug}`
      }
      onClickCapture={unread ? onRead : undefined}
      label={task ? taskLabel(task, now) : calm}
      attention={Boolean(task) || unread}
    />
  );
}

/**
 * A draft as a MyHouseTile: "● Continue draft"; without a photo the calm placeholder; "…" › "Delete draft" with a small
 * confirmation. The card and Continue lead into the flow.
 */
function DraftCard({ stay, href, onDelete }: { stay: Stay; href: string; onDelete: () => void }) {
  const t = useTranslations("houses.home");
  const showToast = useToast();
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <MyHouseTile
        stay={stay}
        href={href}
        label={t("draftLabel")}
        menu={<MoreMenu label={t("draftOptions")} buttonClassName={iconButtonStyles("sm", undefined, "onImage")} items={[{ label: t("deleteDraft"), danger: true, onSelect: () => setConfirming(true) }]} />}
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

/** Hosting's last tile: "Open a House" in the same size – a light placeholder with a plus, no dashed edge (CLAUDE.md "Your houses – Reihen statt Reiter"). */
function OpenHouseTile() {
  const t = useTranslations("houses.home");
  const entry = useOpenHouseEntry();
  return (
    <Link
      href={entry.href}
      data-house-card="open"
      className="group flex aspect-4/3 min-w-0 flex-col items-center justify-center gap-3 rounded-2xl bg-ink/4 transition-colors duration-150 hover:bg-ink/7 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-ink/8 text-ink transition-transform duration-150 group-hover:scale-105 motion-reduce:transition-none">
        <Plus className="size-5" aria-hidden />
      </span>
      <span className="text-body-lg font-semibold text-ink">{entry.allowed ? t("openHouse") : entry.label}</span>
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

/** A column's order: the shortest deadline first (none last). */
const byDeadline = (a: TodoEntry, b: TodoEntry) => (a.due ?? "9999").localeCompare(b.due ?? "9999");

/**
 * "Needs you · N", Ember (the global class), two thirds wide and exactly as high as Up next; Payouts its footer. Three fixed columns of the same
 * width – Pay · Reply · Set up (config/todo.ts): each headed by its icon 20px, the word and how many are open; an empty one says only "All
 * done ✓". Entries of 64px (photo 48px, what, "short name · deadline", under 24h orange) – as many as fit the column's height (measured); more:
 * the last row "+N more →", which opens a sheet "{Column} · {n}" with all of them. An entry leads to its House (/h/[id]?step=…). Under the
 * columns one line "COMING UP" (56px). Phones: the columns under each other, three entries each at most.
 */
function TodoTile({ groups: shownGroups = TODO_GROUPS, entries, now }: { /** The columns shown (before the launch and in the beta without Pay) */ groups?: readonly TodoGroup[]; entries: TodoEntry[]; now: string }) {
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
        <div ref={colsRef} className="flex min-h-0 flex-1 flex-col">
        {total === 0 ? (
          // Nothing to do anywhere: one calm state instead of three "All done" columns.
          <div className="flex flex-1 flex-col justify-center">
            <p className="flex items-center gap-2 text-h2 text-ink">
              {td("allCaughtUp")}
              <Check aria-hidden className="size-6 text-ink/60" strokeWidth={2.25} />
            </p>
            <p className="mt-2 text-body text-ink/60">{td("allSetHint")}</p>
          </div>
        ) : (
        <div className={cn("grid min-h-0 flex-1 gap-y-6 overflow-hidden sm:gap-y-0 sm:divide-x sm:divide-ink/8", groups.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
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
        )}
        </div>
      </div>
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
 * The dark strip under Up next and the to-dos (CLAUDE.md "Your houses – Kennzahlen-Streifen klarer"): a quarter lower than the House page's
 * (--stage-bar-h × 0.75), four equal blocks – each a small label (13px, capitals, muted), a large number (text-h1, ~36px) and one line
 * (14px). Each block is one link as a whole (hover: a little lighter, pointer), no arrows. A host: EARNED THIS MONTH (money only once
 * payments are on, else GOING) · HOSTING · YOUR HOUSE · YOUR PEOPLE; without a House hosted: GOING · WAITING · LIVED IN · YOUR PEOPLE.
 * Phones: lower, the blocks one sideways-scrolling row (StripRow).
 */
function StageStrip({ today, host, earnings, hosting, going, waiting, livedIn, payOk }: { today: string; host: boolean; earnings: Earnings; hosting: Stay[]; going: Stay[]; waiting: Stay[]; livedIn: Stay[]; payOk: boolean }) {
  const tb = useTranslations("houses.home.dash.blocks");
  const f = useFormat();
  const store = useStore();
  const viewer = usePreferredCurrency();
  const people = useYourPeople();
  const money = (eur: number) => f.price(Math.round(convertApprox(eur, "EUR", viewer)), viewer);
  const stats = host ? hostStatsFor(store, earnings, store.currentUserId ?? "", today) : null;
  type Block = { key: string; label: string; value: string; line: string; href: string };
  const month = earnings.months.find((m) => m.month === today.slice(0, 7))?.amount ?? 0;
  const year = stats?.type === "pro" ? stats.earningsThisYear : earnings.thisYear;
  const names = (stays: Stay[], empty: string) => (stays.length === 0 ? empty : stays.length === 1 ? shortNameOf(stays[0]) : tb("andMore", { name: shortNameOf(stays[0]), count: stays.length - 1 }));
  const filled = hosting.reduce((sum, s) => sum + crewInOf(store, s), 0);
  const total = hosting.reduce((sum, s) => sum + s.spotsTotal, 0);
  const goingBlock: Block = { key: "going", label: tb("going"), value: String(going.length), line: names(going, tb("goingNone")), href: "/your-houses#row-going" };
  const peopleBlock: Block = { key: "people", label: tb("people"), value: String(people.length), line: tb("peopleLine"), href: "/people" };
  const blocks: Block[] = host
    ? [
        payOk ? { key: "earned", label: tb("earned"), value: money(month), line: tb("earnedYear", { amount: money(year) }), href: "/your-houses/payouts" } : goingBlock,
        { key: "hosting", label: tb("hosting"), value: tb("houses", { count: hosting.length }), line: names(hosting, tb("hostingNone")), href: "/your-houses#row-hosting" },
        {
          key: "house",
          label: tb("house", { count: hosting.length }),
          value: total > 0 ? tb("full", { percent: Math.round((filled / total) * 100) }) : "–",
          line: total > 0 ? tb("spots", { filled, total }) : tb("hostingNone"),
          href: "/your-houses#row-hosting",
        },
        peopleBlock,
      ]
    : [
        goingBlock,
        { key: "waiting", label: tb("waiting"), value: String(waiting.length), line: names(waiting, tb("waitingNone")), href: "/your-houses#row-waiting" },
        { key: "livedIn", label: tb("livedIn"), value: String(livedIn.length), line: tb("countries", { count: new Set(livedIn.map((s) => s.location.country).filter(Boolean)).size }), href: "/your-houses#row-livedIn" },
        peopleBlock,
      ];
  return (
    <div data-surface="dark" className="ember ember-strip band-inset band-inset-full flex items-stretch py-3 md:h-(--frame-strip-h) md:py-0">
      <StripRow className="flex-1 items-stretch md:-mx-6 md:grid md:grid-cols-4">
        {blocks.map((block) => (
          <Link
            key={block.key}
            href={block.href}
            // The whole block is the link (hover lighter); between the blocks a fine line that keeps clear of the strip's edges (24px).
            className="relative flex min-w-44 shrink-0 cursor-pointer flex-col justify-center px-6 transition-colors duration-150 before:absolute before:inset-y-6 before:left-0 before:w-px before:bg-ink/12 first:before:hidden hover:bg-ink/6 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring) md:min-w-0"
          >
            <span className="truncate text-small uppercase text-ink/60">{block.label}</span>
            <span className="mt-1 truncate text-h1 tabular-nums text-ink">{block.value}</span>
            <span className="mt-0.5 truncate text-nav font-normal text-ink/70">{block.line}</span>
          </Link>
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
  // The label "Do it again" is its own button: Open a House with everything but the dates, the old crew picked in "Fill your House".
  // Lived in → the area's Moments tab (its dark strip has "Do it again" too).
  return <MyHouseTile stay={stay} href={areaHref(stay, "moments")} label={td("doItAgain")} labelAction={() => router.push(againHref(stay.id))} />;
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
