"use client";

import { Check, ChevronRight, MessageCircle, Plus, Search, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { inviteHref } from "@/components/create/model";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { cardClass } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Img } from "@/components/ui/Img";
import { ListRow } from "@/components/ui/ListRow";
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
    <p className={cn("text-small text-muted", className)}>
      {t("togetherIn")}{" "}
      {houses.map((h, i) => (
        <span key={h.id}>
          {i > 0 && ", "}
          <span className="font-medium text-ink">{h.title}</span> ({f.shortRange(h.startDate, h.endDate)})
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
          <Button variant="primary" href="/">
            {t("emptyAction")}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          className={cn(formInput, "pl-10", !panel && "bg-surface")}
        />
      </label>
      {shown.length === 0 ? (
        <p className="px-2 py-6 text-small text-muted">{t("noMatch", { query: query.trim() })}</p>
      ) : (
        <ul className={cn("mt-4", panel ? "space-y-1" : "divide-y divide-line rounded-xl border border-line bg-surface px-4")}>
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
  // Panel: icons only (narrow column). Page: icons on phones, labels from sm. Tertiary – they repeat on every row.
  const labelClass = panel ? "sr-only" : "max-sm:sr-only";
  const actionClass = panel ? "size-10" : "max-sm:size-10";
  return (
    // The name is a stretched link: the whole row opens the person; the actions sit above it.
    <div className={cn("relative", panel && cn("rounded-lg px-2", active ? "bg-bg" : "hover:bg-ink/[0.03]"))}>
      <ListRow
        lead={<Avatar user={user} size="md" />}
        title={
          <Link
            href={href}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className="flex min-w-0 items-center gap-1 after:absolute after:inset-0"
          >
            <span className="truncate">{user.name}</span>
            {user.verified && <VerifiedBadge />}
          </Link>
        }
        subtitle={<TogetherIn houses={person.houses} className="truncate" />}
        action={
          <span className="relative flex items-center gap-4">
            <Button variant="tertiary" onClick={onMessage} aria-label={t("messageLabel", { name: user.name })} title={t("message")} className={actionClass}>
              <MessageCircle aria-hidden />
              <span className={labelClass}>{t("message")}</span>
            </Button>
            <Button variant="tertiary" onClick={onInvite} aria-label={t("inviteLabel", { name: user.name })} title={t("invite")} className={actionClass}>
              <UserPlus aria-hidden />
              <span className={labelClass}>{t("invite")}</span>
            </Button>
          </span>
        }
      />
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
      <ul className="divide-y divide-line">
        {houses.map((stay) => {
          const reason = blockedReason(stay);
          return (
            <li key={stay.id}>
              {/* The whole row invites; "Invite" is its tertiary label, a Badge says why it can't. */}
              <button
                type="button"
                disabled={reason !== null}
                onClick={() => {
                  if (!person) return;
                  store.inviteToStay(stay.id, person.id);
                  showToast(t("sentToast", { name, title: stay.title }));
                  onClose();
                }}
                className="group block w-full text-left disabled:cursor-default"
              >
                <ListRow
                  lead={
                    stay.photos?.[0] ? (
                      <Img src={stay.photos[0]} alt="" width={40} height={40} className="size-10 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <StayThumb stay={stay} size={40} className="size-10" />
                    )
                  }
                  title={stay.title}
                  subtitle={`${f.placeName(stay)} · ${f.shortRange(stay.startDate, stay.endDate)} · ${t("spotsLeft", { count: openSpots(stay) })}`}
                  action={
                    reason ? (
                      <Badge icon={reason === t("invited") ? <Check aria-hidden /> : undefined}>{reason}</Badge>
                    ) : (
                      <span className={buttonStyles("tertiary", "md", "group-hover:underline")}>{t("invite")}</span>
                    )
                  }
                />
              </button>
            </li>
          );
        })}
        <li>
          <Link href={person ? inviteHref(person.id) : "/create"} onClick={onClose} className="block">
            <ListRow
              lead={<Plus aria-hidden />}
              title={t("openNew")}
              subtitle={t("openNewText", { name })}
              action={<ChevronRight className="size-4 text-muted" aria-hidden />}
            />
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
      <div className="flex h-full flex-col justify-center">
        <EmptyState icon={Users} title={t("emptyTitle")} />
      </div>
    );
  }
  const { user, houses } = person;

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <div className="flex items-center gap-4">
          <Avatar user={user} size="xl" />
          <div className="min-w-0">
            <h2 className="flex items-center gap-1 text-h3 tracking-tight">
              <span className="truncate">{user.name}</span>
              {user.verified && <VerifiedBadge />}
            </h2>
            <p className="text-muted">{f.ageAndCountry(user)}</p>
          </div>
        </div>
        {user.bio && <p className="mt-4 leading-relaxed text-ink">{user.bio}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          {/* Secondary: this panel sits inside the Houses tab, whose page keeps its own single primary. */}
          <Button variant="secondary" size="lg" onClick={() => invite.start(user)}>
            <UserPlus aria-hidden />
            {t("invite")}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => message(person)}>
            <MessageCircle aria-hidden />
            {t("message")}
          </Button>
          <Button variant="tertiary" size="lg" href={`/u/${user.id}`} className="px-2">
            {t("viewProfile")}
          </Button>
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="mb-3 text-body-lg font-semibold">{t("housesTitle", { count: houses.length })}</h2>
        <ul className="divide-y divide-line">
          {houses.map((stay) => (
            <li key={stay.id}>
              <Link href={`/my-stays?id=${stay.id}`} className="block hover:opacity-80">
                <ListRow
                  lead={
                    stay.photos?.[0] ? (
                      <Img src={stay.photos[0]} alt="" width={40} height={40} className="size-10 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <StayThumb stay={stay} size={40} className="size-10" />
                    )
                  }
                  title={stay.title}
                  subtitle={`${f.placeName(stay)} · ${f.shortRange(stay.startDate, stay.endDate)}`}
                  action={<Badge>{stay.status === "completed" ? t("completed") : t("locked")}</Badge>}
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {user.photos.length > 1 && (
        <section className={cardClass}>
          <div className="grid grid-cols-3 gap-3 xl:grid-cols-4">
            {user.photos.slice(0, 4).map((src) => (
              <span key={src} className="relative block aspect-4/5 overflow-hidden rounded-2xl bg-line">
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
