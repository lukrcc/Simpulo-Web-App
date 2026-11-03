"use client"; // Error boundaries must be Client Components.

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/ActionButton";

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
        <div className="flex size-14 items-center justify-center rounded-full bg-bg text-ink">
          <TriangleAlert className="size-7" aria-hidden />
        </div>
        <h1 className="mt-6 text-h2 tracking-tight">{t("title")}</h1>
        <p className="mt-2 max-w-sm text-muted">{t("description")}</p>
        <Button variant="primary" size="lg" onClick={() => retry()} className="mt-8">
          <RotateCcw aria-hidden />
          {t("retry")}
        </Button>
      </div>
    </Container>
  );
}
