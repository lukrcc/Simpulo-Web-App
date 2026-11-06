"use client";

import { BadgeCheck, CircleAlert, IdCard, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/ActionButton";
import { payments } from "@/lib/payments";
import { useIdentity } from "@/lib/payments/hooks";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Voluntary ID check (Stripe Identity): why, the state, "Verify with ID". The check mark on the profile comes only from "verified". */
export function IdentityCard({ className }: { className?: string }) {
  const t = useTranslations("verification");
  const router = useRouter();
  const me = useStore().currentUserId;
  const { status } = useIdentity();
  const [busy, setBusy] = useState(false);
  async function start() {
    if (!me || busy) return;
    setBusy(true);
    router.push(await payments.startIdentityCheck(me, "/settings#verification"));
  }
  if (status === null) return <div className={cn("card-soft h-28 animate-pulse rounded-3xl", className)} />;
  const view = {
    none: { icon: IdCard, title: t("noneTitle"), text: t("noneText") },
    processing: { icon: Loader2, title: t("processingTitle"), text: t("processingText") },
    verified: { icon: BadgeCheck, title: t("verifiedTitle"), text: t("verifiedText") },
    failed: { icon: CircleAlert, title: t("failedTitle"), text: t("failedText") },
  }[status];
  const Icon = view.icon;
  return (
    <div className={cn("card-soft flex flex-wrap items-center gap-4 rounded-3xl p-6", className)}>
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full bg-ink/6", status === "verified" ? "text-accent" : "text-ink")}>
        <Icon className={cn("size-5", status === "processing" && "animate-spin")} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold text-ink">{view.title}</p>
        <p className="text-small text-muted">{view.text}</p>
      </div>
      {(status === "none" || status === "failed") && (
        <Button variant="secondary" size="sm" onClick={start} disabled={busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          {t("action")}
        </Button>
      )}
    </div>
  );
}
