import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OnboardingDone } from "@/components/onboarding/OnboardingDone";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.done");
  return { title: t("metaTitle") };
}

/** /welcome/done – the end of the guest onboarding: three Houses to start with (CLAUDE.md "Onboarding"). Never indexed (layout). */
export default function Page() {
  return <OnboardingDone />;
}
