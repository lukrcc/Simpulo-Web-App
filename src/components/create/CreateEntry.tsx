"use client";

import { useTranslations } from "next-intl";
import { CreateStayForm } from "@/components/views/CreateStayForm";
import { Container } from "@/components/layout/Container";
import { LegalLine } from "@/components/layout/LegalLine";
import { Button } from "@/components/ui/ActionButton";
import { canOpenHouse, usePlatformPhase } from "@/config/platform";

/**
 * /create: Open a House – or, before the launch (config/platform.ts: no openHouse, but applyAsHost), a calm placeholder "Apply as a host".
 * The application itself comes in its own step.
 */
export function CreateEntry() {
  const phase = usePlatformPhase();
  if (canOpenHouse(phase)) return <CreateStayForm />;
  return <ApplyAsHost />;
}

function ApplyAsHost() {
  const t = useTranslations("platform.apply");
  return (
    <Container className="flex min-h-[calc(100dvh-var(--header-total))] flex-col items-center justify-center py-16 text-center">
      <p className="text-eyebrow uppercase text-muted">{t("eyebrow")}</p>
      <h1 className="mt-3 text-h1 text-ink">{t("title")}</h1>
      <p className="mt-3 max-w-[520px] text-body-lg text-muted">{t("text")}</p>
      <Button href="/" variant="secondary" className="mt-8">
        {t("back")}
      </Button>
      <LegalLine className="mt-16" />
    </Container>
  );
}
