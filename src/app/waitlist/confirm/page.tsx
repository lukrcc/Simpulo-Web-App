import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WaitlistConfirmPage } from "@/components/platform/WaitlistLinks";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platform.waitlist");
  return pageMetadata({ title: t("confirmedTitle"), description: t("confirmedText"), path: "/waitlist/confirm", noindex: true });
}

/** /waitlist/confirm?token= – the waitlist's double opt-in link. Never indexed. */
export default function Page() {
  return <WaitlistConfirmPage />;
}
