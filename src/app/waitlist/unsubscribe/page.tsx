import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WaitlistUnsubscribePage } from "@/components/platform/WaitlistLinks";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platform.waitlist");
  return pageMetadata({ title: t("unsubscribeTitle"), description: t("unsubscribeText"), path: "/waitlist/unsubscribe", noindex: true });
}

/** /waitlist/unsubscribe?token= – the link in every waitlist email. Never indexed. */
export default function Page() {
  return <WaitlistUnsubscribePage />;
}
