import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HostOnboarding } from "@/components/onboarding/HostOnboarding";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.host");
  return { title: t("metaTitle") };
}

/** /welcome/host – the host's onboarding (CLAUDE.md "Onboarding"). Never indexed (layout). */
export default function Page() {
  return <HostOnboarding />;
}
