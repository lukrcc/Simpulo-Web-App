"use client"; // The admin's error page – German, in the admin's dark scope (inside AdminFrame), the same ErrorView look.

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { ErrorView } from "@/components/states/ErrorView";

export default function AdminError({ error, retry, reset }: { error: unknown; retry?: () => void; reset?: () => void }) {
  const t = useTranslations("admin.errors");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorView texts={{ title: t("title"), description: t("description"), explore: t("overview"), getHelp: t("getHelp"), retry: t("retry"), offlineTitle: t("offlineTitle"), offlineDescription: t("offlineDescription") }} retry={retry ?? reset} homeHref="/admin" />;
}
