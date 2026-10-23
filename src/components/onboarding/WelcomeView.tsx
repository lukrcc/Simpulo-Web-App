"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { Container } from "@/components/layout/Container";
import { getCurrentUser, isProfileComplete, useStore } from "@/lib/store";
import { CompleteProfileForm } from "./CompleteProfileForm";
import { safeNextPath } from "./welcome";

/** /welcome?next=/path – "Complete your profile", then on to `next`. Complete profiles skip straight there. */
export function WelcomeView({ next }: { next?: string }) {
  const t = useTranslations("onboarding");
  return (
    <RequireLogin title={t("loginTitle")}>
      <WelcomeGate next={safeNextPath(next)} />
    </RequireLogin>
  );
}

function WelcomeGate({ next }: { next: string }) {
  const t = useTranslations("onboarding");
  const me = getCurrentUser(useStore());
  const router = useRouter();
  // Already complete (or just saved): continue to `next`.
  const completeOnArrival = me ? isProfileComplete(me) : false;

  useEffect(() => {
    if (completeOnArrival) router.replace(next);
  }, [completeOnArrival, next, router]);

  if (!me || completeOnArrival) return null;

  return (
    <Container page width="narrow">
      <div className="max-w-lg rounded-[24px] bg-white p-6 md:p-8">
        <h1 className="mb-4 text-2xl font-bold tracking-tight">{t("title")}</h1>
        {/* Keyed by user: switching the dev user starts a fresh form. */}
        <CompleteProfileForm key={me.id} user={me} onDone={() => router.replace(next)} />
      </div>
    </Container>
  );
}
