import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Logo } from "@/components/layout/Logo";
import { cardClass } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { PreviewForm } from "./PreviewForm";

export const metadata: Metadata = { title: "Private preview", robots: { index: false, follow: false } };

/** The one password page of the preview gate and the demo (src/proxy.ts; with no gate on, the proxy sends /preview home – the secret only exists at runtime): header, band and footer are gone here (globals.css). */
export default async function PreviewPage() {
  const t = await getTranslations("preview");
  return (
    <div data-preview-gate className="flex min-h-dvh items-center justify-center px-4">
      <div className={cn(cardClass, "w-full max-w-md")}>
        <Logo size="sm" />
        <p className="mt-4 text-body text-muted">{t("text")}</p>
        <Suspense fallback={null}>
          <PreviewForm />
        </Suspense>
      </div>
    </div>
  );
}
