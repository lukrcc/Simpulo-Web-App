"use client";

import { Check, Link2, Mail, MailOpen, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { FormField, formInput } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { cardClass } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { paymentSplit } from "@/lib/fees";
import { findUser, houseInviteUrl, openHouseInvites, useStore } from "@/lib/store";
import type { HouseInvite, Stay } from "@/lib/types";
import { cn, openSpots } from "@/lib/utils";
import { DetailSection, ListRow } from "./DetailSection";
import { InterestLine } from "./InterestInvite";
import { CardPayForm } from "./PaySheet";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "Nov 4, 14:30" – when a reservation runs out. */
function useUntil() {
  const f = useFormat();
  return (iso: string) => `${f.day(iso)}, ${f.time(iso)}`;
}

const linkOf = (stay: Stay, invite: HouseInvite) => houseInviteUrl(window.location.origin, stay, invite);

// ─── Host ──────────────────────────────────────────────────────────────────────

/**
 * Your houses → "Interested & invites": people interested in the city and month, the open invite links (Resend /
 * Cancel) and "Invite" (name or email → a link that reserves a spot for 48h). The header's "Invite" opens the same
 * sheet (InviteSheet).
 */
export function HostInvitesSection({ stay }: { stay: Stay }) {
  const t = useTranslations("houses.invites");
  const tSection = useTranslations("houses.detail.sections");
  const tCommon = useTranslations("common");
  const store = useStore();
  const showToast = useToast();
  const until = useUntil();
  const [inviting, setInviting] = useState(false);
  const invites = openHouseInvites(store, stay.id);
  const canInvite = openSpots(stay) > 0;

  async function resend(invite: HouseInvite) {
    store.resendHouseInvite(invite.token);
    if (invite.email) return showToast(t("resentEmail", { email: invite.email }));
    // Link only: the renewed link goes to the clipboard, to send again.
    try {
      await navigator.clipboard.writeText(linkOf(stay, invite));
      showToast(t("resentLink"));
    } catch {
      showToast(tCommon("linkCopyFailed"));
    }
  }

  return (
    <DetailSection
      title={tSection("interested")}
      action={
        <Button variant="secondary" onClick={() => setInviting(true)} disabled={!canInvite}>
          <UserPlus aria-hidden />
          {t("invite")}
        </Button>
      }
    >
      <InterestLine stay={stay} />
      <p className="py-2 text-small text-muted">{canInvite ? t("description") : t("full")}</p>
      {invites.length > 0 && (
        <ul className="divide-y divide-line">
          {invites.map((invite) => {
            const name = invite.invitedName ?? invite.email ?? t("someone");
            return (
              <li key={invite.token}>
                <ListRow
                  lead={invite.email ? <Mail aria-hidden /> : <Link2 aria-hidden />}
                  title={name}
                  subtitle={`${t("until", { date: until(invite.expiresAt) })} · ${invite.email ? t("emailed", { email: invite.email }) : t("linkOnly")}`}
                  action={
                    <>
                      <Button variant="tertiary" onClick={() => resend(invite)} aria-label={t("resendLabel", { name })}>
                        {t("resend")}
                      </Button>
                      <Button
                        variant="tertiary"
                        onClick={() => {
                          store.cancelHouseInvite(invite.token);
                          showToast(t("cancelled"));
                        }}
                        aria-label={t("cancelLabel", { name })}
                      >
                        {t("cancel")}
                      </Button>
                    </>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
      <InviteSheet stay={stay} open={inviting} onClose={() => setInviting(false)} />
    </DetailSection>
  );
}

/** The invite sheet: from the section's "Invite" and from the header's primary "Invite". */
export function InviteSheet({ stay, open, onClose }: { stay: Stay; open: boolean; onClose: () => void }) {
  const t = useTranslations("houses.invites");
  return (
    <Sheet open={open} onClose={onClose} title={t("sheet.title", { title: stay.title })}>
      {/* Remounted per open: always starts at the empty field. */}
      {open && <InviteForm stay={stay} onDone={onClose} />}
    </Sheet>
  );
}

/** Name or email → the invite. Email: "sent" (mock mail). Name: the link, to copy and send yourself. */
function InviteForm({ stay, onDone }: { stay: Stay; onDone: () => void }) {
  const t = useTranslations("houses.invites.sheet");
  const tCommon = useTranslations("common");
  const store = useStore();
  const showToast = useToast();
  const until = useUntil();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<HouseInvite | null>(null);
  const [copied, setCopied] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text) return setError(t("empty"));
    // An @ means an email – and then it has to be a real-looking one.
    const isEmail = text.includes("@");
    if (isEmail && !EMAIL.test(text)) return setError(t("invalidEmail"));
    const invite = store.createHouseInvite(stay.id, isEmail ? { email: text } : { name: text });
    if (!invite) return setError(t("failed"));
    setCreated(invite);
  }

  async function copy(invite: HouseInvite) {
    try {
      await navigator.clipboard.writeText(linkOf(stay, invite));
      setCopied(true);
    } catch {
      showToast(tCommon("linkCopyFailed"));
    }
  }

  if (created) {
    const date = until(created.expiresAt);
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg text-ink">
            {created.email ? <MailOpen className="size-5" aria-hidden /> : <Link2 className="size-5" aria-hidden />}
          </span>
          <div className="min-w-0 text-body">
            <p className="font-semibold text-ink">{created.email ? t("sentTitle") : t("linkTitle")}</p>
            <p className="mt-0.5 text-muted">
              {created.email ? t("sentText", { email: created.email, date }) : t("linkText", { name: created.invitedName ?? "", date })}
            </p>
          </div>
        </div>
        {/* The link is always there to copy – also when it was emailed. */}
        <div className="flex items-center gap-2 rounded-xl border border-line bg-bg py-1.5 pl-4 pr-1.5">
          <span className="min-w-0 flex-1 truncate text-small text-muted">{linkOf(stay, created)}</span>
          <Button variant={created.email ? "secondary" : "primary"} onClick={() => copy(created)}>
            {copied ? <Check aria-hidden /> : <Link2 aria-hidden />}
            {copied ? t("copied") : t("copy")}
          </Button>
        </div>
        <Button variant="secondary" size="lg" onClick={onDone} className="w-full">
          {t("done")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormField label={t("label")} helper={t("helper")} error={error}>
        <input
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder={t("placeholder")}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          className={formInput}
        />
      </FormField>
      <Button type="submit" size="lg" className="w-full">
        {t("create")}
      </Button>
    </form>
  );
}

// ─── Guest (House page with ?invite=token) ─────────────────────────────────────

/** Top of the House page while the invite link is valid: who invited you and how long your spot waits. */
export function InviteBanner({ stay, invite }: { stay: Stay; invite: HouseInvite }) {
  const t = useTranslations("house.inviteLink");
  const store = useStore();
  const until = useUntil();
  const host = findUser(store, stay.hostId);
  return (
    <div role="status" className={cn(cardClass, "flex items-center gap-3 text-body")}>
      <MailOpen className="size-5 shrink-0 text-muted" aria-hidden />
      <p className="min-w-0 flex-1 font-medium text-ink">{t("banner", { host: host?.name.split(" ")[0] ?? "", date: until(invite.expiresAt) })}</p>
    </div>
  );
}

/**
 * Joining through the invite: a locked place is paid right here (card form), then the reservation becomes a
 * member; otherwise they join now and pay later with the crew. Opened after login (the page's requireAuth).
 */
export function InviteJoinSheet({ stay, invite, open, onClose }: { stay: Stay; invite: HouseInvite; open: boolean; onClose: () => void }) {
  const t = useTranslations("house.inviteLink");
  return (
    <Sheet open={open} onClose={onClose} title={t("sheetTitle", { title: stay.title })} size="wide">
      {open && <InviteJoin stay={stay} invite={invite} onDone={onClose} />}
    </Sheet>
  );
}

function InviteJoin({ stay, invite, onDone }: { stay: Stay; invite: HouseInvite; onDone: () => void }) {
  const t = useTranslations("house.inviteLink");
  const store = useStore();
  const showToast = useToast();
  const [busy, setBusy] = useState(false);
  const host = findUser(store, stay.hostId);
  const locked = stay.accommodationStatus === "locked" && stay.pricePerPerson;

  function finish(result: "joined" | "declined" | "invalid") {
    if (result === "joined") showToast(t("joinedToast", { title: stay.title }));
    if (result === "invalid") showToast(t("invalid"));
    if (result !== "declined") onDone();
  }

  if (locked) {
    const amounts = paymentSplit(stay.pricePerPerson!, stay.hostFeePerPerson ?? 0);
    return (
      <div className="space-y-4">
        <p className="text-small text-muted">{t("payText")}</p>
        <CardPayForm
          stay={stay}
          amounts={{ ...amounts, hostFee: amounts.hostFee || undefined }}
          onPay={async (card) => {
            const result = await store.redeemHouseInvite(invite.token, card);
            finish(result);
            return result === "declined" ? "declined" : "paid";
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-small text-muted">{t("joinText", { host: host?.name.split(" ")[0] ?? "" })}</p>
      <Button
        size="lg"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          finish(await store.redeemHouseInvite(invite.token));
        }}
        className="w-full"
      >
        {t("joinNow")}
      </Button>
    </div>
  );
}
