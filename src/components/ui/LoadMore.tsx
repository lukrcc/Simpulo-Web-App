"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/ActionButton";
import { cn } from "@/lib/utils";

export type LoadMoreKind = "houses" | "updates";

/**
 * Under a long list (Open Houses, Your houses, Updates), centred: "Showing 24 of 100 houses" (14px muted), a 240 × 2px progress bar (rail
 * ink 10 %, filled ink), and "Show 24 more" – 48px, at least 240px, the soft button (ink 7 %, semibold; hover 12 %), never black. Loading:
 * a spinner in the same button, same size. All loaded: no button – "That's all 100 houses" and, if given, a text link (Explore: "Open your
 * own →"). Only on a click; nothing loads on scroll. Nothing at all for a list that fits on one page.
 */
export function LoadMore({
  shown,
  total,
  nextCount,
  loading,
  onLoadMore,
  paged,
  kind = "houses",
  doneLink,
  className,
}: {
  shown: number;
  total: number;
  nextCount: number;
  loading: boolean;
  onLoadMore: () => void;
  /** The list has more than one page in all */
  paged: boolean;
  kind?: LoadMoreKind;
  doneLink?: { href: string; label: string };
  className?: string;
}) {
  const t = useTranslations("common.loadMore");
  if (!paged || total === 0) return null;
  const done = shown >= total;
  const progress = Math.min(1, shown / total);
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      {done ? (
        <>
          <p className="text-nav text-muted">{t("all", { total, kind })}</p>
          {doneLink && (
            <Link href={doneLink.href} className="mt-2 inline-flex items-center gap-1 text-nav font-semibold text-ink underline-offset-4 hover:underline">
              {doneLink.label}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          )}
        </>
      ) : (
        <>
          <p className="text-nav text-muted" aria-live="polite">
            {t("showing", { shown, total, kind })}
          </p>
          <div aria-hidden className="mt-3 h-0.5 w-60 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full origin-left rounded-full bg-ink transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none" style={{ transform: `scaleX(${progress})` }} />
          </div>
          <Button variant="soft" size="lg" onClick={onLoadMore} aria-busy={loading} className="mt-5 min-w-60">
            {/* Both always laid out, one visible: loading keeps the button exactly as it was. */}
            <span className="grid place-items-center">
              <span className={cn("col-start-1 row-start-1", loading && "invisible")}>{t("more", { count: nextCount })}</span>
              {loading && (
                <span className="col-start-1 row-start-1 flex items-center">
                  <LoaderCircle aria-hidden className="size-5! animate-spin" />
                  <span className="sr-only">{t("loading")}</span>
                </span>
              )}
            </span>
          </Button>
        </>
      )}
    </div>
  );
}
