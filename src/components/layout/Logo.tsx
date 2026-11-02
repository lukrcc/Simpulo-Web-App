import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Wordmark (32px/700) with the tagline (14px muted, 2px under it). The class hooks let the site header move and fade them. */
export function Logo({ className, taglineClassName }: { className?: string; taglineClassName?: string }) {
  const t = useTranslations("nav");
  return (
    <Link href="/" aria-label={t("home")} className={cn("flex flex-col self-center justify-self-start leading-none", className)}>
      <span className="text-[32px] font-bold tracking-tight text-ink">
        simpulo<span className="text-accent">.</span>
      </span>
      <span className={cn("mt-0.5 text-sm text-muted", taglineClassName)}>{t("tagline")}</span>
    </Link>
  );
}
