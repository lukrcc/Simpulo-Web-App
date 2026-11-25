"use client";

import { currentHouseOf } from "@/lib/metrics/profile";
import { placeShortOf } from "@/lib/shortName";

import { Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { createHrefOf } from "@/components/create/model";
import { useMonthName } from "@/components/explore/SearchFields";
import { useInForLine } from "@/components/InFor";
import { InviteSheet } from "@/components/InviteSheet";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Img } from "@/components/ui/Img";
import { Input } from "@/components/ui/Input";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { TabBar } from "@/components/ui/TabBar";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { placeById } from "@/lib/data/places";
import { activeInForOf, alsoInFor, inForPlaceName, sharedInFor, type AlsoInFor } from "@/lib/inFor";
import { nearbyPeople, type NearbyMatch } from "@/lib/nearby";
import { useNow } from "@/lib/useNow";
import { againHref } from "@/components/create/model";
import { crewThreadId } from "@/lib/links";
import { InForSheet } from "@/components/InFor";
import { canInvite } from "@/lib/invites";
import { profileHref } from "@/lib/privacy";
import { shortNameOf } from "@/lib/shortName";
import { getCrew, isCrewMember, settingsOf, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { firstName, housePhotos } from "@/lib/utils";
import { blockedEitherWay, livedTogether } from "@/lib/yourPeople";

/** The search shows from this many people on (in the open tab). */
const SEARCH_FROM = 9;

type Tab = "people" | "lived" | "saved" | "crews";
const TABS: readonly Tab[] = ["people", "lived", "saved", "crews"];
/** The tab's value in the URL (`?tab=lived|saved|crews`; Your people without one). */
const tabOfParam = (value: string | null): Tab => (value === "lived" || value === "saved" || value === "crews" ? value : "people");
const YEAR_MS = 365 * 86_400_000;

/** Statuses that mean the person is already in, invited to or asking for a House. */
const TAKEN = ["invited", "pending", "accepted", "waitlisted", "waitlist_requested"];

interface Group {
  house: Stay;
  endedAt: string;
  people: User[];
}

/**
 * /people (avatar menu and the own profile → "Your people", CLAUDE.md "Netzwerk-Seite"): four tabs, every list private –
 *   Your people – the ones you chose each other with (both confirmed); on top what you're in for, who of them is in for the same
 *                 ("Plan it together"), and – with Nearby on on both sides – who's in the same city at the same time
 *   Lived with  – everyone from your past crews
 *   Saved       – profiles you bookmarked
 *   Crews       – every past crew as a group: its chat, its album, "Do it again"; a year on "One year since …"
 * People grouped by House, the most recent first. Per person "Invite to a House", their "I'm in for" and a silent "Remove" (nobody is told).
 */
export function YourPeople() {
  const t = useTranslations("people.page");
  return (
    <RequireLogin title={t("loginTitle")} description={t("loginDescription")}>
      <PeopleContent />
    </RequireLogin>
  );
}

function PeopleContent() {
  const t = useTranslations("people.page");
  const store = useStore();
  // The one clock (lib/useNow.ts – in dev with the Clock's time travel, e.g. +1 year for the anniversary).
  const now = useNow();
  const today = now === null ? null : new Date(now).toISOString().slice(0, 10);
  const showToast = useToast();
  const me = store.currentUserId;
  const meUser = store.users.find((u) => u.id === me);
  const settings = settingsOf(meUser);

  // The tab lives in the URL, read after hydration (the first render is always Your people, like the server).
  const [tab, setTab] = useState<Tab>("people");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL is only readable after hydration
    setTab(tabOfParam(new URLSearchParams(window.location.search).get("tab")));
  }, []);
  const chooseTab = (next: Tab) => {
    setTab(next);
    setQuery("");
    const url = new URL(window.location.href);
    if (next === "people") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", url);
  };

  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  // Every past crew of mine, one group per House: Lived with = all of them (minus blocked and removed), Your people = only both confirmed.
  const { lived, mutual } = useMemo(() => {
    if (!me) return { lived: [] as Group[], mutual: [] as Group[] };
    // Blocked either way (they blocked me too) and the ones I removed – silently gone from every list.
    const gone = new Set([...settings.blockedUserIds, ...(settings.removedPeopleIds ?? []), ...store.users.filter((u) => settingsOf(u).blockedUserIds.includes(me)).map((u) => u.id)]);
    const byHouse = new Map<string, Group>();
    for (const entry of store.livedWith) {
      if (entry.userId !== me || gone.has(entry.otherUserId)) continue;
      const user = store.users.find((u) => u.id === entry.otherUserId);
      const house = store.stays.find((s) => s.id === entry.houseId);
      if (!user || !house || user.deletedAt) continue;
      const group = byHouse.get(house.id) ?? { house, endedAt: entry.endedAt, people: [] };
      if (!group.people.some((p) => p.id === user.id)) group.people.push(user);
      if (entry.endedAt > group.endedAt) group.endedAt = entry.endedAt;
      byHouse.set(house.id, group);
    }
    const all = [...byHouse.values()].toSorted((a, b) => b.endedAt.localeCompare(a.endedAt));
    const ours = all.map((g) => ({ ...g, people: g.people.filter((u) => livedTogether(store, me, u.id)) })).filter((g) => g.people.length > 0);
    return { lived: all, mutual: ours };
  }, [store, me, settings.blockedUserIds, settings.removedPeopleIds]);

  const saved = useMemo(
    () => (settings.savedPeopleIds ?? []).flatMap((id) => store.users.find((u) => u.id === id && !u.deletedAt && !(me && blockedEitherWay(store, me, id))) ?? []),
    [store, me, settings.savedPeopleIds],
  );

  // Your people, each once, in the order of the groups (most recent House first) – for the hint.
  const mutualIds = useMemo(() => [...new Set(mutual.flatMap((g) => g.people.map((u) => u.id)))], [mutual]);
  const shared = today ? sharedInFor(store.inFor, mutualIds, today) : null;
  // "Ana is also in for Surf in Ericeira in March" – only your people; and who of them is nearby (both turned it on).
  const also = me && today ? alsoInFor(store.inFor, me, mutualIds, today) : [];
  const nearby = me && today ? nearbyPeople(store, me, mutualIds, today) : [];

  // Crews: every past House of mine (host or crew), the people in it (blocked and deleted left out) – it stays as a group.
  const blockedIds = new Set(settings.blockedUserIds);
  const crews =
    me && today
      ? store.stays
          .filter((s) => s.endDate < today && !s.isExample && (s.status === "published" || s.status === "booked" || s.status === "completed") && isCrewMember(store, s, me))
          .map((house) => ({ house, people: getCrew(store, house).filter((u) => u.id !== me && !blockedIds.has(u.id) && !blockedEitherWay(store, me, u.id) && !u.deletedAt) }))
          .toSorted((a, b) => b.house.endDate.localeCompare(a.house.endDate))
      : [];

  // My Houses with a free spot someone could be invited to (not one they're in or asking for already).
  const invitableFor = (user: User): Stay[] =>
    me && today
      ? store.stays
          .filter((s) => canInvite(store, s, me, today) && !isCrewMember(store, s, user.id) && !store.joinRequests.some((r) => r.stayId === s.id && r.userId === user.id && TAKEN.includes(r.status)))
          .toSorted((a, b) => a.startDate.localeCompare(b.startDate))
      : [];
  const [inviteTarget, setInviteTarget] = useState<User | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const groups = tab === "people" ? mutual : tab === "lived" ? lived : [];
  const count = tab === "saved" ? saved.length : tab === "crews" ? crews.length : new Set(groups.flatMap((g) => g.people.map((u) => u.id))).size;
  const matches = (user: User, house?: Stay) => !needle || user.name.toLowerCase().includes(needle) || (house ? shortNameOf(house).toLowerCase().includes(needle) : false);
  const shownGroups = groups.map((g) => ({ ...g, people: g.people.filter((u) => matches(u, g.house)) })).filter((g) => g.people.length > 0);
  const shownSaved = saved.filter((u) => matches(u));
  const shownCrews = crews.filter((c) => !needle || shortNameOf(c.house).toLowerCase().includes(needle) || c.people.some((u) => u.name.toLowerCase().includes(needle)));
  const nothingShown = tab === "saved" ? shownSaved.length === 0 : tab === "crews" ? shownCrews.length === 0 : shownGroups.length === 0;

  const remove = (user: User) => {
    if (tab === "saved") {
      store.toggleSavedPerson(user.id);
      showToast(t("unsaved", { name: firstName(user) }));
    } else {
      store.removePerson(user.id);
      showToast(t("removed", { name: firstName(user) }));
    }
  };
  const row = (user: User, key: string) => (
    <PersonRow
      key={key}
      user={user}
      today={today}
      canInviteTo={invitableFor(user).length > 0}
      onInvite={() => {
        setInviteTarget(user);
        setInviteOpen(true);
      }}
      onRemove={() => remove(user)}
    />
  );

  return (
    <Container page className="explore-width pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-h1">{t("title")}</h1>
        {count >= SEARCH_FROM && (
          <div className="relative w-full md:max-w-[320px]">
            <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="pl-11" />
          </div>
        )}
      </div>
      <TabBar className="mt-6" label={t("tabsLabel")} value={tab} onChange={chooseTab} options={TABS.map((value) => ({ value, label: t(`tabs.${value}`) }))} />

      {tab === "people" && (
        <>
          {shared && <SharedHint shared={shared} />}
          <InForPanel also={also} hasPeople={mutualIds.length > 0} />
          <NearbyPanel matches={nearby} on={Boolean(meUser?.privacy?.nearby)} hasPeople={mutualIds.length > 0} />
        </>
      )}

      {count === 0 ? (
        <div className="mt-10">
          {/* Empty: what shows up here and when – with the way to a first House. */}
          <EmptyState
            title={t(`empty.${tab}.title`)}
            description={t(`empty.${tab}.text`)}
            action={
              tab === "saved" ? undefined : (
                <Button href="/explore" variant="secondary">
                  {t("explore")}
                </Button>
              )
            }
          />
        </div>
      ) : nothingShown ? (
        <p className="mt-10 text-muted">{t("noMatch")}</p>
      ) : tab === "crews" ? (
        <ul className="mt-10 grid grid-cols-[repeat(auto-fill,minmax(min(360px,100%),1fr))] gap-x-10 gap-y-10">
          {shownCrews.map((c) => (
            <CrewItem key={c.house.id} house={c.house} people={c.people} now={now ?? 0} />
          ))}
        </ul>
      ) : tab === "saved" ? (
        <ul className="mt-10 grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-x-10 gap-y-8">{shownSaved.map((u) => row(u, u.id))}</ul>
      ) : (
        <div className="mt-10 flex flex-col gap-14">
          {shownGroups.map((g) => (
            <section key={g.house.id} aria-label={shortNameOf(g.house)}>
              <GroupHead house={g.house} />
              <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-x-10 gap-y-8">{g.people.map((u) => row(u, `${g.house.id}-${u.id}`))}</ul>
            </section>
          ))}
        </div>
      )}

      {inviteTarget && (
        <InviteSheet key={inviteTarget.id} houses={invitableFor(inviteTarget)} open={inviteOpen} onClose={() => setInviteOpen(false)} preselect={[inviteTarget.id]} />
      )}
    </Container>
  );
}

/** A crew's head: the House photo (rounded 16), its short name and dates – a link to the House. */
function GroupHead({ house }: { house: Stay }) {
  const store = useStore();
  const format = useFormat();
  const host = store.users.find((u) => u.id === house.hostId);
  const photo = housePhotos(house, host)[0];
  return (
    <Link href={`/h/${house.id}`} className="group/head inline-flex items-center gap-4 rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)">
      <span className="relative block size-14 shrink-0 overflow-hidden rounded-[16px] bg-surface-2">{photo && <Img src={photo} alt="" fill sizes="56px" className="object-cover" />}</span>
      <span className="min-w-0">
        <span className="block truncate text-h3 text-ink group-hover/head:underline">{shortNameOf(house)}</span>
        <span className="block truncate text-small text-muted">{format.stayDates(house)}</span>
      </span>
    </Link>
  );
}

/** One person: round photo, first name, "Now in {city}", their running "I'm in for", then "Invite to a House" and "Remove". */
function PersonRow({ user, today, canInviteTo, onInvite, onRemove }: { user: User; today: string | null; canInviteTo: boolean; onInvite: () => void; onRemove: () => void }) {
  const t = useTranslations("people.page");
  const store = useStore();
  const line = useInForLine();
  const inFor = today ? activeInForOf(store.inFor, user.id, today)[0] : undefined;
  const current = today ? currentHouseOf(store, user.id, today) : undefined;
  const name = firstName(user);
  // The Houses you both were in (host or crew), the most recent first.
  const me = store.currentUserId;
  const shared = me
    ? store.stays
        .filter((stay) => (stay.hostId === me || isCrewMember(store, stay, me)) && (stay.hostId === user.id || isCrewMember(store, stay, user.id)))
        .toSorted((a, b) => b.startDate.localeCompare(a.startDate))
    : [];
  const latest = shared[0];
  return (
    <li className="flex items-start gap-4">
      <Link href={profileHref(user.id)} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)" aria-label={name}>
        <PersonPhoto src={user.photos[0]} alt={name} size={72} className="size-18" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={profileHref(user.id)} className="block truncate text-body font-semibold text-ink hover:underline">
          {name}
        </Link>
        {/* "Now in …" only from a House they're in right now – there's no place field. */}
        {current && <p className="truncate text-small text-muted">{t("nowIn", { city: placeShortOf(current) })}</p>}
        {inFor && <p className="mt-0.5 truncate text-small text-ink">{t("inFor", { line: line(inFor) })}</p>}
        {/* The Houses you shared – the most recent named (CLAUDE.md "Profilseite neu"). */}
        {latest && <p className="mt-0.5 truncate text-small text-muted">{t("together", { count: shared.length, name: shortNameOf(latest) })}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* "Message": the crew chat of your most recent shared House – no free direct chats between people (DIRECT_MESSAGE_POLICY). */}
          {latest && (
            <Button variant="secondary" size="sm" href={`/messages/${crewThreadId(latest.id)}`}>
              {t("message")}
            </Button>
          )}
          {canInviteTo && (
            <Button variant="secondary" size="sm" onClick={onInvite}>
              {t("invite")}
            </Button>
          )}
          <Button variant="tertiary" size="sm" onClick={onRemove}>
            {t("remove")}
          </Button>
        </div>
      </div>
    </li>
  );
}

/** "Mara and Jonas are in for Lisbon in March – open a House?" – the second part opens Open a House with the place and month filled in. */
function SharedHint({ shared }: { shared: NonNullable<ReturnType<typeof sharedInFor>> }) {
  const t = useTranslations("people.page");
  const store = useStore();
  const monthName = useMonthName();
  const [a, b] = shared.userIds.map((id) => store.users.find((u) => u.id === id));
  if (!a || !b) return null;
  const href = createHrefOf({ place: placeById(shared.placeId), month: shared.month });
  return (
    <p className="mt-8 text-body-lg text-ink md:max-w-[680px]">
      {t.rich("hint", {
        a: firstName(a),
        b: firstName(b),
        place: inForPlaceName(shared),
        month: monthName(shared.month),
        link: (chunks) => (
          <Link href={href} className="font-semibold underline underline-offset-4 hover:text-muted">
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}

/**
 * What you're in for, and who of your people is in for the same – "Ana is also in for Surf in Ericeira in March" with "Plan it together"
 * (Open a House with place, month and theme filled in, Ana picked in Fill your House). Only between your people (lib/inFor.ts).
 */
function InForPanel({ also, hasPeople }: { also: AlsoInFor[]; hasPeople: boolean }) {
  const t = useTranslations("people.page");
  const format = useFormat();
  const store = useStore();
  const monthName = useMonthName();
  const line = useInForLine();
  const now = useNow();
  const today = now === null ? null : new Date(now).toISOString().slice(0, 10);
  const [adding, setAdding] = useState(false);
  const mine = store.currentUserId && today ? activeInForOf(store.inFor, store.currentUserId, today) : [];
  return (
    <section aria-labelledby="people-in-for" className="mt-8 md:max-w-[720px]">
      <h2 id="people-in-for" className="text-eyebrow uppercase text-ink/55">
        {t("inForTitle")}
      </h2>
      {mine.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {mine.map((s) => (
            <li key={s.id} className="rounded-full border border-ink/12 px-3 py-1 text-small text-ink">
              {line(s)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-body text-muted">{t("inForNone")}</p>
      )}
      <Button variant="tertiary" size="sm" className="-ml-4 mt-2" onClick={() => setAdding(true)}>
        {t("inForAdd")}
      </Button>
      {also.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {also.map((a) => {
            const user = store.users.find((u) => u.id === a.userId);
            if (!user) return null;
            const href = `${createHrefOf({ place: placeById(a.placeId), month: a.month, category: a.category })}&invite=${encodeURIComponent(user.id)}`;
            return (
              <li key={a.userId} data-also-in-for={a.userId} className="flex flex-wrap items-center gap-3">
                <PersonPhoto src={user.photos[0]} alt="" size={40} className="size-10 shrink-0" />
                <p className="min-w-0 flex-1 basis-[240px] text-body text-ink">
                  {a.category
                    ? t("alsoInForTheme", { name: firstName(user), theme: format.vibe(a.category), place: inForPlaceName(a), month: monthName(a.month) })
                    : t("alsoInFor", { name: firstName(user), place: inForPlaceName(a), month: monthName(a.month) })}
                </p>
                <Button href={href} variant="secondary" size="sm">
                  {t("planTogether")}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {!hasPeople && mine.length > 0 && <p className="mt-3 text-small text-muted">{t("inForPrivate")}</p>}
      <InForSheet open={adding} onClose={() => setAdding(false)} />
    </section>
  );
}

/** Nearby (consent on both sides, off by default): who of your people is in the same city at the same time – from Houses, never a location. */
function NearbyPanel({ matches, on, hasPeople }: { matches: NearbyMatch[]; on: boolean; hasPeople: boolean }) {
  const t = useTranslations("people.page");
  const format = useFormat();
  const store = useStore();
  if (!hasPeople) return null;
  return (
    <section aria-labelledby="people-nearby" className="mt-8 md:max-w-[720px]">
      <h2 id="people-nearby" className="text-eyebrow uppercase text-ink/55">
        {t("nearbyTitle")}
      </h2>
      {!on ? (
        <p className="mt-2 text-body text-muted">
          {t.rich("nearbyOff", { link: (c) => <Link href="/settings/privacy" className="font-semibold text-ink underline underline-offset-4">{c}</Link> })}
        </p>
      ) : matches.length === 0 ? (
        <p className="mt-2 text-body text-muted">{t("nearbyNone")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {matches.map((m) => {
            const user = store.users.find((u) => u.id === m.userId);
            if (!user) return null;
            return (
              <li key={m.userId} data-nearby={m.userId} className="flex items-center gap-3">
                <PersonPhoto src={user.photos[0]} alt="" size={40} className="size-10 shrink-0" />
                <p className="min-w-0 text-body text-ink">{t("nearbyLine", { name: firstName(user), city: m.city, dates: format.shortRange(m.from, m.to) ?? "" })}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** A past crew, kept as a group: the House, who was in it, its chat, its album, "Do it again"; a year on "One year since …". */
function CrewItem({ house, people, now }: { house: Stay; people: User[]; now: number }) {
  const t = useTranslations("people.page");
  const year = now >= Date.parse(`${house.endDate}T12:00:00Z`) + YEAR_MS;
  return (
    <li data-crew={house.id} className="flex flex-col gap-4">
      <GroupHead house={house} />
      {year && <p className="text-small font-semibold text-ink">{t("crewYear", { title: shortNameOf(house) })}</p>}
      <ul className="flex flex-wrap gap-2" aria-label={t("crewPeople")}>
        {people.map((u) => (
          <li key={u.id}>
            <Link href={profileHref(u.id)} aria-label={firstName(u)} className="block rounded-full">
              <PersonPhoto src={u.photos[0]} alt={firstName(u)} size={40} className="size-10" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button href={`/messages/${crewThreadId(house.id)}`} variant="secondary" size="sm">
          {t("crewChat")}
        </Button>
        <Button href={`/h/${house.id}?tab=moments`} variant="secondary" size="sm">
          {t("crewAlbum")}
        </Button>
        <Button href={againHref(house.id, people.map((u) => u.id))} variant="tertiary" size="sm">
          {t("crewAgain")}
        </Button>
      </div>
    </li>
  );
}
