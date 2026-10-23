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
  className?: string;
}

/** ⋯ with "Report" (and "Block …" for people). Logged out, both ask for a login first. */
export function SafetyMenu({ target, user, onBlocked, className }: SafetyMenuProps) {
  const t = useTranslations("safety");
  const store = useStore();
  const requireAuth = useRequireAuth();
  const showToast = useToast();
  const [sheet, setSheet] = useState<"report" | "block" | null>(null);
  const name = user ? firstName(user) : undefined;
  const blocked = user !== undefined && isBlocked(store, user.id);

  const items: MoreMenuItem[] = [{ label: t("report"), onSelect: () => requireAuth(() => setSheet("report"), t("loginToReport")) }];
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
            onSelect: () => requireAuth((userId) => userId !== user.id && setSheet("block"), t("loginToBlock", { name })),
          },
    );
  }

  return (
    <>
      <MoreMenu items={items} label={t("moreOptions")} className={className} />
      <ReportSheet open={sheet === "report"} onClose={() => setSheet(null)} target={target} name={name} />
      {user && <BlockSheet open={sheet === "block"} onClose={() => setSheet(null)} user={user} onBlocked={onBlocked} />}
    </>
  );
}
