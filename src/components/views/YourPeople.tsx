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
import { useTodayIso } from "@/lib/birthDate";
import { placeById } from "@/lib/data/places";
import { activeInForOf, inForPlaceName, sharedInFor } from "@/lib/inFor";
import { canInvite } from "@/lib/invites";
import { profileHref } from "@/lib/privacy";
import { shortNameOf } from "@/lib/shortName";
import { isCrewMember, settingsOf, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { firstName, housePhotos } from "@/lib/utils";
import { livedTogether } from "@/lib/yourPeople";

/** The search shows from this many people on (in the open tab). */
const SEARCH_FROM = 9;

type Tab = "people" | "lived" | "saved";
const TABS: readonly Tab[] = ["people", "lived", "saved"];
/** The tab's value in the URL (`?tab=lived|saved`; Your people without one). */
const tabOfParam = (value: string | null): Tab => (value === "lived" || value === "saved" ? value : "people");

/** Statuses that mean the person is already in, invited to or asking for a House. */
const TAKEN = ["invited", "pending", "accepted", "waitlisted", "waitlist_requested"];

interface Group {
  house: Stay;
  endedAt: string;
  people: User[];
}

/**
 * /people (avatar menu and the own profile → "Your people"): three tabs – Your people (both confirmed), Lived with (everyone from your past
 * crews) and Saved profiles (private bookmarks). The first two grouped by House, the most recent first. Per person "Invite to a House",
 * their running "I'm in for" and a silent "Remove". On top at most one hint when two of your people are in for the same place and month.
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
  const today = useTodayIso();
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
    const gone = new Set([...settings.blockedUserIds, ...(settings.removedPeopleIds ?? [])]);
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
    () => (settings.savedPeopleIds ?? []).flatMap((id) => store.users.find((u) => u.id === id && !u.deletedAt && !settings.blockedUserIds.includes(id)) ?? []),
    [store.users, settings.savedPeopleIds, settings.blockedUserIds],
  );

  // Your people, each once, in the order of the groups (most recent House first) – for the hint.
  const mutualIds = useMemo(() => [...new Set(mutual.flatMap((g) => g.people.map((u) => u.id)))], [mutual]);
  const shared = today ? sharedInFor(store.inFor, mutualIds, today) : null;

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
  const count = tab === "saved" ? saved.length : new Set(groups.flatMap((g) => g.people.map((u) => u.id))).size;
  const matches = (user: User, house?: Stay) => !needle || user.name.toLowerCase().includes(needle) || (house ? shortNameOf(house).toLowerCase().includes(needle) : false);
  const shownGroups = groups.map((g) => ({ ...g, people: g.people.filter((u) => matches(u, g.house)) })).filter((g) => g.people.length > 0);
  const shownSaved = saved.filter((u) => matches(u));
  const nothingShown = tab === "saved" ? shownSaved.length === 0 : shownGroups.length === 0;

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

      {shared && <SharedHint shared={shared} />}

      {count === 0 ? (
        <div className="mt-10">
          {tab === "people" && (
            <EmptyState
              title={t("emptyPeople")}
              description={t("emptyPeopleDescription")}
              action={
                <Button href="/" variant="secondary">
                  {t("explore")}
                </Button>
              }
            />
          )}
          {tab === "lived" && <EmptyState title={t("emptyLived")} />}
          {tab === "saved" && <EmptyState title={t("emptySaved")} description={t("emptySavedDescription")} />}
        </div>
      ) : nothingShown ? (
        <p className="mt-10 text-muted">{t("noMatch")}</p>
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
        <div className="mt-3 flex flex-wrap items-center gap-2">
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
