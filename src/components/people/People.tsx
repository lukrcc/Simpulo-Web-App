"use client";

import { Check, ChevronRight, MessageCircle, Plus, Search, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { inviteHref } from "@/components/create/model";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Img } from "@/components/ui/Img";
import { Sheet } from "@/components/ui/Sheet";
import { StayThumb } from "@/components/ui/StayThumb";
import { useToast } from "@/components/ui/Toast";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { formInput } from "@/components/form/FormLayout";
import { useFormat } from "@/i18n/format";
import { getPeople, isBlocked, useStore, type PersonEntry } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { cn, openSpots } from "@/lib/utils";

/** The current user's People (everyone from their completed and locked Houses), without people they blocked. */
export function usePeople(): PersonEntry[] {
  const store = useStore();
  return useMemo(
    () => (store.currentUserId ? getPeople(store, store.currentUserId).filter((p) => !isBlocked(store, p.user.id)) : []),
    [store],
  );
}

/** Houses the current user hosts that can still take someone: listed (open or booked), not over. */
function useOpenHostedHouses(): Stay[] {
  const store = useStore();
  return useMemo(
    () =>
      store.stays
        .filter((s) => s.hostId === store.currentUserId && (s.status === "published" || s.status === "booked"))
        .toSorted((a, b) => a.startDate.localeCompare(b.startDate)),
    [store.stays, store.currentUserId],
  );
}

/** "Message": the direct chat with them, about the most recent House you shared. */
function useMessagePerson() {
  const { openDirectThread } = useStore();
  const router = useRouter();
  return (person: PersonEntry) => {
    const threadId = openDirectThread(person.houses[0].id, person.user.id);
    if (threadId) router.push(`/inbox/${threadId}`);
  };
}

/**
 * "Invite to a House": the sheet with your open Houses – or, with none, straight to the stepper with them picked.
 * Returns the trigger and the sheet to render.
 */
function useInviteToHouse() {
  const router = useRouter();
  const open = useOpenHostedHouses();
  const [inviting, setInviting] = useState<User | null>(null);
  const start = (user: User) => (open.length === 0 ? router.push(inviteHref(user.id)) : setInviting(user));
  const sheet = <InviteToHouseSheet person={inviting} houses={open} onClose={() => setInviting(null)} />;
  return { start, sheet };
}

/** "Together in: Training Week Barcelona (Oct 16–26), …" */
function TogetherIn({ houses, className }: { houses: Stay[]; className?: string }) {
  const t = useTranslations("people");
  const f = useFormat();
  return (
    <p className={cn("text-[13px] text-zinc-500", className)}>
      {t("togetherIn")}{" "}
      {houses.map((h, i) => (
        <span key={h.id}>
          {i > 0 && ", "}
          <span className="font-medium text-zinc-700">{h.title}</span> ({f.shortRange(h.startDate, h.endDate)})
        </span>
      ))}
    </p>
  );
}

interface PeopleListProps {
  /** "page": /people, full rows with labelled actions. "panel": the Houses tab's list column, icon actions. */
  variant: "page" | "panel";
  /** Where a row leads (default: the person's profile) */
  hrefOf?: (person: PersonEntry) => string;
  /** Panel: the person shown in the detail column */
  activeId?: string;
}

/** Search by name, then one row per person (most recent shared House first) with Message and Invite to a House. */
export function PeopleList({ variant, hrefOf = (p) => `/u/${p.user.id}`, activeId }: PeopleListProps) {
  const t = useTranslations("people");
  const people = usePeople();
  const message = useMessagePerson();
  const invite = useInviteToHouse();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? people.filter((p) => p.user.name.toLowerCase().includes(q)) : people;
  const panel = variant === "panel";

  if (people.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("emptyTitle")}
        action={
          <Link href="/" className={buttonClass("dark", "sm")}>
            {t("emptyAction")}
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          className={cn(formInput, "pl-10", !panel && "bg-white")}
        />
      </label>
      {shown.length === 0 ? (
        <p className="px-2 py-6 text-sm text-zinc-500">{t("noMatch", { query: query.trim() })}</p>
      ) : (
        <ul className={cn("mt-4", panel ? "space-y-1" : "divide-y divide-black/5 rounded-[24px] bg-white")}>
          {shown.map((person) => (
            <li key={person.user.id}>
              <PersonRow
                person={person}
                href={hrefOf(person)}
                active={person.user.id === activeId}
                panel={panel}
                onMessage={() => message(person)}
                onInvite={() => invite.start(person.user)}
              />
            </li>
          ))}
        </ul>
      )}
      {invite.sheet}
    </div>
  );
}

interface PersonRowProps {
  person: PersonEntry;
  href: string;
  active: boolean;
  panel: boolean;
  onMessage: () => void;
  onInvite: () => void;
}

function PersonRow({ person, href, active, panel, onMessage, onInvite }: PersonRowProps) {
  const t = useTranslations("people");
  const { user } = person;
  const iconButton = "flex size-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-black/5";
  return (
    <div className={cn("flex items-center gap-3", panel ? cn("rounded-2xl p-2.5", active ? "bg-page" : "hover:bg-black/[0.03]") : "px-4 py-4 md:px-5")}>
      {/* Photo, name and houses open the person; the actions sit outside the link. */}
      <Link href={href} scroll={false} aria-current={active ? "page" : undefined} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar user={user} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate text-sm font-semibold">{user.name}</span>
            {user.verified && <VerifiedBadge />}
          </span>
          <TogetherIn houses={person.houses} className={cn("mt-0.5", panel && "line-clamp-2")} />
        </span>
      </Link>
      {panel ? (
        <div className="flex shrink-0 items-center">
          <button type="button" onClick={onMessage} aria-label={t("messageLabel", { name: user.name })} title={t("message")} className={iconButton}>
            <MessageCircle className="size-[18px]" aria-hidden />
          </button>
          <button type="button" onClick={onInvite} aria-label={t("inviteLabel", { name: user.name })} title={t("invite")} className={iconButton}>
            <UserPlus className="size-[18px]" aria-hidden />
          </button>
        </div>
      ) : (
        // Phones: icons only (the row is narrow); from sm the labels.
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button type="button" onClick={onMessage} aria-label={t("messageLabel", { name: user.name })} className={cn(buttonClass("secondary", "sm"), "max-sm:size-10 max-sm:px-0")}>
            <MessageCircle className="size-4" aria-hidden />
            <span className="max-sm:sr-only">{t("message")}</span>
          </button>
          <button type="button" onClick={onInvite} aria-label={t("inviteLabel", { name: user.name })} className={cn(buttonClass("dark", "sm"), "max-sm:size-10 max-sm:px-0")}>
            <UserPlus className="size-4" aria-hidden />
            <span className="max-sm:sr-only">{t("invite")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

/** Your open Houses for one person – each shows whether they can be invited – and "Open a new House" (them picked). */
function InviteToHouseSheet({ person, houses, onClose }: { person: User | null; houses: Stay[]; onClose: () => void }) {
  const t = useTranslations("people.sheet");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const name = person?.name.split(" ")[0] ?? "";

  /** Why this House can't take an invite for them – or null when it can. */
  function blockedReason(stay: Stay): string | null {
    if (!person) return null;
    const request = store.joinRequests.findLast((r) => r.stayId === stay.id && r.userId === person.id && r.status !== "declined");
    if (request?.status === "accepted") return t("member");
    if (request?.status === "invited") return t("invited");
    if (request?.status === "pending") return t("asked");
    if (openSpots(stay) === 0) return t("full");
    return null;
  }

  return (
    <Sheet open={person !== null} onClose={onClose} title={t("title", { name })} subtitle={t("subtitle")}>
      <ul className="-mx-2 space-y-1">
        {houses.map((stay) => {
          const reason = blockedReason(stay);
          return (
            <li key={stay.id}>
              <button
                type="button"
                disabled={reason !== null}
                onClick={() => {
                  if (!person) return;
                  store.inviteToStay(stay.id, person.id);
                  showToast(t("sentToast", { name, title: stay.title }));
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-black/[0.03] disabled:cursor-default disabled:hover:bg-transparent"
              >
                {stay.photos?.[0] ? (
                  <Img src={stay.photos[0]} alt="" width={48} height={48} className="size-12 shrink-0 rounded-xl object-cover" />
                ) : (
                  <StayThumb stay={stay} size={48} className="size-12" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{stay.title}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {f.placeName(stay)} · {f.shortRange(stay.startDate, stay.endDate)} · {t("spotsLeft", { count: openSpots(stay) })}
                  </span>
                </span>
                {reason ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-zinc-600">
                    {reason === t("invited") && <Check className="size-3" aria-hidden />}
                    {reason}
                  </span>
                ) : (
                  <span className={buttonClass("dark", "sm", "shrink-0")}>{t("invite")}</span>
                )}
              </button>
            </li>
          );
        })}
        <li>
          <Link
            href={person ? inviteHref(person.id) : "/create"}
            onClick={onClose}
            className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-black/[0.03]"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-black/15 text-ink">
              <Plus className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t("openNew")}</span>
              <span className="block text-xs text-zinc-500">{t("openNewText", { name })}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-zinc-400" aria-hidden />
          </Link>
        </li>
      </ul>
    </Sheet>
  );
}

/** Houses tab, desktop detail: the selected person – photos, the Houses you shared, Message / Invite / profile. */
export function PersonPanel({ personId }: { personId: string | null }) {
  const t = useTranslations("people");
  const f = useFormat();
  const people = usePeople();
  const message = useMessagePerson();
  const invite = useInviteToHouse();
  const person = people.find((p) => p.user.id === personId) ?? people[0];
  if (!person) {
    return (
      <div className="flex h-full items-center justify-center rounded-[24px] border-2 border-dashed border-black/10">
        <EmptyState icon={Users} title={t("emptyTitle")} />
      </div>
    );
  }
  const { user, houses } = person;

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] bg-white p-6">
        <div className="flex items-center gap-4">
          <Avatar user={user} size="xl" />
          <div className="min-w-0">
            <h2 className="flex items-center gap-1 text-2xl font-bold tracking-tight">
              <span className="truncate">{user.name}</span>
              {user.verified && <VerifiedBadge />}
            </h2>
            <p className="text-zinc-500">{f.ageAndCountry(user)}</p>
          </div>
        </div>
        {user.bio && <p className="mt-4 leading-relaxed text-neutral-700">{user.bio}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => invite.start(user)} className={buttonClass("dark", "md")}>
            <UserPlus className="size-4" aria-hidden />
            {t("invite")}
          </button>
          <button type="button" onClick={() => message(person)} className={buttonClass("secondary", "md")}>
            <MessageCircle className="size-4" aria-hidden />
            {t("message")}
          </button>
          <Link href={`/u/${user.id}`} className={buttonClass("ghost", "md")}>
            {t("viewProfile")}
          </Link>
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold">{t("housesTitle", { count: houses.length })}</h2>
        <ul className="divide-y divide-black/5">
          {houses.map((stay) => (
            <li key={stay.id} className="py-3 first:pt-0 last:pb-0">
              <Link href={`/my-stays?id=${stay.id}`} className="flex items-center gap-3 hover:opacity-80">
                {stay.photos?.[0] ? (
                  <Img src={stay.photos[0]} alt="" width={56} height={56} className="size-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <StayThumb stay={stay} size={56} className="size-14" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{stay.title}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {f.placeName(stay)} · {f.shortRange(stay.startDate, stay.endDate)}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-page px-2.5 py-1 text-xs font-medium text-zinc-600">
                  {stay.status === "completed" ? t("completed") : t("locked")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {user.photos.length > 1 && (
        <section className="rounded-[24px] bg-white p-6">
          <div className="grid grid-cols-3 gap-3 xl:grid-cols-4">
            {user.photos.slice(0, 4).map((src) => (
              <span key={src} className="relative block aspect-4/5 overflow-hidden rounded-2xl bg-neutral-200">
                <Img src={src} alt="" fill sizes="200px" className="object-cover" />
              </span>
            ))}
          </div>
        </section>
      )}
      {invite.sheet}
    </div>
  );
}
