import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/layout/Logo";
import { cardClass } from "@/components/ui/Card";
import { APP_MODE } from "@/lib/appMode";
import { cn } from "@/lib/utils";
import { DemoLoginForm } from "./DemoLoginForm";

export const metadata: Metadata = { title: "Private preview", robots: { index: false, follow: false } };

/** The demo's door: the header, band and footer are gone on this page (globals.css). */
export default async function DemoLoginPage() {
  if (APP_MODE !== "demo") notFound();
  const t = await getTranslations("demo.login");
  return (
    <div data-demo-login className="flex min-h-dvh items-center justify-center px-4">
      <div className={cn(cardClass, "w-full max-w-md")}>
        <Logo />
        <p className="mt-4 text-body text-muted">{t("text")}</p>
        <Suspense fallback={null}>
          <DemoLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
