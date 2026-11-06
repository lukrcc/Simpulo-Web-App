"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/ActionButton";
import { ByStripe, PayoutStatusCard } from "./PayoutSetup";

/** Back from onboarding: "Stripe is checking your details" → "Payouts ready · Bank ****1234", or "Stripe needs one more thing". */
export function PayoutsReturn() {
  const t = useTranslations("payouts");
  return (
    <RequireLogin title={t("returnTitle")}>
      <Container page width="narrow" className="pb-(--space-section)">
        <Button href="/settings#payouts" variant="tertiary" size="sm" className="-ml-4 mb-6">
          <ArrowLeft aria-hidden />
          {t("returnBack")}
        </Button>
        <h1 className="text-h2 text-ink">{t("returnTitle")}</h1>
        <PayoutStatusCard className="mt-6" />
        <ByStripe className="mt-4" />
      </Container>
    </RequireLogin>
  );
}
