"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { MoreMenu, type MoreMenuItem } from "@/components/ui/MoreMenu";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";

interface CrewMenuProps {
  stay: Stay;
  /** Where a member lands after leaving (they lose access to the chat and the House panel). */
  afterLeaveHref: string;
  /** Leave out "View House" etc. where the page already links there */
  minimal?: boolean;
}

/** ⋯ menu for a crew: members can leave; the host can't – they edit or close the House instead. */
export function CrewMenu({ stay, afterLeaveHref, minimal = false }: CrewMenuProps) {
  const t = useTranslations("houses");
  const { currentUserId, leaveStay, closeStay } = useStore();
  const router = useRouter();
  const showToast = useToast();
  const [confirm, setConfirm] = useState<"leave" | "close" | null>(null);
  const isHost = stay.hostId === currentUserId;

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

  const items: MoreMenuItem[] = isHost
    ? [
        ...(minimal ? [] : [{ label: t("crewMenu.manage"), href: `/my-stays?id=${stay.id}` }]),
        { label: t("crewMenu.edit"), href: `/my-stays/${stay.id}/edit` },
        ...(stay.status === "closed" ? [] : [{ label: t("crewMenu.close"), onSelect: () => setConfirm("close"), danger: true }]),
      ]
    : [
        ...(minimal ? [] : [{ label: t("crewMenu.view"), href: `/stays/${stay.slug}` }]),
        { label: t("crewMenu.leave"), onSelect: () => setConfirm("leave"), danger: true },
      ];

  return (
    <>
      <MoreMenu items={items} />
      <ConfirmSheet
        open={confirm === "leave"}
        title={t("crewMenu.leaveTitle")}
        description={t("crewMenu.leaveDescription")}
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
