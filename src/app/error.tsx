"use client"; // Error boundaries must be Client Components.

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Container } from "@/components/layout/Container";
import { buttonClass } from "@/components/ui/button";

interface ErrorPageProps {
  error: unknown;
  /** Re-fetches and re-renders the segment (Next 16 – preferred over reset()). */
  retry: () => void;
}

export default function ErrorPage({ error, retry }: ErrorPageProps) {
  const t = useTranslations("states.error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container page>
      <div className="flex flex-col items-center py-16 text-center md:py-24">
        <div className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
          <TriangleAlert className="size-7" aria-hidden />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight md:text-3xl">{t("title")}</h1>
        <p className="mt-2 max-w-sm text-neutral-500">{t("description")}</p>
        <button type="button" onClick={() => retry()} className={buttonClass("dark", "md", "mt-8")}>
          <RotateCcw className="size-4" aria-hidden />
          {t("retry")}
        </button>
      </div>
    </Container>
  );
}
