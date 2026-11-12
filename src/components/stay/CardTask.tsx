"use client";

import { FileUp, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useRef, useState, useSyncExternalStore, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { CardStatusAction } from "@/components/HouseCard";
import { Button } from "@/components/ui/ActionButton";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Img } from "@/components/ui/Img";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { type CardTask, type CardTaskKind } from "@/lib/houseTasks";
export { cardTaskOf } from "@/lib/houseTasks";
import { answersSlowly, responseRate } from "@/lib/requests";
import { findUser, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { housePhotos } from "@/lib/utils";
import { HouseRequests } from "./HouseDetail";
import { LockSheet } from "./LockSheet";
import { PaySheet } from "./PaySheet";

const noSubscribe = () => () => {};

/**
 * On a House card (footer="status"): when the House asks something of you, the one glass pill with its orange dot and a short text
 * ("Pay · 31h left", "Review 4", "Answer invite") that opens the action itself, in a sheet – not the card. Up next shows it as a button. The sheet goes to the body (a portal): the card scales on hover
 * and clips its content, a fixed sheet inside it would move and be cut.
 */
export function CardTaskAction({ stay, task, now, button = false, text = false }: { stay: Stay; task: CardTask; now: string; /** A real button (Up next) instead of the card's glass pill */ button?: boolean; /** MyHouseTile's status line: "● Review 1 request", "Pay · 48h" in orange – text, no pill */ text?: boolean }) {
  const t = useTranslations("houses.home.task");
  const [open, setOpen] = useState(false);
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  // "Pay · 31h left": the hours until its deadline, at least 1.
  const hours = task.date ? Math.max(1, Math.ceil((Date.parse(task.date) - Date.parse(now)) / 3_600_000)) : 0;
  const label = t(`${task.kind}.action`, { count: task.count ?? 0, hours });
  return (
    <>
      {text ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          className={cn("inline-flex min-w-0 items-center gap-1.5 truncate text-small font-semibold underline-offset-4 hover:underline", task.kind === "pay" || task.kind === "offer" ? "text-accent" : "text-ink")}
        >
          {task.kind !== "pay" && task.kind !== "offer" && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />}
          {label}
        </button>
      ) : button ? (
        <Button onClick={() => setOpen(true)}>{label}</Button>
      ) : (
        <CardStatusAction onClick={() => setOpen(true)}>{label}</CardStatusAction>
      )}
      {hydrated && createPortal(<TaskSheet stay={stay} kind={task.kind} open={open} onClose={() => setOpen(false)} now={now} />, document.body)}
    </>
  );
}

function TaskSheet({ stay, kind, open, onClose, now }: { stay: Stay; kind: CardTaskKind; open: boolean; onClose: () => void; now: string }) {
  if (kind === "pay") return <PaySheet stay={stay} open={open} onClose={onClose} />;
  if (kind === "choosePlace") return open ? <LockSheet stay={stay} onClose={onClose} /> : null;
  if (kind === "requests") return <RequestsSheet stay={stay} open={open} onClose={onClose} now={now} />;
  if (kind === "book") return <BookingSheet stay={stay} open={open} onClose={onClose} />;
  if (kind === "invite") return <InviteAnswerSheet stay={stay} open={open} onClose={onClose} />;
  return <OfferSheet stay={stay} open={open} onClose={onClose} />;
}

/** "Review": the House's open requests in the side panel, exactly as on its Requests tab. A host who lets requests expire reads why it matters. */
function RequestsSheet({ stay, open, onClose, now }: { stay: Stay; open: boolean; onClose: () => void; now: string }) {
  const t = useTranslations("houses.home.task");
  const store = useStore();
  const slow = answersSlowly(responseRate(store, stay.hostId, Date.parse(now)));
  return (
    <Sheet variant="panel" open={open} onClose={onClose} title={t("requests.sheetTitle", { house: stay.title })}>
      {slow && <p className="mb-6 text-small text-muted">{t("requests.slow")}</p>}
      <HouseRequests stay={stay} />
    </Sheet>
  );
}

/** The House small at the top of a dialog: picture, title, dates · place. */
function HouseLine({ stay }: { stay: Stay }) {
  const f = useFormat();
  const cover = housePhotos(stay)[0];
  return (
    <div className="flex items-center gap-4">
      <span className="relative size-14 shrink-0 overflow-hidden rounded-[14px] bg-ink/6">{cover && <Img src={cover} alt="" fill sizes="56px" className="object-cover" />}</span>
      <span className="min-w-0">
        <span className="block truncate text-body font-semibold text-ink">{stay.title}</span>
        <span className="block truncate text-small text-muted">
          {f.stayDatesLong(stay)} · {f.placeName(stay)}
        </span>
      </span>
    </div>
  );
}

/** "Answer": join (the spot is held for you) or say no. */
function InviteAnswerSheet({ stay, open, onClose }: { stay: Stay; open: boolean; onClose: () => void }) {
  const t = useTranslations("houses.home.task");
  const tHouses = useTranslations("houses");
  const store = useStore();
  const showToast = useToast();
  const host = findUser(store, stay.hostId);
  function respond(accept: boolean) {
    store.respondToInvite(stay.id, accept);
    onClose();
    showToast(accept ? tHouses("invite.acceptedToast", { title: stay.title }) : tHouses("invite.declinedToast"));
  }
  return (
    <Sheet open={open} onClose={onClose} title={t("invite.sheetTitle", { name: host?.name.split(" ")[0] ?? "" })}>
      <HouseLine stay={stay} />
      <p className="mt-4 text-body text-muted">{t("invite.sheetText")}</p>
      <ModalFooter onCancel={onClose} className="mt-8">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => respond(false)}>
            {tHouses("invite.decline")}
          </Button>
          <Button onClick={() => respond(true)}>{tHouses("invite.accept")}</Button>
        </div>
      </ModalFooter>
    </Sheet>
  );
}

/** "Take spot": a spot from the waitlist, held for 24h. With payments already due, taking it is paying for it. */
function OfferSheet({ stay, open, onClose }: { stay: Stay; open: boolean; onClose: () => void }) {
  const t = useTranslations("houses.home.task");
  const store = useStore();
  const showToast = useToast();
  const [paying, setPaying] = useState(false);
  const payToTake = stay.accommodationStatus === "locked" && Boolean(stay.pricePerPerson) && stay.spotsFilled + 1 >= stay.spotsTotal;
  return (
    <>
      <ConfirmSheet
        open={open}
        title={t("offer.sheetTitle", { house: stay.title })}
        description={t("offer.sheetText")}
        confirmLabel={t("offer.action")}
        onClose={onClose}
        onConfirm={() => {
          store.takeWaitlistSpot(stay.id);
          onClose();
          if (payToTake) setPaying(true);
          else showToast(t("offer.toast", { house: stay.title }));
        }}
      />
      <PaySheet stay={stay} open={paying} onClose={() => setPaying(false)} />
    </>
  );
}

/** "Confirm booking": everyone paid – upload the booking confirmation within 48h, and the money is released. */
function BookingSheet({ stay, open, onClose }: { stay: Stay; open: boolean; onClose: () => void }) {
  const t = useTranslations("houses.home.task");
  const tPay = useTranslations("houses.payments");
  const store = useStore();
  const showToast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    await store.confirmBooking(stay.id, file);
    setBusy(false);
    onClose();
    showToast(tPay("confirmedToast"));
  }
  return (
    <Sheet open={open} onClose={onClose} title={t("book.sheetTitle")}>
      <HouseLine stay={stay} />
      <p className="mt-4 text-body text-muted">{t("book.sheetText")}</p>
      <ModalFooter onCancel={onClose} className="mt-8">
        <input ref={input} type="file" accept="image/*,application/pdf" onChange={upload} className="hidden" />
        <Button disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="animate-spin" aria-label={tPay("uploading")} /> : <FileUp aria-hidden />}
          {tPay("upload")}
        </Button>
      </ModalFooter>
    </Sheet>
  );
}
