"use client";

// The error page of the app and its areas (app/error.tsx and <area>/error.tsx): ErrorView with the app's words. The error goes to the
// console only (TODO(monitoring): to the error service) – never shown to the person.
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { ErrorView } from "./ErrorView";

export default function RouteError({ error, retry, reset }: { error: unknown; retry?: () => void; reset?: () => void }) {
  const t = useTranslations("states.error");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <ErrorView
      texts={{ title: t("title"), description: t("description"), explore: t("explore"), getHelp: t("getHelp"), retry: t("retry"), offlineTitle: t("offlineTitle"), offlineDescription: t("offlineDescription") }}
      retry={retry ?? reset}
    />
  );
}
