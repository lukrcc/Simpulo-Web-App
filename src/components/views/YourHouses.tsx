"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { clearDraft, readDraft, toInput } from "@/components/create/model";
import { CardStatusAction, CardStatusChip, HouseCard } from "@/components/HouseCard";
import { Container } from "@/components/layout/Container";
import { PayoutSetupSheet } from "@/components/payouts/PayoutSetup";
import { CardTaskAction, cardTaskOf } from "@/components/stay/CardTask";
import { buttonStyles } from "@/components/ui/ActionButton";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { iconButtonStyles } from "@/components/ui/IconButton";
import { Img } from "@/components/ui/Img";
import { Panel } from "@/components/ui/Panel";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { HOUSE_GRID } from "@/config/explore";
import { useFormat } from "@/i18n/format";
import { locationOf } from "@/lib/catalog";
import { earningsFor, type Earnings } from "@/lib/earnings";
import { manageHref, type CardTask } from "@/lib/houseTasks";
import type { PayoutAccountStatus } from "@/lib/payments";
import { usePayoutAccount } from "@/lib/payments/hooks";
import { didntWorkOut } from "@/lib/requests";
import { crewThreadId, findUser, getCrew, getCrewThread, getCurrentUser, getMyPayment, isCrewMember, useStore } from "@/lib/store";
import type { JoinRequest, Stay } from "@/lib/types";
import { cn, firstName, housePhotos, openSpots } from "@/lib/utils";
import { waitlistPosition } from "@/lib/waitlist";

/**
 * /your-houses – everything you're part of, as calm as Explore. On top "Up next": the House that starts next (hosted or joined) as one
 * Panel row as high as a HouseCard, with its one action. Under it "All · Hosting · Joined · Past" (?tab=) and ONE grid of HouseCards
 * (footer="status": crew + "N of M", one pill – the action or the status; All leaves out Up next and what didn't work out) – what asks something of you first, then by start date (Past: the
 * newest first). Drafts are cards too ("Draft" + Continue, "…" › Delete draft); the dashed "Open a House" card only under Hosting. The
 * money ("€7,510 received · View payouts →") beside the segment, for hosts. A new account: one calm empty state.
 */
export function YourHouses() {
  const t = useTranslations("houses");
  return (
    <RequireLogin title={t("loginTitle")} description={t("loginDescription")}>
      <YourHousesContent />
    </RequireLogin>
  );
}

type Tab = "all" | "hosting" | "joined" | "past";
const TABS: readonly Tab[] = ["all", "hosting", "joined", "past"];
const noSubscribe = () => () => {};
const TAB_KEY = { all: "tabAll", hosting: "tabHosting", joined: "tabJoined", past: "tabPast" } as const;

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

function YourHousesContent() {
  const t = useTranslations("houses.home");
  const store = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const [now] = useState(() => new Date().toISOString());
  const today = now.slice(0, 10);
  const me = store.currentUserId;
  const meUser = getCurrentUser(store);
  const earnings = earningsFor(store, me, today);
  const payout = usePayoutAccount();
  // ?tab= after hydration: the prerendered page doesn't know the query.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const [picked, setPicked] = useState<Tab | null>(null);
  const fromUrl = params.get("tab") as Tab | null;
  const tab: Tab = picked ?? (hydrated && fromUrl && TABS.includes(fromUrl) ? fromUrl : "all");

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

  // Never hosted, never joined: no cards, no empty sections – one calm invitation.
  if (!hasHosted && joined.length === 0 && past.length === 0 && didntWork.length === 0) return <NewHere />;

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
    ...didntWork.map(({ request, stay }) => ({ key: request.id, stay, waits: false, kind: "past" as const, failed: true, node: <YourHouseCard stay={stay} now={now} request={request} href={`/house/${stay.slug}`} /> })),
    ...past.map((stay) => ({ key: stay.id, stay, waits: false, kind: "past" as const, node: <YourHouseCard stay={stay} now={now} /> })),
  ];
  // Up next: the House you're in (hosting or joined) that starts next – or is on now. In All it isn't in the grid a second time.
  const upNext = [...hosting.filter((s) => s.status !== "closed"), ...joined.filter((j) => j.request.status === "accepted").map((j) => j.stay)].toSorted((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const upNextRequest = upNext ? joined.find((j) => j.stay.id === upNext.id)?.request : undefined;
  // All: everything but what didn't work out (that's only under Past) and the House already shown as Up next.
  const inTab = (item: Item) =>
    tab === "all" ? !item.failed && !(upNext && item.kind !== "draft" && item.stay.id === upNext.id) : tab === "hosting" ? item.kind === "hosting" || item.kind === "draft" : item.kind === tab;
  // What asks something of you first, then by start date; the past (and in All, after the rest) the newest first.
  const sorted = items.filter(inTab).toSorted((a, b) => {
    const pastA = a.kind === "past";
    const pastB = b.kind === "past";
    if (pastA !== pastB) return Number(pastA) - Number(pastB);
    if (pastA) return b.stay.startDate.localeCompare(a.stay.startDate);
    return Number(b.waits) - Number(a.waits) || (a.stay.startDate || "9999").localeCompare(b.stay.startDate || "9999");
  });

  function choose(next: Tab) {
    setPicked(next);
    router.replace(next === "all" ? "/your-houses" : `/your-houses?tab=${next}`, { scroll: false });
  }

  return (
    <Container className="pb-(--space-section) pt-8 md:pt-10">
      {upNext && <UpNext stay={upNext} request={upNextRequest} now={now} />}
      <div className={cn("flex flex-wrap items-center justify-between gap-x-6 gap-y-3", upNext && "mt-12")}>
        <SegmentedControl label={t("tabsLabel")} value={tab} onChange={choose} className="w-full max-w-md" options={TABS.map((value) => ({ value, label: t(TAB_KEY[value]) }))} />
        {hosts && <PayoutsLine earnings={earnings} status={payout.status} />}
      </div>
      {sorted.length === 0 && tab !== "hosting" ? (
        <p className="mt-10 text-body text-muted">{t("tabEmpty")}</p>
      ) : (
        <ul className={cn(HOUSE_GRID, "mt-6")}>
          {sorted.map((item) => (
            <li key={item.key}>{item.node}</li>
          ))}
          {/* The dashed "Open a House" card: only under Hosting, as large as a HouseCard. */}
          {tab === "hosting" && (
            <li>
              <OpenHouseTile />
            </li>
          )}
        </ul>
      )}
    </Container>
  );
}

/**
 * The card pill's text when nothing is asked of you – short, so it never needs an ellipsis: "Cancelled", "Didn't work out", the month of a
 * past House, "Requested", "Waitlist #2", "Happening now", "Booked", "Paid", "2 spots left", "Starts in 12 days".
 */
function useStatusText() {
  const t = useTranslations("houses.home");
  const format = useFormatter();
  const store = useStore();
  return (stay: Stay, now: string, request?: JoinRequest): string => {
    const today = now.slice(0, 10);
    if (stay.status === "closed") return t("guest.cancelled");
    if (request && didntWorkOut(request)) return t("guest.didntWorkOut");
    if (stay.status === "completed" || stay.endDate < today) return format.dateTime(new Date(`${stay.startDate.slice(0, 7)}-01T00:00:00Z`), { month: "short", year: "numeric", timeZone: "UTC" });
    if (request?.status === "pending") return t("guest.requested");
    if (request?.status === "waitlist_requested") return t("guest.waitlistRequested");
    if (request?.status === "waitlisted") return t("guest.waitlisted", { position: waitlistPosition(store, stay.id, request.userId) ?? 1 });
    if (stay.startDate <= today) return t("liveNow");
    if (stay.bookingConfirmedAt) return t("guest.booked");
    if (request && getMyPayment(store, stay.id)?.status === "paid") return t("guest.paid");
    const spots = openSpots(stay);
    if (spots > 0 && stay.acceptingRequests) return t("liveSpotsLeft", { count: spots });
    return startsText(t, stay, today);
  };
}

/** "Starts in 12 days" · "Starts tomorrow" · "Starts today" · "Happening now". */
function startsText(t: ReturnType<typeof useTranslations<"houses.home">>, stay: Stay, today: string): string {
  if (stay.startDate < today) return t("liveNow");
  const days = Math.round((Date.parse(stay.startDate) - Date.parse(today)) / 86_400_000);
  return days === 0 ? t("liveStartsToday") : t("liveStartsIn", { days });
}

/**
 * "Up next": one Panel row over the full width, as high as a HouseCard – left the photo in the card's own 4:5 (one grid column, the same
 * height cap), right the eyebrow "Up next · Starts in 12 days", the title large, dates · place, the crew "2 of 4 · Booked", one line of
 * context (the open task, else the last chat message, else "All set") and bottom right its one button (the task, else Open chat).
 */
function UpNext({ stay, request, now }: { stay: Stay; request?: JoinRequest; now: string }) {
  const t = useTranslations("houses.home");
  const f = useFormat();
  const store = useStore();
  const task = cardTaskOf(store, stay, now);
  const host = findUser(store, stay.hostId);
  const crew = getCrew(store, stay);
  const cover = housePhotos(stay, host)[0];
  const thread = getCrewThread(store, stay.id);
  const chat = thread ? `/messages/${crewThreadId(stay.id)}` : null;
  const today = now.slice(0, 10);
  const spots = openSpots(stay);
  const crewStatus = stay.bookingConfirmedAt
    ? t("guest.booked")
    : request && getMyPayment(store, stay.id)?.status === "paid"
      ? t("guest.paid")
      : spots > 0
        ? t("liveSpotsLeft", { count: spots })
        : t("host.full");
  const last = thread?.messages.findLast((m) => m.senderId !== "system" && m.text.trim() !== "");
  const sender = last ? findUser(store, last.senderId) : undefined;
  const context = task
    ? taskLine(t, f, task)
    : last && sender
      ? `${sender.id === store.currentUserId ? t("you") : firstName(sender)}: ${last.text}`
      : t("upNextAllSet");
  return (
    <section aria-labelledby="up-next" className={HOUSE_GRID}>
      <Panel flush className="relative col-span-full grid grid-cols-subgrid overflow-hidden">
        {/* The photo: one grid column, 4:5 like every HouseCard (data-house-card: the grid's same height cap). */}
        <div data-house-card className="relative aspect-4/5 w-full bg-ink/6">
          {cover && <Img src={cover} alt="" fill sizes="400px" className="object-cover" style={stay.focalPoint ? { objectPosition: `${stay.focalPoint.x}% ${stay.focalPoint.y}%` } : undefined} />}
        </div>
        <div className="flex min-w-0 flex-col py-8 pr-8 max-[47.99rem]:px-6 max-[47.99rem]:pb-6 max-[47.99rem]:pt-0 [grid-column:2/-1] max-[47.99rem]:[grid-column:1/-1]">
          <h2 id="up-next" className="text-eyebrow uppercase text-ink/55">
            {t("upNextEyebrow", { status: startsText(t, stay, today) })}
          </h2>
          <Link href={manageHref(stay)} className="mt-3 block rounded-lg text-h1 text-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-(--focus-ring)">
            <span className="line-clamp-2">{stay.title}</span>
          </Link>
          <p className="mt-2 truncate text-body-lg text-muted">
            {f.stayDatesLong(stay)} · {f.placeName(stay)}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <span className="flex shrink-0 -space-x-2">
              {crew.slice(0, 5).map((member) => (
                <PersonPhoto key={member.id} src={member.photos[0]} alt={member.name} size={32} className="size-8 rounded-full border-2 border-[#FBFAF7]" />
              ))}
            </span>
            <span className="truncate text-body text-ink">{t("crewStatus", { filled: stay.spotsFilled, total: stay.spotsTotal, status: crewStatus })}</span>
          </div>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
            <p className="min-w-0 max-w-[560px] text-body text-muted line-clamp-2">{context}</p>
            {/* Above the card-wide link. */}
            <div className="relative z-1 shrink-0">
              {task ? (
                <CardTaskAction stay={stay} task={task} now={now} button />
              ) : (
                chat && (
                  <Link href={chat} className={buttonStyles("secondary", "md")}>
                    {t("openChat")}
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </Panel>
    </section>
  );
}

/** The open task as a sentence ("Pay your share – due Nov 9"). */
function taskLine(t: ReturnType<typeof useTranslations<"houses.home">>, f: ReturnType<typeof useFormat>, task: CardTask): string {
  const date = task.date ? f.day(task.date) : "";
  switch (task.kind) {
    case "pay":
      return t("tasks.pay", { date });
    case "offer":
      return t("tasks.offer", { date });
    case "requests":
      return t("tasks.requests", { count: task.count ?? 0 });
    case "book":
      return t("tasks.book");
    case "choosePlace":
      return t("tasks.choosePlace");
    case "invite":
      return t("tasks.invite");
  }
}

/**
 * Right of the segment, muted: "€7,407 received · View payouts →" (the link in ink) – the crew's money passed on for the stay, not
 * income. No payout account yet: "Set up payouts →". Only for hosts.
 */
function PayoutsLine({ earnings, status }: { earnings: Earnings; status: PayoutAccountStatus | null }) {
  const t = useTranslations("houses.home.earningsCard");
  const f = useFormat();
  const [setup, setSetup] = useState(false);
  const link = "font-semibold text-ink underline-offset-4 hover:underline";
  if (status === null) return null;
  if (status === "none" || status === "action_required") {
    return (
      <>
        <button type="button" onClick={() => setSetup(true)} className={cn("text-small", link)}>
          {t("setupLink")}
        </button>
        <PayoutSetupSheet open={setup} onClose={() => setSetup(false)} />
      </>
    );
  }
  return (
    <p className="text-small text-muted">
      {t("received", { amount: f.price(earnings.thisYear, earnings.currency) })} ·{" "}
      <Link href="/your-houses/payouts" className={link}>
        {t("link")}
      </Link>
    </p>
  );
}

/**
 * A House in Your houses: the one HouseCard, footer="status" – left the crew and "N of M", right ONE glass pill: what's asked of you
 * (orange dot, opens the action) or, with nothing to do, the status as plain info.
 */
function YourHouseCard({ stay, now, request, href }: { stay: Stay; now: string; request?: JoinRequest; href?: string }) {
  const store = useStore();
  const statusText = useStatusText();
  const failed = request ? didntWorkOut(request) : false;
  const task = failed ? null : cardTaskOf(store, stay, now);
  const own = stay.hostId === store.currentUserId;
  return (
    <HouseCard
      stay={stay}
      host={findUser(store, stay.hostId)}
      crew={getCrew(store, stay)}
      notch={own ? "you" : "host"}
      footer="status"
      href={href ?? manageHref(stay)}
      status={task ? <CardTaskAction stay={stay} task={task} now={now} /> : <CardStatusChip>{statusText(stay, now, request)}</CardStatusChip>}
    />
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
