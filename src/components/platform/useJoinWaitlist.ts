"use client";

import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/Toast";

/** Where "Become a Founding Host", "Host one like this" and "Host here" lead: the host application (before the launch the placeholder at
 *  /create – the application itself comes in its own step). */
export const HOST_APPLY_HREF = "/create";

/** "Join the waitlist" (pre-launch and beta): for now a toast – the waitlist itself comes in its own step. */
export function useJoinWaitlist() {
  const t = useTranslations("platform.waitlist");
  const showToast = useToast();
  return () => showToast(t("toast"));
}
