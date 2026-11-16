"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { MoreMenu, type MoreMenuItem } from "@/components/ui/MoreMenu";
import { useToast } from "@/components/ui/Toast";
import { isBlocked, useStore } from "@/lib/store";
import type { Report, User } from "@/lib/types";
import { firstName } from "@/lib/utils";
import { BlockSheet } from "./BlockSheet";
import { ReportSheet } from "./ReportSheet";

interface SafetyMenuProps {
  /** What "Report" reports */
  target: Report["target"];
  /** Adds "Block {name}" / "Unblock {name}" */
  user?: User;
  /** After blocking `user` */
  onBlocked?: () => void;
  /** More entries above "Report" (e.g. "Show QR code" on the House page) */
  extraItems?: MoreMenuItem[];
  className?: string;
  buttonClassName?: string;
  /** Above everything, not an entry (the chat: its background dots) */
  top?: React.ReactNode;
  onOpen?: () => void;
  /** From a dark surface: the dark menu */
  dark?: boolean;
}

/** ⋯ with "Report" (and "Block …" for people). Logged out, both ask for a login first. */
export function SafetyMenu({ target, user, onBlocked, extraItems = [], className, buttonClassName, top, onOpen, dark }: SafetyMenuProps) {
  const t = useTranslations("safety");
  const store = useStore();
  const requireAuth = useRequireAuth();
  const showToast = useToast();
  const [sheet, setSheet] = useState<"report" | "block" | null>(null);
  const name = user ? firstName(user) : undefined;
  const blocked = user !== undefined && isBlocked(store, user.id);

  const items: MoreMenuItem[] = [...extraItems, ...(extraItems.length > 0 ? [{ separator: true as const }] : []), { label: t("report"), onSelect: () => requireAuth(() => setSheet("report"), { reason: "login" }) }];
  if (user && name) {
    items.push(
      blocked
        ? {
            label: t("unblock", { name }),
            onSelect: () => {
              store.unblockUser(user.id);
              showToast(t("blockedProfile.unblocked", { name }));
            },
          }
        : {
            label: t("block", { name }),
            danger: true,
            // Your own profile / House never shows this menu – but right after an inline login it might be you.
            onSelect: () => requireAuth((userId) => userId !== user.id && setSheet("block"), { reason: "login" }),
          },
    );
  }

  return (
    <>
      <MoreMenu items={items} label={t("moreOptions")} className={className} buttonClassName={buttonClassName} top={top} onOpen={onOpen} dark={dark} />
      <ReportSheet open={sheet === "report"} onClose={() => setSheet(null)} target={target} name={name} />
      {user && <BlockSheet open={sheet === "block"} onClose={() => setSheet(null)} user={user} onBlocked={onBlocked} />}
    </>
  );
}
