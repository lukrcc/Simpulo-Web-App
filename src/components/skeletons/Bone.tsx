import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One grey placeholder shape – size and radius come from `className`. */
export function Bone({ className }: { className?: string }) {
  return <div className={cn("rounded-full bg-black/5", className)} />;
}

/** Pulsing wrapper that announces "Loading" once for everything inside it. */
export function SkeletonRoot({ children, className }: { children: ReactNode; className?: string }) {
  const t = useTranslations("states");
  return (
    <div role="status" aria-busy="true" aria-label={t("loading")} className={cn("animate-pulse", className)}>
      {children}
    </div>
  );
}
