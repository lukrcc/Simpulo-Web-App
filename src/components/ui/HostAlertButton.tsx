"use client";

import { Bell, BellRing } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { usePreviewGuard } from "@/components/PreviewMode";
import { getCurrentUser, useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { Button } from "./ActionButton";
import { useToast } from "./Toast";

/**
 * "Notify me" on a host's profile: an alert when they open a House. Secondary in both states (a toggle, never the
 * page's primary) – off a bell, on a ringing bell and "Notifying". No counts anywhere – it's a personal reminder, not a follower relation.
 */
export function HostAlertButton({ host }: { host: Pick<User, "id" | "name"> }) {
  const t = useTranslations("common.ui.hostAlert");
  const store = useStore();
  const requireAuth = useRequireAuth();
  const showToast = useToast();
  const guard = usePreviewGuard();
  const name = host.name.split(" ")[0];
  const on = getCurrentUser(store)?.hostAlerts?.includes(host.id) ?? false;

  function toggle() {
    guard(() =>
      requireAuth(() => {
        store.toggleHostAlert(host.id);
        showToast(on ? t("off", { name }) : t("on", { name }));
      }, { reason: "login" }),
    );
  }

  return (
    <Button
      variant="secondary"
      size="md"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? t("notifyingLabel", { name }) : t("notifyMeLabel", { name })}
    >
      {on ? <BellRing /> : <Bell />}
      {on ? t("notifying") : t("notifyMe")}
    </Button>
  );
}
