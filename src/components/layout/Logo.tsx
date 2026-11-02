import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Wordmark with the tagline (muted) right under it. `size="header"`: the site header's 24px/700 wordmark and 13px
 * tagline, 0px apart (Header sizes, SiteHeader.tsx); default: 32px / 14px (the phone header). The tagline class hook
 * lets the site header move and fade it.
 */
export function Logo({ size = "lg", tagline = true, className, taglineClassName }: { size?: "lg" | "header"; /** false: the wordmark alone (the compact header) */ tagline?: boolean; className?: string; taglineClassName?: string }) {
  const t = useTranslations("nav");
  const header = size === "header";
  return (
    <Link href="/" aria-label={t("home")} className={cn("flex flex-col self-center justify-self-start leading-none", className)}>
      <span className={cn("font-bold tracking-tight text-ink", header ? "text-[24px]" : "text-[32px]")}>
        simpulo<span className="text-accent">.</span>
      </span>
      {tagline && <span className={cn("text-muted", header ? "text-[13px]" : "mt-0.5 text-sm", taglineClassName)}>{t("tagline")}</span>}
    </Link>
  );
}
