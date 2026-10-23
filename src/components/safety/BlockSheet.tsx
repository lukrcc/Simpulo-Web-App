"use client";

import { useTranslations } from "next-intl";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { firstName } from "@/lib/utils";

interface BlockSheetProps {
  open: boolean;
  onClose: () => void;
  user: User;
  /** After blocking, e.g. leave a chat that's now gone */
  onBlocked?: () => void;
}

/** "Block Tom?" – blocking hides their chats and auto-declines their requests to your Houses. */
export function BlockSheet({ open, onClose, user, onBlocked }: BlockSheetProps) {
  const t = useTranslations("safety.blockSheet");
  const { blockUser } = useStore();
  const showToast = useToast();
  const name = firstName(user);

  return (
    <ConfirmSheet
      open={open}
      title={t("title", { name })}
      description={t("description")}
      confirmLabel={t("confirm")}
      onClose={onClose}
      onConfirm={() => {
        blockUser(user.id);
        showToast(t("blocked", { name }));
        onClose();
        onBlocked?.();
      }}
    />
  );
}
