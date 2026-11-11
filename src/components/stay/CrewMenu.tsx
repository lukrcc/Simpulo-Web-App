"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { MoreMenu, type MoreMenuItem } from "@/components/ui/MoreMenu";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { useStore } from "@/lib/store";
import { waitlistOf, waitlistRefund } from "@/lib/waitlist";
import type { Stay } from "@/lib/types";

interface CrewMenuProps {
  stay: Stay;
  /** Where a member lands after leaving (they lose access to the chat and the House panel). */
  afterLeaveHref: string;
  /** Leave out "View House" etc. where the page already links there */
  minimal?: boolean;
  /** More entries first (the detail page puts "Edit" here) */
  extraItems?: MoreMenuItem[];
  /** The trigger's look (on the detail page's photo banner: onImage) */
  buttonClassName?: string;
}

/** ⋯ menu for a crew: members can leave; the host can't – they edit or close the House instead. */
export function CrewMenu({ stay, afterLeaveHref, minimal = false, extraItems = [], buttonClassName }: CrewMenuProps) {
  const t = useTranslations("houses");
  const store = useStore();
  const { currentUserId, leaveStay, closeStay, setAcceptingRequests } = store;
  const f = useFormat();
  const router = useRouter();
  const showToast = useToast();
  const [confirm, setConfirm] = useState<"leave" | "close" | null>(null);
  const isHost = stay.hostId === currentUserId;
  // Paid, and people are waiting: the spot goes to the waitlist and the refund keeps Simpulo's fee (src/lib/waitlist.ts).
  const paid = store.payments.find((p) => p.stayId === stay.id && p.userId === currentUserId && p.status === "paid");
  const toWaitlist = paid && waitlistOf(store, stay.id).length > 0 ? paid : undefined;

  function leave() {
    setConfirm(null);
    // Navigate first: once out of the crew, this chat/panel isn't ours to show anymore.
    router.push(afterLeaveHref);
    leaveStay(stay.id);
    showToast(t("crewMenu.leftToast", { title: stay.title }));
  }

  function close() {
    setConfirm(null);
    closeStay(stay.id);
    showToast(t("detail.closedToast"));
  }

  const items: MoreMenuItem[] = [...extraItems, ...(isHost
    ? [
        ...(minimal ? [] : [{ label: t("crewMenu.manage"), href: `/h/${stay.id}/manage` }]),
        ...(minimal ? [] : [{ label: t("crewMenu.edit"), href: `/your-houses/${stay.id}/edit` }]),
        // Taking requests is a setting, not a status to show – it lives here.
        ...(stay.status === "published" || stay.status === "booked"
          ? [
              {
                label: stay.acceptingRequests ? t("crewMenu.stopRequests") : t("crewMenu.takeRequests"),
                onSelect: () => setAcceptingRequests(stay.id, !stay.acceptingRequests),
              },
            ]
          : []),
        ...(stay.status === "closed" ? [] : [{ label: t("crewMenu.close"), onSelect: () => setConfirm("close"), danger: true }]),
      ]
    : [
        ...(minimal ? [] : [{ label: t("crewMenu.view"), href: `/house/${stay.slug}` }]),
        { label: t("crewMenu.leave"), onSelect: () => setConfirm("leave"), danger: true },
      ])];

  return (
    <>
      <MoreMenu items={items} buttonClassName={buttonClassName} />
      <ConfirmSheet
        open={confirm === "leave"}
        title={t("crewMenu.leaveTitle")}
        description={toWaitlist ? t("crewMenu.leaveWaitlistDescription", { amount: f.price(waitlistRefund(toWaitlist), stay.currency), fee: f.price(toWaitlist.fee, stay.currency) }) : paid ? t("crewMenu.leavePaidDescription") : t("crewMenu.leaveDescription")}
        confirmLabel={t("crewMenu.leaveConfirm")}
        onConfirm={leave}
        onClose={() => setConfirm(null)}
      />
      <CloseStayConfirm open={confirm === "close"} onConfirm={close} onClose={() => setConfirm(null)} />
    </>
  );
}

/** Shared by the chat menu and the Houses danger zone. */
export function CloseStayConfirm({ open, onConfirm, onClose }: { open: boolean; onConfirm: () => void; onClose: () => void }) {
  const t = useTranslations("houses.crewMenu");
  return (
    <ConfirmSheet
      open={open}
      title={t("closeTitle")}
      description={t("closeDescription")}
      confirmLabel={t("closeConfirm")}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
