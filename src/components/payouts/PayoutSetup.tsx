"use client";

import { BadgeCheck, CircleAlert, Landmark, Loader2, ShieldCheck, Users, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/ActionButton";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { payments } from "@/lib/payments";
import { usePayoutAccount } from "@/lib/payments/hooks";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Where Stripe sends the host back after onboarding. */
export const PAYOUTS_RETURN = "/settings/payouts";

/** "Payments by Stripe", small – the only place the name shows; no logo copies. */
export function ByStripe({ className }: { className?: string }) {
  const t = useTranslations("payouts");
  return <p className={cn("text-small text-muted", className)}>{t("byStripe")}</p>;
}

/** Sends the host to the provider's onboarding (the mock: /dev/stripe-onboarding). */
export function useStartOnboarding() {
  const router = useRouter();
  const me = useStore().currentUserId;
  const [busy, setBusy] = useState(false);
  async function start() {
    if (!me || busy) return;
    setBusy(true);
    await payments.createPayoutAccount(me);
    const link = await payments.getOnboardingLink(me, PAYOUTS_RETURN);
    router.push(link);
  }
  return { start, busy };
}

/** "Set up payouts": three short points, "Continue to Stripe", "Payments by Stripe". */
export function PayoutSetupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("payouts");
  const { start, busy } = useStartOnboarding();
  const points = [
    { icon: Users, text: t("point1") },
    { icon: Wallet, text: t("point2") },
    { icon: ShieldCheck, text: t("point3") },
  ];
  return (
    <Sheet open={open} onClose={onClose} title={t("setupTitle")}>
      <ul className="flex flex-col gap-4">
        {points.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink/6 text-ink">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="pt-1.5 text-body text-ink">{text}</span>
          </li>
        ))}
      </ul>
      <ModalFooter onCancel={onClose} className="mt-8">
        <Button onClick={start} disabled={busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          {t("continue")}
        </Button>
      </ModalFooter>
      <ByStripe className="mt-4 text-right" />
    </Sheet>
  );
}

/**
 * The payout account's state as one card: none → set it up · pending → "Stripe is checking your details" · active → "Payouts ready · Bank ****1234" ·
 * action_required → "Stripe needs one more thing". Settings › Payouts, Earnings, the return page.
 */
export function PayoutStatusCard({ className }: { className?: string }) {
  const t = useTranslations("payouts");
  const { status, last4 } = usePayoutAccount();
  const [setup, setSetup] = useState(false);
  const { start, busy } = useStartOnboarding();
  if (status === null) return <div className={cn("card-soft h-28 animate-pulse rounded-3xl", className)} />;
  const view = {
    none: { icon: Landmark, title: t("noneTitle"), text: t("noneText") },
    pending: { icon: Loader2, title: t("pendingTitle"), text: t("pendingText") },
    action_required: { icon: CircleAlert, title: t("actionTitle"), text: t("actionText") },
    active: { icon: BadgeCheck, title: t("activeTitle", { last4: last4 ?? "1234" }), text: t("activeText") },
  }[status];
  const Icon = view.icon;
  return (
    <div className={cn("card-soft flex flex-wrap items-center gap-4 rounded-3xl p-6", className)}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink/6 text-ink">
        <Icon className={cn("size-5", status === "pending" && "animate-spin")} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold text-ink">{view.title}</p>
        <p className="text-small text-muted">{view.text}</p>
      </div>
      {status === "none" && (
        <Button variant="secondary" size="sm" onClick={() => setSetup(true)}>
          {t("setupAction")}
        </Button>
      )}
      {status === "action_required" && (
        <Button variant="secondary" size="sm" onClick={start} disabled={busy}>
          {t("actionAction")}
        </Button>
      )}
      <PayoutSetupSheet open={setup} onClose={() => setSetup(false)} />
    </div>
  );
}
