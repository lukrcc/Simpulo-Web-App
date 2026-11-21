"use client"; // The last net: an error in the root layout itself. It replaces the whole document, so it brings its own <html> and the styles –
// and no app providers: the words come from lib/i18n (tEn), "Get help" is a link (CLAUDE.md "Fehlerseiten").

import { useEffect } from "react";
import { ErrorView } from "@/components/states/ErrorView";
import { tEn } from "@/lib/i18n/translate";
import "./globals.css";

export default function GlobalError({ error, retry, reset }: { error: unknown; retry?: () => void; reset?: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const t = (key: string) => tEn(`states.error.${key}` as "states.error.title");
  return (
    <html lang="en">
      <body className="min-h-svh bg-bg font-sans text-ink">
        <ErrorView texts={{ title: t("title"), description: t("description"), explore: t("explore"), getHelp: t("getHelp"), retry: t("retry"), offlineTitle: t("offlineTitle"), offlineDescription: t("offlineDescription") }} retry={retry ?? reset} helpHref="/contact" />
      </body>
    </html>
  );
}
