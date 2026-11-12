"use client";

import { Check, ChevronRight, Link2, MessageCircle, QrCode, Search, Share } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { useMonthName } from "@/components/explore/SearchFields";
import { SimpuloQR } from "@/components/SimpuloQR";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { Img } from "@/components/ui/Img";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { INVITE_POLICY } from "@/config/policies";
import { useTodayIso } from "@/lib/birthDate";
import { inForPlaceName, isActiveInFor } from "@/lib/inFor";
import { inviteSuggestions, searchInvitees, useCanInvite } from "@/lib/invites";
import { inviteLink } from "@/lib/links";
import { shortNameOf } from "@/lib/shortName";
import { findUser, isConnection, useStore, type InviteResult } from "@/lib/store";
import type { HouseInvite, Stay, User } from "@/lib/types";
import { cn, firstName, housePhotos, openSpots } from "@/lib/utils";

const isTouchDevice = () => "ontouchstart" in window || navigator.maxTouchPoints > 0;

/**
 * "Bring people" – the one way to invite into a House, from every entry (House page, crew circles, chat, Open a House, Your houses, a
 * profile). Head: the House (photo, title, "{n} spots open"). Then "Share link" (copy, WhatsApp, QR, the system's share – a link /i/{code}
 * holds a spot for INVITE_POLICY.inviteHoldHours, made on first use), and the people to pick: Your people · Saved · "In for {place} ·
 * {month}" (lib/inFor.ts) · everyone else only by search. Pick several → "Invite {n}". Mouse: the side panel; touch: a bottom sheet.
 * `page`: the same content on a page of its own (Open a House › "Fill your House").
 */
export function InviteSheet({ stay, houses, open, onClose, preselect = [], title }: { stay?: Stay; /** No `stay`: pick one of these first (a profile's "Invite to your House") */ houses?: Stay[]; open: boolean; onClose: () => void; preselect?: string[]; title?: string }) {
  const t = useTranslations("invite");
  const [picked, setPicked] = useState<Stay | null>(null);
  const house = stay ?? picked ?? (houses?.length === 1 ? houses[0] : null);
  const [selected, setSelected] = useState<string[]>(preselect);
  const close = () => {
    onClose();
    setPicked(null);
  };
  const send = useSendInvites(house, () => {
    setSelected([]);
    close();
  });
  return (
    <Sheet
      variant="panel"
      open={open}
      onClose={close}
      title={title ?? t("title")}
      footer={
        house ? (
          <div className="flex w-full items-center justify-end">
            <Button onClick={() => send(selected)} disabled={selected.length === 0}>
              {selected.length > 0 ? t("inviteCount", { count: selected.length }) : t("invite")}
            </Button>
          </div>
        ) : undefined
      }
    >
      {/* The panel's body has no padding of its own: 24px, like its head and foot. */}
      <div className="px-6 pb-6 pt-2">
        {house ? <InvitePanel stay={house} selected={selected} onSelect={setSelected} /> : <HousePicker houses={houses ?? []} onPick={setPicked} />}
      </div>
    </Sheet>
  );
}

/** Open a House › "Fill your House": the sheet's content on its own page, with its button. */
export function InvitePage({ stay, preselect = [], onDone, head }: { stay: Stay; preselect?: string[]; onDone: () => void; head?: ReactNode }) {
  const t = useTranslations("invite");
  const [selected, setSelected] = useState<string[]>(preselect);
  const send = useSendInvites(stay, onDone);
  return (
    <div className="flex flex-col gap-8">
      {head}
      <InvitePanel stay={stay} selected={selected} onSelect={setSelected} />
      <div className="flex items-center justify-between gap-4">
        <Button variant="tertiary" onClick={onDone} className="-ml-4">
          {t("skip")}
        </Button>
        <Button onClick={() => send(selected)} disabled={selected.length === 0}>
          {selected.length > 0 ? t("inviteCount", { count: selected.length }) : t("invite")}
        </Button>
      </div>
    </div>
  );
}

/** Sends to everyone picked; one toast says how it went (sent, the daily limit, said no to invites). */
function useSendInvites(stay: Stay | null, done: () => void) {
  const t = useTranslations("invite");
  const store = useStore();
  const showToast = useToast();
  return (ids: string[]) => {
    if (!stay || ids.length === 0) return;
    const results: InviteResult[] = ids.map((id) => store.inviteToStay(stay.id, id));
    const sent = results.filter((r) => r === "sent").length;
    if (results.includes("limit")) showToast(t("limitReached", { count: INVITE_POLICY.inviteNonConnectionsPerDay, sent }));
    else if (sent > 0) showToast(t("sent", { count: sent, hours: INVITE_POLICY.inviteHoldHours }));
    else showToast(t("notSent"));
    if (sent > 0) done();
  };
}

/** No House given (a profile): which of yours? */
function HousePicker({ houses, onPick }: { houses: Stay[]; onPick: (stay: Stay) => void }) {
  const t = useTranslations("invite");
  const store = useStore();
  return (
    <div>
      <p className="mb-3 text-body text-muted">{t("pickHouse")}</p>
      <ul className="space-y-1">
        {houses.map((stay) => (
          <li key={stay.id}>
            <button type="button" onClick={() => onPick(stay)} className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors duration-150 hover:bg-ink/5">
              <HousePhoto stay={stay} photo={housePhotos(stay, findUser(store, stay.hostId))[0]} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold text-ink">{stay.title}</span>
                <span className="block truncate text-small text-muted">{t("spotsOpen", { count: openSpots(stay) })}</span>
              </span>
              <ChevronRight aria-hidden className="size-4 text-muted" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HousePhoto({ stay, photo }: { stay: Stay; photo?: string }) {
  return <span className="relative size-14 shrink-0 overflow-hidden rounded-[14px] bg-ink/6">{photo && <Img src={photo} alt="" fill sizes="56px" className="object-cover" />}{!photo && <span className="sr-only">{stay.title}</span>}</span>;
}

/** The content: the House, "Share link", the people. Picking stops at the open spots; the daily limit for people with no tie is shown. */
function InvitePanel({ stay, selected, onSelect }: { stay: Stay; selected: string[]; onSelect: (ids: string[]) => void }) {
  const t = useTranslations("invite");
  const store = useStore();
  const today = useTodayIso();
  const monthName = useMonthName();
  const [query, setQuery] = useState("");
  const me = store.currentUserId;
  if (!me || !today) return null;
  const spots = openSpots(stay);
  const { people, saved, inFor } = inviteSuggestions(store, me, stay, today);
  const results = searchInvitees(store, me, stay, query).filter((u) => ![...people, ...saved, ...inFor].some((p) => p.id === u.id));
  // People picked from the search earlier stay visible in their own list.
  const pickedElse = selected.flatMap((id) => ([...people, ...saved, ...inFor].some((p) => p.id === id) ? [] : (findUser(store, id) ?? [])));
  const sentToday = store.joinRequests.filter((r) => r.invitedBy === me && r.createdAt.slice(0, 10) === today && !isConnection(store, me, r.userId)).length;
  const strangersPicked = selected.filter((id) => !isConnection(store, me, id)).length;
  const strangersLeft = Math.max(0, INVITE_POLICY.inviteNonConnectionsPerDay - sentToday - strangersPicked);
  const full = selected.length >= spots;
  const toggle = (user: User) => {
    if (selected.includes(user.id)) return onSelect(selected.filter((id) => id !== user.id));
    if (full || (!isConnection(store, me, user.id) && strangersLeft === 0)) return;
    onSelect([...selected, user.id]);
  };
  const disabledFor = (user: User) => !selected.includes(user.id) && (full || (!isConnection(store, me, user.id) && strangersLeft === 0));
  // "In for Lisbon · Mar": the place and month this House answers.
  const signal = store.inFor.find((s) => inFor.some((u) => u.id === s.userId) && isActiveInFor(s, today));
  const inForTitle = signal ? t("inForTitle", { place: inForPlaceName(signal), month: monthName(stay.startDate.slice(0, 7), "bare") }) : t("inForTitleNoPlace");
  const row = (user: User, note: string) => <PersonRow key={user.id} user={user} note={note} on={selected.includes(user.id)} disabled={disabledFor(user)} onToggle={() => toggle(user)} />;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <HousePhoto stay={stay} photo={housePhotos(stay, findUser(store, stay.hostId))[0]} />
        <div className="min-w-0">
          <p className="truncate text-h3 text-ink">{stay.title}</p>
          <p className="text-small text-muted">{t("spotsOpen", { count: spots })}</p>
        </div>
      </div>

      <ShareLink stay={stay} />

      {people.length > 0 && <Section title={t("yourPeople")}>{people.map((u) => row(u, t("livedWith")))}</Section>}
      {saved.length > 0 && <Section title={t("saved")}>{saved.map((u) => row(u, t("savedNote")))}</Section>}
      {inFor.length > 0 && <Section title={inForTitle}>{inFor.map((u) => row(u, t("inForNote")))}</Section>}
      {pickedElse.length > 0 && <Section title={t("picked")}>{pickedElse.map((u) => row(u, t("searchNote")))}</Section>}

      <section>
        <h3 className="mb-3 text-eyebrow uppercase text-ink/55">{t("search")}</h3>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaceholder")} aria-label={t("search")} className="pl-11" />
        </div>
        {query.trim().length >= 2 && (
          <ul className="mt-2">
            {results.length === 0 ? <li className="px-2 py-2 text-small text-muted">{t("noMatch")}</li> : results.map((u) => row(u, t("searchNote")))}
          </ul>
        )}
      </section>

      <p className="text-small text-muted">
        {full ? t("allSpotsPicked") : t("strangersLeft", { count: strangersLeft, limit: INVITE_POLICY.inviteNonConnectionsPerDay })}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-eyebrow uppercase text-ink/55">{title}</h3>
      <ul>{children}</ul>
    </section>
  );
}

/** One person: avatar 40px, first name, a note; a round check on the right (chosen: ink with a white check). */
function PersonRow({ user, note, on, disabled, onToggle }: { user: User; note: string; on: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={on}
        disabled={disabled}
        onClick={onToggle}
        className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors duration-150 hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
      >
        <Avatar user={user} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-semibold text-ink">{firstName(user)}</span>
          <span className="block truncate text-small text-muted">{note}</span>
        </span>
        <span aria-hidden className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150", on ? "border-ink bg-ink text-white" : "border-ink/20 text-transparent")}>
          <Check className="size-3.5 motion-safe:transition-transform motion-safe:duration-200" strokeWidth={3} />
        </span>
      </button>
    </li>
  );
}

/** "Share link": copy, WhatsApp, QR, the system's share. The link (/i/{code}) is made on first use and holds a spot for 48h. */
function ShareLink({ stay }: { stay: Stay }) {
  const t = useTranslations("invite");
  const tCommon = useTranslations("common");
  const store = useStore();
  const showToast = useToast();
  const [invite, setInvite] = useState<HouseInvite | null>(null);
  const [qr, setQr] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function" && isTouchDevice();
  const ensure = () => {
    if (invite) return inviteLink(invite.token);
    const made = store.createHouseInvite(stay.id, {});
    if (!made) {
      showToast(t("linkFailed"));
      return null;
    }
    setInvite(made);
    return inviteLink(made.token);
  };
  const text = (url: string) => t("message", { title: shortNameOf(stay), url });
  const copy = async () => {
    const url = ensure();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      showToast(t("copied", { hours: INVITE_POLICY.inviteHoldHours }));
    } catch {
      showToast(tCommon("linkCopyFailed"));
    }
  };
  const whatsApp = () => {
    const url = ensure();
    if (url) window.open(`https://wa.me/?text=${encodeURIComponent(text(url))}`, "_blank", "noopener");
  };
  const system = async () => {
    const url = ensure();
    if (!url) return;
    try {
      await navigator.share({ title: stay.title, text: text(url), url });
    } catch {
      // Cancelled – nothing to show.
    }
  };
  const actions = [
    { key: "copy", icon: <Link2 aria-hidden />, label: t("copy"), onClick: copy },
    { key: "whatsapp", icon: <MessageCircle aria-hidden />, label: t("whatsapp"), onClick: whatsApp },
    { key: "qr", icon: <QrCode aria-hidden />, label: t("qr"), onClick: () => ensure() && setQr((q) => !q) },
    ...(canShare ? [{ key: "share", icon: <Share aria-hidden />, label: t("share"), onClick: system }] : []),
  ];
  return (
    <section>
      <h3 className="mb-2 text-eyebrow uppercase text-ink/55">{t("shareLink")}</h3>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button key={a.key} variant="secondary" size="sm" onClick={a.onClick} aria-pressed={a.key === "qr" ? qr : undefined}>
            {a.icon}
            {a.label}
          </Button>
        ))}
      </div>
      <p className="mt-2 text-small text-muted">{t("linkHolds", { hours: INVITE_POLICY.inviteHoldHours })}</p>
      {qr && invite && (
        <div className="mt-4 inline-block rounded-[20px] bg-[#F4EEE7] p-4">
          <SimpuloQR url={inviteLink(invite.token)} size={160} refParam="invite-sheet" />
        </div>
      )}
    </section>
  );
}

/** After joining or paying: "Bring someone? 2 spots left" + "Invite" (the invite sheet) – only while there's a spot and the House hasn't started. */
export function BringSomeone({ stay, className }: { stay: Stay; className?: string }) {
  const t = useTranslations("invite");
  const can = useCanInvite(stay.id);
  const [open, setOpen] = useState(false);
  if (!can) return null;
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-3", className)}>
      <span className="text-body text-ink">{t("bringSomeone", { count: openSpots(stay) })}</span>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t("invite")}
      </Button>
      <InviteSheet stay={stay} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
