import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReportContentForm } from "@/components/safety/ReportContentForm";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reportContent");
  return pageMetadata({ title: t("title"), description: t("intro"), path: "/report-content" });
}

/** /report-content – report content you believe is illegal or against the rules, with or without an account (CLAUDE.md "Plattform-Pflichten"). */
export default function ReportContentPage() {
  return <ReportContentForm />;
}
